"""Authenticated Socket.IO connection handling."""

from __future__ import annotations

import uuid

from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import SocketIO, emit, join_room

from app.auth.model import User
from app.extensions import db


def register_socket_handlers(socketio: SocketIO) -> None:
    """Register websocket lifecycle handlers."""

    @socketio.on("connect")
    def handle_connect(auth):
        token = None
        if isinstance(auth, dict):
            token = auth.get("token")
        token = token or request.args.get("token")
        if not token:
            return False

        try:
            decoded = decode_token(token)
            user_id = uuid.UUID(decoded.get("sub"))
            user = db.session.get(User, user_id)
        except Exception:
            return False

        if user is None or user.deleted_at is not None or user.status != "active":
            return False

        join_room("school")
        join_room(f"user:{user.id}")
        for role in user.roles:
            join_room(f"role:{role.name}")

        emit(
            "schoolconnect:ready",
            {
                "user_id": str(user.id),
                "roles": [role.name for role in user.roles],
            },
        )
