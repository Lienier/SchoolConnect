"""Business logic for the registration module.

Enforces registration rules: no duplicate registration, capacity limits with
automatic waitlisting, team formation, approval workflow and cancellation.
"""

from __future__ import annotations

import uuid

from app.common.exceptions import NotFoundError, ValidationError
from app.events.repository import EventRepository
from app.registrations.model import Registration, Team, TeamMember, Waitlist
from app.registrations.repository import (
    RegistrationRepository,
    TeamRepository,
    WaitlistRepository,
)
from app.utils.datetime import utcnow


class RegistrationService:
    """Coordinates registration, team and waitlist workflows."""

    def __init__(self) -> None:
        self.registrations = RegistrationRepository()
        self.teams = TeamRepository()
        self.waitlists = WaitlistRepository()
        self.events = EventRepository()

    def _get_open_event(self, event_id: uuid.UUID):
        event = self.events.get_by_id(event_id)
        if event is None:
            raise NotFoundError("Event not found.")
        if event.status not in {"approved", "ongoing"}:
            raise ValidationError("Registration is not open for this event.")
        if event.registration_deadline and utcnow() > event.registration_deadline:
            raise ValidationError("The registration deadline has passed.")
        return event

    # --- individual registration -----------------------------------------
    def register(
        self, *, event_id: uuid.UUID, user_id: uuid.UUID, notes=None, team_id=None
    ) -> Registration:
        event = self._get_open_event(event_id)

        existing = self.registrations.get_for_user_event(user_id, event_id)
        if existing is not None and existing.status not in {"cancelled", "rejected"}:
            raise ValidationError("You are already registered for this event.")

        status = "approved" if not event.approval_required else "pending"

        if event.capacity is not None:
            active = self.registrations.count_active(event_id)
            if active >= event.capacity:
                return self._add_to_waitlist(event_id, user_id, notes)

        registration = Registration(
            event_id=event_id,
            user_id=user_id,
            team_id=team_id,
            status=status,
            notes=notes,
        )
        self.registrations.add(registration)
        self.registrations.commit()
        return registration

    def _add_to_waitlist(self, event_id, user_id, notes) -> Registration:
        registration = Registration(
            event_id=event_id, user_id=user_id, status="waitlisted", notes=notes
        )
        self.registrations.add(registration)
        entry = Waitlist(
            event_id=event_id,
            user_id=user_id,
            position=self.waitlists.next_position(event_id),
        )
        self.waitlists.add(entry)
        self.registrations.commit()
        return registration

    # --- team registration -----------------------------------------------
    def register_team(
        self, *, event_id: uuid.UUID, leader_id: uuid.UUID, name: str, member_ids: list[uuid.UUID]
    ) -> Team:
        event = self._get_open_event(event_id)
        if not event.is_team_event:
            raise ValidationError("This event does not accept team registrations.")

        members = list(dict.fromkeys([leader_id, *member_ids]))
        if event.max_team_size and len(members) > event.max_team_size:
            raise ValidationError(
                f"Team exceeds the maximum size of {event.max_team_size}."
            )

        team = Team(event_id=event_id, name=name, leader_id=leader_id)
        self.teams.add(team)
        self.teams.flush()

        for uid in members:
            if self.registrations.get_for_user_event(uid, event_id):
                raise ValidationError(
                    "One or more members are already registered for this event."
                )
            self.teams.add_member(
                TeamMember(
                    team_id=team.id,
                    user_id=uid,
                    role="leader" if uid == leader_id else "member",
                )
            )
            self.registrations.add(
                Registration(
                    event_id=event_id,
                    user_id=uid,
                    team_id=team.id,
                    status="pending" if event.approval_required else "approved",
                )
            )
        self.teams.commit()
        return team

    # --- read -------------------------------------------------------------
    def list_registrations(self, *, event_id=None, user_id=None, status=None):
        return self.registrations.list_query(
            event_id=uuid.UUID(event_id) if event_id else None,
            user_id=uuid.UUID(user_id) if user_id else None,
            status=status,
        )

    def get_registration(self, registration_id: uuid.UUID) -> Registration:
        reg = self.registrations.get_by_id(registration_id)
        if reg is None:
            raise NotFoundError("Registration not found.")
        return reg

    # --- approval ---------------------------------------------------------
    def decide(
        self, *, registration_id: uuid.UUID, reviewer_id: uuid.UUID, decision: str, notes=None
    ) -> Registration:
        if decision not in {"approved", "rejected"}:
            raise ValidationError("decision must be 'approved' or 'rejected'.")
        reg = self.get_registration(registration_id)
        if reg.status not in {"pending", "waitlisted"}:
            raise ValidationError("Only pending registrations can be decided.")
        reg.status = decision
        reg.reviewed_by = reviewer_id
        reg.reviewed_at = utcnow()
        if notes:
            reg.notes = notes
        self.registrations.commit()
        return reg

    def cancel(self, *, registration_id: uuid.UUID, actor_id: uuid.UUID) -> Registration:
        reg = self.get_registration(registration_id)
        if reg.status in {"cancelled", "attended", "absent"}:
            raise ValidationError("This registration can no longer be cancelled.")
        reg.status = "cancelled"
        reg.reviewed_by = actor_id
        reg.reviewed_at = utcnow()
        self.registrations.commit()
        self._promote_waitlist(reg.event_id)
        return reg

    def _promote_waitlist(self, event_id: uuid.UUID) -> None:
        event = self.events.get_by_id(event_id)
        if event is None or event.capacity is None:
            return
        active = self.registrations.count_active(event_id)
        if active >= event.capacity:
            return
        for entry in self.waitlists.list_for_event(event_id):
            reg = self.registrations.get_for_user_event(entry.user_id, event_id)
            if reg and reg.status == "waitlisted":
                reg.status = "pending" if event.approval_required else "approved"
                entry.promoted = True
                self.registrations.commit()
                break


__all__ = ["RegistrationService"]
