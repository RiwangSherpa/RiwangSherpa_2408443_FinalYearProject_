"""
Helpers for eSewa ePay v2 subscription payments.
"""

import base64
import hashlib
import hmac
import json
from decimal import Decimal
from typing import Any


ESEWA_SIGNED_FIELD_NAMES = "total_amount,transaction_uuid,product_code"


def format_esewa_amount(value: Decimal | int | float | str) -> str:
    amount = Decimal(str(value))
    if amount == amount.to_integral():
        return str(amount.quantize(Decimal("1")))
    return format(amount.normalize(), "f")


def generate_esewa_signature(message: str, secret_key: str) -> str:
    digest = hmac.new(
        secret_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return base64.b64encode(digest).decode("utf-8")


def build_esewa_signature_message(fields: dict[str, Any], signed_field_names: str) -> str:
    names = [name.strip() for name in signed_field_names.split(",") if name.strip()]
    return ",".join(f"{name}={fields[name]}" for name in names)


def decode_esewa_callback_data(encoded_data: str) -> dict[str, Any]:
    normalized = encoded_data.strip().replace(" ", "+")
    padded = normalized + ("=" * (-len(normalized) % 4))
    decoded = base64.b64decode(padded).decode("utf-8")
    payload = json.loads(decoded)
    if not isinstance(payload, dict):
        raise ValueError("Decoded eSewa callback data must be an object")
    return payload
