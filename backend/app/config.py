"""
Configuration settings using Pydantic Settings
"""

from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional

class Settings(BaseSettings):
    """Application settings"""
    # Ollama Configuration (PRIMARY AI)
    OLLAMA_MODEL: str = "dolphin3:8b"  # Primary AI model
    OLLAMA_BASE_URL: str = "http://localhost:11434"  # Ollama API URL
    
    # Database
    DATABASE_URL: str = "sqlite:///./database/study_buddy.db"
    LOG_LEVEL: str = "INFO"
    
    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production"  # Change in production!
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"

    # Password Reset
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 24
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
BACKEND_DIR = Path(__file__).resolve().parent.parent  # Points to backend/
DB_DIR = BACKEND_DIR / "database"
DB_DIR.mkdir(exist_ok=True)  # Create folder if missing
settings.DATABASE_URL = f"sqlite:///{DB_DIR / 'study_buddy.db'}"
