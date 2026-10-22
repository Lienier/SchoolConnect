# SchoolConnect Frontend

React 19 + Vite + TypeScript + Tailwind + shadcn/ui client for SchoolConnect.

## Stack

React Router DOM, Axios, React Hook Form, Zod, TanStack Query, FullCalendar,
Chart.js, html5-qrcode.

## Architecture

Feature-based modular architecture. See `src/features/README.md` for the
standard feature layout and component rules (small, single-responsibility
components).

```
src/
├── api/         # Shared Axios client
├── assets/
├── components/  # Shared UI (shadcn/ui lives in components/ui)
├── constants/
├── contexts/
├── features/    # Self-contained feature modules
├── hooks/
├── layouts/
├── pages/       # Top-level route pages
├── providers/   # QueryProvider, AppProviders
├── routes/      # AppRoutes (lazy-loaded, code-split)
├── services/
├── store/
├── styles/      # globals.css (Tailwind)
├── types/       # Shared API types (ApiResponse, PaginationMeta)
└── utils/       # cn(), helpers
```

## Theme

Modern Minimal — Navy Blue primary, white surfaces, gray accents, large radius,
soft shadows. Mobile-first, responsive from 320px to 1440px.

## Getting started

```powershell
# From the frontend/ directory
npm install
Copy-Item .env.example .env   # adjust if needed
npm run dev
```

The selected backend is `schoolconnect-performance` at
`https://schoolconnect-performance.onrender.com`. The dev server proxies `/api`
and `/socket.io` to `VITE_API_TARGET`, defaulting to this service. Set
`VITE_API_TARGET=http://localhost:5000` to use a local backend instead.

For Vercel, the build command in `vercel.json` explicitly sets
`VITE_API_BASE_URL=https://schoolconnect-performance.onrender.com/api`.
This ensures a new build uses the selected service even if the dashboard still
has an older API URL. Redeploy to update the live bundle. Historical QA fixtures
still use their explicit local API target.
