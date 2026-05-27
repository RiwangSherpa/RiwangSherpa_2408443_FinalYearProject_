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
    AI_PROVIDER: str = "lmstudio"
    AI_BASE_URL: str = "http://localhost:1234/v1"
    AI_MODEL: str = "google/gemma-4-e4b"
    AI_TIMEOUT_SECONDS: int = 120

    AI_TUTOR_MODEL: str = "google/gemma-4-e4b"
    AI_QUIZ_MODEL: str = "google/gemma-4-e4b"
    AI_ROADMAP_MODEL: str = "google/gemma-4-e4b"
    AI_VISION_MODEL: str = "google/gemma-4-e4b"

    LM_STUDIO_BASE_URL: str = "http://localhost:1234/v1"

    # Backward-compatible Ollama settings.
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

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = 15
    ALLOWED_FILE_TYPES: list[str] = [
        "pdf",
        "png",
        "jpg",
        "jpeg",
        "webp",
        "txt",
        "md",
        "docx",
    ]
    BRAINSTORM_CHUNK_TOKENS: int = 800
    BRAINSTORM_CHUNK_OVERLAP_TOKENS: int = 120
    BRAINSTORM_MAX_CONTEXT_CHARS: int = 20000
    BRAINSTORM_MAX_PDF_PAGES: int = 200
    BRAINSTORM_MODEL_CONTEXT_TOKENS: int = 16384
    
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"
    
    class Config:
        env_file = (".env", "../.env")
        case_sensitive = True

settings = Settings()
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DB_DIR = BACKEND_DIR / "database"
DB_DIR.mkdir(exist_ok=True)
if not os.getenv("DATABASE_URL"):
    settings.DATABASE_URL = f"sqlite:///{DB_DIR / 'study_buddy.db'}"

UPLOAD_ROOT = Path(settings.UPLOAD_DIR)
if not UPLOAD_ROOT.is_absolute():
    UPLOAD_ROOT = PROJECT_ROOT / UPLOAD_ROOT

BRAINSTORM_UPLOAD_DIR = UPLOAD_ROOT / "brainstorm"
BRAINSTORM_IMAGE_DIR = BRAINSTORM_UPLOAD_DIR / "images"
BRAINSTORM_DOCUMENT_DIR = BRAINSTORM_UPLOAD_DIR / "documents"

for upload_path in (UPLOAD_ROOT, BRAINSTORM_UPLOAD_DIR, BRAINSTORM_IMAGE_DIR, BRAINSTORM_DOCUMENT_DIR):
    upload_path.mkdir(parents=True, exist_ok=True)
