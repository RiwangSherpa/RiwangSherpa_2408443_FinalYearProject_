"""
Subscription and payment API router (DEMO ONLY)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from app.database import get_db
from app import models, schemas
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

def simulate_payment(payment_method: str, plan: str) -> tuple[bool, str]:
    """
    Simulate payment processing (DEMO ONLY)
    Returns: (success: bool, message: str)
    """
    # Demo payment logic
    if payment_method == "demo_fail":
        return False, "Payment failed: Insufficient funds (demo)"
    
    if payment_method == "demo":
        # Simulate successful payment
        logger.info(f"Demo payment successful for plan: {plan}")
        return True, "Payment processed successfully (demo)"
    
    return False, "Invalid payment method"

@router.get("/status", response_model=schemas.SubscriptionStatus)
async def get_subscription_status(
    current_user: models.User = Depends(get_current_user)
):
    """Get current user's subscription status"""
    is_active = (
        current_user.subscription_plan == models.SubscriptionPlan.PRO and
        (current_user.subscription_expires_at is None or 
         current_user.subscription_expires_at > datetime.utcnow())
    )
    
    return schemas.SubscriptionStatus(
        plan=current_user.subscription_plan.value,
        is_active=is_active,
        expires_at=current_user.subscription_expires_at
    )

@router.post("/upgrade", response_model=schemas.PaymentResponse)
async def upgrade_subscription(
    payment_data: schemas.PaymentRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade subscription (DEMO PAYMENT)"""
    if payment_data.plan == "free":
        # Downgrade to free
        try:
            current_user.subscription_plan = models.SubscriptionPlan.FREE
            current_user.subscription_expires_at = None
            db.commit()
            
            return schemas.PaymentResponse(
                success=True,
                message="Subscription downgraded to Free plan",
                subscription_status=schemas.SubscriptionStatus(
                    plan="free",
                    is_active=True,
                    expires_at=None
                )
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to downgrade subscription: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update subscription"
            )
    
    if payment_data.plan == "pro":
        # Simulate payment
        success, message = simulate_payment(payment_data.payment_method, "pro")
        
        if not success:
            return schemas.PaymentResponse(
                success=False,
                message=message,
                subscription_status=schemas.SubscriptionStatus(
                    plan=current_user.subscription_plan.value,
                    is_active=False,
                    expires_at=current_user.subscription_expires_at
                )
            )
        
        # Upgrade to Pro
        try:
            current_user.subscription_plan = models.SubscriptionPlan.PRO
            # Set expiration to 30 days from now (demo)
            current_user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
            db.commit()
            
            logger.info(f"User {current_user.email} upgraded to Pro plan")
            
            return schemas.PaymentResponse(
                success=True,
                message="Subscription upgraded to Pro plan (demo payment)",
                subscription_status=schemas.SubscriptionStatus(
                    plan="pro",
                    is_active=True,
                    expires_at=current_user.subscription_expires_at
                )
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to upgrade subscription: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update subscription"
            )
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid subscription plan"
    )

@router.get("/features")
async def get_plan_features():
    """Get features available for each plan"""
    return {
        "free": {
            "goals": 5,
            "roadmaps": "Basic",
            "quizzes": 3,
            "ai_explanations": False,
            "advanced_analytics": False,
            "export": False
        },
        "pro": {
            "goals": "Unlimited",
            "roadmaps": "Advanced with AI explanations",
            "quizzes": "Unlimited",
            "ai_explanations": True,
            "advanced_analytics": True,
            "export": True,
            "priority_support": True
        }
    }

