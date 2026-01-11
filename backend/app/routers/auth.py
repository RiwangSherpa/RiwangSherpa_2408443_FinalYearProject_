"""
Authentication API router
Compatible with FastAPI >= 0.110 and Pydantic v2
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app import models, schemas
from app.services.auth_service import (
    authenticate_user,
    create_user,
    create_access_token,
    get_user_by_email,
    create_password_reset_token_for_user,
    verify_password_reset_token,
    use_password_reset_token,
    get_password_hash,
    verify_token,
)

logger = logging.getLogger(__name__)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# -------------------------------------------------
# Dependencies
# -------------------------------------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Return the currently authenticated user"""

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    email: str | None = payload.get("sub")
    if email is None:
        raise credentials_exception

    user = get_user_by_email(db, email)
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user

# -------------------------------------------------
# Routes
# -------------------------------------------------

@router.post(
    "/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    user_data: schemas.UserRegister,
    db: Session = Depends(get_db),
):
    """Register a new user"""

    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    try:
        user = create_user(
            db=db,
            email=user_data.email,
            password=user_data.password.get_secret_value(),
            full_name=user_data.full_name,
        )
        logger.info("New user registered: %s", user.email)
        return user

    except Exception as exc:
        logger.exception("Registration failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        ) from exc


@router.post("/login", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Login using OAuth2 password flow.
    `username` field is treated as email.
    """

    user = authenticate_user(
        db=db,
        email=form_data.username,
        password=form_data.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=schemas.UserResponse)
async def get_me(
    current_user: models.User = Depends(get_current_user),
):
    """Return current authenticated user"""
    return current_user


@router.post(
    "/forgot-password",
    response_model=schemas.PasswordResetResponse,
)
async def forgot_password(
    request: schemas.PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """Request password reset"""

    user = get_user_by_email(db, request.email)

    # Always return success (avoid email enumeration)
    if not user:
        logger.info(
            "Password reset requested for non-existent email: %s",
            request.email,
        )
        return {
            "message": "If the email exists, a password reset link has been sent."
        }

    reset_token = create_password_reset_token_for_user(db, user)

    # Demo-only logging (replace with email service in prod)
    logger.info("Password reset token generated for %s", user.email)
    logger.debug("Reset token: %s", reset_token.token)

    print("\n=== PASSWORD RESET TOKEN ===")
    print(f"Email: {user.email}")
    print(f"Token: {reset_token.token}")
    print(f"Reset URL: http://localhost:5173/reset-password?token={reset_token.token}")
    print(f"Expires: {reset_token.expires_at}")
    print("===========================\n")

    return {
        "message": "If the email exists, a password reset link has been sent."
    }


@router.post(
    "/reset-password",
    response_model=schemas.PasswordResetResponse,
)
async def reset_password(
    reset_data: schemas.PasswordReset,
    db: Session = Depends(get_db),
):
    """Reset password using a valid token"""

    user = verify_password_reset_token(db, reset_data.token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user.hashed_password = get_password_hash(
        reset_data.new_password.get_secret_value()
    )
    db.commit()

    use_password_reset_token(db, reset_data.token)

    logger.info("Password reset successful for %s", user.email)

    return {"message": "Password reset successful"}
