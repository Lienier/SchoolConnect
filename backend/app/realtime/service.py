"""Small broadcast helpers for realtime cache updates."""

from __future__ import annotations

import uuid
from typing import Any

from app.extensions import socketio


def emit_update(
    topic: str,
    action: str,
    *,
    entity_id: uuid.UUID | str | None = None,
    message: str | None = None,
    data: dict[str, Any] | None = None,
    user_id: uuid.UUID | str | None = None,
    roles: list[str] | tuple[str, ...] | None = None,
) -> None:
    """Emit a realtime update to college-wide, role, or user rooms."""

    payload: dict[str, Any] = {
        "topic": topic,
        "action": action,
        "entity_id": str(entity_id) if entity_id else None,
        "message": message,
        "data": data or {},
    }
    rooms: list[str] = []
    if user_id:
        rooms.append(f"user:{user_id}")
    for role in roles or ():
        rooms.append(f"role:{role}")
    if not rooms:
        rooms.append("school")

    for room in rooms:
        socketio.emit("schoolconnect:update", payload, to=room)


def disconnect_user(user_id: uuid.UUID | str) -> None:
    """Immediately close every active realtime connection for a user."""
    room = f"user:{user_id}"
    participants = list(socketio.server.manager.get_participants("/", room))
    for participant in participants:
        sid = participant[0] if isinstance(participant, tuple) else participant
        socketio.server.disconnect(sid, namespace="/")


__all__ = ["disconnect_user", "emit_update"]
