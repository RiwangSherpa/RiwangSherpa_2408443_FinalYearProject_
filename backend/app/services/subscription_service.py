"""
Subscription status helpers shared by routers and feature gates.
"""

from datetime import datetime
from typing import Optional

from app import models


FREE_FEATURES = {
    "goals": 5,
    "roadmaps": "Basic",
    "quizzes": 3,
    "ai_explanations": False,
    "advanced_analytics": False,
    "export": False,
}


def coerce_plan_value(plan: object) -> str:
    if isinstance(plan, models.SubscriptionPlan):
        return plan.value

    raw_plan = str(plan or "").strip().lower()
    if raw_plan in {"pro", "subscriptionplan.pro"}:
        return models.SubscriptionPlan.PRO.value
    return models.SubscriptionPlan.FREE.value


def has_active_pro_subscription(
    user: models.User,
    now: Optional[datetime] = None,
) -> bool:
    expires_at = user.subscription_expires_at
    if coerce_plan_value(user.subscription_plan) != models.SubscriptionPlan.PRO.value:
        return False
    if expires_at is None:
        return False
    return expires_at > (now or datetime.utcnow())


def normalize_inactive_subscription(user: models.User) -> bool:
    """Set expired, missing-expiry, or invalid plans to Free. Returns True if changed."""
    if has_active_pro_subscription(user):
        return False

    changed = False
    if coerce_plan_value(user.subscription_plan) != models.SubscriptionPlan.FREE.value:
        user.subscription_plan = models.SubscriptionPlan.FREE
        changed = True

    if user.subscription_expires_at is not None:
        user.subscription_expires_at = None
        changed = True

    return changed


def effective_subscription(user: models.User) -> dict:
    is_pro = has_active_pro_subscription(user)
    expires_at = user.subscription_expires_at if is_pro else None

    return {
        "plan": models.SubscriptionPlan.PRO.value if is_pro else models.SubscriptionPlan.FREE.value,
        "is_pro": is_pro,
        "is_active": is_pro,
        "subscription_expires_at": expires_at,
        "expires_at": expires_at,
    }
