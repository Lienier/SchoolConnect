# SchoolConnect

A centralized **School Bulletin & Event Registration System** enabling school
administrators, teachers, student council officers and students to manage
announcements, organise events, register participants, monitor attendance,
generate reports and communicate via integrated notifications.

## Monorepo layout

```
.
├── backend/    # Flask + SQLAlchemy REST API (see backend/README.md)
└── frontend/   # React 19 + Vite SPA (see frontend/README.md)
```

## Technology

**Frontend:** React 19, Vite, Tailwind CSS, shadcn/ui, React Router DOM, Axios,
React Hook Form, Zod, TanStack Query, FullCalendar, Chart.js, html5-qrcode.

**Backend:** Python 3.13+, Flask, SQLAlchemy, Flask-Migrate, Flask-JWT-Extended,
Flask-Mail, Flask-CORS, Flask-Limiter, Flask-Caching.

**Database:** PostgreSQL. **Auth:** JWT + refresh tokens + Google OAuth, bcrypt
password hashing. **Storage:** local (dev) / Cloudinary (prod). **QR:** qrcode
(backend) + html5-qrcode (frontend).

## Principles

- Feature-based modular architecture, SOLID, single responsibility.
- Standardized API envelope: `{ "success", "message", "data" }`.
- UUID primary keys, audit columns and soft delete on every table.
- Security first: input validation, RBAC, rate limiting, JWT expiry, no leaked
  stack traces, audit logging of sensitive actions.

## Getting started

See [`backend/README.md`](backend/README.md) and
[`frontend/README.md`](frontend/README.md).

## Roles

`admin`, `teacher`, `student_council`, `student`.
