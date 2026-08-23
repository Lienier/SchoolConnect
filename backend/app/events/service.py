"""Business logic for the events module.

Handles event creation (draft / submitted), updates, listing, the approval
workflow (which publishes to the calendar), lifecycle transitions and soft
deletion.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import or_

from app.common.exceptions import NotFoundError, ValidationError
from app.events.model import (
    CalendarEvent,
    Event,
    EventApproval,
    EventCategory,
    EventResult,
)
from app.events.repository import (
    CalendarEventRepository,
    EventApprovalRepository,
    EventCategoryRepository,
    EventRepository,
    EventResultRepository,
)
from app.utils.datetime import utcnow

_VALID_STATUSES = {
    "draft",
    "pending_approval",
    "approved",
    "ongoing",
    "completed",
    "cancelled",
    "archived",
}


def _parse_dt(value, field: str) -> datetime:
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        raise ValidationError(f"{field} must be a valid ISO-8601 datetime.")


class EventService:
    """Coordinates event workflows across repositories."""

    def __init__(self) -> None:
        self.events = EventRepository()
        self.categories = EventCategoryRepository()
        self.approvals = EventApprovalRepository()
        self.calendar = CalendarEventRepository()
        self.results = EventResultRepository()

    # --- categories -------------------------------------------------------
    def list_categories(self) -> list[EventCategory]:
        return self.categories.list_all()

    def create_category(
        self, *, name: str, slug: str, description=None, color=None
    ) -> EventCategory:
        category = EventCategory(
            name=name, slug=slug, description=description, color=color
        )
        self.categories.add(category)
        self.categories.commit()
        return category

    # --- read -------------------------------------------------------------
    def list_events(self, *, status=None, category_id=None, organizer_id=None, search=None):
        cat = uuid.UUID(category_id) if category_id else None
        org = uuid.UUID(organizer_id) if organizer_id else None
        return self.events.list_query(
            status=status, category_id=cat, organizer_id=org, search=search
        )

    def get_event(self, event_id: uuid.UUID) -> Event:
        event = self.events.get_by_id(event_id)
        if event is None:
            raise NotFoundError("Event not found.")
        return event

    # --- create -----------------------------------------------------------
    def create_event(
        self,
        *,
        organizer_id: uuid.UUID,
        title: str,
        description,
        category_id,
        start_time,
        end_time,
        location,
        capacity,
        registration_deadline,
        is_team_event: bool,
        max_team_size,
        submit_for_approval: bool,
    ) -> Event:
        start = _parse_dt(start_time, "start_time")
        end = _parse_dt(end_time, "end_time")
        if end <= start:
            raise ValidationError("end_time must be after start_time.")
        if capacity is not None and capacity < 0:
            raise ValidationError("capacity cannot be negative.")
        if is_team_event and (max_team_size is None or max_team_size < 2):
            raise ValidationError("Team events require max_team_size >= 2.")

        deadline = (
            _parse_dt(registration_deadline, "registration_deadline")
            if registration_deadline
            else None
        )
        if deadline and deadline > start:
            raise ValidationError("registration_deadline must be on or before start_time.")

        event = Event(
            title=title,
            description=description,
            category_id=uuid.UUID(category_id) if category_id else None,
            organizer_id=organizer_id,
            start_time=start,
            end_time=end,
            location=location,
            capacity=capacity,
            registration_deadline=deadline,
            is_team_event=is_team_event,
            max_team_size=max_team_size,
            status="pending_approval" if submit_for_approval else "draft",
            created_by=organizer_id,
            updated_by=organizer_id,
        )
        self.events.add(event)
        self.events.commit()
        return event

    # --- update -----------------------------------------------------------
    def update_event(
        self,
        event_id: uuid.UUID,
        actor_id: uuid.UUID,
        *,
        can_override: bool = False,
        **fields,
    ) -> Event:
        event = self.get_event(event_id)
        if event.status not in {"draft", "pending_approval", "approved", "returned"}:
            raise ValidationError("Only draft, pending, approved, or returned events can be edited.")
        # Security guardrail: if an approved event is edited by a non-admin,
        # automatically reset to pending_approval to require re-verification.
        if event.status == "approved" and not can_override:
            event.status = "pending_approval"
        # Enforce owner-or-override: teachers/admins with events.approve may
        # edit any event; otherwise the actor must be the organizer.
        from app.common.ownership import enforce_owner_or_permission

        enforce_owner_or_permission(
            record_owner_id=event.organizer_id,
            user_id=actor_id,
            has_permission=can_override,
            message="You can only edit events you organize.",
        )

        if fields.get("start_time") is not None:
            event.start_time = _parse_dt(fields["start_time"], "start_time")
        if fields.get("end_time") is not None:
            event.end_time = _parse_dt(fields["end_time"], "end_time")
        if event.end_time <= event.start_time:
            raise ValidationError("end_time must be after start_time.")

        for attr in (
            "title",
            "description",
            "location",
            "capacity",
            "is_team_event",
            "max_team_size",
        ):
            if fields.get(attr) is not None:
                setattr(event, attr, fields[attr])
        if fields.get("category_id") is not None:
            event.category_id = uuid.UUID(fields["category_id"])
        if fields.get("registration_deadline") is not None:
            event.registration_deadline = _parse_dt(
                fields["registration_deadline"], "registration_deadline"
            )
        if event.capacity is not None and event.capacity < 0:
            raise ValidationError("capacity cannot be negative.")

        event.updated_by = actor_id
        self.events.commit()
        return event

    # --- workflow ---------------------------------------------------------
    def submit_for_approval(self, event_id: uuid.UUID, actor_id: uuid.UUID) -> Event:
        event = self.get_event(event_id)
        if event.status != "draft":
            raise ValidationError("Only draft events can be submitted.")
        event.status = "pending_approval"
        event.updated_by = actor_id
        self.events.commit()
        return event

    def decide(
        self,
        *,
        event_id: uuid.UUID,
        reviewer_id: uuid.UUID,
        decision: str,
        comment=None,
    ) -> Event:
        if decision not in {"approved", "rejected", "returned"}:
            raise ValidationError("decision must be 'approved', 'rejected', or 'returned'.")
        event = self.get_event(event_id)
        if event.status != "pending_approval":
            raise ValidationError("Event is not pending approval.")

        approval = EventApproval(
            event_id=event.id,
            reviewer_id=reviewer_id,
            decision=decision,
            comment=comment,
            decided_at=utcnow(),
        )
        self.approvals.add(approval)

        if decision == "approved":
            event.status = "approved"
            self.calendar.add(
                CalendarEvent(
                    event_id=event.id,
                    title=event.title,
                    start_time=event.start_time,
                    end_time=event.end_time,
                    color=event.category.color if event.category else None,
                    is_public=True,
                )
            )
        else:
            event.status = "returned" if decision == "returned" else "draft"
        event.updated_by = reviewer_id
        self.events.commit()
        try:
            from app.notifications.service import NotificationService
            NotificationService().notify(user_id=event.organizer_id, title=f"Event {event.status}", body=f"Your event '{event.title}' was {event.status}.", category="event_workflow", entity_type="event", entity_id=event.id)
        except Exception:
            pass
        return event

    def list_results(self, event_id: uuid.UUID) -> list[EventResult]:
        self.get_event(event_id)
        return self.results.list_for_event(event_id)

    def create_result(self, event_id: uuid.UUID, actor_id: uuid.UUID, **fields) -> EventResult:
        event = self.get_event(event_id)
        if event.status not in {"completed", "ongoing"}:
            raise ValidationError("Results can only be added to ongoing or completed events.")
        result = EventResult(event_id=event_id, created_by=actor_id, **fields)
        self.results.add(result)
        self.results.commit()
        return result

    def delete_result(self, result_id: uuid.UUID, actor_id: uuid.UUID, can_override: bool = False) -> None:
        result = self.results.get_by_id(result_id)
        if result is None:
            raise NotFoundError("Event result not found.")
        event = self.get_event(result.event_id)
        if not can_override and event.organizer_id != actor_id:
            raise ValidationError("You can only manage results for your own events.")
        self.results.delete(result)
        self.results.commit()

    def update_result(self, result_id: uuid.UUID, actor_id: uuid.UUID, can_override: bool = False, **fields) -> EventResult:
        result = self.results.get_by_id(result_id)
        if result is None:
            raise NotFoundError("Event result not found.")
        event = self.get_event(result.event_id)
        if not can_override and event.organizer_id != actor_id:
            raise ValidationError("You can only manage results for your own events.")
        for key, value in fields.items():
            setattr(result, key, value)
        self.results.commit()
        return result

    def change_status(self, event_id: uuid.UUID, actor_id: uuid.UUID, status: str) -> Event:
        if status not in _VALID_STATUSES:
            raise ValidationError("Invalid event status.")
        event = self.get_event(event_id)
        event.status = status
        event.updated_by = actor_id
        self.events.commit()
        return event

    # --- delete -----------------------------------------------------------
    def delete_event(
        self, event_id: uuid.UUID, actor_id: uuid.UUID, *, can_override: bool = False
    ) -> None:
        event = self.get_event(event_id)
        from app.common.ownership import enforce_owner_or_permission

        enforce_owner_or_permission(
            record_owner_id=event.organizer_id,
            user_id=actor_id,
            has_permission=can_override,
            message="You can only delete events you organize.",
        )
        event.soft_delete()
        event.updated_by = actor_id
        self.events.commit()
