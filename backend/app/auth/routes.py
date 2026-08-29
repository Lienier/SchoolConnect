"""HTTP routes for the auth module.

Routes only: parse/validate input, delegate to the service, and return the
standardized response envelope. No business logic lives here.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.auth.repository import UserRepository
from app.auth.schema import auth_tokens, public_user
from app.auth.service import AuthService
from app.auth.validators import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshRequest,
)
from app.common.exceptions import AuthorizationError, ValidationError
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
    """Explain the administrator-managed account policy."""
    raise AuthorizationError(
        "Public registration is disabled. Contact a college administrator to create your account."
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
        user,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
        commit=False,
    )
    user.last_login_at = datetime.now(timezone.utc)
    audit.record_login(
        success=True,
        user_id=user.id,
        email=str(payload.email),
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
        commit=False,
    )
    db.session.commit()
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


@bp.get("/me")
@jwt_required()
def me():
    """Return the currently authenticated user."""
    user = UserRepository().get_by_id(uuid.UUID(get_jwt_identity()))
    if user is None:
        return error_response("User not found.", status_code=404)
    return success_response(data=public_user(user))


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
