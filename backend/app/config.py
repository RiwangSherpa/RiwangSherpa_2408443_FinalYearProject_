"""
Configuration settings using Pydantic Settings
"""

import os
import secrets
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path
from typing import Optional


def get_secret_key() -> str:
    """Get or generate a secure JWT secret key"""
    key = os.getenv("SECRET_KEY")
    if key:
        return key
    new_key = secrets.token_hex(32)
    print(f"WARNING: Generated temporary SECRET_KEY. Set SECRET_KEY={new_key} in .env for persistence")
    return new_key


class Settings(BaseSettings):
    """Application settings"""
    OLLAMA_MODEL: str = "dolphin3:8b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    
    DATABASE_URL: str = "sqlite:///./database/study_buddy.db"
    LOG_LEVEL: str = "INFO"
    
    SECRET_KEY: str = Field(default_factory=get_secret_key)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"

    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 24
    
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60
    RATE_LIMIT_AI_REQUESTS_PER_HOUR: int = 100
    RATE_LIMIT_AI_REQUESTS_PER_HOUR_FREE: int = 10
    
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
BACKEND_DIR = Path(__file__).resolve().parent.parent
DB_DIR = BACKEND_DIR / "database"
DB_DIR.mkdir(exist_ok=True)
settings.DATABASE_URL = f"sqlite:///{DB_DIR / 'study_buddy.db'}"
