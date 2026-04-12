"""
Google OAuth Authentication Router
Compatible with FastAPI >= 0.110 and Pydantic v2
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel
import httpx
import os

from app.database import get_db

logger = logging.getLogger(__name__)
from app import models
from app.services.auth_service import create_access_token, get_user_by_email
from app.config import settings

router = APIRouter()

GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI = settings.GOOGLE_REDIRECT_URI
FRONTEND_URL = settings.FRONTEND_URL

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


class CheckGoogleAccountRequest(BaseModel):
    email: str


class CheckGoogleAccountResponse(BaseModel):
    is_google_account: bool
    provider: str


@router.get("/google")
async def google_login():
    """Redirect user to Google OAuth consent screen"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    
    auth_url = f"{GOOGLE_AUTH_URL}?" + "&".join([f"{k}={v}" for k, v in params.items()])
    print(f"DEBUG: Redirecting to Google with redirect_uri: {GOOGLE_REDIRECT_URI}")
    print(f"DEBUG: Full auth URL: {auth_url}")
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(
    code: str,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback"""
    print(f"DEBUG: Received callback with code: {code}")
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    print(f"DEBUG: Google config loaded - Client ID: {GOOGLE_CLIENT_ID[:20]}...")
    
    async with httpx.AsyncClient() as client:
        print(f"DEBUG: Exchanging code for token...")
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        
        print(f"DEBUG: Token response status: {token_response.status_code}")
        
        if token_response.status_code != 200:
            print(f"DEBUG: Token response body: {token_response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token from Google"
            )
        
        tokens = token_response.json()
        access_token = tokens.get("access_token")
        
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )
        
        google_user = userinfo_response.json()
    
    google_id = google_user.get("id")
    email = google_user.get("email")
    full_name = google_user.get("name")
    avatar_url = google_user.get("picture")
    
    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user data from Google"
        )
    
    try:
        user = db.query(models.User).filter(models.User.google_id == google_id).first()

        if not user:
            existing_user = get_user_by_email(db, email)

            if existing_user:
                existing_user.google_id = google_id
                existing_user.provider = "google"
                if avatar_url and not existing_user.avatar_url:
                    existing_user.avatar_url = avatar_url
                db.commit()
                user = existing_user
            else:
                user = models.User(
                    email=email,
                    full_name=full_name,
                    google_id=google_id,
                    provider="google",
                    avatar_url=avatar_url,
                    is_active=True,
                    is_verified=True,
                    subscription_plan=models.SubscriptionPlan.FREE,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                
                user_stats = models.UserStats(
                    user_id=user.id,
                    total_xp=0,
                    current_level=1,
                    total_study_sessions=0,
                    total_study_hours=0.0,
                    total_quizzes_taken=0,
                    total_questions_answered=0,
                    perfect_quiz_count=0,
                    longest_streak=0,
                    goals_completed=0,
                    roadmap_steps_completed=0
                )
                db.add(user_stats)
                db.commit()
    except SQLAlchemyError as e:
        logger.exception("Database error during Google login: %s", str(e))
        raise

    access_token = create_access_token(data={"sub": user.email})
    
    redirect_url = f"{FRONTEND_URL}/auth/callback?token={access_token}"
    print(f"DEBUG: Redirecting to frontend: {redirect_url}")
    return RedirectResponse(url=redirect_url)


@router.post("/check-google-account", response_model=CheckGoogleAccountResponse)
async def check_google_account(
    request: CheckGoogleAccountRequest,
    db: Session = Depends(get_db)
):
    """Check if an account uses Google Sign-In"""
    user = get_user_by_email(db, request.email)
    
    if not user:
        return CheckGoogleAccountResponse(
            is_google_account=False,
            provider="local"
        )
    
    return CheckGoogleAccountResponse(
        is_google_account=user.provider == "google" or user.google_id is not None,
        provider=user.provider or "local"
    )
