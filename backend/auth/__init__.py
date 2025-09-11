"""
Authentication module for secure user management.

This module provides:
- User registration and login with email/phone
- Google OAuth integration
- JWT token management
- Password security and validation
- Account security features
"""

from .models import (
    UserSignupEmail,
    UserSignupPhone, 
    UserLoginEmail,
    UserLoginPhone,
    GoogleLoginRequest,
    UserResponse,
    LoginResponse,
    TokenResponse,
    MessageResponse,
    RefreshTokenRequest,
    PasswordResetRequest,
    ErrorResponse,
    ValidationErrorResponse
)

from .authentication import (
    register_user_email,
    register_user_phone,
    login_user_email,
    login_user_phone,
    google_oauth_login,
    refresh_access_token
)

__all__ = [
    # Models
    "UserSignupEmail",
    "UserSignupPhone",
    "UserLoginEmail", 
    "UserLoginPhone",
    "GoogleLoginRequest",
    "UserResponse",
    "LoginResponse",
    "TokenResponse",
    "MessageResponse",
    "RefreshTokenRequest",
    "PasswordResetRequest",
    "ErrorResponse",
    "ValidationErrorResponse",
    
    # Authentication functions
    "register_user_email",
    "register_user_phone", 
    "login_user_email",
    "login_user_phone",
    "google_oauth_login",
    "refresh_access_token"
]