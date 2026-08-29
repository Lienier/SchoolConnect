"""Business logic for the events module.

Handles event creation, updates, lifecycle transitions and soft deletion.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy import or_

from app.common.exceptions import NotFoundError, ValidationError
from app.events.model import (
    CalendarEvent,
    Event,
    EventCategory,
    EventResult,
)
from app.events.repository import (
    CalendarEventRepository,
    EventCategoryRepository,
    EventRepository,
    EventResultRepository,
)
from app.extensions import db
from app.utils.datetime import date_in_app_timezone, today_in_app_timezone, utcnow

_VALID_STATUSES = {"approved", "ongoing", "completed", "cancelled", "archived"}
_STATUS_TRANSITIONS = {
    "approved": {"ongoing", "cancelled", "archived"},
    "ongoing": {"completed", "cancelled", "archived"},
    "completed": {"archived"},
    "cancelled": {"archived"},
    "archived": set(),
}


def _parse_dt(value, field: str) -> datetime:
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        raise ValidationError(f"{field} must be a valid ISO-8601 datetime.")


def _require_not_before_today(value: datetime, field: str) -> None:
    if date_in_app_timezone(value) < today_in_app_timezone():
        raise ValidationError(f"{field} cannot be in the past.")


class EventService:
    """Coordinates event workflows across repositories."""

    def __init__(self) -> None:
        self.events = EventRepository()
        self.categories = EventCategoryRepository()
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
    ) -> Event:
        start = _parse_dt(start_time, "start_time")
        end = _parse_dt(end_time, "end_time")
        _require_not_before_today(start, "start_time")
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
        if deadline:
            _require_not_before_today(deadline, "registration_deadline")
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
            status="approved",
            created_by=organizer_id,
            updated_by=organizer_id,
        )
        self.events.add(event)
        self.events.flush()
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
        previous_capacity = event.capacity
        if event.status != "approved":
            raise ValidationError("Only upcoming approved events can be edited.")
        # Organizers, assigned officers, and admins may edit upcoming events.
        from app.common.ownership import enforce_owner_or_permission

        from app.events.access import can_manage_event

        if not can_override and not can_manage_event(actor_id, event):
            enforce_owner_or_permission(
                record_owner_id=event.organizer_id,
                user_id=actor_id,
                has_permission=False,
                message="You can only edit events you organize or are assigned to.",
            )

        if fields.get("start_time") is not None:
            event.start_time = _parse_dt(fields["start_time"], "start_time")
            _require_not_before_today(event.start_time, "start_time")
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
            _require_not_before_today(event.registration_deadline, "registration_deadline")
        if event.capacity is not None and event.capacity < 0:
            raise ValidationError("capacity cannot be negative.")
        if event.registration_deadline and event.registration_deadline > event.start_time:
            raise ValidationError("registration_deadline must be on or before start_time.")
        if event.capacity is not None:
            from app.registrations.repository import RegistrationRepository

            if RegistrationRepository().count_active(event.id) > event.capacity:
                raise ValidationError("capacity cannot be below the current registration count.")

        event.updated_by = actor_id
        calendar_event = self.calendar.get_for_event(event.id)
        if calendar_event is not None:
            calendar_event.title = event.title
            calendar_event.start_time = event.start_time
            calendar_event.end_time = event.end_time
            calendar_event.color = event.category.color if event.category else None
            calendar_event.is_public = event.status in {"approved", "ongoing"}
        self.events.commit()
        if event.capacity != previous_capacity:
            from app.registrations.service import RegistrationService

            RegistrationService().fill_waitlist(event.id)
        return event

    # --- workflow ---------------------------------------------------------
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
        from app.events.access import can_manage_event
        if not can_override and not can_manage_event(actor_id, event):
            raise ValidationError("You can only manage results for events assigned to you.")
        self.results.delete(result)
        self.results.commit()

    def update_result(self, result_id: uuid.UUID, actor_id: uuid.UUID, can_override: bool = False, **fields) -> EventResult:
        result = self.results.get_by_id(result_id)
        if result is None:
            raise NotFoundError("Event result not found.")
        event = self.get_event(result.event_id)
        from app.events.access import can_manage_event
        if not can_override and not can_manage_event(actor_id, event):
            raise ValidationError("You can only manage results for events assigned to you.")
        for key, value in fields.items():
            setattr(result, key, value)
        self.results.commit()
        return result

    def change_status(self, event_id: uuid.UUID, actor_id: uuid.UUID, status: str) -> Event:
        if status not in _VALID_STATUSES:
            raise ValidationError("Invalid event status.")
        event = self.get_event(event_id)
        if status == event.status:
            return event
        if status not in _STATUS_TRANSITIONS.get(event.status, set()):
            raise ValidationError(f"Event cannot transition from {event.status} to {status}.")
        now = utcnow()
        if status == "ongoing" and now < _as_aware_utc(event.start_time):
            raise ValidationError("An event cannot start before its scheduled start time.")
        if status == "completed" and now < _as_aware_utc(event.end_time):
            raise ValidationError("An event cannot complete before its scheduled end time.")
        event.status = status
        event.updated_by = actor_id
        calendar_event = self.calendar.get_for_event(event.id)
        if calendar_event is not None:
            calendar_event.is_public = status in {"approved", "ongoing"}
        self.events.commit()
        return event

    def refresh_lifecycle(self) -> None:
        """Advance scheduled events when an event surface is requested."""
        now = utcnow()
        changed = False
        events = db.session.scalars(
            db.select(Event).where(
                Event.deleted_at.is_(None), Event.status.in_(("approved", "ongoing"))
            )
        ).all()
        for event in events:
            end = _as_aware_utc(event.end_time)
            start = _as_aware_utc(event.start_time)
            next_status = "completed" if end <= now else "ongoing" if start <= now else None
            if next_status and next_status != event.status:
                event.status = next_status
                calendar_event = self.calendar.get_for_event(event.id)
                if calendar_event is not None:
                    calendar_event.is_public = next_status == "ongoing"
                changed = True
        if changed:
            self.events.commit()

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


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
