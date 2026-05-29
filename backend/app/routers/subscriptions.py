"""
Subscription and payment API router.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import logging
import uuid
import hmac

import httpx

from app.database import get_db
from app import models, schemas
from app.config import settings
from app.routers.auth import get_current_user
from app.services.subscription_service import (
    FREE_FEATURES,
    effective_subscription,
    normalize_inactive_subscription,
)
from app.services.esewa_service import (
    ESEWA_SIGNED_FIELD_NAMES,
    build_esewa_signature_message,
    decode_esewa_callback_data,
    format_esewa_amount,
    generate_esewa_signature,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _plan_features() -> dict:
    return {
        "free": FREE_FEATURES,
        "pro": {
            "goals": "Unlimited",
            "roadmaps": "Advanced with AI explanations",
            "quizzes": "Unlimited",
            "ai_explanations": True,
            "advanced_analytics": True,
            "export": True,
            "priority_support": True,
            "price_npr": settings.SUBSCRIPTION_PRICE_NPR,
            "payment_provider": "esewa",
        },
    }


def _subscription_status(user: models.User) -> schemas.SubscriptionStatus:
    status_data = effective_subscription(user)
    status_data["features"] = _plan_features()[status_data["plan"]]
    return schemas.SubscriptionStatus(**status_data)


def _khalti_config_error() -> HTTPException | None:
    missing = []
    if not settings.KHALTI_SECRET_KEY:
        missing.append("KHALTI_SECRET_KEY")
    if not settings.KHALTI_BASE_URL:
        missing.append("KHALTI_BASE_URL")
    if not settings.FRONTEND_URL:
        missing.append("FRONTEND_URL")

    if not missing:
        return None

    logger.error(
        "Khalti payment gateway is not configured. Missing keys: %s. secret_configured=%s base_url_configured=%s",
        ", ".join(missing),
        bool(settings.KHALTI_SECRET_KEY),
        bool(settings.KHALTI_BASE_URL),
    )
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"Khalti payment gateway is not configured. Missing: {', '.join(missing)}.",
    )


def _subscription_amount_paisa() -> int:
    amount_npr = Decimal(str(settings.SUBSCRIPTION_PRICE_NPR))
    return int((amount_npr * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _subscription_amount_npr() -> Decimal:
    return Decimal(str(settings.SUBSCRIPTION_PRICE_NPR)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _khalti_url(path: str) -> str:
    return f"{settings.KHALTI_BASE_URL.rstrip('/')}/{path.lstrip('/')}"


def _normalize_khalti_status(khalti_status: str | None) -> str:
    status_value = (khalti_status or "").strip().lower()
    if status_value == "completed":
        return "completed"
    if status_value in {"pending"}:
        return "pending"
    if status_value in {"initiated"}:
        return "initiated"
    if status_value in {"user canceled", "cancelled", "canceled"}:
        return "cancelled"
    if status_value in {"refunded", "partially refunded"}:
        return "refunded"
    return "failed"


def _khalti_headers() -> dict[str, str]:
    config_error = _khalti_config_error()
    if config_error:
        raise config_error

    return {
        "Authorization": f"Key {settings.KHALTI_SECRET_KEY}",
        "Content-Type": "application/json",
    }


async def _lookup_khalti_payment(pidx: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            _khalti_url("/epayment/lookup/"),
            headers=_khalti_headers(),
            json={"pidx": pidx},
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid response from Khalti lookup API",
        ) from exc

    if response.status_code in {401, 403}:
        logger.error("Khalti lookup authorization failed: %s", payload)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Khalti lookup authorization failed",
        )

    if response.status_code >= 400 and not payload.get("status"):
        logger.error("Khalti lookup failed: %s", payload)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=payload.get("detail") or "Khalti lookup failed",
        )

    if response.status_code >= 500:
        logger.error("Khalti lookup server error: %s", payload)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Khalti lookup service is temporarily unavailable",
        )

    return payload


def _esewa_config_error() -> HTTPException | None:
    missing = []
    if not settings.ESEWA_MERCHANT_CODE:
        missing.append("ESEWA_MERCHANT_CODE")
    if not settings.ESEWA_SECRET_KEY:
        missing.append("ESEWA_SECRET_KEY")
    if not settings.ESEWA_PAYMENT_URL:
        missing.append("ESEWA_PAYMENT_URL")
    if not settings.ESEWA_STATUS_CHECK_URL:
        missing.append("ESEWA_STATUS_CHECK_URL")
    if not settings.FRONTEND_URL:
        missing.append("FRONTEND_URL")

    if not missing:
        return None

    logger.error("eSewa payment gateway is not configured. Missing keys: %s", ", ".join(missing))
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"eSewa payment gateway is not configured. Missing: {', '.join(missing)}.",
    )


def _normalize_esewa_status(esewa_status: str | None) -> str:
    status_value = (esewa_status or "").strip().lower()
    if status_value in {"complete", "completed", "success", "successful"}:
        return "completed"
    if status_value in {"pending", "ambigious", "ambiguous"}:
        return "pending"
    if status_value in {"canceled", "cancelled"}:
        return "cancelled"
    if status_value in {"not_found", "failed", "failure", "full_refund", "partial_refund"}:
        return "failed"
    return "failed"


def _extract_esewa_transaction_uuid(verify_data: schemas.EsewaVerifyRequest) -> tuple[str | None, dict]:
    callback_payload = dict(verify_data.callback_data or {})

    encoded_data = verify_data.data or callback_payload.get("data")
    if encoded_data:
        try:
            decoded_payload = decode_esewa_callback_data(str(encoded_data))
        except (ValueError, TypeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid eSewa callback data",
            ) from exc
        callback_payload = {**callback_payload, **decoded_payload}

    transaction_uuid = (
        verify_data.transaction_uuid
        or callback_payload.get("transaction_uuid")
        or callback_payload.get("pid")
    )
    return transaction_uuid, callback_payload


def _verify_esewa_callback_signature(callback_payload: dict) -> None:
    callback_signature = callback_payload.get("signature")
    signed_field_names = callback_payload.get("signed_field_names")
    if not callback_signature or not signed_field_names:
        return

    try:
        message = build_esewa_signature_message(callback_payload, str(signed_field_names))
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="eSewa callback signature fields are incomplete",
        ) from exc

    expected_signature = generate_esewa_signature(message, settings.ESEWA_SECRET_KEY)
    if not hmac.compare_digest(str(callback_signature), expected_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid eSewa callback signature",
        )


async def _check_esewa_status(payment: models.SubscriptionPayment) -> dict:
    params = {
        "product_code": payment.product_code,
        "total_amount": format_esewa_amount(Decimal(str(payment.total_amount or 0))),
        "transaction_uuid": payment.transaction_uuid,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(settings.ESEWA_STATUS_CHECK_URL, params=params)
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("eSewa status response must be an object")
    except httpx.HTTPError as exc:
        logger.exception("Failed to reach eSewa status check API")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not connect to eSewa payment gateway",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid response from eSewa status check API",
        ) from exc

    if response.status_code >= 500:
        logger.error("eSewa status check server error: %s", payload)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="eSewa status check service is temporarily unavailable",
        )
    if response.status_code >= 400 and not payload.get("status"):
        logger.error("eSewa status check failed: %s", payload)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=payload.get("error_message") or "eSewa status check failed",
        )

    return payload

@router.get("/status", response_model=schemas.SubscriptionStatus)
async def get_subscription_status(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's subscription status"""
    if normalize_inactive_subscription(current_user):
        db.commit()
        db.refresh(current_user)

    return _subscription_status(current_user)


@router.post("/esewa/initiate", response_model=schemas.EsewaInitiateResponse)
async def initiate_esewa_payment(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create signed eSewa ePay v2 form data for the Pro plan."""
    config_error = _esewa_config_error()
    if config_error:
        raise config_error

    amount = _subscription_amount_npr()
    tax_amount = Decimal("0")
    product_service_charge = Decimal("0")
    product_delivery_charge = Decimal("0")
    total_amount = amount + tax_amount + product_service_charge + product_delivery_charge
    transaction_uuid = f"studybuddy-pro-{current_user.id}-{uuid.uuid4().hex[:12]}"
    product_code = settings.ESEWA_MERCHANT_CODE
    success_url = f"{settings.FRONTEND_URL.rstrip('/')}/subscription/esewa/success"
    failure_url = f"{settings.FRONTEND_URL.rstrip('/')}/subscription/esewa/failure"

    form_fields = {
        "amount": format_esewa_amount(amount),
        "tax_amount": format_esewa_amount(tax_amount),
        "total_amount": format_esewa_amount(total_amount),
        "transaction_uuid": transaction_uuid,
        "product_code": product_code,
        "product_service_charge": format_esewa_amount(product_service_charge),
        "product_delivery_charge": format_esewa_amount(product_delivery_charge),
        "success_url": success_url,
        "failure_url": failure_url,
        "signed_field_names": ESEWA_SIGNED_FIELD_NAMES,
    }
    signature_message = build_esewa_signature_message(form_fields, ESEWA_SIGNED_FIELD_NAMES)
    signature = generate_esewa_signature(signature_message, settings.ESEWA_SECRET_KEY)

    payment = models.SubscriptionPayment(
        user_id=current_user.id,
        provider="esewa",
        transaction_uuid=transaction_uuid,
        product_code=product_code,
        amount=float(amount),
        tax_amount=float(tax_amount),
        total_amount=float(total_amount),
        amount_paisa=_subscription_amount_paisa(),
        plan=models.SubscriptionPlan.PRO.value,
        status="initiated",
        raw_response={
            "initiate_request": {
                **form_fields,
                "signature_message": signature_message,
            },
        },
    )
    db.add(payment)
    db.commit()

    return schemas.EsewaInitiateResponse(
        payment_url=settings.ESEWA_PAYMENT_URL,
        signature=signature,
        **form_fields,
    )


@router.post("/esewa/verify", response_model=schemas.EsewaVerifyResponse)
async def verify_esewa_payment(
    verify_data: schemas.EsewaVerifyRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify eSewa status with eSewa before activating Pro."""
    config_error = _esewa_config_error()
    if config_error:
        raise config_error

    transaction_uuid, callback_payload = _extract_esewa_transaction_uuid(verify_data)
    if not transaction_uuid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing eSewa transaction UUID",
        )

    _verify_esewa_callback_signature(callback_payload)

    payment = db.query(models.SubscriptionPayment).filter(
        models.SubscriptionPayment.transaction_uuid == transaction_uuid,
        models.SubscriptionPayment.user_id == current_user.id,
        models.SubscriptionPayment.provider == "esewa",
    ).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment record not found",
        )

    if payment.status == "completed":
        subscription_status = _subscription_status(current_user)
        return schemas.EsewaVerifyResponse(
            success=True,
            message=(
                "Payment already verified. Pro plan is active."
                if subscription_status.is_pro
                else "Payment already verified."
            ),
            payment_status=payment.status,
            subscription_status=subscription_status,
            reference_id=payment.reference_id,
        )

    status_payload = await _check_esewa_status(payment)
    normalized_status = _normalize_esewa_status(status_payload.get("status"))
    reference_id = (
        status_payload.get("refId")
        or status_payload.get("ref_id")
        or callback_payload.get("transaction_code")
    )

    payment.status = normalized_status
    payment.reference_id = reference_id
    payment.raw_response = {
        **(payment.raw_response or {}),
        "callback_payload": callback_payload,
        "status_check_response": status_payload,
    }

    response_product_code = status_payload.get("product_code") or status_payload.get("scd")
    if response_product_code and response_product_code != payment.product_code:
        payment.status = "failed"
        db.commit()
        logger.warning(
            "eSewa product code mismatch for %s: expected %s, got %s",
            transaction_uuid,
            payment.product_code,
            response_product_code,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verified payment product code does not match the original payment",
        )

    response_transaction_uuid = status_payload.get("transaction_uuid")
    if response_transaction_uuid and response_transaction_uuid != payment.transaction_uuid:
        payment.status = "failed"
        db.commit()
        logger.warning(
            "eSewa transaction UUID mismatch for %s: got %s",
            payment.transaction_uuid,
            response_transaction_uuid,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verified payment reference does not match the original payment",
        )

    response_total = status_payload.get("total_amount") or status_payload.get("totalAmount")
    if response_total is not None:
        expected_total = Decimal(str(payment.total_amount or 0)).quantize(Decimal("0.01"))
        actual_total = Decimal(str(response_total)).quantize(Decimal("0.01"))
        if actual_total != expected_total:
            payment.status = "failed"
            db.commit()
            logger.warning(
                "eSewa amount mismatch for %s: expected %s, got %s",
                transaction_uuid,
                expected_total,
                actual_total,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verified payment amount does not match the subscription price",
            )

    if normalized_status != "completed":
        db.commit()
        return schemas.EsewaVerifyResponse(
            success=False,
            message="Payment was not completed. Please try again.",
            payment_status=payment.status,
            subscription_status=_subscription_status(current_user),
            reference_id=payment.reference_id,
        )

    current_user.subscription_plan = models.SubscriptionPlan.PRO
    current_user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
    db.commit()
    db.refresh(current_user)

    logger.info("User %s upgraded to Pro via eSewa transaction_uuid=%s", current_user.email, transaction_uuid)

    return schemas.EsewaVerifyResponse(
        success=True,
        message="Payment successful. Pro plan activated.",
        payment_status=payment.status,
        subscription_status=_subscription_status(current_user),
        reference_id=payment.reference_id,
    )


@router.post("/khalti/initiate", response_model=schemas.KhaltiInitiateResponse)
async def initiate_khalti_payment(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Khalti Web Checkout payment request for the Pro plan."""
    config_error = _khalti_config_error()
    if config_error:
        raise config_error

    amount_paisa = _subscription_amount_paisa()
    if amount_paisa < 1000:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Subscription price must be at least NPR 10 for Khalti checkout",
        )

    purchase_order_id = f"studybuddy-pro-{current_user.id}-{uuid.uuid4().hex[:12]}"
    payload = {
        "return_url": f"{settings.FRONTEND_URL.rstrip('/')}/subscription/callback",
        "website_url": settings.FRONTEND_URL.rstrip("/"),
        "amount": amount_paisa,
        "purchase_order_id": purchase_order_id,
        "purchase_order_name": "StudyBuddy Pro Monthly Subscription",
        "customer_info": {
            "name": current_user.full_name or current_user.email,
            "email": current_user.email,
        },
        "amount_breakdown": [
            {
                "label": "StudyBuddy Pro Monthly Subscription",
                "amount": amount_paisa,
            }
        ],
        "product_details": [
            {
                "identity": "studybuddy-pro-monthly",
                "name": "StudyBuddy Pro Monthly Subscription",
                "total_price": amount_paisa,
                "quantity": 1,
                "unit_price": amount_paisa,
            }
        ],
        "merchant_extra": f"user_id:{current_user.id}",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                _khalti_url("/epayment/initiate/"),
                headers=_khalti_headers(),
                json=payload,
            )
        response_payload = response.json()
    except HTTPException:
        raise
    except httpx.HTTPError as exc:
        logger.exception("Failed to reach Khalti initiate API")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not connect to Khalti payment gateway",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid response from Khalti initiate API",
        ) from exc

    if response.status_code >= 400:
        logger.error(
            "Khalti initiate failed with status %s: %s",
            response.status_code,
            response_payload,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=response_payload.get("detail") or "Khalti payment initialization failed",
        )

    pidx = response_payload.get("pidx")
    payment_url = response_payload.get("payment_url")
    if not pidx or not payment_url:
        logger.error("Khalti initiate response missing pidx/payment_url: %s", response_payload)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Khalti did not return a payment URL",
        )

    payment = models.SubscriptionPayment(
        user_id=current_user.id,
        pidx=pidx,
        amount_paisa=amount_paisa,
        plan=models.SubscriptionPlan.PRO.value,
        status="initiated",
        provider="khalti",
        raw_response={
            "initiate_request": {
                **payload,
                "customer_info": {
                    "name": payload["customer_info"]["name"],
                    "email": payload["customer_info"]["email"],
                },
            },
            "initiate_response": response_payload,
        },
    )
    db.add(payment)
    db.commit()

    return schemas.KhaltiInitiateResponse(
        pidx=pidx,
        payment_url=payment_url,
        expires_at=response_payload.get("expires_at"),
        expires_in=response_payload.get("expires_in"),
        amount_paisa=amount_paisa,
    )


@router.post("/khalti/verify", response_model=schemas.KhaltiVerifyResponse)
async def verify_khalti_payment(
    verify_data: schemas.KhaltiVerifyRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify a Khalti payment via lookup before activating Pro."""
    payment = db.query(models.SubscriptionPayment).filter(
        models.SubscriptionPayment.pidx == verify_data.pidx,
        models.SubscriptionPayment.user_id == current_user.id,
        models.SubscriptionPayment.provider == "khalti",
    ).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment record not found",
        )

    if payment.status == "completed":
        return schemas.KhaltiVerifyResponse(
            success=True,
            message="Payment already verified. Pro plan is active.",
            payment_status=payment.status,
            subscription_status=_subscription_status(current_user),
        )

    lookup_payload = await _lookup_khalti_payment(verify_data.pidx)
    normalized_status = _normalize_khalti_status(lookup_payload.get("status"))
    transaction_id = lookup_payload.get("transaction_id")
    total_amount = lookup_payload.get("total_amount")

    payment.status = normalized_status
    payment.transaction_id = transaction_id
    payment.raw_response = {
        **(payment.raw_response or {}),
        "lookup_response": lookup_payload,
    }

    if normalized_status != "completed":
        db.commit()
        return schemas.KhaltiVerifyResponse(
            success=False,
            message="Payment was not completed. Please try again.",
            payment_status=payment.status,
            subscription_status=_subscription_status(current_user),
        )

    if int(total_amount or 0) != payment.amount_paisa:
        payment.status = "failed"
        db.commit()
        logger.warning(
            "Khalti amount mismatch for pidx %s: expected %s, got %s",
            verify_data.pidx,
            payment.amount_paisa,
            total_amount,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verified payment amount does not match the subscription price",
        )

    lookup_pidx = lookup_payload.get("pidx")
    if lookup_pidx and lookup_pidx != payment.pidx:
        payment.status = "failed"
        db.commit()
        logger.warning(
            "Khalti pidx mismatch for payment %s: lookup returned %s",
            payment.pidx,
            lookup_pidx,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verified payment reference does not match the original payment",
        )

    if lookup_payload.get("refunded") is True:
        payment.status = "refunded"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment has been refunded and cannot activate Pro",
        )

    current_user.subscription_plan = models.SubscriptionPlan.PRO
    current_user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
    db.commit()
    db.refresh(current_user)

    logger.info("User %s upgraded to Pro via Khalti pidx=%s", current_user.email, verify_data.pidx)

    return schemas.KhaltiVerifyResponse(
        success=True,
        message="Payment successful. Pro plan activated.",
        payment_status=payment.status,
        subscription_status=_subscription_status(current_user),
    )


@router.get("/payment-status", response_model=schemas.PaymentStatusResponse)
async def get_payment_status(
    pidx: str = Query(..., min_length=1),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the locally stored status for a subscription payment."""
    payment = db.query(models.SubscriptionPayment).filter(
        models.SubscriptionPayment.pidx == pidx,
        models.SubscriptionPayment.user_id == current_user.id,
        models.SubscriptionPayment.provider == "khalti",
    ).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment record not found",
        )

    return schemas.PaymentStatusResponse(
        pidx=payment.pidx,
        status=payment.status,
        plan=payment.plan,
        amount_paisa=payment.amount_paisa,
        transaction_id=payment.transaction_id,
    )

@router.post("/upgrade", response_model=schemas.PaymentResponse)
async def upgrade_subscription(
    payment_data: schemas.PaymentRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update subscription plan.

    Pro upgrades are handled only through eSewa verification.
    """
    if payment_data.plan == "free":
        try:
            current_user.subscription_plan = models.SubscriptionPlan.FREE
            current_user.subscription_expires_at = None
            db.commit()
            
            return schemas.PaymentResponse(
                success=True,
                message="Subscription downgraded to Free plan",
                subscription_status=_subscription_status(current_user),
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to downgrade subscription: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update subscription"
            )
    
    if payment_data.plan == "pro":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use eSewa checkout to upgrade to Pro",
        )
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid subscription plan"
    )

@router.get("/features")
async def get_plan_features():
    """Get features available for each plan"""
    return _plan_features()

