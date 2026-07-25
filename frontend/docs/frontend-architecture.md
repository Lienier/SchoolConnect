# Frontend Architecture Prompt — SchoolConnect

This document defines the frontend conventions every page and component must
follow. It is the single source of truth for structure, styling, state, and
routing so that the UI stays consistent as the project grows.

## 1. Tech Stack
- **React 19 + TypeScript**, bundled by **Vite**.
- **Tailwind CSS** with a `navy` accent palette; shadcn/ui "new-york" visual style.
- **TanStack Query** for server state (fetching, caching, mutations).
- **React Hook Form + Zod** for forms and client-side validation.
- **Axios** (`@/api/client`) for HTTP, with automatic 401 → refresh → retry.
- **React Router** for routing (lazy-loaded pages).

## 2. Folder Structure
```
src/
  api/client.ts            # Axios instance + interceptors
  components/ui/           # Primitives: Button, Card, Input, Label, Modal, Table, Badge, Select, Pagination, Toast
  constants/              # Storage keys, API base URL
  features/<name>/        # Feature module (one per backend module)
    components/           # Presentational pieces (forms, lists, cards)
    pages/                # Route-level pages (default export, lazy-loaded)
    services/<name>Api.ts # API calls for the feature
    types/index.ts        # Types matching the API envelope
    validators/index.ts   # Zod schemas
  hooks/                  # Cross-feature hooks (usePermissions, useDebounce)
  layouts/                # AppShell / AdminLayout / PublicLayout
  routes/AppRoutes.tsx    # Central route table
  context|providers/      # App-wide providers (AuthProvider, ToastProvider)
  styles/                 # Global CSS / Tailwind entry
  types/api.ts            # Shared envelope: ApiResponse<T>, PaginationMeta
  utils/                  # cn(), date, format helpers
```

Every feature module follows the same shape. Shared code goes in `components/ui`
or `hooks`; never duplicate primitives across features.

## 3. Layout System
- `AppShell` (in `layouts/`) renders the sidebar nav + topbar and wraps all
  authenticated pages via a layout route.
- Nav items are permission-gated: an item is shown only if `usePermissions()`
  reports the required permission (admin sees all; teacher/student see subsets).
- Public pages (login, register, home) use `PublicLayout` without the shell.

## 4. Route Protection
- `ProtectedRoute` ensures authentication (redirect to `/login`).
- Permission gating is done **inside** pages via `usePermissions().can("x.y")`
  so the UI can hide actions and show "no permission" states gracefully.

## 5. State Management
- **Server state** → TanStack Query. Use `queryKey: ["resource", ...params]`.
  List queries return `{ data, meta }`; wire `meta` into `Pagination`.
- **Auth/user** → React Context (`AuthProvider`); consumed via `useAuth()`.
- **Transient UI** (toasts, modals) → local component state or `ToastProvider`.
- No global Redux/Zustand store is needed.

## 6. Theme System
- Tailwind `navy-*` palette is the brand color. Use `text-navy-800`,
  `bg-navy-50`, `border-navy-200`, etc. Never hardcode raw hex in components.
- Dark mode is out of scope; keep a single light theme.

## 7. Reusable UI Components
- `Button` (variants: primary/secondary/ghost/danger; sizes sm/md/lg; isLoading).
- `Card` surface for content blocks.
- `Input` + `Label` for fields.
- `Modal` for create/edit dialogs.
- `Table` + `Pagination` for list screens.
- `Badge` for statuses (active/suspended, approved/pending).
- `Toast` for success/error feedback after mutations.

## 8. Form Conventions
- Forms use React Hook Form + a Zod resolver from `feature/validators`.
- Submit handlers call the feature API, then `queryClient.invalidateQueries`,
  show a toast, and close the modal.

## 9. API Service Layer
- One `apiClient`-based object per feature: `rolesApi`, `schoolApi`,
  `usersApi`, `dashboardApi`.
- Each method returns `data.data` (and `meta` for lists), matching the
  backend envelope.
- Centralized error handling: the Axios interceptor surfaces backend
  `message`/`error_code`; pages show toasts on mutation error.

## 10. Permission Helper
`usePermissions()` derives the user's effective permission set from their
roles (mapping role → permissions mirrors the backend `DEFAULT_ROLE_PERMISSIONS`).
Custom roles created at runtime are resolved by fetching `/roles` once and
merging. A `can(perm)` and `canAny([...])` API is provided.
