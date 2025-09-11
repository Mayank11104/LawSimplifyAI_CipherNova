"""
Utility module for security, database, and helper functions.

This module provides:
- Database connection and management
- Password hashing and verification
- JWT token creation and verification
- Input validation and sanitization
- Security utility functions
"""

from .security import (
    # Database
    database,
    users_collection,
    refresh_tokens_collection,
    init_database,
    
    # Password functions
    hash_password,
    verify_password,
    validate_password_strength,
    
    # JWT functions
    create_access_token,
    create_refresh_token,
    verify_token,
    extract_token_data,
    
    # Database utilities
    get_user_by_email,
    get_user_by_phone,
    get_user_by_id,
    get_user_by_google_id,
    
    # Security utilities
    sanitize_input,
    is_valid_email_format,
    is_valid_phone_format
)

__all__ = [
    # Database
    "database",
    "users_collection", 
    "refresh_tokens_collection",
    "init_database",
    
    # Password functions
    "hash_password",
    "verify_password",
    "validate_password_strength",
    
    # JWT functions
    "create_access_token",
    "create_refresh_token", 
    "verify_token",
    "extract_token_data",
    
    # Database utilities
    "get_user_by_email",
    "get_user_by_phone",
    "get_user_by_id", 
    "get_user_by_google_id",
    
    # Security utilities
    "sanitize_input",
    "is_valid_email_format",
    "is_valid_phone_format"
]