from fastapi import FastAPI, HTTPException, Depends, status, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from decouple import config
import uvicorn

# Import our authentication modules
from auth.models import (
    UserSignupEmail, UserSignupPhone, UserLoginEmail, UserLoginPhone,
    GoogleLoginRequest,GoogleLoginResponse, UserResponse, LoginResponse, TokenResponse,
    MessageResponse, RefreshTokenRequest, PasswordResetRequest,
    ErrorResponse, ValidationErrorResponse
)
from auth.authentication import (
    register_user_email, register_user_phone,
    login_user_email, login_user_phone, google_oauth_login,
    refresh_access_token
)
from utils.security import (
    init_database, extract_token_data, get_user_by_id,
    is_valid_email_format, is_valid_phone_format
)

# ==============================
# Configuration
# ==============================
APP_NAME = config("APP_NAME", default="Auth Backend")
BACKEND_CORS_ORIGINS = config("BACKEND_CORS_ORIGINS", default='["http://localhost:5173"]')

# Parse CORS origins (handle both JSON string and comma-separated)
try:
    import json
    CORS_ORIGINS = json.loads(BACKEND_CORS_ORIGINS)
except:
    CORS_ORIGINS = [origin.strip() for origin in BACKEND_CORS_ORIGINS.split(",")]

# ==============================
# FastAPI App Lifecycle
# ==============================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup and shutdown events"""
    # Startup
    print(f"🚀 Starting {APP_NAME}")
    print("📦 Initializing database...")
    await init_database()
    print("✅ Database initialized successfully")
    yield
    # Shutdown
    print(f"👋 Shutting down {APP_NAME}")

# ==============================
# FastAPI App Creation
# ==============================
app = FastAPI(
    title=APP_NAME,
    description="Secure Authentication API with Email, Phone, and Google OAuth",
    version="1.0.0",
    lifespan=lifespan
)

# ==============================
# CORS Middleware
# ==============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ==============================
# Security Dependencies
# ==============================
security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current authenticated user from JWT token"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    token_data = extract_token_data(credentials.credentials)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user = await get_user_by_id(token_data["user_id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

# ==============================
# Exception Handlers
# ==============================
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with consistent error format"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail if isinstance(exc.detail, str) else exc.detail.get("error", "Unknown error"),
            "message": exc.detail if isinstance(exc.detail, str) else exc.detail.get("message", "An error occurred"),
            "details": exc.detail if isinstance(exc.detail, dict) else None
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected exceptions"""
    print(f"❌ Unexpected error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal Server Error",
            "message": "Something went wrong on our end. Please try again."
        }
    )

# ==============================
# Health Check Routes
# ==============================
@app.get("/")
async def root():
    """Root endpoint - API status"""
    return {
        "message": f"Welcome to {APP_NAME}",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "API is running normally"
    }

# ==============================
# Authentication Routes
# ==============================

# 1. USER REGISTRATION (EMAIL)
@app.post("/auth/register", response_model=LoginResponse)
async def register_user(user_data: UserSignupEmail, response: Response):
    """
    Register new user with email
    Matches React: authAPI.register(userData)
    """
    try:
        result = await register_user_email(user_data,response)
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )

# 2. USER LOGIN (EMAIL) - FORM DATA
@app.post("/auth/login", response_model=LoginResponse)
async def login_user_form(
    username: str = Form(...),  # React sends 'username' but it's actually email
    password: str = Form(...)
):
    """
    User login with email using form data
    Matches React: formData.append('username', email)
    """
    try:
        # Create UserLoginEmail object from form data
        if is_valid_email_format(username):
            login_data = UserLoginEmail(email=username, password=password)
            result = await login_user_email(login_data)
        else:
            # Maybe it's a phone number
            if is_valid_phone_format(username):
                login_data = UserLoginPhone(phone=username, password=password)
                result = await login_user_phone(login_data)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "Invalid login format",
                        "message": "Please enter a valid email address or phone number",
                        "suggestion": "Check your email/phone format and try again"
                    }
                )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )

# 3. PHONE LOGIN (JSON)
@app.post("/auth/phone-login", response_model=LoginResponse)
async def phone_login(login_data: UserLoginPhone):
    """
    User login with phone number
    Matches React: authAPI.phoneLogin(phone, password)
    """
    try:
        result = await login_user_phone(login_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Phone login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Phone login failed. Please try again."
        )

# 4. GOOGLE OAUTH LOGIN
@app.post("/auth/google", response_model=GoogleLoginResponse)
async def google_login(google_data: GoogleLoginRequest):
    try:
        result = await google_oauth_login(google_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Google login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google login failed. Please try again."
        )

# 5. REFRESH TOKEN
@app.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(token_data: RefreshTokenRequest):
    """
    Refresh access token using refresh token
    """
    try:
        result = await refresh_access_token(token_data.refresh_token)
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed. Please try again."
        )

# 6. GET CURRENT USER
@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current user information
    Requires valid JWT token
    """
    from auth.models import user_document_to_response
    return user_document_to_response(current_user)

# 7. FORGOT PASSWORD (PLACEHOLDER)
@app.post("/auth/forgot-password", response_model=MessageResponse)
async def forgot_password(reset_data: PasswordResetRequest):
    """
    Password reset request
    Matches React: authAPI.forgotPassword(email)
    """
    try:
        # TODO: Implement email sending logic
        # For now, return success message
        return MessageResponse(
            message=f"If an account with {reset_data.email} exists, you will receive a password reset email shortly.",
            success=True
        )
    except Exception as e:
        print(f"Forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset request failed. Please try again."
        )

# 8. LOGOUT (CLIENT-SIDE HANDLED)
@app.post("/auth/logout", response_model=MessageResponse)
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout user (mainly for token cleanup)
    Client should also clear localStorage
    """
    # TODO: Add refresh token blacklisting logic if needed
    return MessageResponse(
        message="Logged out successfully",
        success=True
    )

# ==============================
# Additional Utility Routes
# ==============================
@app.get("/auth/validate-token")
async def validate_token(current_user: dict = Depends(get_current_user)):
    """
    Validate JWT token
    Returns user info if token is valid
    """
    return {
        "valid": True,
        "user_id": str(current_user["_id"]),
        "email": current_user.get("email"),
        "name": current_user["name"]
    }

# ==============================
# Development Routes (Optional)
# ==============================
@app.get("/auth/test")
async def test_auth():
    """Test endpoint for development"""
    return {
        "message": "Auth API is working!",
        "endpoints": [
            "POST /auth/register - User registration",
            "POST /auth/login - Email/Phone login (form data)",
            "POST /auth/phone-login - Phone login (JSON)",
            "POST /auth/google - Google OAuth login",
            "POST /auth/refresh - Refresh token",
            "GET /auth/me - Get current user",
            "POST /auth/forgot-password - Password reset",
            "POST /auth/logout - Logout user"
        ]
    }

# ==============================
# Run Application
# ==============================
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )