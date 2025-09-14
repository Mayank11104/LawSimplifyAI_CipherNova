# config.py
# This file defines the Pydantic model for application settings.

from fastapi.openapi.models import APIKey
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8"
    )

    
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM : str

    API_Key: Optional[str] = " "

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET : str
    REDIRECT_URI : str

    DEBUG: bool = False
    APP_NAME: str = "Default App Name"
    MAX_CONNECTIONS: int = 25


settings = Settings()

