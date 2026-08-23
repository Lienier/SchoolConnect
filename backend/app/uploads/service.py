"""Business logic for the uploads module.

Stores files on the configured backend (local disk by default; Cloudinary can
be added later) and records ``UploadedFile`` metadata that other modules
reference via attachment tables.
"""

from __future__ import annotations

import os
import uuid

from flask import current_app
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from app.announcements.model import Announcement, AnnouncementAttachment, UploadedFile
from app.common.exceptions import ValidationError
from app.extensions import db


class UploadService:
    """Handles file persistence and metadata records."""

    def _allowed(self, filename: str) -> bool:
        if "." not in filename:
            return False
        ext = filename.rsplit(".", 1)[1].lower()
        return ext in current_app.config.get("ALLOWED_UPLOAD_EXTENSIONS", set())

    @staticmethod
    def allowed_entity_type(entity_type: str | None) -> bool:
        """Restrict polymorphic attachment targets to supported resources."""
        return entity_type in {None, "announcement", "event"}

    def store(
        self,
        *,
        file: FileStorage,
        uploader_id: uuid.UUID,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
    ) -> UploadedFile:
        if file is None or not file.filename:
            raise ValidationError("No file provided.")
        if not self._allowed(file.filename):
            raise ValidationError("File type is not allowed.")
        if entity_type == "announcement" and entity_id is not None:
            if db.session.get(Announcement, entity_id) is None:
                raise ValidationError("Announcement not found.")

        original = secure_filename(file.filename)
        ext = original.rsplit(".", 1)[1].lower() if "." in original else ""
        stored_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex

        upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
        os.makedirs(upload_folder, exist_ok=True)
        path = os.path.join(upload_folder, stored_name)
        file.save(path)
        size = os.path.getsize(path)
        if size <= 0:
            os.remove(path)
            raise ValidationError("Uploaded file is empty.")

        record = UploadedFile(
            uploader_id=uploader_id,
            filename=stored_name,
            original_name=original,
            content_type=file.mimetype or "application/octet-stream",
            size_bytes=size,
            storage_backend="local",
            storage_path=path,
            url=f"/api/uploads/{stored_name}",
            entity_type=entity_type,
            entity_id=entity_id,
        )
        db.session.add(record)
        if entity_type == "announcement" and entity_id is not None:
            db.session.flush()
            db.session.add(AnnouncementAttachment(announcement_id=entity_id, file_id=record.id))
        db.session.commit()
        return record

    def get(self, file_id: uuid.UUID) -> UploadedFile | None:
        return db.session.get(UploadedFile, file_id)

    @staticmethod
    def to_dict(record: UploadedFile) -> dict:
        return {
            "id": str(record.id),
            "filename": record.filename,
            "original_name": record.original_name,
            "content_type": record.content_type,
            "size_bytes": record.size_bytes,
            "url": record.url,
            "entity_type": record.entity_type,
            "entity_id": str(record.entity_id) if record.entity_id else None,
        }


__all__ = ["UploadService"]
