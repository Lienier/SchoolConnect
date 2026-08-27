"""HTTP routes for the announcements module.

Routes only: validate input, enforce permissions, delegate to the service, and
return the standardized response envelope.
"""

from __future__ import annotations

import uuid

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.announcements.repository import AnnouncementRepository
from app.announcements.service import AnnouncementService
from app.announcements.validators import (
    AnnouncementApprovalRequest,
    AnnouncementCreateRequest,
    AnnouncementUpdateRequest,
    CategoryCreateRequest,
)
from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.responses import success_response
from app.permissions.decorators import (
    has_role,
    require_any_permission,
    require_permission,
)
from app.realtime.service import emit_update

bp = Blueprint("announcements", __name__, url_prefix="/announcements")
_service = AnnouncementService()
_repo = AnnouncementRepository()


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object.")
    return data


@bp.get("")
@jwt_required()
@require_any_permission("announcements.view", "announcements.approve")
def list_announcements():
    """List announcements (paginated). Staff see all; feed filter optional."""
    params = PaginationParams.from_request()
    status = request.args.get("status")
    if has_role(get_jwt_identity(), "student"):
        status = "published"
    category_id = request.args.get("category_id")
    priority = request.args.get("priority")
    query = _service.list_announcements(
        status=status, category_id=category_id, priority=priority
    )
    items, meta = paginate(query, params)
    return success_response(
        data=[
            a.to_dict(include_approvals=not has_role(get_jwt_identity(), "student"))
            for a in items
        ],
        meta=meta,
    )


@bp.get("/feed")
@jwt_required()
def public_feed():
    """List only published announcements for the in-app feed."""
    params = PaginationParams.from_request()
    query = _service.list_announcements(status="published")
    items, meta = paginate(query, params)
    return success_response(data=[a.to_dict() for a in items], meta=meta)


@bp.get("/<announcement_id>")
@jwt_required()
@require_any_permission("announcements.view", "announcements.approve")
def get_announcement(announcement_id: str):
    """Get a single announcement with approval history."""
    announcement = _service.get_announcement(uuid.UUID(announcement_id))
    if has_role(get_jwt_identity(), "student") and announcement.status != "published":
        from app.common.exceptions import NotFoundError
        raise NotFoundError("Announcement not found.")
    return success_response(data=announcement.to_dict(include_approvals=not has_role(get_jwt_identity(), "student")))


@bp.post("")
@jwt_required()
@require_permission("announcements.create")
def create_announcement():
    """Create a draft announcement, optionally submitting for approval.

    Staff may create announcements according to their assigned permission.
    """
    payload = AnnouncementCreateRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    announcement = _service.create_announcement(
        author_id=actor,
        title=payload.title,
        body=payload.body,
        summary=payload.summary,
        category_id=payload.category_id,
        priority=payload.priority,
        target_audience=payload.target_audience,
        expires_at=payload.expires_at,
        submit_for_approval=payload.submit_for_approval,
    )
    emit_update(
        "announcement",
        "created",
        entity_id=announcement.id,
        message=f"Announcement created: {announcement.title}",
    )
    return success_response(
        data=announcement.to_dict(),
        message="Announcement created.",
        status_code=201,
    )


@bp.patch("/<announcement_id>")
@jwt_required()
@require_permission("announcements.update")
def update_announcement(announcement_id: str):
    """Update a draft announcement."""
    payload = AnnouncementUpdateRequest(**_body())
    actor = uuid.UUID(get_jwt_identity())
    announcement = _service.update_announcement(
        uuid.UUID(announcement_id),
        actor_id=actor,
        can_override=has_role(str(actor), "admin") or has_role(str(actor), "teacher"),
        title=payload.title,
        body=payload.body,
        summary=payload.summary,
        category_id=payload.category_id,
        priority=payload.priority,
        target_audience=payload.target_audience,
        expires_at=payload.expires_at,
    )
    emit_update(
        "announcement",
        "updated",
        entity_id=announcement.id,
        message=f"Announcement updated: {announcement.title}",
    )
    return success_response(data=announcement.to_dict(), message="Announcement updated.")


@bp.post("/<announcement_id>/approve")
@jwt_required()
@require_permission("announcements.approve")
def approve_announcement(announcement_id: str):
    """Approve or reject a pending announcement."""
    payload = AnnouncementApprovalRequest(**_body())
    reviewer = uuid.UUID(get_jwt_identity())
    announcement = _service.decide(
        announcement_id=uuid.UUID(announcement_id),
        reviewer_id=reviewer,
        decision=payload.decision,
        comment=payload.comment,
    )
    emit_update(
        "announcement",
        announcement.status,
        entity_id=announcement.id,
        message=f"Announcement {announcement.status}: {announcement.title}",
    )
    return success_response(
        data=announcement.to_dict(),
        message=f"Announcement {announcement.status}.",
    )


@bp.delete("/<announcement_id>")
@jwt_required()
@require_permission("announcements.delete")
def delete_announcement(announcement_id: str):
    """Soft-delete an announcement."""
    actor = uuid.UUID(get_jwt_identity())
    _service.delete_announcement(
        uuid.UUID(announcement_id),
        actor_id=actor,
        can_override=has_role(str(actor), "admin") or has_role(str(actor), "teacher"),
    )
    emit_update("announcement", "deleted", entity_id=announcement_id)
    return success_response(message="Announcement deleted.")


@bp.get("/categories/all")
@jwt_required()
@require_permission("announcements.view")
def list_categories():
    """List all announcement categories."""
    return success_response(data=[
        {"id": str(c.id), "name": c.name, "slug": c.slug, "color": c.color}
        for c in _service.list_categories()
    ])


@bp.post("/categories")
@jwt_required()
@require_permission("announcements.update")
def create_category():
    """Create an announcement category."""
    payload = CategoryCreateRequest(**_body())
    category = _service.create_category(
        name=payload.name, slug=payload.slug,
        description=payload.description, color=payload.color,
    )
    return success_response(
        data={"id": str(category.id), "name": category.name, "slug": category.slug},
        message="Category created.",
        status_code=201,
    )
