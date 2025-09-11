import os
from datetime import datetime, timedelta
from typing import Any, Union, Optional
import motor.motor_asyncio
from passlib.context import CryptContext
from jose import JWTError, jwt
from decouple import config

# ==============================
# Configuration
# ==============================
SECRET_KEY = config("SECRET_KEY")
ALGORITHM = config("ALGORITHM", default="HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30, cast=int)
REFRESH_TOKEN_EXPIRE_DAYS = config("REFRESH_TOKEN_EXPIRE_DAYS", default=30, cast=int)

MONGODB_URI = config("MONGODB_URI")
DATABASE_NAME = config("DATABASE_NAME")

# ==============================
# Password Hashing
# ==============================
# Using bcrypt with 12 rounds (very secure)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

# ==============================
# Database Connection
# ==============================
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
database = client[DATABASE_NAME]

# Collections
users_collection = database.users
refresh_tokens_collection = database.refresh_tokens

async def init_database():
    """Initialize database with proper indexes for security and performance"""
    try:
        # Create unique indexes for user identification
        await users_collection.create_index("email", unique=True, sparse=True)
        await users_collection.create_index("phone", unique=True, sparse=True)
        await users_collection.create_index("google_id", unique=True, sparse=True)
        
        # Create indexes for performance
        await users_collection.create_index("created_at")
        await users_collection.create_index("last_login")
        await users_collection.create_index("is_active")
        
        # Create index for refresh tokens with TTL (automatic cleanup)
        await refresh_tokens_collection.create_index("expires_at", expireAfterSeconds=0)
        await refresh_tokens_collection.create_index("user_id")
        
        print("✅ Database indexes created successfully")
    except Exception as e:
        print(f"❌ Error creating database indexes: {e}")

# ==============================
# Password Security Functions
# ==============================
def hash_password(password: str) -> str:
    """
    Hash password using bcrypt with salt rounds=12
    Very secure against rainbow table attacks
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against hash
    Returns True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)

def validate_password_strength(password: str) -> dict:
    """
    Validate password strength
    Returns validation result with details
    """
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    if len(password) > 128:
        errors.append("Password must be less than 128 characters")
    if not any(c.islower() for c in password):
        errors.append("Password must contain at least one lowercase letter")
    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter")
    if not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one number")
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        errors.append("Password must contain at least one special character")
    
    return {
        "is_valid": len(errors) == 0,
        "errors": errors
    }

# ==============================
# JWT Token Functions
# ==============================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create JWT access token
    Short-lived token for API access
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "type": "access"
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """
    Create JWT refresh token
    Long-lived token for getting new access tokens
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "type": "refresh"
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """
    Verify and decode JWT token
    Returns payload if valid, None if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def extract_token_data(token: str) -> Optional[dict]:
    """
    Extract user data from JWT token
    Returns user info if token is valid
    """
    payload = verify_token(token)
    if payload is None:
        return None
    
    return {
        "user_id": payload.get("sub"),
        "email": payload.get("email"),
        "token_type": payload.get("type"),
        "expires": payload.get("exp")
    }

# ==============================
# Database Utility Functions
# ==============================
async def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email address"""
    return await users_collection.find_one({"email": email, "is_active": True})

async def get_user_by_phone(phone: str) -> Optional[dict]:
    """Get user by phone number"""
    return await users_collection.find_one({"phone": phone, "is_active": True})

async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get user by ID"""
    from bson import ObjectId
    try:
        return await users_collection.find_one({"_id": ObjectId(user_id), "is_active": True})
    except:
        return None

async def get_user_by_google_id(google_id: str) -> Optional[dict]:
    """Get user by Google ID"""
    return await users_collection.find_one({"google_id": google_id, "is_active": True})

# ==============================
# Security Utilities
# ==============================
def sanitize_input(text: str) -> str:
    """
    Sanitize user input to prevent injection attacks
    """
    if not isinstance(text, str):
        return str(text)
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&', '$', '`']
    for char in dangerous_chars:
        text = text.replace(char, '')
    
    return text.strip()

def is_valid_email_format(email: str) -> bool:
    """
    Basic email format validation
    """
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_pattern, email) is not None

def is_valid_phone_format(phone: str) -> bool:
    """
    Basic phone number format validation
    """
    import re
    # Allow phones with + prefix, digits, spaces, hyphens, parentheses
    phone_pattern = r'^\+?[\d\s\-\(\)]{8,15}$'
    return re.match(phone_pattern, phone) is not None