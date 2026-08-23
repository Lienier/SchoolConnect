"""HTTP routes for the auth module.

Routes only: parse/validate input, delegate to the service, and return the
standardized response envelope. No business logic lives here.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from flask import Blueprint, current_app, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.auth.repository import UserRepository
from app.auth.schema import auth_tokens, public_user
from app.auth.service import AuthService
from app.auth.validators import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    OAuthLoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.common.exceptions import ValidationError
from app.common.responses import error_response, success_response
from app.extensions import db

limiter = Limiter(key_func=get_remote_address)

bp = Blueprint("auth", __name__, url_prefix="/auth")
_service = AuthService()


def _body() -> dict:
    """Return the parsed JSON body or raise a validation error."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object.")
    return data


@bp.post("/register")
@limiter.limit("20 per hour")
def register():
    """Public self-registration endpoint."""
    payload = RegisterRequest(**_body())
    user = _service.register(
        email=str(payload.email),
        password=payload.password,
        full_name=payload.full_name,
        first_name=payload.first_name,
        last_name=payload.last_name,
        username=payload.username,
    )
    access, raw_refresh = _service.issue_tokens(
        user, ip_address=request.remote_addr
    )
    return success_response(
        data=auth_tokens(access, raw_refresh, user),
        message="Registration successful.",
        status_code=201,
    )


@bp.post("/login")
@limiter.limit("10 per minute")
def login():
    """Credential login returning access + refresh tokens."""
    from app.audit.service import AuditService
    from app.common.exceptions import AppError

    audit = AuditService()
    payload = LoginRequest(**_body())
    try:
        user = _service.authenticate(
            email=str(payload.email), password=payload.password
        )
    except AppError as exc:
        audit.record_login(
            success=False,
            email=str(payload.email),
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string,
            reason=getattr(exc, "message", "authentication failed"),
        )
        raise
    access, raw_refresh = _service.issue_tokens(
        user, ip_address=request.remote_addr, user_agent=request.user_agent.string
    )
    user.last_login_at = datetime.now(timezone.utc)
    db.session.commit()
    audit.record_login(
        success=True,
        user_id=user.id,
        email=str(payload.email),
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
    )
    return success_response(
        data=auth_tokens(access, raw_refresh, user),
        message="Login successful.",
    )


@bp.post("/refresh")
def refresh():
    """Rotate a refresh token into a new access + refresh pair."""
    payload = RefreshRequest(**_body())
    access, raw_refresh, user = _service.rotate_refresh_token(payload.refresh_token)
    return success_response(
        data=auth_tokens(access, raw_refresh, user),
        message="Token refreshed.",
    )


@bp.post("/logout")
@jwt_required()
def logout():
    """Revoke the presented refresh token."""
    body = _body()
    raw = body.get("refresh_token")
    _service.logout(raw_refresh=raw)
    return success_response(message="Logged out.")


@bp.post("/forgot-password")
@limiter.limit("5 per hour")
def forgot_password():
    """Request a password reset email token (token returned for dev)."""
    payload = ForgotPasswordRequest(**_body())
    token = _service.create_password_reset(str(payload.email))
    # In production the token is emailed; returned here for local testing.
    reset_data = {"reset_token": token} if token and current_app.config.get(
        "RETURN_RESET_TOKENS", False
    ) else None
    return success_response(
        data=reset_data,
        message="If the email exists, a reset link has been sent.",
    )


@bp.post("/reset-password")
def reset_password():
    """Set a new password using a reset token."""
    payload = ResetPasswordRequest(**_body())
    _service.reset_password(payload.token, payload.password)
    return success_response(message="Password has been reset.")


@bp.post("/verify-email")
def verify_email():
    """Verify an email address using a verification token."""
    body = _body()
    token = body.get("token")
    if not token:
        raise ValidationError("Verification token is required.")
    _service.verify_email(token)
    return success_response(message="Email verified.")


@bp.get("/me")
@jwt_required()
def me():
    """Return the currently authenticated user."""
    user = UserRepository().get_by_id(uuid.UUID(get_jwt_identity()))
    if user is None:
        return error_response("User not found.", status_code=404)
    return success_response(data=public_user(user))


@bp.post("/oauth/google")
def oauth_google():
    """Exchange a Google ID token for SchoolConnect tokens."""
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    payload = OAuthLoginRequest(**_body())
    client_id = current_app.config.get("GOOGLE_CLIENT_ID")
    if not client_id:
        raise ValidationError("Google OAuth is not configured.")
    try:
        claim = id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            audience=client_id,
        )
    except Exception as exc:  # noqa: BLE001 - surface as client error
        raise ValidationError("Invalid Google token.") from exc

    if not claim.get("email_verified"):
        raise ValidationError("Google email is not verified.")

    user = _service.oauth_login_or_register(
        provider="google",
        provider_user_id=str(claim.get("sub")),
        email=str(claim.get("email")),
        full_name=str(claim.get("name", "")),
    )
    access, raw_refresh = _service.issue_tokens(
        user, ip_address=request.remote_addr
    )
    return success_response(
        data=auth_tokens(access, raw_refresh, user),
        message="Google login successful.",
    )


@bp.post("/change-password")
@jwt_required()
def change_password():
    """Change the password of the authenticated user."""
    payload = ChangePasswordRequest(**_body())
    user_id = uuid.UUID(get_jwt_identity())
    user = UserRepository().get_by_id(user_id)
    if user is None:
        return error_response("User not found.", status_code=404)
    _service.change_password(
        user, current_password=payload.current_password, new_password=payload.new_password
    )
    return success_response(message="Password changed.")
