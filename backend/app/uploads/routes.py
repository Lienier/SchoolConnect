"""HTTP routes for the uploads module."""

from __future__ import annotations

import os
import uuid

from flask import Blueprint, current_app, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.common.exceptions import NotFoundError, ValidationError
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
def serve(filename: str):
    """Serve a stored file from the local upload folder."""
    folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
    if not os.path.exists(os.path.join(folder, filename)):
        raise NotFoundError("File not found.")
    return send_from_directory(folder, filename)
