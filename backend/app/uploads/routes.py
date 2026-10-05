"""HTTP routes for the uploads module."""

from __future__ import annotations

import uuid

from flask import Blueprint, current_app, redirect, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.announcements.model import Announcement
from app.announcements.service import AnnouncementService
from app.permissions.decorators import has_permission, user_roles
from app.common.exceptions import AuthorizationError, NotFoundError, ValidationError
from app.events.access import require_event_manager
from app.events.model import Event
from app.extensions import db
from app.common.responses import success_response
from app.uploads.service import UploadService

bp = Blueprint("uploads", __name__, url_prefix="/uploads")
_service = UploadService()


@bp.post("")
@jwt_required()
def upload():
    """Upload a file and record its metadata."""
    if "file" not in request.files:
        raise ValidationError("No file part in the request.")
    actor = uuid.UUID(get_jwt_identity())
    entity_type = request.form.get("entity_type")
    entity_id = request.form.get("entity_id")
    if not _service.allowed_entity_type(entity_type):
        raise ValidationError("Unsupported upload target.")
    if not entity_type or not entity_id:
        raise ValidationError("An upload target and target identifier are required.")
    target_id = uuid.UUID(entity_id)
    if entity_type == "event":
        event = db.session.get(Event, target_id)
        if event is None:
            raise NotFoundError("Event not found.")
        require_event_manager(actor, event)
    elif entity_type == "announcement":
        announcement = db.session.get(Announcement, target_id)
        if announcement is None:
            raise NotFoundError("Announcement not found.")
        from app.permissions.decorators import has_permission
        if announcement.author_id != actor and not has_permission(str(actor), "announcements.moderate"):
            raise AuthorizationError("You cannot attach files to this announcement.")
    record = _service.store(
        file=request.files["file"],
        uploader_id=actor,
        entity_type=entity_type,
        entity_id=target_id,
    )
    return success_response(
        data=_service.to_dict(record), message="File uploaded.", status_code=201
    )


@bp.get("/<path:filename>")
@jwt_required()
def serve(filename: str):
    """Apply the parent resource's visibility rules before delivering a file."""
    record = _service.get_by_filename(filename)
    if record is None:
        raise NotFoundError("File not found.")
    actor = get_jwt_identity()
    if record.entity_type == "announcement":
        announcement = db.session.get(Announcement, record.entity_id)
        if announcement is None or announcement.deleted_at is not None or not has_permission(actor, "announcements.view"):
            raise NotFoundError("File not found.")
        if not has_permission(actor, "announcements.moderate") and not (
            announcement.author_id == uuid.UUID(actor)
            or AnnouncementService.visible_to(announcement, user_roles(actor))
        ):
            raise NotFoundError("File not found.")
    elif record.entity_type == "event":
        from app.events.access import can_manage_event
        event = db.session.get(Event, record.entity_id)
        if event is None or event.deleted_at is not None or not has_permission(actor, "events.view") or (
            event.status not in {"approved", "ongoing", "completed"} and not can_manage_event(actor, event)
        ):
            raise NotFoundError("File not found.")
    elif record.uploader_id != uuid.UUID(actor):
        raise NotFoundError("File not found.")
    if record and record.storage_backend == "cloudinary" and record.storage_path:
        return redirect(_service.cloudinary_download_url(record))

    folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
    return send_from_directory(folder, filename)
