"""HTTP routes for the uploads module."""

from __future__ import annotations

import uuid

from flask import Blueprint, current_app, redirect, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.common.exceptions import NotFoundError, ValidationError
from app.common.responses import success_response
from app.uploads.service import UploadService
from app.permissions.decorators import has_permission

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
    if entity_type and not has_permission(actor, f"{entity_type}s.update"):
        raise ValidationError("You cannot attach files to this resource.")
    record = _service.store(
        file=request.files["file"],
        uploader_id=actor,
        entity_type=entity_type,
        entity_id=uuid.UUID(entity_id) if entity_id else None,
    )
    return success_response(
        data=_service.to_dict(record), message="File uploaded.", status_code=201
    )


@bp.get("/<path:filename>")
@jwt_required()
def serve(filename: str):
    """Serve a stored file only to authenticated users."""
    record = _service.get_by_filename(filename)
    if record and record.storage_backend == "cloudinary" and record.storage_path:
        return redirect(record.storage_path)

    folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
    if record is None:
        raise NotFoundError("File not found.")
    return send_from_directory(folder, filename)
