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
    AnnouncementCreateRequest,
    AnnouncementUpdateRequest,
    CategoryCreateRequest,
)
from app.common.exceptions import ValidationError
from app.common.pagination import PaginationParams, paginate
from app.common.responses import success_response
from app.permissions.decorators import (
    has_permission,
    has_role,
    require_any_permission,
    require_permission,
)
from app.realtime.service import emit_update
from app.extensions import db
from app.audit.service import AuditService

bp = Blueprint("announcements", __name__, url_prefix="/announcements")
_service = AnnouncementService()
_repo = AnnouncementRepository()
_audit = AuditService()


def _record_audit(action: str, entity_id: uuid.UUID, actor_id: uuid.UUID) -> None:
    _audit.record_audit(
        action=action,
        entity_type="announcement",
        entity_id=entity_id,
        actor_id=actor_id,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string,
    )


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object.")
    return data


def _paginate_visible(items, params: PaginationParams):
    total = len(items)
    page_items = items[params.offset : params.offset + params.page_size]
    total_pages = (total + params.page_size - 1) // params.page_size if total else 0
    return page_items, {
        "page": params.page,
        "page_size": params.page_size,
        "total_items": total,
        "total_pages": total_pages,
    }


def _actor_roles() -> set[str]:
    from app.permissions.decorators import user_roles

    return user_roles(get_jwt_identity())


@bp.get("")
@jwt_required()
@require_permission("announcements.view")
def list_announcements():
    """List announcements (paginated). Staff see all; feed filter optional."""
    params = PaginationParams.from_request()
    status = request.args.get("status")
    can_moderate = has_permission(get_jwt_identity(), "announcements.moderate")
    if not can_moderate:
        status = "published"
    category_id = request.args.get("category_id")
    priority = request.args.get("priority")
    query = _service.list_announcements(
        status=status, category_id=category_id, priority=priority
    )
    if can_moderate:
        items, meta = paginate(query, params)
    else:
        visible = [
            item
            for item in db.session.scalars(query).all()
            if _service.visible_to(item, _actor_roles())
        ]
        items, meta = _paginate_visible(visible, params)
    return success_response(
        data=[
            a.to_dict()
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
    visible = [
        item
        for item in db.session.scalars(query).all()
        if _service.visible_to(item, _actor_roles())
    ]
    items, meta = _paginate_visible(visible, params)
    return success_response(data=[a.to_dict() for a in items], meta=meta)


@bp.get("/<announcement_id>")
@jwt_required()
@require_permission("announcements.view")
def get_announcement(announcement_id: str):
    """Get a single announcement with approval history."""
    announcement = _service.get_announcement(uuid.UUID(announcement_id))
    if not has_permission(get_jwt_identity(), "announcements.moderate") and not _service.visible_to(
        announcement, _actor_roles()
    ):
        from app.common.exceptions import NotFoundError
        raise NotFoundError("Announcement not found.")
    return success_response(data=announcement.to_dict())


@bp.post("")
@jwt_required()
@require_permission("announcements.create")
def create_announcement():
    """Create and immediately publish an announcement.

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
    )
    _record_audit("announcement.published", announcement.id, actor)
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
        can_override=has_permission(str(actor), "announcements.moderate"),
        title=payload.title,
        body=payload.body,
        summary=payload.summary,
        category_id=payload.category_id,
        priority=payload.priority,
        target_audience=payload.target_audience,
        expires_at=payload.expires_at,
    )
    _record_audit("announcement.updated", announcement.id, actor)
    emit_update(
        "announcement",
        "updated",
        entity_id=announcement.id,
        message=f"Announcement updated: {announcement.title}",
    )
    return success_response(data=announcement.to_dict(), message="Announcement updated.")


@bp.post("/<announcement_id>/archive")
@jwt_required()
@require_permission("announcements.moderate")
def archive_announcement(announcement_id: str):
    """Archive/hide an announcement from the public feed."""
    actor = uuid.UUID(get_jwt_identity())
    announcement = _service.archive_announcement(
        uuid.UUID(announcement_id),
        actor_id=actor,
        can_override=True,
    )
    _record_audit("announcement.archived", announcement.id, actor)
    emit_update(
        "announcement",
        "archived",
        entity_id=announcement.id,
        message=f"Announcement archived: {announcement.title}",
    )
    return success_response(data=announcement.to_dict(), message="Announcement archived.")


@bp.delete("/<announcement_id>")
@jwt_required()
@require_permission("announcements.moderate")
def delete_announcement(announcement_id: str):
    """Soft-delete an announcement."""
    actor = uuid.UUID(get_jwt_identity())
    target = uuid.UUID(announcement_id)
    _service.delete_announcement(
        target,
        actor_id=actor,
        can_override=True,
    )
    _record_audit("announcement.deleted", target, actor)
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
@require_permission("announcements.moderate")
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
