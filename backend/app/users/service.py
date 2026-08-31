"""Business logic for the users module.

Handles administrative user CRUD, role assignment (RBAC) and self-service
profile updates. Services raise domain exceptions; routes translate them into
standardized responses.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.auth.model import User
from app.auth.repository import UserRepository
from app.common.exceptions import ConflictError, NotFoundError, ValidationError
from app.extensions import db
from app.permissions.model import Role
from app.users.repository import RoleRepository, UserRoleRepository
from app.users.model import (
    AdministratorProfile,
    Course,
    Department,
    OfficerProfile,
    Organization,
    Section,
    StudentProfile,
    TeacherProfile,
)


class UserService:
    """Coordinates user administration workflows."""

    def __init__(self) -> None:
        self.users = UserRepository()
        self.roles = RoleRepository()
        self.user_roles = UserRoleRepository()
        self.student_roles = {"student", "student_council", "department_student_leader"}
        self.officer_roles = {"student_council", "department_student_leader"}

    # --- admin CRUD -------------------------------------------------------
    def list_users_query(self):
        """Return a ``Select`` of active (non-deleted) users for querying."""
        return select(User).where(User.deleted_at.is_(None))

    def create_user(
        self, *, email: str, full_name: str, password: str, roles: list[str],
        first_name=None, middle_name=None, last_name=None, username=None,
        status: str = "active", student_number=None, department_id=None,
        course_id=None, section_id=None, officer_position=None,
        actor_id: uuid.UUID | None = None,
    ) -> User:
        """Admin-created user with explicit role assignment."""
        from app.auth.service import AuthService

        status = "active"
        roles = list(dict.fromkeys(roles))
        if self.users.get_by_email(email):
            raise ConflictError("An account with this email already exists.")
        role_objs = self._resolve_roles(roles)
        role_names = {role.name for role in role_objs}
        if not username:
            username = self._generated_username(
                email=email,
                role_names=role_names,
                student_number=student_number,
            )
        if username and self.users.get_by_username(username):
            raise ConflictError("This username is already taken.")
        self._validate_status(status)

        self._validate_profile_payload(
            role_names=role_names,
            student_number=student_number,
            department_id=department_id,
            course_id=course_id,
            section_id=section_id,
            officer_position=officer_position,
        )
        user = User(
            email=email,
            full_name=self._display_name(first_name, middle_name, last_name, full_name),
            first_name=first_name,
            middle_name=middle_name,
            last_name=last_name,
            username=username,
            password_hash=AuthService._hash_password(password),
            status=status,
            email_verified=True,
            created_by=actor_id,
        )
        self.users.add(user)
        self.users.flush()
        self.user_roles.replace_roles(
            user.id, [r.id for r in role_objs]
        )
        self._create_role_profiles(
            user,
            role_names=role_names,
            student_number=student_number,
            department_id=department_id,
            course_id=course_id,
            section_id=section_id,
            officer_position=officer_position,
        )
        self.users.commit()
        return user

    def list_users(self, page: int = 1, page_size: int = 20, status: str | None = None):
        """Return a paginated list of users (placeholder; paging in routes)."""
        from sqlalchemy import select

        stmt = select(User).where(User.deleted_at.is_(None))
        if status:
            stmt = stmt.where(User.status == status)
        return stmt

    def get_user(self, user_id: uuid.UUID) -> User:
        """Return a user or raise NotFound."""
        user = self.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found.")
        return user

    def update_user(self, user_id: uuid.UUID, **fields) -> User:
        """Update modifiable user fields."""
        user = self.get_user(user_id)
        if "status" in fields and fields["status"] is not None:
            self._validate_status(fields["status"])
        for key, value in fields.items():
            if value is not None:
                setattr(user, key, value)
        if any(fields.get(key) is not None for key in ("first_name", "middle_name", "last_name")):
            user.full_name = self._display_name(
                user.first_name, user.middle_name, user.last_name, user.full_name
            )
        self.users.commit()
        return user

    # --- status transitions ----------------------------------------------
    def disable_user(self, user_id: uuid.UUID, *, reason: str | None = None) -> User:
        """Disable a user (sets status to ``inactive``)."""
        user = self.get_user(user_id)
        if user.status == "inactive":
            return user
        user.status = "inactive"
        self._revoke_sessions(user.id)
        self.users.commit()
        return user

    def suspend_user(self, user_id: uuid.UUID) -> User:
        """Suspend a user (sets status to ``suspended``)."""
        user = self.get_user(user_id)
        user.status = "suspended"
        self._revoke_sessions(user.id)
        self.users.commit()
        return user

    def reactivate_user(self, user_id: uuid.UUID) -> User:
        """Reactivate a disabled/suspended user (sets status to ``active``)."""
        user = self.get_user(user_id)
        user.status = "active"
        self.users.commit()
        return user

    # --- admin password reset --------------------------------------------
    def admin_reset_password(self, user_id: uuid.UUID, *, new_password: str) -> None:
        """Forcefully set a new password for a user (admin action)."""
        from app.auth.repository import RefreshTokenRepository

        user = self.get_user(user_id)
        if len(new_password) < 8:
            raise ValidationError("Password must be at least 8 characters.")
        user.password_hash = self._hash_password(new_password)
        RefreshTokenRepository().revoke_all_for_user(user.id)
        self.users.commit()

    def set_avatar(self, user_id: uuid.UUID, url: str) -> User:
        """Set a user's profile-picture URL."""
        user = self.get_user(user_id)
        user.avatar_url = url
        self.users.commit()
        return user

    def soft_delete_user(self, user_id: uuid.UUID) -> None:
        """Soft-delete a user."""
        user = self.get_user(user_id)
        user.soft_delete()
        self._revoke_sessions(user.id)
        self.users.commit()

    # --- roles ------------------------------------------------------------
    def assign_roles(
        self,
        user_id: uuid.UUID,
        role_names: list[str],
        *,
        student_number=None,
        department_id=None,
        course_id=None,
        section_id=None,
        officer_position=None,
    ) -> User:
        """Replace a user's roles with the given set."""
        user = self.get_user(user_id)
        role_objs = self._resolve_roles(role_names)
        next_role_names = {role.name for role in role_objs}
        self._sync_profiles_for_role_assignment(
            user.id,
            next_role_names,
            student_number=student_number,
            department_id=department_id,
            course_id=course_id,
            section_id=section_id,
            officer_position=officer_position,
        )
        self.user_roles.replace_roles(user.id, [r.id for r in role_objs])
        self.users.commit()
        return user

    def list_roles(self) -> list[Role]:
        """Return all roles."""
        return self.roles.list_all()

    # --- self profile -----------------------------------------------------
    def update_own_profile(self, user: User, *, phone=None, first_name=None,
                           last_name=None) -> User:
        """Update the authenticated user's own basic profile fields."""
        if phone is not None:
            user.phone = phone
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if first_name is not None or last_name is not None:
            user.full_name = self._display_name(
                user.first_name, user.middle_name, user.last_name, user.full_name
            )
        self.users.commit()
        return user

    def student_profile_data(self, user_id: uuid.UUID) -> dict:
        """Serialize a student's college structure profile."""
        profile = db.session.get(StudentProfile, user_id)
        if profile is None:
            raise NotFoundError("Student profile not found.")
        return {
            "student_number": profile.student_number,
            "department_id": str(profile.department_id) if profile.department_id else None,
            "course_id": str(profile.course_id) if profile.course_id else None,
            "section_id": str(profile.section_id) if profile.section_id else None,
            "year_level": profile.year_level,
            "profile_completed": profile.profile_completed,
        }

    def update_student_profile(
        self, user_id: uuid.UUID, *, department_id, course_id, section_id
    ) -> StudentProfile:
        """Validate and save the current student's college structure selection."""
        profile = db.session.get(StudentProfile, user_id)
        if profile is None:
            raise NotFoundError("Student profile not found.")
        department_uuid = self._uuid_or_none(department_id)
        course_uuid = self._uuid_or_none(course_id)
        section_uuid = self._uuid_or_none(section_id)
        if not all((department_uuid, course_uuid, section_uuid)):
            raise ValidationError("Department, course, and section are required.")
        department = db.session.get(Department, department_uuid)
        course = db.session.get(Course, course_uuid)
        section = db.session.get(Section, section_uuid)
        if department is None or course is None or section is None:
            raise ValidationError("Invalid college structure selection.")
        if course.department_id != department.id or section.course_id != course.id:
            raise ValidationError("Course and section must belong to the selected department.")
        profile.department_id = department.id
        profile.course_id = course.id
        profile.section_id = section.id
        profile.profile_completed = bool(profile.student_number)
        db.session.commit()
        return profile

    # --- helpers ----------------------------------------------------------
    @staticmethod
    def _hash_password(password: str) -> str:
        """Return a bcrypt hash for an admin-set password."""
        import bcrypt

        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def _validate_status(status: str) -> None:
        allowed = {"active", "inactive", "suspended", "invited"}
        if status not in allowed:
            raise ValidationError(f"Invalid status '{status}'.")

    @staticmethod
    def _revoke_sessions(user_id: uuid.UUID) -> None:
        from app.auth.repository import RefreshTokenRepository

        RefreshTokenRepository().revoke_all_for_user(user_id)

    def _resolve_roles(self, role_names: list[str]) -> list[Role]:
        roles: list[Role] = []
        for name in role_names:
            role = self.roles.get_by_name(name)
            if role is None:
                raise ValidationError(f"Unknown role '{name}'.")
            roles.append(role)
        if not roles:
            raise ValidationError("At least one role must be assigned.")
        return roles

    @staticmethod
    def _display_name(
        first_name: str | None,
        middle_name: str | None,
        last_name: str | None,
        fallback: str,
    ) -> str:
        first = (first_name or "").strip()
        middle = (middle_name or "").strip()
        last = (last_name or "").strip()
        if not first or not last:
            return fallback.strip()
        initials = ""
        if middle:
            parts = [part for part in middle.split() if part]
            if len(parts) == 1:
                initials = f"{parts[0][0].upper()}."
            else:
                initials = "".join(part[0].upper() for part in parts[:2])
        return " ".join(part for part in [first, initials, last] if part)

    @staticmethod
    def _uuid_or_none(value) -> uuid.UUID | None:
        if value in (None, ""):
            return None
        try:
            return uuid.UUID(str(value))
        except (TypeError, ValueError) as exc:
            raise ValidationError("Invalid college structure identifier.") from exc

    @staticmethod
    def _generated_username(
        *, email: str, role_names: set[str], student_number: str | None
    ) -> str | None:
        if role_names & {"student", "student_council", "department_student_leader"}:
            return student_number.strip() if student_number else None
        return email.split("@", 1)[0].strip() or None

    def _validate_profile_payload(
        self, *, role_names: set[str], student_number=None, department_id=None,
        course_id=None, section_id=None, officer_position=None,
    ) -> None:
        officer_position = officer_position.strip() if isinstance(officer_position, str) else officer_position
        if role_names & self.student_roles:
            if not student_number:
                raise ValidationError("Student ID number is required.")
            existing_student = db.session.scalar(
                select(StudentProfile).where(StudentProfile.student_number == student_number)
            )
            if existing_student is not None:
                raise ConflictError("This student ID number is already assigned.")

        department_uuid = self._uuid_or_none(department_id)
        course_uuid = self._uuid_or_none(course_id)
        section_uuid = self._uuid_or_none(section_id)

        if role_names & self.student_roles and department_uuid is None:
            raise ValidationError("Department is required for students.")
        if role_names & self.student_roles and course_uuid is None:
            raise ValidationError("Course is required for students.")
        if "teacher" in role_names and department_uuid is None:
            raise ValidationError("Department is required for professors.")
        if role_names & self.officer_roles and not officer_position:
            raise ValidationError("Officer role is required.")
        if department_uuid and db.session.get(Department, department_uuid) is None:
            raise ValidationError("Department not found.")
        if course_uuid:
            course = db.session.get(Course, course_uuid)
            if course is None:
                raise ValidationError("Course not found.")
            if department_uuid and course.department_id != department_uuid:
                raise ValidationError("Course does not belong to the selected department.")
        if section_uuid:
            section = db.session.get(Section, section_uuid)
            if section is None:
                raise ValidationError("Section not found.")
            if course_uuid and section.course_id != course_uuid:
                raise ValidationError("Section does not belong to the selected course.")
        if "student_council" in role_names:
            self._ensure_organization_position(self._student_council_organization(), officer_position)
        if "department_student_leader" in role_names:
            self._ensure_organization_position(self._department_student_leaders_for(department_uuid), officer_position)

    def _create_role_profiles(
        self, user: User, *, role_names: set[str], student_number=None,
        department_id=None, course_id=None, section_id=None, officer_position=None,
    ) -> None:
        officer_position = officer_position.strip() if isinstance(officer_position, str) else officer_position
        department_uuid = self._uuid_or_none(department_id)
        course_uuid = self._uuid_or_none(course_id)
        section_uuid = self._uuid_or_none(section_id)

        if role_names & self.student_roles:
            db.session.add(
                StudentProfile(
                    id=user.id,
                    student_number=student_number,
                    department_id=department_uuid,
                    course_id=course_uuid,
                    section_id=section_uuid,
                    profile_completed=bool(
                        student_number and department_uuid and course_uuid and section_uuid
                    ),
                )
            )
        if "teacher" in role_names:
            db.session.add(TeacherProfile(id=user.id, department_id=department_uuid))
        if role_names & self.officer_roles:
            organization = (
                self._student_council_organization()
                if "student_council" in role_names
                else self._department_student_leaders_for(department_uuid)
            )
            db.session.add(
                OfficerProfile(
                    id=user.id,
                    organization_id=organization.id if organization else None,
                    position=officer_position,
                )
            )
        if "admin" in role_names:
            db.session.add(AdministratorProfile(id=user.id))

    def _sync_profiles_for_role_assignment(
        self,
        user_id: uuid.UUID,
        role_names: set[str],
        *,
        student_number=None,
        department_id=None,
        course_id=None,
        section_id=None,
        officer_position=None,
    ) -> None:
        officer_position = officer_position.strip() if isinstance(officer_position, str) else officer_position
        department_uuid = self._uuid_or_none(department_id)
        course_uuid = self._uuid_or_none(course_id)
        section_uuid = self._uuid_or_none(section_id)

        if role_names & self.student_roles:
            profile = db.session.get(StudentProfile, user_id)
            if profile is None:
                if not student_number:
                    raise ValidationError("Student ID number is required.")
                if department_uuid is None or course_uuid is None:
                    raise ValidationError("Department and course are required for student roles.")
                profile = StudentProfile(id=user_id, student_number=student_number)
                db.session.add(profile)
            if student_number:
                existing_student = db.session.scalar(
                    select(StudentProfile).where(
                        StudentProfile.student_number == student_number,
                        StudentProfile.id != user_id,
                    )
                )
                if existing_student is not None:
                    raise ConflictError("This student ID number is already assigned.")
                profile.student_number = student_number
            if department_uuid:
                if db.session.get(Department, department_uuid) is None:
                    raise ValidationError("Department not found.")
                profile.department_id = department_uuid
            if course_uuid:
                course = db.session.get(Course, course_uuid)
                if course is None:
                    raise ValidationError("Course not found.")
                if profile.department_id and course.department_id != profile.department_id:
                    raise ValidationError("Course does not belong to the selected department.")
                profile.course_id = course_uuid
                profile.department_id = course.department_id
            if section_uuid:
                section = db.session.get(Section, section_uuid)
                if section is None:
                    raise ValidationError("Section not found.")
                if profile.course_id and section.course_id != profile.course_id:
                    raise ValidationError("Section does not belong to the selected course.")
                profile.section_id = section_uuid
            profile.profile_completed = bool(
                profile.student_number and profile.department_id and profile.course_id and profile.section_id
            )
        else:
            student_profile = db.session.get(StudentProfile, user_id)
            if student_profile is not None:
                db.session.delete(student_profile)

        if "teacher" in role_names:
            teacher = db.session.get(TeacherProfile, user_id)
            if teacher is None:
                teacher = TeacherProfile(id=user_id)
                db.session.add(teacher)
            if department_uuid is None and teacher.department_id is None:
                raise ValidationError("Department is required for professors.")
            if department_uuid:
                if db.session.get(Department, department_uuid) is None:
                    raise ValidationError("Department not found.")
                teacher.department_id = department_uuid
        else:
            teacher = db.session.get(TeacherProfile, user_id)
            if teacher is not None:
                db.session.delete(teacher)

        if role_names & self.officer_roles:
            if not officer_position:
                raise ValidationError("Officer position is required.")
            student_profile = db.session.get(StudentProfile, user_id)
            if student_profile is None:
                raise ValidationError("Council roles require a student profile.")
            organization = (
                self._student_council_organization()
                if "student_council" in role_names
                else self._department_student_leaders_for(student_profile.department_id)
            )
            if organization is None:
                raise ValidationError("Create the matching council organization in College Structure before assigning this role.")
            self._ensure_organization_position(organization, officer_position)
            officer = db.session.get(OfficerProfile, user_id)
            if officer is None:
                officer = OfficerProfile(id=user_id)
                db.session.add(officer)
            officer.organization_id = organization.id
            officer.position = officer_position
        else:
            officer = db.session.get(OfficerProfile, user_id)
            if officer is not None:
                db.session.delete(officer)

        if "admin" in role_names:
            if db.session.get(AdministratorProfile, user_id) is None:
                db.session.add(AdministratorProfile(id=user_id))
        else:
            admin = db.session.get(AdministratorProfile, user_id)
            if admin is not None:
                db.session.delete(admin)

    @staticmethod
    def _student_council_organization() -> Organization:
        council = db.session.scalar(
            select(Organization).where(Organization.organization_type == "student_council")
        )
        if council is None:
            raise ValidationError("Create the college-wide Student Council organization before assigning Student Council officers.")
        return council

    @staticmethod
    def _department_student_leaders_for(department_id: uuid.UUID | None) -> Organization | None:
        if department_id is None:
            return None
        leaders = db.session.scalar(
            select(Organization).where(
                Organization.department_id == department_id,
                Organization.organization_type == "department_student_leaders",
            )
        )
        if leaders is None:
            raise ValidationError("Create the department student leaders organization before assigning department student leaders.")
        return leaders

    @staticmethod
    def _ensure_organization_position(organization: Organization, position: str | None) -> None:
        if not position:
            raise ValidationError("Officer position is required.")
        saved_positions = {item.name for item in organization.positions}
        if not saved_positions:
            raise ValidationError("Add council roles or positions in College Structure before assigning members.")
        if position not in saved_positions:
            raise ValidationError("Officer position must be one of the roles saved on this council.")

    @staticmethod
    def _sync_role_profiles(user_id: uuid.UUID, role_names: set[str]) -> None:
        """Keep system role links and one-to-one profile rows consistent."""
        desired = {
            StudentProfile: bool(role_names & {"student", "student_council", "department_student_leader"}),
            TeacherProfile: "teacher" in role_names,
            OfficerProfile: bool(role_names & {"student_council", "department_student_leader"}),
            AdministratorProfile: "admin" in role_names,
        }
        for model, should_exist in desired.items():
            current = db.session.get(model, user_id)
            if should_exist and current is None:
                db.session.add(model(id=user_id))
            elif not should_exist and current is not None:
                db.session.delete(current)
