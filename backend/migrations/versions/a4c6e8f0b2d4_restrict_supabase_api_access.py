"""Restrict SchoolConnect tables to backend database access.

No permissive Supabase policies: authentication and authorization live in Flask.
"""
from alembic import op

revision = "a4c6e8f0b2d4"
down_revision = "f3b5d7e9a1c2"
branch_labels = None
depends_on = None

SQL = r"""
-- SchoolConnect uses Flask authorization, not direct Supabase Data API access.
-- Run as the database owner. The backend DB role must own these tables or
-- have BYPASSRLS. This script does not delete data or change Flask permissions.
DO $security$
DECLARE
    target record;
    api_role text;
    column_names text;
BEGIN
    FOR target IN
        SELECT c.oid, c.relname FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        AND c.relname = ANY (ARRAY[
        'academic_years',
        'activity_logs',
        'administrator_profiles',
        'alembic_version',
        'announcement_attachments',
        'announcement_categories',
        'announcements',
        'attendance',
        'attendance_logs',
        'audit_logs',
        'calendar_events',
        'courses',
        'departments',
        'event_attachments',
        'event_categories',
        'event_officer_assignments',
        'event_requirements',
        'event_results',
        'events',
        'login_history',
        'notification_logs',
        'notification_templates',
        'notifications',
        'officer_profiles',
        'organization_positions',
        'organizations',
        'permissions',
        'qr_tokens',
        'refresh_tokens',
        'registrations',
        'role_permissions',
        'roles',
        'sections',
        'semesters',
        'student_profiles',
        'teacher_profiles',
        'team_members',
        'teams',
        'uploaded_files',
        'user_roles',
        'users',
        'waitlists'
        ])
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target.relname);
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', target.relname);
        SELECT string_agg(quote_ident(attname), ', ') INTO column_names
        FROM pg_attribute WHERE attrelid = target.oid AND attnum > 0 AND NOT attisdropped;
        EXECUTE format('REVOKE SELECT (%s), INSERT (%s), UPDATE (%s), REFERENCES (%s) ON TABLE public.%I FROM PUBLIC',
            column_names, column_names, column_names, column_names, target.relname);
        FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
                EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', target.relname, api_role);
                EXECUTE format('REVOKE SELECT (%s), INSERT (%s), UPDATE (%s), REFERENCES (%s) ON TABLE public.%I FROM %I',
                    column_names, column_names, column_names, column_names, target.relname, api_role);
                IF has_table_privilege(api_role, target.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
                   OR has_any_column_privilege(api_role, target.oid, 'SELECT,INSERT,UPDATE,REFERENCES') THEN
                    RAISE EXCEPTION 'Inherited API privileges remain for % on %. Transaction cancelled.', api_role, target.relname;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END
$security$;
"""


def upgrade():
    if op.get_bind().dialect.name == "postgresql":
        op.execute("SET LOCAL lock_timeout = '10s'")
        op.execute(SQL)


def downgrade():
    raise RuntimeError(
        "Security hardening cannot be automatically reverted. "
        "Review explicit grants and RLS requirements before changing access."
    )
