from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, EmailStr, Field, validator
from bson import ObjectId
import re

# ==============================
# Custom Pydantic Types
# ==============================
from bson import ObjectId
from pydantic import BaseModel

class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic v2"""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        """Pydantic v2 replacement for __modify_schema__"""
        return {
            "type": "string",
            "title": "ObjectId",
            "examples": ["507f1f77bcf86cd799439011"]
        }


# ==============================
# User Registration Models
# ==============================
class UserSignupEmail(BaseModel):
    """Model for email-based user registration"""
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    accept_terms: bool = Field(..., description="Must accept terms of service")

    @validator('name')
    def validate_name(cls, v):
        # Remove extra spaces and validate
        v = ' '.join(v.split())
        if not v.replace(' ', '').isalpha():
            raise ValueError('Name must contain only letters and spaces')
        return v

    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    @validator('accept_terms')
    def terms_must_be_accepted(cls, v):
        if not v:
            raise ValueError('You must accept the terms of service')
        return v

class UserSignupPhone(BaseModel):
    """Model for phone-based user registration"""
    name: str = Field(..., min_length=2, max_length=50)
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    accept_terms: bool = Field(..., description="Must accept terms of service")

    @validator('name')
    def validate_name(cls, v):
        v = ' '.join(v.split())
        if not v.replace(' ', '').isalpha():
            raise ValueError('Name must contain only letters and spaces')
        return v

    @validator('phone')
    def validate_phone(cls, v):
        # Remove all non-digit characters except +
        cleaned = re.sub(r'[^\d+]', '', v)
        if not re.match(r'^\+?[\d]{8,15}$', cleaned):
            raise ValueError('Invalid phone number format')
        return cleaned

    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    @validator('accept_terms')
    def terms_must_be_accepted(cls, v):
        if not v:
            raise ValueError('You must accept the terms of service')
        return v

# ==============================
# User Login Models
# ==============================
class UserLoginEmail(BaseModel):
    """Model for email-based login"""
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)

class UserLoginPhone(BaseModel):
    """Model for phone-based login"""
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=1, max_length=128)

    @validator('phone')
    def validate_phone(cls, v):
        cleaned = re.sub(r'[^\d+]', '', v)
        if not re.match(r'^\+?[\d]{8,15}$', cleaned):
            raise ValueError('Invalid phone number format')
        return cleaned



class GoogleLoginRequest(BaseModel):
    """Model for Google OAuth login"""
    credential: str = Field(..., description="Google OAuth credential/token")

# ==============================
# Password Reset Models
# ==============================
class PasswordResetRequest(BaseModel):
    """Model for password reset request"""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Model for password reset confirmation"""
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

# ==============================
# Response Models
# ==============================
class UserResponse(BaseModel):
    """Model for user data in responses"""
    id: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_verified: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        json_encoders = {
            ObjectId: str
        }

class GoogleLoginResponse(BaseModel):
    message: str
    google_id: str
    email: str
    name: str
    picture: str
    id_token: str   # <-- the original Google credential


class TokenResponse(BaseModel):
    """Model for authentication token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class LoginResponse(BaseModel):
    """Model for successful login response"""
    message: str
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    """Model for refresh token request"""
    refresh_token: str

class MessageResponse(BaseModel):
    """Model for simple message responses"""
    message: str
    success: bool = True

# ==============================
# Database Models (MongoDB Documents)
# ==============================
class UserDocument(BaseModel):
    """MongoDB document model for users"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password_hash: Optional[str] = None  # None for OAuth users
    google_id: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    profile_picture: Optional[str] = None

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

class RefreshTokenDocument(BaseModel):
    """MongoDB document model for refresh tokens"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    token_hash: str  # Store hashed version for security
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    is_active: bool = True
    device_info: Optional[str] = None

    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

# ==============================
# Update Models
# ==============================
class UserProfileUpdate(BaseModel):
    """Model for updating user profile"""
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            v = ' '.join(v.split())
            if not v.replace(' ', '').isalpha():
                raise ValueError('Name must contain only letters and spaces')
        return v

class ChangePasswordRequest(BaseModel):
    """Model for changing password"""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

# ==============================
# Error Models
# ==============================
class ErrorResponse(BaseModel):
    """Model for error responses"""
    error: str
    message: str
    success: bool = False

class ValidationErrorResponse(BaseModel):
    """Model for validation error responses"""
    error: str = "Validation Error"
    details: list
    success: bool = False

# ==============================
# Utility Functions for Models
# ==============================
def user_document_to_response(user_doc: dict) -> UserResponse:
    """Convert MongoDB user document to UserResponse model"""
    return UserResponse(
        id=str(user_doc["_id"]),
        name=user_doc["name"],
        email=user_doc.get("email"),
        phone=user_doc.get("phone"),
        is_verified=user_doc.get("is_verified", False),
        created_at=user_doc["created_at"],
        last_login=user_doc.get("last_login")
    )

def create_user_document(signup_data: Union[UserSignupEmail, UserSignupPhone], 
                        password_hash: str, 
                        google_id: Optional[str] = None) -> dict:
    """Create MongoDB user document from signup data"""
    doc = {
        "name": signup_data.name,
        "password_hash": password_hash,
        "is_active": True,
        "is_verified": False,
        "failed_login_attempts": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    if isinstance(signup_data, UserSignupEmail):
        doc["email"] = signup_data.email
    elif isinstance(signup_data, UserSignupPhone):
        doc["phone"] = signup_data.phone
    
    if google_id:
        doc["google_id"] = google_id
        doc["is_verified"] = True  # Google users are auto-verified
    
    return doc