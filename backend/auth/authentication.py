from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from fastapi import HTTPException, status , Response
from google.auth.transport import requests
from google.oauth2 import id_token
import hashlib
import secrets

from .models import (
    UserSignupEmail, UserSignupPhone, UserLoginEmail, UserLoginPhone,
    GoogleLoginRequest, UserResponse, LoginResponse, TokenResponse,
    MessageResponse, create_user_document, user_document_to_response
)
from utils.security import (
    hash_password, verify_password, validate_password_strength,
    create_access_token, create_refresh_token, verify_token,
    users_collection, refresh_tokens_collection,
    get_user_by_email, get_user_by_phone, get_user_by_google_id,
    sanitize_input, is_valid_email_format, is_valid_phone_format
)
from decouple import config

# Google OAuth Configuration
GOOGLE_CLIENT_ID = config("GOOGLE_CLIENT_ID")

# ==============================
# Account Lockout Configuration
# ==============================
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30

# ==============================
# User Registration Functions
# ==============================

async def register_user_email(signup_data: UserSignupEmail, response: Response) -> LoginResponse:
    """
    Register new user with email - SUPER USER FRIENDLY
    """
    try:
        # Sanitize inputs
        name = sanitize_input(signup_data.name)
        email = signup_data.email.lower().strip()

        # Validate password strength
        password_validation = validate_password_strength(signup_data.password)
        if not password_validation["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Password too weak",
                    "requirements": password_validation["errors"]
                }
            )

        # Check if user already exists with this email
        existing_user = await get_user_by_email(email)
        if existing_user:
            # USER FRIENDLY: Tell them they can just login instead
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "Account already exists",
                    "message": f"An account with {email} already exists. You can login instead!",
                    "suggestion": "Try logging in with your existing password, or use 'Forgot Password' if needed."
                }
            )

        # Hash password
        password_hash = hash_password(signup_data.password)

        # Create user document
        user_doc = create_user_document(signup_data, password_hash)

        # Insert user into database
        result = await users_collection.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id

        # Create tokens
        token_data = {"sub": str(result.inserted_id), "email": email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        # Store refresh token
        await store_refresh_token(str(result.inserted_id), refresh_token)

        # Update last login
        await users_collection.update_one(
            {"_id": result.inserted_id},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=False,  # True in production (HTTPS)
            samesite="lax",  # or "lax"
            max_age=24*3600,
        )

        return LoginResponse(
            message=f"Welcome {name}! Your account has been created successfully.",
            access_token=access_token,
           
            token_type="bearer",
            expires_in=config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30, cast=int) * 60,
            user=user_document_to_response(user_doc)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong during registration. Please try again."
        )

async def register_user_phone(signup_data: UserSignupPhone) -> LoginResponse:
    """
    Register new user with phone - SUPER USER FRIENDLY
    """
    try:
        # Sanitize inputs
        name = sanitize_input(signup_data.name)
        phone = signup_data.phone.strip()
        
        # Validate password strength
        password_validation = validate_password_strength(signup_data.password)
        if not password_validation["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Password too weak",
                    "requirements": password_validation["errors"]
                }
            )
        
        # Check if user already exists with this phone
        existing_user = await get_user_by_phone(phone)
        if existing_user:
            # USER FRIENDLY: Tell them they can just login instead
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "Account already exists",
                    "message": f"An account with {phone} already exists. You can login instead!",
                    "suggestion": "Try logging in with your existing password, or use 'Forgot Password' if needed."
                }
            )
        
        # Hash password
        password_hash = hash_password(signup_data.password)
        
        # Create user document
        user_doc = create_user_document(signup_data, password_hash)
        
        # Insert user into database
        result = await users_collection.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        
        # Create tokens
        token_data = {"sub": str(result.inserted_id), "phone": phone}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        # Store refresh token
        await store_refresh_token(str(result.inserted_id), refresh_token)
        
        # Update last login
        await users_collection.update_one(
            {"_id": result.inserted_id},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        
        return LoginResponse(
            message=f"Welcome {name}! Your account has been created successfully.",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30, cast=int) * 60,
            user=user_document_to_response(user_doc)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong during registration. Please try again."
        )

# ==============================
# User Login Functions
# ==============================
async def login_user_email(login_data: UserLoginEmail) -> LoginResponse:
    """
    Login user with email - HANDLES ALL EDGE CASES GRACEFULLY
    """
    try:
        email = login_data.email.lower().strip()
        
        # Get user
        user = await get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "Account not found",
                    "message": f"No account found with {email}",
                    "suggestion": "Check your email address or create a new account."
                }
            )
        
        # Check if account is locked
        if await is_account_locked(user):
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail={
                    "error": "Account temporarily locked",
                    "message": "Too many failed login attempts. Account is temporarily locked for security.",
                    "suggestion": f"Try again in {LOCKOUT_DURATION_MINUTES} minutes or use 'Forgot Password'."
                }
            )
        
        # For Google OAuth users who try to login with password
        if user.get("google_id") and not user.get("password_hash"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Google account detected",
                    "message": "This account was created with Google. Please use 'Continue with Google' to login.",
                    "suggestion": "Click the Google login button instead."
                }
            )
        
        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            await handle_failed_login(user["_id"])
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "Invalid password",
                    "message": "The password you entered is incorrect.",
                    "suggestion": "Check your password or use 'Forgot Password' to reset it."
                }
            )
        
        # Reset failed attempts on successful login
        await reset_failed_attempts(user["_id"])
        
        # Create tokens
        token_data = {"sub": str(user["_id"]), "email": email}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        # Store refresh token
        await store_refresh_token(str(user["_id"]), refresh_token)
        
        # Update last login
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        
        return LoginResponse(
            message=f"Welcome back, {user['name']}!",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30, cast=int) * 60,
            user=user_document_to_response(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong during login. Please try again."
        )

async def login_user_phone(login_data: UserLoginPhone) -> LoginResponse:
    """
    Login user with phone - HANDLES ALL EDGE CASES GRACEFULLY
    """
    try:
        phone = login_data.phone.strip()
        
        # Get user
        user = await get_user_by_phone(phone)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "Account not found",
                    "message": f"No account found with {phone}",
                    "suggestion": "Check your phone number or create a new account."
                }
            )
        
        # Check if account is locked
        if await is_account_locked(user):
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail={
                    "error": "Account temporarily locked",
                    "message": "Too many failed login attempts. Account is temporarily locked for security.",
                    "suggestion": f"Try again in {LOCKOUT_DURATION_MINUTES} minutes or use 'Forgot Password'."
                }
            )
        
        # For Google OAuth users who try to login with password
        if user.get("google_id") and not user.get("password_hash"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Google account detected",
                    "message": "This account was created with Google. Please use 'Continue with Google' to login.",
                    "suggestion": "Click the Google login button instead."
                }
            )
        
        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            await handle_failed_login(user["_id"])
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "Invalid password",
                    "message": "The password you entered is incorrect.",
                    "suggestion": "Check your password or use 'Forgot Password' to reset it."
                }
            )
        
        # Reset failed attempts on successful login
        await reset_failed_attempts(user["_id"])
        
        # Create tokens
        token_data = {"sub": str(user["_id"]), "phone": phone}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        # Store refresh token
        await store_refresh_token(str(user["_id"]), refresh_token)
        
        # Update last login
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        
        return LoginResponse(
            message=f"Welcome back, {user['name']}!",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30, cast=int) * 60,
            user=user_document_to_response(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong during login. Please try again."
        )

# ==============================
# Google OAuth Functions
# ==============================

from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import datetime, timezone
from auth.models import GoogleLoginResponse,UserDocument
from decouple import config
GOOGLE_CLIENT_ID = config("GOOGLE_CLIENT_ID")

async def google_oauth_login(data: GoogleLoginRequest) -> GoogleLoginResponse:
    try:
        # Verify Google ID token
        idinfo = id_token.verify_oauth2_token(
            data.credential,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )

        # Extract user info
        google_id = idinfo.get("sub")
        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")

        if not google_id or not email:
            raise HTTPException(status_code=400, detail="Invalid Google account info")

        # Check if user exists in DB, else create one
        user_doc = await users_collection.find_one({"email": email})
        if not user_doc:
            new_user = UserDocument(
                name=name,
                email=email,
                google_id=google_id,
                is_verified=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                profile_picture=picture,
            )
            await users_collection.insert_one(new_user.dict(by_alias=True))

        return GoogleLoginResponse(
            message="Google login successful",
            google_id=google_id,
            email=email,
            name=name,
            picture=picture,
            id_token=data.credential,  # return same JWT
        )

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

# ==============================
# Account Security Functions
# ==============================
async def is_account_locked(user: dict) -> bool:
    """Check if account is locked due to failed attempts"""
    if user.get("locked_until"):
        if datetime.now(timezone.utc) < user["locked_until"]:
            return True
        else:
            # Unlock account if lockout period has expired
            await users_collection.update_one(
                {"_id": user["_id"]},
                {"$unset": {"locked_until": ""}, "$set": {"failed_login_attempts": 0}}
            )
    return False

async def handle_failed_login(user_id):
    """Handle failed login attempt"""
    user = await users_collection.find_one({"_id": user_id})
    failed_attempts = user.get("failed_login_attempts", 0) + 1
    
    update_data = {"failed_login_attempts": failed_attempts}
    
    if failed_attempts >= MAX_LOGIN_ATTEMPTS:
        locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        update_data["locked_until"] = locked_until
    
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": update_data}
    )

async def reset_failed_attempts(user_id):
    """Reset failed login attempts on successful login"""
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {"failed_login_attempts": 0}, "$unset": {"locked_until": ""}}
    )

# ==============================
# Token Management Functions
# ==============================
async def store_refresh_token(user_id: str, refresh_token: str):
    """Store refresh token in database"""
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=config("REFRESH_TOKEN_EXPIRE_DAYS", default=30, cast=int))
    
    token_doc = {
        "user_id": user_id,
        "token_hash": token_hash,
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
        "is_active": True
    }
    
    await refresh_tokens_collection.insert_one(token_doc)

async def refresh_access_token(refresh_token: str) -> TokenResponse:
    """Generate new access token using refresh token"""
    try:
        # Verify refresh token
        payload = verify_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        # Check if refresh token exists and is active
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored_token = await refresh_tokens_collection.find_one({
            "user_id": user_id,
            "token_hash": token_hash,
            "is_active": True,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        
        if not stored_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired or invalid"
            )
        
        # Get user
        from utils.security import get_user_by_id
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new access token
        token_data = {"sub": user_id}
        if user.get("email"):
            token_data["email"] = user["email"]
        if user.get("phone"):
            token_data["phone"] = user["phone"]
        
        new_access_token = create_access_token(token_data)
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=refresh_token,  # Keep same refresh token
            token_type="bearer",
            expires_in=config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30, cast=int) * 60,
            user=user_document_to_response(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong refreshing token"
        )
