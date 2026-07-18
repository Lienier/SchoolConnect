# SchoolConnect Backend

Flask + SQLAlchemy REST API for the SchoolConnect School Bulletin & Event
Registration System.

## Architecture

Feature-based modular architecture following SOLID principles. Layers per
feature:

```
routes.py  ->  service.py  ->  repository.py  ->  model.py
                     ^
              schema.py / validators.py / permissions.py / constants.py / utils.py
```

- **routes** – receive request, validate, call service, return standardized response. No business logic.
- **service** – business logic and orchestration. Raises domain exceptions.
- **repository** – the only layer that touches the DB session for its aggregate.
- **model** – SQLAlchemy models extending `app.models.BaseModel`.
- **schema / validators** – request/response validation (Pydantic / Zod-equivalent).
- **permissions** – RBAC checks for the feature.

### Shared layers

| Package         | Responsibility                                            |
| --------------- | --------------------------------------------------------- |
| `config`        | Environment-driven configuration classes                  |
| `extensions`    | Single instances of Flask extensions                      |
| `middleware`    | Logging, error handlers, request context                  |
| `common`        | Response envelopes, exceptions, pagination, registry      |
| `models`        | Base model + mixins (UUID, timestamps, audit, soft delete)|
| `repositories`  | `BaseRepository` (soft-delete-aware CRUD)                  |
| `permissions`   | Roles enum + `require_roles` decorator                    |
| `utils`         | Framework-agnostic helpers                                |

## Standardized responses

Every endpoint returns:

```json
{ "success": true, "message": "", "data": {} }
```

Errors add `errors` and `error_code`. Stack traces are never exposed.

## Database rules

- UUID primary keys.
- Every table has `id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`.
- Soft delete (`deleted_at`) — records are never hard-deleted.

## Getting started

```powershell
# From the backend/ directory
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env   # then fill in values

# Database migrations (after configuring DATABASE_URL)
$env:FLASK_APP = "app.app:app"
flask db init
flask db migrate -m "initial"
flask db upgrade

# Run (development)
flask run
# Run (production, Windows)
waitress-serve --call wsgi:create_app
```

## Adding a new feature module

1. Create `app/<feature>/` with `routes.py`, `service.py`, `repository.py`,
   `model.py`, `schema.py`, `validators.py`, `permissions.py`, `constants.py`,
   `utils.py` and `__init__.py`.
2. Expose a `bp = Blueprint(...)` in `routes.py`.
3. Register it in `app/common/registry.py` `_load_feature_blueprints()`.
