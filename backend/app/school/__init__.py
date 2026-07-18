"""School structure module: CRUD for the reusable organizational hierarchy.

Covers departments, courses, sections, organizations, academic years and
semesters. The SQLAlchemy models live in :mod:`app.users.model` (they were
defined alongside profiles); this module supplies the management surface so the
hierarchy can be targeted by other features (events, announcements) without
duplicating data.
"""
