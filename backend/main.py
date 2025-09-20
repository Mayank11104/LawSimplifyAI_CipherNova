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

from google.oauth2 import id_token
from google.auth.transport import requests
from models import User,UserOut
import httpx
from db import db, get_user_data
from pydantic import ValidationError
from settings.config import settings
import jwt
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def init_indexes():
    await db["users"].create_index("email", unique=True)
    await db["users"].create_index("google_id", unique=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("App startup")
    await init_indexes()

    yield
    db.client.close()

    print("App shutdown")

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",   # React dev server
    "http://127.0.0.1:8000",
    
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],      # Specific origins
    allow_credentials=True,
    allow_methods=["*"],        # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],
)







users = db["users"]

def create_app_token(user_id: str):
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# This dependency is now obsolete as we are using cookies
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") 

def verify_app_token(request: Request) -> str:
    """
    Verifies a JWT token from a cookie and returns the user ID.

    This function is designed to be a FastAPI dependency.
    """
    # We create a generic exception to raise for all authentication errors
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}, # Still good practice for docs
    )
    
    # Check for the token in the cookies
    token = request.cookies.get("token")
    if not token:
        raise credentials_exception

    try:
        # Decode the token
        # This will now be printed if the token exists
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
       
        # Extract the user ID from the 'sub' (subject) claim
        user_id: str = payload.get("sub")
        
        if user_id is None:
            # If the 'sub' claim is missing
            raise credentials_exception
        
    except (jwt.exceptions.PyJWTError, ValidationError, jwt.PyJWTError) as e:
        # The token is invalid for any reason
        raise credentials_exception from e

    return user_id


PROFILER_URL = "https://doc-profiler-gpu-service-918379302610.asia-southeast1.run.app/profile"

async def profile_text_remotely(text_to_profile: str) -> dict:
    """
    Calls the remote document profiling service on Cloud Run.
    """
    # Define the JSON payload for the request
    payload = {
        "text": text_to_profile,
        "max_len": 384,
        "stride": 128,
        "batch_size": 16,
    }

    # Set a long timeout, as GPU inference can take time to start and run
    timeout_config = httpx.Timeout(300.0) # 5 minutes

    try:
        async with httpx.AsyncClient(timeout=timeout_config) as client:
            logger.info(f"Sending text to profiler at {PROFILER_URL}...")
            response = await client.post(PROFILER_URL, json=payload)
            
            # Raise an exception for non-2xx responses
            response.raise_for_status()
            
            logger.info("Successfully received profile from model.")
            return response.json()

    except httpx.RequestError as exc:
        logger.error(f"HTTP request to profiler failed: {exc}")
        # Re-raise as an HTTPException to be caught by FastAPI
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"The document profiling service is unavailable or failed: {str(exc)}"
        )
    except Exception as e:
        logger.error(f"An unexpected error occurred while calling the profiler: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )
    


def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

@app.post("/auth/register")
async def register(user: User):
    if await users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if user.password is None:
                raise ValueError("Password is missing")
    user.password = hash_password(user.password)
    result = await users.insert_one(user.model_dump())
    return {"id": str(result.inserted_id)}

@app.post("/auth/login")
async def login(email: str, password: str, response: Response):
    user = await users.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_app_token(str(user["_id"]))
    response.set_cookie("token", token, httponly=True, samesite="strict", secure=True)
    return {"message": "Login successful"}

@app.get("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="token",
        httponly=False,      
        samesite="none",    
        secure=True    
            
    )
    return {"message": "Logged out"}


# --- Step 1: Redirect user to Google ---
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


@app.get("/auth/me", response_model=UserOut)
async def get_me(user_id: str = Depends(verify_app_token)):
    """
    Get the profile for the currently authenticated user.
    """
    # We fetch the full document from the database
    user_data = await get_user_data(user_id)

    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    # FastAPI will look at the returned `user_data` dictionary and match its keys
    # to the fields in the corrected `UserOut` model ('id', 'email', 'username').
    return user_data

# --- Step 2: Callback from Google ---
@app.get("/auth/google/callback")
async def google_callback(request: Request, response: Response): # Add Response to the signature
    code = request.query_params.get("code")
    
    

    if not code:
        raise HTTPException(status_code=400, detail="No code in callback")

    # Step 3: Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    
    # Add a try...except block to catch the HTTP error
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(token_url, data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.REDIRECT_URI,
                "grant_type": "authorization_code",
            })
            
            # This is the key line to see the error from Google
            resp.raise_for_status() 
            
            token_data = resp.json()

    except httpx.HTTPStatusError as exc:
        # This will catch and print the specific error from Google
        print(f"HTTP Error: {exc.response.status_code} - {exc.response.text}")
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"Google token exchange failed: {exc.response.text}"
        )
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during token exchange")


    id_token_str = token_data.get("id_token")
    if not id_token_str:
        raise HTTPException(status_code=400, detail="No ID token returned")

    # Step 4: Verify ID Token with google-auth
    try:
        idinfo = id_token.verify_oauth2_token(
            id_token_str,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=300
        )
    except Exception as e:
       
        raise HTTPException(status_code=401, detail=f"Invalid Google token : {e}")

    # Step 5: Upsert user in Mongo
    google_id = idinfo["sub"]
    
    email = idinfo.get("email")
    name = idinfo.get("name")

    user = await users.find_one({"google_id": google_id})
    
    if not user:
        
        new_user = User(
        username=name,
        email=email,
        google_id=google_id,
        profile_pic=idinfo["picture"],
        created_at=datetime.now(timezone.utc)
        )
        result = await users.insert_one(new_user.model_dump())
        user_id = str(result.inserted_id)
    else:
        user_id = str(user["_id"])

    # Step 6: Create session JWT
    app_token = create_app_token(user_id)
    response = RedirectResponse(url="http://localhost:5173/clausemain")
    response.set_cookie(key="token", value=app_token, httponly=False,samesite="none",secure=True)
    print("callback done")
    return response

from scripts.extract_and_translate_pipeline import PipelineConfig,initialize_clients,extraction_agent,translate_text, logger
from scripts.refinement import refine
from tempfile import SpooledTemporaryFile



@app.post("/api/upload_and_stream")
async def upload_and_stream_processing(files: List[UploadFile] = File(...)):
    """
    Accepts a file upload, processes it entirely in memory, and streams
    real-time status updates and the final result over the same connection.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")
    
    file = files[0]
    
    # --- THIS IS THE FIX ---
    # Read the file content and filename immediately and outside the generator
    file_content = await file.read()
    original_filename = file.filename

    # Now, define the main processing generator which can safely assume it has a filename
    async def event_generator(content_bytes: bytes, filename: str):
        # This generator is now only called when we are sure 'filename' is a string
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

    # Handle the case where the filename is missing
    if not original_filename:
        async def error_generator():
            yield f"event: error\ndata: {json.dumps({'error': 'A file was uploaded without a filename.'})}\n\n"
        return StreamingResponse(error_generator(), media_type="text/event-stream")

    # If the filename exists, proceed with the main processing stream
    return StreamingResponse(event_generator(file_content, original_filename), media_type="text/event-stream")
