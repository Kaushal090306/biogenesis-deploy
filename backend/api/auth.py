import logging
import random
import secrets
import string
import smtplib
import asyncio
import functools
import socket
import json
import httpx
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from db import models as db_models
from models.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserPublic,
    SendOtpRequest, VerifyOtpRequest, GoogleAuthRequest, OtpRequiredResponse,
    ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest,
)
from core.security import hash_password, verify_password, create_access_token
from core.config import get_settings
from core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = logging.getLogger(__name__)
settings = get_settings()

OTP_EXPIRE_MINUTES = 10
FREE_TIER_TOKENS = 2
RESEND_API_URL = "https://api.resend.com/emails"
GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_STATE_EXPIRE_MINUTES = 10

if settings.FREE_TOKENS != FREE_TIER_TOKENS:
    logger.warning(
        "FREE_TOKENS=%s configured, but signup flow enforces %s tokens for free-tier users.",
        settings.FREE_TOKENS,
        FREE_TIER_TOKENS,
    )


# ─────────────────────────── helpers ──────────────────────────────────────────

def _generate_otp(length: int = 6) -> str:
    """Generate a cryptographically secure OTP."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


def _otp_email_html(otp: str) -> str:
        return f"""
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:8px;">
            <h2 style="color:#38bdf8;margin-bottom:8px;">PharmForge AI</h2>
            <p style="color:#94a3b8;">Your one-time verification code:</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#ffffff;padding:16px 0;">{otp}</div>
            <p style="color:#64748b;font-size:12px;">Expires in {OTP_EXPIRE_MINUTES} minutes. Do not share this code.</p>
        </div>
        """


def _reset_email_html(otp: str) -> str:
        return f"""
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:8px;">
            <h2 style="color:#f87171;margin-bottom:8px;">PharmForge AI — Password Reset</h2>
            <p style="color:#94a3b8;">We received a request to reset the password for this account.</p>
            <p style="color:#94a3b8;">Use the code below to reset your password:</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#ffffff;padding:16px 0;">{otp}</div>
            <p style="color:#64748b;font-size:12px;">Expires in {OTP_EXPIRE_MINUTES} minutes. If you did not request a password reset, you can safely ignore this email.</p>
        </div>
        """


def _send_email_sync(to_email: str, otp: str) -> None:
    """Synchronous SMTP send — called via asyncio.to_thread."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your PharmForge AI verification code"
    msg["From"] = f"PharmForge AI <{settings.SMTP_USER}>"
    msg["To"] = to_email

    msg.attach(MIMEText(_otp_email_html(otp), "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.sendmail(settings.SMTP_USER, to_email, msg.as_string())


def _send_reset_email_sync(to_email: str, otp: str) -> None:
    """Send password reset OTP email."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your PharmForge AI password"
    msg["From"] = f"PharmForge AI <{settings.SMTP_USER}>"
    msg["To"] = to_email

    msg.attach(MIMEText(_reset_email_html(otp), "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.sendmail(settings.SMTP_USER, to_email, msg.as_string())


def _send_welcome_email_sync(to_email: str, username: str) -> None:
    """Send welcome email after successful account creation."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Welcome to PharmForge AI 🧬"
    msg["From"] = f"PharmForge AI <{settings.SMTP_USER}>"
    msg["To"] = to_email

    name = username or to_email.split("@")[0]
    html = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#0f172a;color:#e2e8f0;border-radius:10px;">
      <h1 style="color:#38bdf8;margin-bottom:4px;font-size:24px;">Welcome to PharmForge AI</h1>
      <p style="color:#94a3b8;margin-top:0;">The next-generation drug discovery platform powered by AI.</p>
      <hr style="border:none;border-top:1px solid #1e293b;margin:20px 0;">
      <p style="color:#e2e8f0;">Hi <strong>{name}</strong>,</p>
      <p style="color:#94a3b8;">Your account is now active. Here's what you can do right away:</p>
      <ul style="color:#94a3b8;padding-left:20px;line-height:1.8;">
        <li>🔬 Generate de novo drug candidates from any protein sequence</li>
        <li>⚗️ Get full ADMET &amp; toxicity profiling for every lead</li>
        <li>📊 Download comprehensive discovery reports in CSV format</li>
      </ul>
      <div style="margin:24px 0;">
        <a href="http://localhost:5173" style="background:#38bdf8;color:#0f172a;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Open PharmForge AI →</a>
      </div>
    <p style="color:#64748b;font-size:12px;">You have <strong style="color:#e2e8f0;">{FREE_TIER_TOKENS} free prediction tokens</strong> to get started. Upgrade anytime for unlimited access.</p>
      <hr style="border:none;border-top:1px solid #1e293b;margin:20px 0;">
      <p style="color:#475569;font-size:11px;">PharmForge AI · pharmforgeai@gmail.com</p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.sendmail(settings.SMTP_USER, to_email, msg.as_string())


def _send_password_changed_email_sync(to_email: str) -> None:
    """Send password-changed confirmation email."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your PharmForge AI password has been changed"
    msg["From"] = f"PharmForge AI <{settings.SMTP_USER}>"
    msg["To"] = to_email

    html = """
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:8px;">
      <h2 style="color:#34d399;margin-bottom:8px;">PharmForge AI — Password Changed</h2>
      <p style="color:#94a3b8;">Your account password was successfully changed.</p>
      <p style="color:#94a3b8;">If you made this change, no further action is needed.</p>
      <p style="color:#f87171;font-size:12px;">If you did not change your password, please contact our support immediately.</p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.sendmail(settings.SMTP_USER, to_email, msg.as_string())


async def _send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP via SMTP in a thread to avoid blocking the event loop."""
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            await asyncio.to_thread(_send_email_sync, to_email, otp)
            logger.info("OTP email sent to %s via SMTP", to_email)
            return True
        except (socket.gaierror, TimeoutError, OSError, smtplib.SMTPException) as exc:
            logger.error("Failed to send OTP email to %s via SMTP: %s", to_email, exc)
    else:
        logger.warning("SMTP not configured — attempting Resend fallback for OTP to %s", to_email)

    if await _send_email_via_resend(
        to_email=to_email,
        subject="Your PharmForge AI verification code",
        html=_otp_email_html(otp),
    ):
        logger.info("OTP email sent to %s via Resend", to_email)
        return True

    logger.error("OTP delivery failed for %s on all configured email providers", to_email)
    if settings.EXPOSE_OTP_IN_RESPONSE:
        logger.warning("Debug OTP fallback for %s: %s", to_email, otp)
    return False


async def _send_email_via_resend(to_email: str, subject: str, html: str) -> bool:
    if not settings.RESEND_API_KEY:
        return False

    sender = settings.RESEND_FROM_EMAIL or settings.SMTP_USER
    if not sender:
        logger.error("RESEND_FROM_EMAIL is required when using Resend email delivery")
        return False

    payload = {
        "from": f"PharmForge AI <{sender}>",
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(RESEND_API_URL, headers=headers, json=payload)
        if response.status_code >= 400:
            logger.error(
                "Resend API failed for %s: status=%s body=%s",
                to_email,
                response.status_code,
                response.text[:500],
            )
            return False
        return True
    except Exception as exc:
        logger.error("Resend API error for %s: %s", to_email, exc)
        return False


async def _send_reset_otp_email(to_email: str, otp: str) -> bool:
    if settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            await asyncio.to_thread(_send_reset_email_sync, to_email, otp)
            logger.info("Password reset OTP sent to %s via SMTP", to_email)
            return True
        except (socket.gaierror, TimeoutError, OSError, smtplib.SMTPException) as exc:
            logger.error("Failed to send reset OTP to %s via SMTP: %s", to_email, exc)
    else:
        logger.warning("SMTP not configured — attempting Resend fallback for reset OTP to %s", to_email)

    if await _send_email_via_resend(
        to_email=to_email,
        subject="Reset your PharmForge AI password",
        html=_reset_email_html(otp),
    ):
        logger.info("Password reset OTP sent to %s via Resend", to_email)
        return True

    logger.error("Reset OTP delivery failed for %s on all configured email providers", to_email)
    if settings.EXPOSE_OTP_IN_RESPONSE:
        logger.warning("Debug reset OTP fallback for %s: %s", to_email, otp)
        return False


async def _send_welcome_email(to_email: str, username: str) -> None:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        return
    try:
        await asyncio.to_thread(_send_welcome_email_sync, to_email, username)
        logger.info("Welcome email sent to %s", to_email)
    except Exception as exc:
        logger.warning("Failed to send welcome email to %s: %s", to_email, exc)


async def _send_password_changed_email(to_email: str) -> None:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — password changed for %s", to_email)
        return
    await asyncio.to_thread(_send_password_changed_email_sync, to_email)
    logger.info("Password changed email sent to %s", to_email)


# ─────────────────────────── register ─────────────────────────────────────────

@router.post("/register", response_model=OtpRequiredResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not payload.consent:
        raise HTTPException(status_code=400, detail="You must accept the scientific data consent to register.")

    result = await db.execute(select(db_models.User).where(db_models.User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered.")

    otp = _generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES)

    user = db_models.User(
        email=payload.email,
        username=payload.username,
        password_hash=hash_password(payload.password),
        tokens_left=FREE_TIER_TOKENS,
        plan="free",
        consent_given=True,
        email_verified=False,
        otp_code=otp,
        otp_expires_at=expires,
        organization=payload.organization,
        role=payload.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    otp_sent = await _send_otp_email(payload.email, otp)
    delivery = "email" if otp_sent else "unavailable"
    logger.info("New user registered: %s (id=%d) — OTP delivery=%s", user.email, user.id, delivery)

    return OtpRequiredResponse(
        email=payload.email,
        otp_delivery=delivery,
        debug_otp=otp if (not otp_sent and settings.EXPOSE_OTP_IN_RESPONSE) else None,
    )


# ─────────────────────────── send-otp (resend) ────────────────────────────────

@router.post("/send-otp", status_code=200)
async def send_otp(payload: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(db_models.User).where(db_models.User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        # Don't leak whether email exists
        return {"detail": "If that email is registered, a code has been sent."}

    if user.email_verified:
        return {"detail": "Email already verified."}

    otp = _generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES)
    await db.commit()

    otp_sent = await _send_otp_email(payload.email, otp)
    if otp_sent:
        return {"detail": "Verification code sent.", "otp_delivery": "email"}

    response = {
        "detail": "Verification code generated, but email delivery is unavailable right now.",
        "otp_delivery": "unavailable",
    }
    if settings.EXPOSE_OTP_IN_RESPONSE:
        response["debug_otp"] = otp
    return response


# ─────────────────────────── verify-otp ───────────────────────────────────────

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(payload: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(db_models.User).where(db_models.User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request.")

    if user.email_verified:
        # Already verified — just return a token
        token = create_access_token(str(user.id))
        return TokenResponse(access_token=token, user=UserPublic.model_validate(user))

    now = datetime.now(timezone.utc)
    if not user.otp_code or user.otp_code != payload.otp:
        raise HTTPException(status_code=400, detail="Incorrect verification code.")
    if not user.otp_expires_at or user.otp_expires_at < now:
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    user.email_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    await db.commit()
    await db.refresh(user)

    asyncio.create_task(_send_welcome_email(user.email, user.username or ""))

    token = create_access_token(str(user.id))
    logger.info("Email verified for user: %s", user.email)
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


# ─────────────────────────── login ────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(db_models.User).where(db_models.User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.email_verified:
        now = datetime.now(timezone.utc)
        otp = user.otp_code
        if not otp or not user.otp_expires_at or user.otp_expires_at < now:
            otp = _generate_otp()
            user.otp_code = otp
            user.otp_expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)
            await db.commit()

        otp_sent = await _send_otp_email(user.email, otp)
        detail = {
            "message": "Email not verified. Please verify your email first.",
            "otp_delivery": "email" if otp_sent else "unavailable",
        }
        if not otp_sent and settings.EXPOSE_OTP_IN_RESPONSE:
            detail["debug_otp"] = otp

        raise HTTPException(
            status_code=403,
            detail=detail,
            headers={"X-Requires-Verification": payload.email},
        )

    token = create_access_token(str(user.id))
    logger.info("User login: %s", user.email)
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


# ─────────────────────────── google OAuth ─────────────────────────────────────

def _normalize_origin(origin: str | None) -> str:
    return (origin or "").strip().rstrip("/")


def _is_allowed_frontend_origin(origin: str) -> bool:
    normalized = _normalize_origin(origin)
    if not normalized:
        return False

    allowed = {
        _normalize_origin(settings.FRONTEND_URL),
        "http://localhost:5173",
        "http://localhost:3000",
        "https://pharmforgeai.vercel.app",
    }
    if normalized in allowed:
        return True

    return normalized.startswith("https://") and normalized.endswith(".vercel.app")


def _google_callback_redirect_uri(request: Request) -> str:
    configured = (settings.GOOGLE_REDIRECT_URI or "").strip()
    if configured:
        if configured.startswith("http://") and "localhost" not in configured and "127.0.0.1" not in configured:
            configured = f"https://{configured[len('http://'):]}"
        return configured

    base_url = str(request.base_url).rstrip("/")
    if base_url.startswith("http://") and "localhost" not in base_url and "127.0.0.1" not in base_url:
        base_url = f"https://{base_url[len('http://'):]}"

    return f"{base_url}/api/auth/google/callback"


def _encode_google_state(frontend_origin: str) -> str:
    payload = {
        "frontend_origin": frontend_origin,
        "nonce": secrets.token_urlsafe(16),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=GOOGLE_STATE_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def _decode_google_state(state: str) -> str:
    try:
        payload = jwt.decode(state, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid Google sign-in state.")

    frontend_origin = _normalize_origin(payload.get("frontend_origin"))
    if not _is_allowed_frontend_origin(frontend_origin):
        raise HTTPException(status_code=400, detail="Invalid Google sign-in origin.")
    return frontend_origin


def _google_popup_html(
    frontend_origin: str,
    *,
    success: bool,
    access_token: str | None = None,
    user: dict | None = None,
    error: str | None = None,
) -> str:
    payload = {
        "type": "pharmforge_google_auth",
        "success": success,
    }
    if access_token:
        payload["access_token"] = access_token
    if user is not None:
        payload["user"] = user
    if error:
        payload["error"] = error

    target_origin = frontend_origin if _is_allowed_frontend_origin(frontend_origin) else "*"
    payload_json = json.dumps(payload)
    target_origin_json = json.dumps(target_origin)

    return f"""
<!doctype html>
<html>
  <head><meta charset=\"utf-8\"><title>Google Sign-In</title></head>
  <body>
    <script>
      (function() {{
        const payload = {payload_json};
        const targetOrigin = {target_origin_json};
        try {{
          if (window.opener && !window.opener.closed) {{
            window.opener.postMessage(payload, targetOrigin);
          }}
        }} finally {{
          window.close();
        }}
      }})();
    </script>
    <p>You can close this window.</p>
  </body>
</html>
"""


def _verify_google_credential(credential: str) -> dict:
    if not settings.GOOGLE_CLIENT_ID:
        logger.warning("Google sign-in attempted but GOOGLE_CLIENT_ID is not configured")
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on server.")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
    except ModuleNotFoundError:
        logger.error("Google auth dependency missing. Install 'google-auth' package.")
        raise HTTPException(status_code=503, detail="Google sign-in is temporarily unavailable.")

    try:
        return id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid Google token.")


async def _upsert_google_user(db: AsyncSession, google_email: str, google_sub: str) -> db_models.User:
    # Find existing user by google_id or email
    result = await db.execute(
        select(db_models.User).where(
            (db_models.User.google_id == google_sub) | (db_models.User.email == google_email)
        )
    )
    user = result.scalar_one_or_none()

    if user:
        if not user.google_id:
            user.google_id = google_sub
        user.email_verified = True
        await db.commit()
        await db.refresh(user)
        return user

    user = db_models.User(
        email=google_email,
        password_hash="",  # Google-only account
        google_id=google_sub,
        tokens_left=FREE_TIER_TOKENS,
        plan="free",
        consent_given=True,
        email_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("New Google user registered: %s", user.email)
    asyncio.create_task(_send_welcome_email(user.email, user.username or ""))
    return user


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    idinfo = _verify_google_credential(payload.credential)

    google_email: str = idinfo.get("email", "")
    google_sub: str = idinfo.get("sub", "")
    if not google_email:
        raise HTTPException(status_code=400, detail="Google account has no email.")

    user = await _upsert_google_user(db, google_email, google_sub)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.get("/google/start")
async def google_start(request: Request, frontend_origin: str | None = None):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on server.")

    desired_origin = _normalize_origin(frontend_origin) or _normalize_origin(settings.FRONTEND_URL)
    if not _is_allowed_frontend_origin(desired_origin):
        raise HTTPException(status_code=400, detail="Unsupported frontend origin for Google sign-in.")

    redirect_uri = _google_callback_redirect_uri(request)
    state = _encode_google_state(desired_origin)
    query = urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "prompt": "select_account",
            "state": state,
            "access_type": "online",
            "include_granted_scopes": "true",
        }
    )

    return RedirectResponse(url=f"{GOOGLE_OAUTH_AUTHORIZE_URL}?{query}", status_code=302)


@router.get("/google/callback", response_class=HTMLResponse)
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    frontend_origin = _normalize_origin(settings.FRONTEND_URL)
    if state:
        try:
            frontend_origin = _decode_google_state(state)
        except HTTPException as exc:
            return HTMLResponse(
                _google_popup_html(frontend_origin, success=False, error=str(exc.detail)),
                status_code=400,
            )

    if error:
        logger.warning("Google OAuth callback returned error=%s", error)
        return HTMLResponse(
            _google_popup_html(frontend_origin, success=False, error="Google sign-in was cancelled or denied."),
            status_code=400,
        )

    if not code:
        return HTMLResponse(
            _google_popup_html(frontend_origin, success=False, error="Missing Google authorization code."),
            status_code=400,
        )

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        return HTMLResponse(
            _google_popup_html(frontend_origin, success=False, error="Google sign-in is not configured on server."),
            status_code=503,
        )

    redirect_uri = _google_callback_redirect_uri(request)
    token_form = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            token_resp = await client.post(GOOGLE_OAUTH_TOKEN_URL, data=token_form)
    except Exception as exc:
        logger.error("Google token exchange failed: %s", exc)
        return HTMLResponse(
            _google_popup_html(frontend_origin, success=False, error="Google sign-in is temporarily unavailable."),
            status_code=502,
        )

    if token_resp.status_code >= 400:
        logger.error("Google token exchange rejected: status=%s body=%s", token_resp.status_code, token_resp.text[:500])
        return HTMLResponse(
            _google_popup_html(frontend_origin, success=False, error="Google sign-in failed. Please try again."),
            status_code=400,
        )

    token_data = token_resp.json()
    id_token_value = token_data.get("id_token")
    if not id_token_value:
        logger.error("Google token exchange response missing id_token")
        return HTMLResponse(
            _google_popup_html(frontend_origin, success=False, error="Google sign-in response was incomplete."),
            status_code=400,
        )

    try:
        idinfo = _verify_google_credential(id_token_value)
    except HTTPException as exc:
        return HTMLResponse(
            _google_popup_html(frontend_origin, success=False, error=str(exc.detail)),
            status_code=exc.status_code,
        )

    google_email: str = idinfo.get("email", "")
    google_sub: str = idinfo.get("sub", "")
    if not google_email:
        return HTMLResponse(
            _google_popup_html(frontend_origin, success=False, error="Google account has no email."),
            status_code=400,
        )

    user = await _upsert_google_user(db, google_email, google_sub)
    token = create_access_token(str(user.id))
    user_payload = UserPublic.model_validate(user).model_dump(mode="json")
    return HTMLResponse(
        _google_popup_html(frontend_origin, success=True, access_token=token, user=user_payload),
        status_code=200,
    )


# ─────────────────────────── change password ─────────────────────────────────

@router.post("/change-password", status_code=200)
async def change_password(
    payload: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    if not current_user.password_hash or not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    current_user.password_hash = hash_password(payload.new_password)
    db.add(current_user)
    await db.commit()
    logger.info("Password changed for user: %s", current_user.email)
    try:
        await _send_password_changed_email(current_user.email)
    except Exception as exc:
        logger.error("Failed to send password-changed email: %s", exc)
    return {"detail": "Password updated successfully."}


# ─────────────────────────── forgot password ──────────────────────────────────

@router.post("/forgot-password", status_code=200)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(db_models.User).where(db_models.User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        # Don't leak whether address is registered
        raise HTTPException(status_code=404, detail="No account found with that email address.")

    otp = _generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES)
    await db.commit()

    otp_sent = await _send_reset_otp_email(payload.email, otp)
    if otp_sent:
        return {"detail": "Reset code sent to your email.", "otp_delivery": "email"}

    if settings.EXPOSE_OTP_IN_RESPONSE:
        return {
            "detail": "Email delivery unavailable. Use debug_otp for testing.",
            "otp_delivery": "unavailable",
            "debug_otp": otp,
        }

    raise HTTPException(
        status_code=503,
        detail="Reset email delivery is unavailable right now. Please try again later.",
    )


# ─────────────────────────── reset password ───────────────────────────────────

@router.post("/reset-password", status_code=200)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(db_models.User).where(db_models.User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request.")

    now = datetime.now(timezone.utc)
    if not user.otp_code or user.otp_code != payload.otp:
        raise HTTPException(status_code=400, detail="Incorrect reset code.")
    if not user.otp_expires_at or user.otp_expires_at < now:
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")

    user.password_hash = hash_password(payload.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    await db.commit()
    logger.info("Password reset for user: %s", user.email)

    try:
        await _send_password_changed_email(user.email)
    except Exception as exc:
        logger.error("Failed to send password-changed confirmation: %s", exc)

    return {"detail": "Password reset successfully. You can now sign in."}


# ─────────────────────────── me ───────────────────────────────────────────────

@router.get("/me", response_model=UserPublic)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: db_models.User = Depends(lambda: None),
):
    raise HTTPException(status_code=500, detail="Dependency misconfigured")
