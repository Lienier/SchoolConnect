"""Data-access layer for the registration module."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select

from app.extensions import db
from app.registrations.model import Registration, Team, TeamMember, Waitlist


class RegistrationRepository:
    """Persistence operations for ``Registration``."""

    def get_by_id(self, entity_id: uuid.UUID) -> Registration | None:
        return db.session.scalar(
            select(Registration).where(
                Registration.id == entity_id, Registration.deleted_at.is_(None)
            )
        )

    def get_for_user_event(self, user_id: uuid.UUID, event_id: uuid.UUID) -> Registration | None:
        return db.session.scalar(
            select(Registration).where(
                Registration.user_id == user_id,
                Registration.event_id == event_id,
                Registration.deleted_at.is_(None),
            )
        )

    def list_query(self, *, event_id=None, user_id=None, status=None):
        stmt = select(Registration).where(Registration.deleted_at.is_(None))
        if event_id:
            stmt = stmt.where(Registration.event_id == event_id)
        if user_id:
            stmt = stmt.where(Registration.user_id == user_id)
        if status:
            stmt = stmt.where(Registration.status == status)
        return stmt.order_by(Registration.created_at.desc())

    def count_active(self, event_id: uuid.UUID) -> int:
        return db.session.scalar(
            select(func.count(Registration.id)).where(
                Registration.event_id == event_id,
                Registration.deleted_at.is_(None),
                Registration.status.in_(("pending", "approved", "attended")),
            )
        ) or 0

    def add(self, entity: Registration) -> Registration:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()


class TeamRepository:
    """Persistence operations for ``Team`` and ``TeamMember``."""

    def get_by_id(self, entity_id: uuid.UUID) -> Team | None:
        return db.session.scalar(select(Team).where(Team.id == entity_id))

    def get_by_code(self, code: str) -> Team | None:
        return db.session.scalar(select(Team).where(Team.team_code == code))

    def add(self, entity: Team) -> Team:
        db.session.add(entity)
        return entity

    def add_member(self, member: TeamMember) -> TeamMember:
        db.session.add(member)
        return member

    def flush(self) -> None:
        db.session.flush()

    def commit(self) -> None:
        db.session.commit()


class WaitlistRepository:
    """Persistence operations for ``Waitlist``."""

    def next_position(self, event_id: uuid.UUID) -> int:
        current = db.session.scalar(
            select(func.max(Waitlist.position)).where(Waitlist.event_id == event_id)
        )
        return (current or 0) + 1

    def list_for_event(self, event_id: uuid.UUID) -> list[Waitlist]:
        return list(
            db.session.scalars(
                select(Waitlist)
                .where(Waitlist.event_id == event_id, Waitlist.promoted.is_(False))
                .order_by(Waitlist.position.asc())
            ).all()
        )

    def add(self, entity: Waitlist) -> Waitlist:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()
