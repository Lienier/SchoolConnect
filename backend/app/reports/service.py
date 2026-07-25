"""Business logic for the reports / dashboard analytics module.

Read-only aggregations over events, registrations and attendance. These use
grouped queries rather than materialized views for simplicity at this scale
(~5k users); they can be promoted to materialized views later if needed.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select

from app.attendance.model import Attendance
from app.events.model import Event, EventCategory
from app.extensions import db
from app.registrations.model import Registration


class ReportService:
    """Produces dashboard and reporting aggregates."""

    def event_participation(self, event_id: uuid.UUID) -> dict:
        rows = db.session.execute(
            select(Registration.status, func.count(Registration.id))
            .where(Registration.event_id == event_id, Registration.deleted_at.is_(None))
            .group_by(Registration.status)
        ).all()
        return {"event_id": str(event_id), "by_status": {s: c for s, c in rows}}

    def attendance_summary(self, event_id: uuid.UUID) -> dict:
        rows = db.session.execute(
            select(Attendance.status, func.count(Attendance.id))
            .where(Attendance.event_id == event_id)
            .group_by(Attendance.status)
        ).all()
        return {"event_id": str(event_id), "by_status": {s: c for s, c in rows}}

    def attendance_percentage(self, event_id: uuid.UUID) -> dict:
        """Calculate attendance rate: (attended / approved) * 100."""
        approved_count = db.session.scalar(
            select(func.count(Registration.id)).where(
                Registration.event_id == event_id,
                Registration.deleted_at.is_(None),
                Registration.status.in_(("approved", "attended", "absent")),
            )
        ) or 0
        attended_count = db.session.scalar(
            select(func.count(Registration.id)).where(
                Registration.event_id == event_id,
                Registration.deleted_at.is_(None),
                Registration.status == "attended",
            )
        ) or 0
        percentage = round((attended_count / approved_count * 100), 2) if approved_count > 0 else 0.0
        return {
            "event_id": str(event_id),
            "approved_count": approved_count,
            "attended_count": attended_count,
            "attendance_percentage": percentage,
        }

    def department_attendance_summary(self) -> list[dict]:
        """Aggregate attendance percentage per department."""
        from app.users.model import StudentProfile, Department
        rows = db.session.execute(
            select(
                Department.name,
                func.count(Registration.id).filter(
                    Registration.status == "attended"
                ).label("attended"),
                func.count(Registration.id).filter(
                    Registration.status.in_(("approved", "attended", "absent"))
                ).label("total"),
            )
            .join(StudentProfile, Registration.user_id == StudentProfile.id)
            .join(Department, StudentProfile.department_id == Department.id)
            .where(Registration.deleted_at.is_(None))
            .group_by(Department.name)
        ).all()
        return [
            {
                "department": name,
                "attended": attended,
                "total": total,
                "percentage": round((attended / total * 100), 2) if total > 0 else 0.0,
            }
            for name, attended, total in rows
        ]

    def registration_statistics(self) -> dict:
        total = db.session.scalar(
            select(func.count(Registration.id)).where(Registration.deleted_at.is_(None))
        ) or 0
        rows = db.session.execute(
            select(Registration.status, func.count(Registration.id))
            .where(Registration.deleted_at.is_(None))
            .group_by(Registration.status)
        ).all()
        return {"total": total, "by_status": {s: c for s, c in rows}}

    def most_active_students(self, limit: int = 10) -> list[dict]:
        rows = db.session.execute(
            select(Registration.user_id, func.count(Registration.id).label("cnt"))
            .where(Registration.deleted_at.is_(None))
            .group_by(Registration.user_id)
            .order_by(func.count(Registration.id).desc())
            .limit(limit)
        ).all()
        return [{"user_id": str(uid), "registrations": cnt} for uid, cnt in rows]

    def popular_categories(self, limit: int = 10) -> list[dict]:
        rows = db.session.execute(
            select(EventCategory.name, func.count(Registration.id).label("cnt"))
            .join(Event, Event.category_id == EventCategory.id)
            .join(Registration, Registration.event_id == Event.id)
            .where(Registration.deleted_at.is_(None))
            .group_by(EventCategory.name)
            .order_by(func.count(Registration.id).desc())
            .limit(limit)
        ).all()
        return [{"category": name, "registrations": cnt} for name, cnt in rows]

    def dashboard(self) -> dict:
        total_events = db.session.scalar(
            select(func.count(Event.id)).where(Event.deleted_at.is_(None))
        ) or 0
        upcoming = db.session.scalar(
            select(func.count(Event.id)).where(
                Event.deleted_at.is_(None),
                Event.status.in_(("approved", "ongoing")),
            )
        ) or 0
        pending = db.session.scalar(
            select(func.count(Event.id)).where(
                Event.deleted_at.is_(None), Event.status == "pending_approval"
            )
        ) or 0
        return {
            "total_events": total_events,
            "upcoming_events": upcoming,
            "pending_approvals": pending,
            "registrations": self.registration_statistics(),
            "popular_categories": self.popular_categories(5),
            "department_attendance": self.department_attendance_summary(),
        }


__all__ = ["ReportService"]
