# SchoolConnect Free Deployment

This guide deploys the MVP with a free-first stack:

- Backend: Render Web Service using `backend/Dockerfile`
- Frontend: Vercel static build from `frontend/`
- Database: Supabase Free PostgreSQL
- Uploads: Cloudinary Free

## 1. Prepare Service Accounts

Create free projects/accounts for:

- Supabase
- Cloudinary
- Render
- Vercel
- GitHub repository containing this project

## 2. Supabase Database

Create a Supabase project and copy the direct Postgres connection string.

Use the SQLAlchemy psycopg driver prefix in Render:

```txt
postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE
```

If Supabase gives a URL starting with `postgresql://`, change only the prefix to
`postgresql+psycopg://`.

## 3. Render Backend

Use the included `render.yaml` blueprint, or create the service manually:

- Service type: Web Service
- Runtime: Docker
- Root directory: `backend`
- Plan: Free
- Health check path: `/health`

The backend container runs this command on start:

```sh
flask db upgrade && python -m seed && gunicorn --bind 0.0.0.0:${PORT:-10000} --workers ${WEB_CONCURRENCY:-2} --timeout ${WEB_TIMEOUT:-120} wsgi:app
```

Set these Render environment variables:

```txt
FLASK_ENV=production
APP_NAME=SchoolConnect
API_PREFIX=/api
DATABASE_URL=<supabase-postgres-url-with-postgresql+psycopg-prefix>
SECRET_KEY=<generated-by-render-or-strong-random-value>
JWT_SECRET_KEY=<generated-by-render-or-strong-random-value>
CORS_ORIGINS=https://<vercel-project>.vercel.app
STORAGE_BACKEND=cloudinary
CLOUDINARY_CLOUD_NAME=<cloudinary-cloud-name>
CLOUDINARY_API_KEY=<cloudinary-api-key>
CLOUDINARY_API_SECRET=<cloudinary-api-secret>
SEED_ADMIN_EMAIL=admin@schoolconnect.example.com
SEED_ADMIN_PASSWORD=<strong-admin-password>
SEED_PROFESSOR_EMAIL=professor@schoolconnect.example.com
SEED_PROFESSOR_PASSWORD=<strong-professor-password>
SEED_OFFICER_EMAIL=officer@schoolconnect.example.com
SEED_OFFICER_PASSWORD=<strong-officer-password>
SEED_STUDENT_EMAIL=student@schoolconnect.example.com
SEED_STUDENT_PASSWORD=<strong-student-password>
RATELIMIT_STORAGE_URI=memory://
CACHE_TYPE=SimpleCache
```

After deploy, verify:

```txt
https://<render-service>.onrender.com/health
```

## 4. Vercel Frontend

Create a Vercel project from the same GitHub repo:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Set this Vercel environment variable:

```txt
VITE_API_BASE_URL=https://<render-service>.onrender.com/api
```

The included `frontend/vercel.json` keeps React Router pages working on refresh.

## 5. Baseline Accounts

The seed script creates only one clean baseline account per role. It does not
seed school structure, announcements, events, registrations, attendance,
notifications, or audit records.

```txt
Admin: value of SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
Professor: value of SEED_PROFESSOR_EMAIL / SEED_PROFESSOR_PASSWORD
Student Council: value of SEED_OFFICER_EMAIL / SEED_OFFICER_PASSWORD
Student: value of SEED_STUDENT_EMAIL / SEED_STUDENT_PASSWORD
```

## 6. Smoke Test

After Render and Vercel finish deploying:

- Open the Vercel URL.
- Login as admin and confirm `/admin` loads.
- Confirm `/announcements` shows feed data.
- Create an announcement with an image or PDF and confirm Cloudinary-backed upload works.
- Login as professor and confirm `/professor` and `/attendance` load.
- Generate a QR for an approved/ongoing professor event.
- Login as student and check in from `/attendance/mine`.
- Confirm `/health` stays healthy after a redeploy.

## Free Tier Notes

- Render Free services sleep after inactivity.
- Supabase Free can pause after inactivity and has limited storage.
- Cloudinary Free has usage limits.
- This setup is for MVP/demo use, not production school operations.
