from ast import Try
from mimetypes import init

from fastapi import FastAPI,Request, HTTPException, Depends, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from google.oauth2 import id_token
from google.auth.transport import requests
from models import User,UserOut
import httpx
from db import db, get_user_data
from pydantic import ValidationError
from settings.config import settings
import jwt

from datetime import datetime, timezone, timedelta

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def init_indexes():
    await db["users"].create_index("email", unique=True)
    await db["users"].create_index("google_id", unique=True)

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



def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

@app.post("/auth/register")
async def register(user: User):
    if await users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
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

@app.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("token")
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
    response.set_cookie(key="token", value=app_token, httponly=True,samesite="strict",secure=True)
    print("callback done")
    return response

