"""Business logic for the registration module.

Enforces registration rules: no duplicate registration, capacity limits with
automatic waitlisting, team formation, approval workflow and cancellation.
"""

from __future__ import annotations

import uuid
from datetime import timezone

from app.common.exceptions import AuthorizationError, NotFoundError, ValidationError
from app.events.repository import EventRepository
from app.events.model import Event, EventRequirement
from app.users.model import Section, StudentProfile
from app.registrations.model import Registration, Team, TeamMember, Waitlist
from app.registrations.repository import (
    RegistrationRepository,
    TeamRepository,
    WaitlistRepository,
)
from app.utils.datetime import utcnow
from app.extensions import db
from app.permissions.decorators import has_permission
from sqlalchemy import select, and_
import random
import string


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
        if event.registration_deadline and utcnow() > _as_aware_utc(event.registration_deadline):
            raise ValidationError("The registration deadline has passed.")
        return event

    # --- individual registration -----------------------------------------
    def _check_schedule_conflict(self, user_id: uuid.UUID, event: Event) -> None:
        if not event.start_time or not event.end_time:
            return
        
        stmt = select(Registration).join(Event).where(
            Registration.user_id == user_id,
            Registration.status.notin_({"cancelled", "rejected"}),
            Event.start_time < _as_aware_utc(event.end_time),
            Event.end_time > _as_aware_utc(event.start_time),
        )
        conflict = db.session.scalar(stmt)
        if conflict:
            raise ValidationError("Schedule conflict: you are already registered for an event during this time.")

    def _check_eligibility(self, user_id: uuid.UUID, event_id: uuid.UUID) -> None:
        stmt = select(EventRequirement).where(EventRequirement.event_id == event_id, EventRequirement.is_mandatory == True)
        requirements = db.session.scalars(stmt).all()
        if not requirements:
            return
            
        profile = db.session.get(StudentProfile, user_id)
        if not profile:
            raise ValidationError("You do not meet the eligibility requirements for this event.")
            
        for req in requirements:
            if req.requirement_type == "year_level" and str(profile.year_level) != req.requirement_value:
                raise ValidationError("You do not meet the eligibility requirements for this event.")
            if req.requirement_type == "department" and str(profile.department_id) != req.requirement_value:
                raise ValidationError("You do not meet the eligibility requirements for this event.")
            if req.requirement_type == "course_section":
                section = db.session.get(Section, profile.section_id) if profile.section_id else None
                allowed_values = {
                    str(profile.section_id) if profile.section_id else "",
                    f"{section.course_id}:{profile.section_id}" if section else "",
                }
                if str(req.requirement_value) not in allowed_values:
                    raise ValidationError("You do not meet the eligibility requirements for this event.")

    def register(
        self, *, event_id: uuid.UUID, user_id: uuid.UUID, notes=None, team_id=None
    ) -> Registration:
        event = self._get_open_event(event_id)

        existing = self.registrations.get_for_user_event(user_id, event_id)
        if existing is not None and existing.status not in {"cancelled", "rejected"}:
            raise ValidationError("You are already registered for this event.")
            
        self._check_schedule_conflict(user_id, event)
        self._check_eligibility(user_id, event_id)

        status = "approved" if not event.approval_required else "pending"

        if event.capacity is not None:
            active = self.registrations.count_active(event_id)
            if active >= event.capacity:
                return self._add_to_waitlist(event_id, user_id, notes)

        if existing is not None:
            existing.team_id = team_id
            existing.status = status
            existing.notes = notes
            existing.reviewed_by = None
            existing.reviewed_at = None
            existing.deleted_at = None
            registration = existing
        else:
            registration = Registration(
                event_id=event_id,
                user_id=user_id,
                team_id=team_id,
                status=status,
                notes=notes,
            )
            self.registrations.add(registration)
        self.registrations.commit()
        self._notify(user_id, f"Registration {registration.status}", f"Your registration for '{event.title}' is {registration.status}.", event.id)
        return registration

    @staticmethod
    def _notify(user_id: uuid.UUID, title: str, body: str, event_id: uuid.UUID) -> None:
        try:
            from app.notifications.service import NotificationService
            NotificationService().notify(user_id=user_id, title=title, body=body, category="registration_workflow", entity_type="event", entity_id=event_id)
        except Exception:
            pass

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
    @staticmethod
    def _generate_team_code() -> str:
        chars = string.ascii_uppercase + string.digits
        return "SC-" + "".join(random.choices(chars, k=4))

    @staticmethod
    def normalize_team_code(team_code: str) -> str:
        value = str(team_code or "").strip().upper()
        for hyphen in (chr(0x2010), chr(0x2011), chr(0x2012), chr(0x2013), chr(0x2014), chr(0x2212)):
            value = value.replace(hyphen, "-")
        value = "".join(value.split())
        if value.startswith("SC") and not value.startswith("SC-") and len(value) > 2:
            value = f"SC-{value[2:]}"
        return value

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

        existing_by_user = {
            uid: self.registrations.get_for_user_event(uid, event_id)
            for uid in members
        }
        if any(
            existing is not None and existing.status not in {"cancelled", "rejected"}
            for existing in existing_by_user.values()
        ):
            raise ValidationError(
                "One or more members are already registered for this event."
            )

        team = Team(event_id=event_id, name=name, leader_id=leader_id, team_code=self._generate_team_code())
        self.teams.add(team)
        self.teams.flush()

        for uid in members:
            self.teams.add_member(
                TeamMember(
                    team_id=team.id,
                    user_id=uid,
                    role="leader" if uid == leader_id else "member",
                )
            )
            existing = existing_by_user[uid]
            if existing is not None:
                existing.team_id = team.id
                existing.status = "pending" if event.approval_required else "approved"
                existing.notes = None
                existing.reviewed_by = None
                existing.reviewed_at = None
                existing.deleted_at = None
            else:
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

    def join_team_by_code(self, *, team_code: str, user_id: uuid.UUID) -> Registration:
        team = self.teams.get_by_code(self.normalize_team_code(team_code))
        if team is None:
            raise NotFoundError("Invalid team code.")
        event = self._get_open_event(team.event_id)
        # Check if already registered
        existing = self.registrations.get_for_user_event(user_id, team.event_id)
        if existing is not None and existing.status not in {"cancelled", "rejected"}:
            raise ValidationError("You are already registered for this event.")
        # Check team size
        already_member = any(member.user_id == user_id for member in team.members)
        current_members = len(team.members)
        if event.max_team_size and current_members >= event.max_team_size and not already_member:
            raise ValidationError("This team is already full.")
        # Add member and register
        if not already_member:
            self.teams.add_member(TeamMember(team_id=team.id, user_id=user_id, role="member"))
        status = "pending" if event.approval_required else "approved"
        if existing is not None:
            existing.team_id = team.id
            existing.status = status
            existing.notes = None
            existing.reviewed_by = None
            existing.reviewed_at = None
            existing.deleted_at = None
            registration = existing
        else:
            registration = Registration(
                event_id=team.event_id, user_id=user_id, team_id=team.id, status=status
            )
            self.registrations.add(registration)
        self.registrations.commit()
        return registration

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
        event = self.events.get_by_id(reg.event_id)
        if event:
            self._notify(reg.user_id, f"Registration {decision}", f"Your registration for '{event.title}' was {decision}.", event.id)
        return reg

    def cancel(self, *, registration_id: uuid.UUID, actor_id: uuid.UUID) -> Registration:
        reg = self.get_registration(registration_id)

        # A registration may only be cancelled by its owner, its team leader,
        # or a staff member with the explicit registrations.manage permission.
        is_owner = reg.user_id == actor_id
        is_team_leader = False
        if reg.team_id is not None:
            team = db.session.get(Team, reg.team_id)
            is_team_leader = team is not None and team.leader_id == actor_id
        if not (is_owner or is_team_leader or has_permission(actor_id, "registrations.manage")):
            raise AuthorizationError("You can only cancel your own registration.")
        
        event = self.events.get_by_id(reg.event_id)
        if event and event.registration_deadline and utcnow() > _as_aware_utc(event.registration_deadline):
            raise ValidationError("Cancellations are locked after the registration deadline.")
            
        if reg.status in {"cancelled", "attended", "absent"}:
            raise ValidationError("This registration can no longer be cancelled.")
        reg.status = "cancelled"
        reg.reviewed_by = actor_id
        reg.reviewed_at = utcnow()
        self.registrations.commit()
        self._promote_waitlist(reg.event_id)
        event = self.events.get_by_id(reg.event_id)
        if event:
            self._notify(reg.user_id, "Registration cancelled", f"Your registration for '{event.title}' was cancelled.", event.id)
        return reg

    def promote(self, *, registration_id: uuid.UUID, actor_id: uuid.UUID) -> Registration:
        reg = self.get_registration(registration_id)
        if reg.status != "waitlisted":
            raise ValidationError("Only waitlisted registrations can be promoted.")
        event = self.events.get_by_id(reg.event_id)
        if event is None or (event.capacity is not None and self.registrations.count_active(event.id) >= event.capacity):
            raise ValidationError("No capacity is currently available.")
        reg.status = "pending" if event.approval_required else "approved"
        reg.reviewed_by = actor_id
        reg.reviewed_at = utcnow()
        self.registrations.commit()
        self._notify(reg.user_id, f"Registration {reg.status}", f"You were moved from the waitlist for '{event.title}'.", event.id)
        return reg

    def remove(self, *, registration_id: uuid.UUID, actor_id: uuid.UUID) -> None:
        reg = self.get_registration(registration_id)
        if not has_permission(str(actor_id), "registrations.manage"):
            raise AuthorizationError("You do not have permission to remove registrations.")
        reg.deleted_at = utcnow()
        self.registrations.commit()

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


def _as_aware_utc(value):
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)
