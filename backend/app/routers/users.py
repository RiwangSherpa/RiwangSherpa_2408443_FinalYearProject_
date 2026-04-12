"""
User settings API router
Handles user preferences including theme management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app import models, schemas
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


class ThemeUpdate(BaseModel):
    theme: str

class ThemeResponse(BaseModel):
    theme: str

class UserSettings(BaseModel):
    theme_preference: str
    full_name: Optional[str]
    subscription_plan: str


@router.get("/theme", response_model=ThemeResponse)
async def get_theme_preference(
    current_user: models.User = Depends(get_current_user)
):
    """Get user's theme preference"""
    return ThemeResponse(theme=current_user.theme_preference or "light")

@router.put("/theme", response_model=ThemeResponse)
async def update_theme_preference(
    theme_data: ThemeUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's theme preference"""
    if theme_data.theme not in ["light", "dark"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Theme must be either 'light' or 'dark'"
        )
    
    current_user.theme_preference = theme_data.theme
    db.commit()
    db.refresh(current_user)
    
    logger.info(f"User {current_user.email} updated theme to {theme_data.theme}")
    
    return ThemeResponse(theme=current_user.theme_preference)

@router.get("/settings", response_model=UserSettings)
async def get_user_settings(
    current_user: models.User = Depends(get_current_user)
):
    """Get all user settings"""
    return UserSettings(
        theme_preference=current_user.theme_preference or "light",
        full_name=current_user.full_name,
        subscription_plan=current_user.subscription_plan.value
    )
