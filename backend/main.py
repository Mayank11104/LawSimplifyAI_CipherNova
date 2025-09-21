from ast import Try
from mimetypes import init

import asyncio
import uuid
import os
from fastapi.responses import StreamingResponse
import json

from fastapi import FastAPI,Request, HTTPException, Depends, status, Response,UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from typing import List, cast, IO

# --- Google Cloud and Auth Imports ---
from google.cloud import firestore
import google.auth
import google.auth.transport.requests
import google.oauth2.id_token
# ---

from models import User,UserOut
import httpx
from pydantic import ValidationError
from settings.config import settings
import jwt
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta

from passlib.context import CryptContext

# --- Firestore Client Initialization ---
# This replaces the MongoDB client. It authenticates automatically on GCP.
db = firestore.AsyncClient()
users_ref = db.collection("users")
# ---

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("App startup: Firestore client initialized.")
    # Programmatic index creation is not needed for Firestore in this way.
    # Indexes should be managed via the Google Cloud Console.
    yield
    # No explicit client.close() is needed for the Firestore async client.
    print("App shutdown")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Helpers (Unchanged) ---
def create_app_token(user_id: str):
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_app_token(request: Request) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = request.cookies.get("token")
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except (jwt.PyJWTError, ValidationError) as e:
        raise credentials_exception from e
    return user_id

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# --- Service-to-Service Authentication ---
PROFILER_URL = "https://doc-profiler-gpu-service-918379302610.asia-southeast1.run.app/profile"

async def profile_text_remotely(text_to_profile: str) -> dict:
    headers = {}
    try:
        credentials, project = google.auth.default()
        auth_req = google.auth.transport.requests.Request()
        token = google.oauth2.id_token.fetch_id_token(auth_req, PROFILER_URL)
        headers = {"Authorization": f"Bearer {token}"}
        logger.info("Successfully generated authentication token for Cloud Run.")
    except Exception as e:
        logger.error(f"Failed to generate authentication token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not generate credentials to call the profiling service: {e}"
        )

    payload = {"text": text_to_profile, "max_len": 384, "stride": 128, "batch_size": 16}
    timeout_config = httpx.Timeout(300.0)

    try:
        async with httpx.AsyncClient(timeout=timeout_config) as client:
            logger.info(f"Sending text to profiler at {PROFILER_URL}...")
            response = await client.post(PROFILER_URL, json=payload, headers=headers)
            response.raise_for_status()
            logger.info("Successfully received profile from model.")
            return response.json()
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 403:
            logger.error("Request to profiler failed with 403 Forbidden. This is an authentication/permission issue.")
        raise HTTPException(status_code=exc.response.status_code, detail=f"Error calling profiling service: {exc.response.text}") from exc
    except Exception as e:
        logger.error(f"An unexpected error occurred while calling the profiler: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")

# --- User Management Endpoints (Migrated to Firestore) ---

@app.post("/auth/register")
async def register(user: User):
    query = users_ref.where("email", "==", user.email).limit(1)
    docs = [doc async for doc in query.stream()]
    if docs:
        raise HTTPException(status_code=400, detail="Email already registered")
    if user.password is None:
        raise ValueError("Password is missing")
    user.password = hash_password(user.password)
    timestamp, doc_ref = await users_ref.add(user.model_dump())
    return {"id": doc_ref.id}

@app.post("/auth/login")
async def login(email: str, password: str, response: Response):
    user_doc, user_id = None, None
    query = users_ref.where("email", "==", email).limit(1)
    async for doc in query.stream():
        user_doc = doc.to_dict()
        user_id = doc.id
    
    if not user_doc or not verify_password(password, user_doc.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user_doc or not user_id or not verify_password(password, user_doc.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_app_token(user_id)
    response.set_cookie("token", token, httponly=True, samesite="strict", secure=True)
    return {"message": "Login successful"}

@app.get("/auth/google/login")
async def google_login():
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
    )
    return RedirectResponse(google_auth_url)

@app.get("/auth/google/callback")
async def google_callback(request: Request, response: Response):
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="No code in callback")

    token_url = "https://oauth2.googleapis.com/token"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(token_url, data={
                "code": code, "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.REDIRECT_URI, "grant_type": "authorization_code",
            })
            resp.raise_for_status()
            token_data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google token exchange failed: {e}")

    id_token_str = token_data.get("id_token")
    try:
        idinfo = google.oauth2.id_token.verify_oauth2_token(id_token_str, google.auth.transport.requests.Request(), settings.GOOGLE_CLIENT_ID,clock_skew_in_seconds=60)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token : {e}")

    google_id = idinfo["sub"]
    user_id = None
    query = users_ref.where("google_id", "==", google_id).limit(1)
    async for doc in query.stream():
        user_id = doc.id

    if not user_id:
        new_user = User(
            username=idinfo.get("name"), email=idinfo.get("email"),
            google_id=google_id, profile_pic=idinfo.get("picture"),
            created_at=datetime.now(timezone.utc)
        )
        timestamp, doc_ref = await users_ref.add(new_user.model_dump())
        user_id = doc_ref.id

    app_token = create_app_token(user_id)
    response = RedirectResponse(url="http://localhost:5173/clausemain")
    response.set_cookie(key="token", value=app_token, httponly=False, samesite="none", secure=True)
    return response

async def get_user_data_firestore(user_id: str):
    doc_ref = users_ref.document(user_id)
    doc = await doc_ref.get()
    if not doc.exists:
        return None
    user_data = doc.to_dict()
    if user_data is None:
        user_data = {}
    user_data["id"] = doc.id
    return user_data

@app.get("/auth/me", response_model=UserOut)
async def get_me(user_id: str = Depends(verify_app_token)):
    user_data = await get_user_data_firestore(user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    return user_data


from scripts.extract_and_translate_pipeline import PipelineConfig,initialize_clients,extraction_agent,translate_text, logger
from scripts.refinement import refine

@app.post("/api/upload_and_stream")
async def upload_and_stream_processing(
    files: List[UploadFile] = File(...),
    # user_id: str = Depends(verify_app_token) # User authentication is now active
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    
    file = files[0]
    
    file_content = await file.read()
    original_filename = file.filename

    async def event_generator(content_bytes: bytes, filename: str):
        try:
            yield f"data: {json.dumps({'status': 'Initializing clients...'})}\n\n"
            await asyncio.sleep(1)
            config = PipelineConfig.from_env()
            docai_client, translation_model = initialize_clients(config)

            yield f"data: {json.dumps({'status': 'Extracting text from document...'})}\n\n"
            extracted_text = extraction_agent(content_bytes, filename, docai_client, config)
            
            yield f"data: {json.dumps({'status': 'Extraction complete.'})}\n\n"
            await asyncio.sleep(1)

            yield f"data: {json.dumps({'status': 'Translating text...'})}\n\n"
            translated_text = translate_text(extracted_text, translation_model)
            yield f"data: {json.dumps({'status': 'Translation complete.'})}\n\n"
            await asyncio.sleep(1)

            yield f"data: {json.dumps({'status': 'Sending text to profiling model...'})}\n\n"
            raw_profile = await profile_text_remotely(translated_text)
            yield f"data: {json.dumps({'status': 'Profiling complete.'})}\n\n"
            await asyncio.sleep(1)

            yield f"data: {json.dumps({'status': 'Refining and structuring results...'})}\n\n"
            refined_profile = refine(raw_profile)
            yield f"data: {json.dumps({'status': 'Process complete!'})}\n\n"
            await asyncio.sleep(1)

            yield f"event: final_result\ndata: {json.dumps(refined_profile)}\n\n"

        except Exception as e:
            error_message = f"An error occurred: {str(e)}"
            logger.error(f"Error processing file {filename}: {error_message}")
            yield f"event: error\ndata: {json.dumps({'error': error_message})}\n\n"

    if not original_filename:
        async def error_generator():
            yield f"event: error\ndata: {json.dumps({'error': 'A file was uploaded without a filename.'})}\n\n"
        return StreamingResponse(error_generator(), media_type="text/event-stream")

    return StreamingResponse(event_generator(file_content, original_filename), media_type="text/event-stream")

# ```eof
# ```markdown:Updated Dependencies:requirements.txt
# # Replace motor and pymongo with google-cloud-firestore
# google-cloud-firestore

# # Keep other dependencies
# fastapi
# uvicorn[standard]
# pydantic
# python-jose[cryptography] # For JWT
# passlib[bcrypt] # For password hashing
# httpx # For making async requests
# google-auth # For service-to-service authentication
# python-dateutil # For the refinement script

# # Add any dependencies from your 'scripts' folder, e.g.
# google-cloud-aiplatform
# google-cloud-documentai
# ```eof