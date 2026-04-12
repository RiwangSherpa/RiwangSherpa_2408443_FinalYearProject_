"""
Authentication and subscription dependencies
"""

from datetime import datetime, date
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserDailyUsage, SubscriptionPlan
from app.services.auth_service import verify_token

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


def require_pro_subscription(user: User = Depends(get_current_user)) -> User:
    """Dependency that requires Pro subscription"""
    if user.subscription_plan != SubscriptionPlan.PRO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro subscription required. Upgrade to access this feature."
        )
    return user


def check_daily_limit(feature: str, limit: int):
    """Factory function to create daily limit checkers"""
    async def checker(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        if user.subscription_plan == SubscriptionPlan.PRO:
            return user
        
        today = date.today()
        usage = db.query(UserDailyUsage).filter(
            UserDailyUsage.user_id == user.id,
            UserDailyUsage.feature == feature,
            UserDailyUsage.date == today
        ).first()
        
        current_count = usage.count if usage else 0
        
        if current_count >= limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Daily {feature} limit reached ({limit}/{limit}). Upgrade to Pro for unlimited access."
            )
        
        return user
    return checker


async def track_usage(user_id: int, feature: str, db: Session):
    """Track feature usage for daily limits"""
    today = date.today()
    usage = db.query(UserDailyUsage).filter(
        UserDailyUsage.user_id == user_id,
        UserDailyUsage.feature == feature,
        UserDailyUsage.date == today
    ).first()
    
    if usage:
        usage.count += 1
    else:
        usage = UserDailyUsage(
            user_id=user_id,
            feature=feature,
            date=today,
            count=1
        )
        db.add(usage)
    
    db.commit()


def check_active_goals_limit(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    """Check if free user has reached active goals limit"""
    if user.subscription_plan == SubscriptionPlan.PRO:
        return user
    
    from app.models import Goal
    active_goals_count = db.query(Goal).filter(
        Goal.user_id == user.id,
        Goal.is_completed == False
    ).count()
    
    if active_goals_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Free users can have maximum 3 active goals. Complete a goal or upgrade to Pro."
        )
    
    return user
