"""
SMTP email delivery for Study Buddy account and notification emails.
"""

from __future__ import annotations

import asyncio
import logging
import smtplib
import threading
from email.message import EmailMessage
from email.utils import formataddr
from html import escape
from typing import Iterable

from sqlalchemy.orm import Session

from app import models
from app.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    """Raised when SMTP delivery cannot be completed."""


def _safe_error_message(exc: Exception) -> str:
    message = str(exc)
    if settings.SMTP_PASSWORD:
        message = message.replace(settings.SMTP_PASSWORD, "[redacted]")
    return f"{type(exc).__name__}: {message}"


class EmailService:
    def __init__(self) -> None:
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USERNAME
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
        self.from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_USE_TLS
        self.timeout = settings.SMTP_TIMEOUT_SECONDS

    @property
    def is_configured(self) -> bool:
        return bool(self.host and self.port and self.username and self.password and self.from_email)

    def send_email(self, to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
        if not self.is_configured:
            raise EmailDeliveryError(
                "SMTP email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, "
                "SMTP_PASSWORD, and SMTP_FROM_EMAIL."
            )

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = formataddr((self.from_name, self.from_email))
        message["To"] = to_email
        message.set_content(text_body)
        if html_body:
            message.add_alternative(html_body, subtype="html")

        with smtplib.SMTP(self.host, self.port, timeout=self.timeout) as smtp:
            if self.use_tls:
                smtp.starttls()
            smtp.login(self.username, self.password)
            smtp.send_message(message)

    def send_password_reset_email(self, to_email: str, reset_link: str) -> None:
        expiry_minutes = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        subject = "Reset your Study Buddy password"
        text_body = (
            "Hi,\n\n"
            "We received a request to reset your Study Buddy password.\n\n"
            f"Reset your password here: {reset_link}\n\n"
            f"This link expires in {expiry_minutes} minutes and can only be used once.\n"
            "If you did not request this, you can ignore this email.\n\n"
            "Study Buddy"
        )
        html_body = f"""
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#065f46;margin:0 0 12px">Reset your Study Buddy password</h2>
          <p>We received a request to reset your Study Buddy password.</p>
          <p>
            <a href="{escape(reset_link)}" style="display:inline-block;background:#065f46;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">
              Reset Password
            </a>
          </p>
          <p>This link expires in {expiry_minutes} minutes and can only be used once.</p>
          <p style="color:#6b7280">If you did not request this, you can ignore this email.</p>
        </div>
        """
        self.send_email(to_email, subject, text_body, html_body)

    def send_notification_email(self, to_email: str, subject: str, body: str, html_body: str | None = None) -> None:
        self.send_email(to_email, subject, body, html_body)

    def send_test_notification_email(self, to_email: str) -> None:
        self.send_notification_email(
            to_email,
            "Study Buddy email notifications enabled",
            "You will now receive important Study Buddy updates.",
            """
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#065f46;margin:0 0 12px">Email notifications enabled</h2>
              <p>You will now receive important Study Buddy updates.</p>
            </div>
            """,
        )


def _run_safely(description: str, callback) -> None:
    try:
        callback()
    except Exception as exc:
        logger.error("%s failed: %s", description, _safe_error_message(exc))


def send_in_background(description: str, callback) -> None:
    thread = threading.Thread(target=_run_safely, args=(description, callback), daemon=True)
    thread.start()


async def send_password_reset_email_async(to_email: str, reset_link: str) -> bool:
    service = EmailService()
    logger.info("SMTP configured: %s", "yes" if service.is_configured else "no")
    if not service.is_configured:
        logger.warning("Password reset email not sent: SMTP not configured")
        return False

    try:
        await asyncio.to_thread(service.send_password_reset_email, to_email, reset_link)
    except Exception as exc:
        logger.error("Password reset email send failed for %s: %s", to_email, _safe_error_message(exc))
        return False

    logger.info("Password reset email sent for %s", to_email)
    return True


def send_notifications_enabled_email_async(to_email: str) -> None:
    send_in_background(
        "Notification opt-in email",
        lambda: EmailService().send_test_notification_email(to_email),
    )


def send_goal_completed_email_async(db: Session, user_id: int, goal_title: str) -> None:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.email_notifications:
        return

    safe_title = goal_title or "your learning goal"
    subject = "Goal completed in Study Buddy"
    body = f"Nice work. You completed your Study Buddy goal: {safe_title}."
    html_body = f"""
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:0 auto;padding:24px">
      <h2 style="color:#065f46;margin:0 0 12px">Goal completed</h2>
      <p>Nice work. You completed your Study Buddy goal:</p>
      <p style="font-weight:700">{escape(safe_title)}</p>
    </div>
    """
    send_in_background(
        "Goal completed email",
        lambda: EmailService().send_notification_email(user.email, subject, body, html_body),
    )


def send_achievement_emails_async(db: Session, user_id: int, achievements: Iterable[dict]) -> None:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.email_notifications:
        return

    for achievement in achievements:
        name = str(achievement.get("name") or "Achievement")
        xp_reward = achievement.get("xp_reward", 0)
        subject = "Achievement unlocked in Study Buddy"
        body = f"You unlocked {name} in Study Buddy and earned {xp_reward} XP."
        html_body = f"""
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px;margin:0 auto;padding:24px">
          <h2 style="color:#065f46;margin:0 0 12px">Achievement unlocked</h2>
          <p>You unlocked:</p>
          <p style="font-weight:700">{escape(name)}</p>
          <p>Reward: {escape(str(xp_reward))} XP</p>
        </div>
        """
        send_in_background(
            "Achievement notification email",
            lambda email=user.email, subj=subject, text=body, html=html_body: EmailService().send_notification_email(
                email, subj, text, html
            ),
        )
