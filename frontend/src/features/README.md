# Frontend Features

Feature-based modular architecture. Each feature is self-contained and owns its
own UI, data-access and validation logic.

## Standard feature layout

```
features/<feature>/
├── components/   # Small, single-responsibility UI components
├── pages/        # Route-level page components (lazy-loaded)
├── hooks/        # Feature-specific React Query hooks & logic
├── services/     # API calls (thin wrappers over the shared apiClient)
├── types/        # TypeScript types for this feature
└── validators/   # Zod schemas for forms & API payloads
```

## Rules

- Components must be small with a single responsibility. Never create a
  1000-line component. Prefer composing `EventCard`, `EventHeader`,
  `RegistrationButton`, etc.
- Data fetching goes through TanStack Query hooks that call `services`.
- Forms use React Hook Form with Zod resolvers from `validators`.
- No business/data logic inside page components beyond composition.

## Planned features

`auth`, `users`, `announcements`, `events`, `registrations`, `attendance`,
`reports`, `dashboard`, `calendar`, `notifications`.
