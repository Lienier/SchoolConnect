# Supabase security remediation

Target project: `ikbxhtjzjdllvxbiyfao` (SchoolConnect).

Status: prepared locally; not applied or verified against production.

The React client uses the Flask API. Flask authenticates users with its own JWTs
and accesses PostgreSQL through SQLAlchemy. Direct Supabase Data API privileges
bypass that application authorization and must not expose these tables.

## Apply

1. Confirm the production backend DATABASE_URL role owns the application tables
   or has BYPASSRLS. Otherwise establish its required backend policy before
   enabling RLS; a non-owner role without a policy will lose row access.
2. Open this project's Supabase SQL Editor and run `supabase_security_fix.sql`.
   Alternatively deploy the backend and run `flask db upgrade` with its production
   DATABASE_URL. The migration is idempotent after manually running the SQL.
3. Verify all application tables have `rls_enabled = true`, `anon_access = false`,
   and `authenticated_access = false`. Investigate any other live-only tables
   reported by Security Advisor; the script deliberately targets known app tables.
4. Rerun Supabase Security Advisor and confirm both reported findings are gone.
5. Test login, bulletin loading, event registration, and authorized admin updates
   through Flask. Confirm unauthorized Flask requests are still rejected.

The transaction enables RLS and revokes table and column privileges from PUBLIC,
anon, and authenticated. It aborts if inherited API privileges remain. It neither
deletes rows nor modifies existing policies or the backend role. RLS alone does
not restrict a table owner or a BYPASSRLS backend role. No automatic downgrade is
provided because restoring broad grants would reintroduce the exposure.

Future migrations creating tables must also enable RLS and revoke API grants.
New tables are not automatically protected by this fixed list. Do not use broad
USING (true) policies to clear warnings. Sensitive fields stay behind Flask's
existing authorization and serialization.

Reference: https://supabase.com/docs/guides/database/postgres/row-level-security
