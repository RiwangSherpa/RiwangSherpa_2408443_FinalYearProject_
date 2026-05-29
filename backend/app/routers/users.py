"""
User settings API router
Handles user preferences including theme management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging
from typing import Optional
from pydantic import BaseModel, Field, SecretStr

from app.database import get_db
from app import models, schemas
from app.routers.auth import get_current_user
from app.services.auth_service import get_password_hash, verify_password
from app.services.email_service import send_notifications_enabled_email_async
from app.services.subscription_service import effective_subscription

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
    email_notifications: bool


class UserSettingsUpdate(BaseModel):
    theme_preference: Optional[str] = None
    email_notifications: Optional[bool] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=255)


class ChangePasswordRequest(BaseModel):
    current_password: SecretStr
    new_password: SecretStr


class MessageResponse(BaseModel):
    message: str


def _setting(user: models.User, field: str, default):
    value = getattr(user, field, None)
    return default if value is None else value


def _settings_response(user: models.User) -> UserSettings:
    subscription = effective_subscription(user)
    return UserSettings(
        theme_preference=_setting(user, "theme_preference", "light"),
        full_name=user.full_name,
        subscription_plan=subscription["plan"],
        email_notifications=_setting(user, "email_notifications", False),
    )


def _validate_choice(value: Optional[str], allowed: set[str], field_name: str):
    if value is not None and value not in allowed:
        allowed_values = ", ".join(sorted(allowed))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be one of: {allowed_values}",
        )


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
    return _settings_response(current_user)


@router.put("/settings", response_model=UserSettings)
async def update_user_settings(
    settings_data: UserSettingsUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update app preference settings for the current user."""
    _validate_choice(settings_data.theme_preference, {"light", "dark"}, "theme_preference")

    update_data = settings_data.model_dump(exclude_unset=True)
    previous_email_notifications = bool(current_user.email_notifications)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    if (
        "email_notifications" in update_data
        and bool(current_user.email_notifications)
        and not previous_email_notifications
    ):
        send_notifications_enabled_email_async(current_user.email)

    return _settings_response(current_user)


@router.put("/profile", response_model=schemas.UserResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update safe profile fields for the current user."""
    full_name = profile_data.full_name.strip() if profile_data.full_name else None
    current_user.full_name = full_name
    db.commit()
    db.refresh(current_user)

    subscription = effective_subscription(current_user)
    return schemas.UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        subscription_plan=subscription["plan"],
        subscription_expires_at=subscription["subscription_expires_at"],
        is_pro=subscription["is_pro"],
        provider=current_user.provider,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
    )


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password for local password-based accounts."""
    if current_user.provider == "google" or not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password changes are only available for email/password accounts.",
        )

    current_password = password_data.current_password.get_secret_value()
    new_password = password_data.new_password.get_secret_value()

    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters.",
        )

    current_user.hashed_password = get_password_hash(new_password)
    db.commit()

    return MessageResponse(message="Password changed successfully.")
