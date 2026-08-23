# SchoolConnect: Complete Implementation Plan

> **For:** Agentic AI Agents & Developers  
> **Based on:** Full codebase audit of ~65–70% complete system  
> **Purpose:** Precise, file-level instructions to bring SchoolConnect to 100% feature-complete

---

## Audit Summary: What Is Already Done vs. What Is Missing

### ✅ Already Implemented (Do NOT Rebuild)
| Feature | Location |
|---|---|
| `_check_schedule_conflict()` | `backend/app/registrations/service.py:47` |
| `_check_eligibility()` | `backend/app/registrations/service.py:57` |
| Deadline cancellation lock | `backend/app/registrations/service.py:210` |
| `team_code` column on `Team` model | `backend/app/registrations/model.py:57` |
| `_generate_team_code()` + `join_team_by_code()` | `backend/app/registrations/service.py:120,155` |
| `returned` status in `Event` model CheckConstraint | `backend/app/events/model.py:50` |
| `decide()` supporting `"returned"` decision | `backend/app/events/service.py:196` |
| `reviewer_name` in `event.to_dict(include_approvals=True)` | `backend/app/events/model.py:148` |
| Announcement prioritization sort | `backend/app/announcements/repository.py:35` |
| `schedule_event_reminders()` | `backend/app/notifications/service.py:107` |
| `attendance_percentage()` + `department_attendance_summary()` | `backend/app/reports/service.py:38,55` |
| `HeroAlertBanner.tsx` | `frontend/src/features/announcements/components/HeroAlertBanner.tsx` |
| `SocialFeedCard.tsx` (scaffold) | `frontend/src/features/announcements/components/SocialFeedCard.tsx` |
| `HomePage.tsx` with feed + tabs + search | `frontend/src/pages/HomePage.tsx` |
| `ApprovalInboxPage.tsx` (scaffold) | `frontend/src/features/dashboards/shared/ApprovalInboxPage.tsx` |
| `join_team` route `POST /registrations/team/join` | `backend/app/registrations/routes.py:95` |

## Phase 1 — Backend Model Fixes (Database Schema Gaps)

These are **blocking bugs**: code references columns that do not exist in the model.

### 1.1 — ADD `is_emergency` to `Announcement` model

**File:** `backend/app/announcements/model.py`

**Problem:** `backend/app/announcements/repository.py:40` sorts by `Announcement.is_emergency.desc()` but the `Announcement` model has no `is_emergency` column. This will cause a runtime `AttributeError` on any announcement list query.

**Fix:** Add the column after `is_pinned`:
```python
is_emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
---

## Phase 1 — Backend Model Fixes (Database Schema Gaps)

These are **blocking bugs**: code references columns that do not exist in the model.

### 1.1 — ADD `is_emergency` to `Announcement` model

**File:** `backend/app/announcements/model.py`

**Problem:** `backend/app/announcements/repository.py:40` sorts by `Announcement.is_emergency.desc()` but the `Announcement` model has no `is_emergency` column. This will cause a runtime `AttributeError` on any announcement list query.

**Fix:** Add the column after `is_pinned`:
```python
is_emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


Copy

Insert at cursor
Also add "is_emergency" to to_dict() return value.

Then run: flask db migrate -m "add_is_emergency_to_announcements" + flask db upgrade

1.2 — ADD requirement_value to EventRequirement model
File: backend/app/events/model.py

Problem: backend/app/registrations/service.py:62–75 checks req.requirement_value (e.g. req.requirement_type == "year_level" and str(profile.year_level) != req.requirement_value) but EventRequirement only has a description: Text column — no requirement_value column. This causes AttributeError on any eligibility check.

Fix: Add the column after requirement_type:

requirement_value: Mapped[str | None] = mapped_column(String(100), nullable=True)

Copy

Insert at cursor
python
Then run: flask db migrate -m "add_requirement_value_to_event_requirements" + flask db upgrade

1.3 — ADD returned to AnnouncementApproval decision values
File: backend/app/announcements/service.py

Problem: decide() only accepts "approved" or "rejected". The system spec requires "returned" for announcements too (parallel to events). The AnnouncementApproval model has no constraint blocking it, but the service raises ValidationError for any other value.

Fix: In AnnouncementService.decide(), change the guard:

if decision not in ("approved", "rejected", "returned"):
    raise ValidationError("Decision must be 'approved', 'rejected', or 'returned'.")

Copy

Insert at cursor
python
Add the returned branch:

elif decision == "returned":
    announcement.status = "draft"

Copy

Insert at cursor
python
Phase 2 — Frontend Type Definition Fixes
These cause TypeScript compile errors or silent runtime failures.

2.1 — ADD is_emergency to Announcement type
File: frontend/src/features/announcements/types/index.ts

Add to the Announcement interface:

is_emergency: boolean;

Copy

Insert at cursor
typescript
2.2 — ADD returned to EventStatus union type
File: frontend/src/features/events/types/index.ts

Change:

export type EventStatus =
  | "draft" | "pending_approval" | "approved" | "ongoing"
  | "completed" | "cancelled" | "archived";

Copy

Insert at cursor
typescript
To:

export type EventStatus =
  | "draft" | "pending_approval" | "approved" | "ongoing"
  | "completed" | "cancelled" | "archived" | "returned";

Copy

Insert at cursor
typescript
2.3 — ADD reviewer_name to EventApproval type
File: frontend/src/features/events/types/index.ts

Change EventApproval interface:

export interface EventApproval {
  id: string;
  reviewer_id: string;
  reviewer_name: string | null;   // ADD THIS
  decision: string;
  comment: string | null;
  decided_at: string | null;
}

Copy

Insert at cursor
typescript
Phase 3 — Frontend API Service Fixes
3.1 — ADD "returned" decision support to eventsApi.approve
File: frontend/src/features/events/services/eventsApi.ts

Change the approve method signature:

async approve(
  id: string,
  decision: "approved" | "rejected" | "returned",
  comment?: string
)

Copy

Insert at cursor
typescript
3.2 — ADD "returned" decision support to announcementsApi.approve
File: frontend/src/features/announcements/services/announcementsApi.ts

Change the approve method signature:

async approve(
  id: string,
  decision: "approved" | "rejected" | "returned",
  comment?: string
)

Copy

Insert at cursor
typescript
Phase 4 — SocialFeedCard Bug Fixes
File: frontend/src/features/announcements/components/SocialFeedCard.tsx

4.1 — Fix broken capacity bar CSS (Critical Visual Bug)
Problem: Line ~195 has:

width: `\\${capacityPercentage}%`,

Copy

Insert at cursor
tsx
The escaped backslash makes the width render as the literal string \${capacityPercentage}% instead of e.g. 72%. The capacity bar will always be 0 width.

Fix:

width: `${capacityPercentage}%`,

Copy

Insert at cursor
tsx
4.2 — Fix lightbox trigger (UX Bug)
Problem: The lightbox opens on onMouseEnter (hover), which is wrong UX — it fires accidentally on desktop and is unusable on mobile. It should open on click.

Fix: Replace the media section's hover-based lightbox with a separate lightboxOpen state:

const [lightboxOpen, setLightboxOpen] = useState(false);

Copy

Insert at cursor
tsx
Change the image container:

<div
  style={{ width: '100%', height: '16rem', overflow: 'hidden', cursor: 'zoom-in' }}
  onClick={() => setLightboxOpen(true)}
>
  <img ... style={{ ..., transform: 'scale(1)', transition: 'transform 0.3s ease' }} />
</div>

Copy

Insert at cursor
tsx
Change the lightbox overlay to use lightboxOpen instead of isHovered:

{lightboxOpen && (
  <div
    style={{ position: 'fixed', inset: 0, ... }}
    onClick={() => setLightboxOpen(false)}
  >
    ...
    <button onClick={() => setLightboxOpen(false)}>✕</button>
  </div>
)}

Copy

Insert at cursor
tsx
Remove the isHovered state entirely (it is no longer needed).

Phase 5 — ApprovalInboxPage: Wire to Real API
File: frontend/src/features/dashboards/shared/ApprovalInboxPage.tsx

Problem: The component uses MOCK_APPROVALS hardcoded data. It needs to fetch real pending events and announcements from the API and call the real approve/reject/return endpoints.

5.1 — Replace mock data with real API calls
The component needs to:

Fetch pending events via GET /events?status=pending_approval

Fetch pending announcements via GET /announcements?status=pending_approval

On Approve → call eventsApi.approve(id, "approved", comment) or announcementsApi.approve(id, "approved", comment)

On Reject → call with "rejected"

On Return for Revision → call with "returned"

Invalidate TanStack Query cache after each action

Implementation approach:

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/features/events/services/eventsApi';
import { announcementsApi } from '@/features/announcements/services/announcementsApi';

// Inside component:
const queryClient = useQueryClient();

const { data: pendingEvents } = useQuery({
  queryKey: ['events', 'pending_approval'],
  queryFn: () => eventsApi.list({ status: 'pending_approval' }),
});

const { data: pendingAnnouncements } = useQuery({
  queryKey: ['announcements', 'pending_approval'],
  queryFn: () => announcementsApi.list({ status: 'pending_approval' }),
});

const decideMutation = useMutation({
  mutationFn: ({ id, type, decision, comment }: {
    id: string;
    type: 'event' | 'announcement';
    decision: 'approved' | 'rejected' | 'returned';
    comment: string;
  }) =>
    type === 'event'
      ? eventsApi.approve(id, decision, comment)
      : announcementsApi.approve(id, decision, comment),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['events', 'pending_approval'] });
    queryClient.invalidateQueries({ queryKey: ['announcements', 'pending_approval'] });
    setIsModalOpen(false);
    setComment('');
  },
});


Copy

Insert at cursor
tsx
Build the items array by merging pendingEvents.data and pendingAnnouncements.data into the ApprovalItem shape.

Phase 6 — EventDetailPage: Add "Return for Revision" Button
File: frontend/src/features/events/pages/EventDetailPage.tsx

Problem: The approval action bar only has Approve and Reject. The spec requires a "Return for Revision" option.

Fix: In the isApprover && event.status === "pending_approval" block, add:

<Button variant="secondary" onClick={() => handleDecideEvent("returned")}>
  Return for Revision
</Button>

Copy

Insert at cursor
tsx
Update handleDecideEvent signature:

const handleDecideEvent = async (decision: "approved" | "rejected" | "returned") => {
  try {
    await eventsApi.approve(id, decision);
    toast(`Event ${decision}.`, "success");
    refresh();
  } catch {
    toast("Could not update the event.", "error");
  }
};

Copy

Insert at cursor
tsx
Also add "returned" to the statusTones map:

returned: "warning",

Copy

Insert at cursor
tsx
Phase 7 — AppRoutes: Register ApprovalInboxPage Route
File: frontend/src/routes/AppRoutes.tsx

Problem: ApprovalInboxPage exists but has no route registered. Teachers and Officers cannot navigate to it.

Fix:

Add lazy import:

const ApprovalInboxPage = lazy(
  () => import("@/features/dashboards/shared/ApprovalInboxPage")
    .then(m => ({ default: m.ApprovalInboxPage }))
);

Copy

Insert at cursor
tsx
Add route inside the ProtectedRoute block:

<Route path="/approvals" element={<ApprovalInboxPage />} />

Copy

Insert at cursor
tsx
Add navigation links in TeacherDashboardPage and OfficerDashboardPage:

<QuickLink label="Approval Inbox" to="/approvals" variant="primary" />

Copy

Insert at cursor
tsx
Phase 8 — HomePage: "My Department" Tab Logic
File: frontend/src/pages/HomePage.tsx

Problem: The "My Department" tab filter has no logic — it falls through to show all items because there is no department matching condition.

Fix: The filteredItems filter needs to check the user's department. Since HomePage is public (no auth required), the "My Department" tab should redirect to login if unauthenticated, or filter by user.department if authenticated.

import { useAuth } from "@/features/auth/context/AuthContext";

// Inside component:
const { user } = useAuth();

const filteredItems = MOCK_FEED_ITEMS.filter(item => {
  if (activeTab === "Announcements" && item.type !== "announcement") return false;
  if (activeTab === "Events" && item.type !== "event") return false;
  if (activeTab === "My Department") {
    if (!user) return false; // hide all if not logged in
    if (item.department && user.department && item.department !== user.department) return false;
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const matches =
      item.title.toLowerCase().includes(q) ||
      item.body.toLowerCase().includes(q) ||
      item.tags?.some(t => t.toLowerCase().includes(q)) ||
      item.location?.toLowerCase().includes(q) ||
      item.author_name.toLowerCase().includes(q);
    if (!matches) return false;
  }
  return true;
});


Copy

Insert at cursor
tsx
Also show a "Sign in to see your department feed" message when activeTab === "My Department" && !user.

Phase 9 — Cron Runner for Notification Reminders
Problem: NotificationService.schedule_event_reminders() is fully implemented but is never called. There is no background job runner.

File to create: backend/cron_runner.py

This script is meant to be run daily by a system cron job (e.g. 0 7 * * * python cron_runner.py).

"""Daily cron runner: fires event reminder notifications.

Run via: python cron_runner.py
Schedule: daily at 07:00 server time (e.g. via crontab or a task scheduler).
"""
from app.app import create_app
from app.extensions import db
from app.events.model import Event
from app.notifications.service import NotificationService
from app.utils.datetime import utcnow
from sqlalchemy import select
from datetime import timedelta

app = create_app()

with app.app_context():
    now = utcnow()
    # Find events starting within the next 3 days that are approved/ongoing
    upcoming = db.session.scalars(
        select(Event).where(
            Event.deleted_at.is_(None),
            Event.status.in_(("approved", "ongoing")),
            Event.start_time >= now,
            Event.start_time <= now + timedelta(days=3),
        )
    ).all()

    svc = NotificationService()
    total = 0
    for event in upcoming:
        reminders = svc.schedule_event_reminders(
            event_id=event.id,
            event_title=event.title,
            event_start=event.start_time,
        )
        total += len(reminders)

    print(f"[cron_runner] Processed {len(upcoming)} events, sent {total} reminders.")


Copy

Insert at cursor
python
Phase 10 — Security Fixes (from Code Review)
These were flagged by the automated scan and must be addressed before production.

10.1 — JWT tokens in localStorage (High — XSS risk)
File: frontend/src/api/client.ts:41–43

Problem: localStorage.setItem(TOKEN_STORAGE_KEY, ...) stores JWTs in localStorage, which is accessible to any JavaScript including injected malicious scripts.

Recommended fix: Move token storage to httpOnly cookies set by the backend. The backend already uses withCredentials: true on the Axios instance. Update the Flask auth routes to set Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict and remove the localStorage token writes from the frontend.

Interim mitigation (if cookie migration is deferred): Ensure all user-generated content rendered in the feed is HTML-escaped. Never use dangerouslySetInnerHTML.

10.2 — Path traversal in file uploads (High)
File: backend/app/uploads/routes.py:42–43

Problem: File path construction uses unsanitized user input, enabling ../../ traversal attacks.

Fix: Use werkzeug.utils.secure_filename() on all uploaded filenames before constructing storage paths:

from werkzeug.utils import secure_filename
safe_name = secure_filename(original_filename)

Copy

Insert at cursor
python
10.3 — Hardcoded credentials in auth pages (Low)
Files: frontend/src/features/auth/pages/LoginPage.tsx:95, RegisterPage.tsx:95,119

Problem: Demo/test credentials are hardcoded in the UI source.

Fix: Remove all hardcoded credential strings. Use environment-specific seed data or a separate dev-only helper instead.

10.4 — CSRF protection missing (High)
File: frontend/src/api/client.ts:37–38

Problem: State-changing POST/PATCH/DELETE requests have no CSRF token.

Fix: Add Flask-WTF CSRF protection or implement the double-submit cookie pattern. On the frontend, read the CSRF token from a cookie and attach it as a request header:

const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;

Copy

Insert at cursor
typescript
Phase 11 — Feed Integration: Replace Mock Data with Real API
File: frontend/src/pages/HomePage.tsx

Problem: MOCK_ALERTS and MOCK_FEED_ITEMS are hardcoded. The page needs to fetch real data.

11.1 — Fetch real emergency/pinned announcements for HeroAlertBanner
const { data: alertsData } = useQuery({
  queryKey: ['announcements', 'alerts'],
  queryFn: () => announcementsApi.list({ status: 'published', priority: 'urgent' }),
});

const alerts: AlertAnnouncement[] = (alertsData?.data ?? [])
  .filter(a => a.is_pinned || a.is_emergency)
  .map(a => ({
    id: a.id,
    title: a.title,
    body: a.body,
    priority: a.priority,
    is_pinned: a.is_pinned,
    author_name: undefined,
    created_at: a.created_at,
  }));

Copy

Insert at cursor
tsx
11.2 — Fetch real feed items (announcements + events merged)
const { data: announcementsData } = useQuery({
  queryKey: ['feed', 'announcements'],
  queryFn: () => announcementsApi.feed(1),
});

const { data: eventsData } = useQuery({
  queryKey: ['feed', 'events'],
  queryFn: () => eventsApi.list({ status: 'approved' }),
});

Copy

Insert at cursor
tsx
Map both to FeedItem[] shape and merge + sort by created_at DESC.

The FeedItem interface needs author_name and author_role which the backend does not currently return on list endpoints. Two options:

Option A (recommended): Add a /feed endpoint to the backend that returns a unified feed with author info joined.

Option B (quick): Enrich the existing Announcement.to_dict() and Event.to_dict() to include author_name and author_role by joining the User model.

For Option B, in backend/app/announcements/model.py, add a relationship:

author: Mapped["User"] = relationship("User", foreign_keys=[author_id], lazy="joined")

Copy

Insert at cursor
python
Then in to_dict():

"author_name": self.author.full_name if self.author else None,
"author_role": self.author.roles[0].name if self.author and self.author.roles else None,

Copy

Insert at cursor
python
Do the same for Event.to_dict() using organizer_id → organizer relationship.

Phase 12 — SocialFeedCard: "Register Now" Button Wiring
File: frontend/src/features/announcements/components/SocialFeedCard.tsx

Problem: The "Register Now" button calls nothing — it has no onClick handler.

Fix: The card needs to either:

Navigate to /events/:id (simplest)

Open a registration modal inline

Since the card is used on the public HomePage (unauthenticated users), the button should redirect to login if not authenticated, or trigger registration if authenticated.

import { useNavigate } from 'react-router-dom';

// Inside component:
const navigate = useNavigate();

// On Register Now button:
onClick={() => navigate(user ? `/events/${item.id}` : '/login')}

Copy

Insert at cursor
tsx
The FeedItem interface already has id, so this works directly.

Phase 13 — "Add to Calendar" Button Implementation
File: frontend/src/features/announcements/components/SocialFeedCard.tsx

Problem: The "Add to Calendar" button has no onClick handler.

Decision from spec: Use Google Calendar web URL intent (no .ics download needed for MVP).

onClick={() => {
  if (!item.start_time) return;
  const start = new Date(item.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = item.end_time
    ? new Date(item.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    : start;
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE`
    + `&text=${encodeURIComponent(item.title)}`
    + `&dates=${start}/${end}`
    + `&details=${encodeURIComponent(item.body.substring(0, 200))}`
    + `&location=${encodeURIComponent(item.location ?? '')}`;
  window.open(url, '_blank');
}}


Copy

Insert at cursor
tsx
Execution Order for Agents
Execute phases in this exact order to avoid dependency failures:

Phase 1  → Backend model fixes (migrations required after)
Phase 2  → Frontend type fixes (unblocks TypeScript compilation)
Phase 3  → API service signature fixes
Phase 4  → SocialFeedCard bug fixes (visual + UX)
Phase 5  → ApprovalInboxPage real API wiring
Phase 6  → EventDetailPage "Return for Revision" button
Phase 7  → AppRoutes registration
Phase 8  → HomePage "My Department" tab logic
Phase 9  → Cron runner creation
Phase 10 → Security fixes (can be done in parallel with 4–9)
Phase 11 → Feed real data integration (depends on Phase 2 + 3)
Phase 12 → Register Now button wiring
Phase 13 → Add to Calendar button


Copy

Insert at cursor
Open Questions (Require Human Decision Before Implementation)
Emergency announcement emails: Should is_emergency = True announcements automatically trigger NotificationService.broadcast() to all active students on creation, or remain in-app only? This affects backend/app/announcements/service.py:create_announcement().

Feed author data strategy: Option A (new /feed endpoint) vs Option B (enrich existing to_dict())? Option A is cleaner but requires a new route + migration. Option B is faster but adds join overhead to all list queries.

JWT token storage migration: Migrating from localStorage to httpOnly cookies requires coordinated backend + frontend changes and affects the refresh token rotation flow in client.ts. Confirm if this is in scope for the current sprint.

Files Modified Per Phase Summary
Phase	Files
1.1	backend/app/announcements/model.py + new migration
1.2	backend/app/events/model.py + new migration
1.3	backend/app/announcements/service.py
2.1	frontend/src/features/announcements/types/index.ts
2.2	frontend/src/features/events/types/index.ts
2.3	frontend/src/features/events/types/index.ts
3.1	frontend/src/features/events/services/eventsApi.ts
3.2	frontend/src/features/announcements/services/announcementsApi.ts
4.1–4.2	frontend/src/features/announcements/components/SocialFeedCard.tsx
5	frontend/src/features/dashboards/shared/ApprovalInboxPage.tsx
6	frontend/src/features/events/pages/EventDetailPage.tsx
7	frontend/src/routes/AppRoutes.tsx + TeacherDashboardPage.tsx + OfficerDashboardPage.tsx
8	frontend/src/pages/HomePage.tsx
9	backend/cron_runner.py (NEW FILE)
10.1	frontend/src/api/client.ts + backend auth routes
10.2	backend/app/uploads/routes.py
10.3	frontend/src/features/auth/pages/LoginPage.tsx + RegisterPage.tsx
10.4	frontend/src/api/client.ts + backend Flask config
11	frontend/src/pages/HomePage.tsx + backend/app/announcements/model.py + backend/app/events/model.py
12–13	frontend/src/features/announcements/components/SocialFeedCard.tsx

Now writing this to the file. Since I'm in agentic-coding OFF mode, I cannot write files directly — but I can present the complete plan for you to save. Here it is formatted and ready:

---

The plan above is the complete `IMPLEMENTATION_PLAN.md` document. To save it, you can either:
- Switch to **agentic-coding ON mode** using the IDE Chat toggle and ask me to write it
- Or copy the markdown block above and save it as `IMPLEMENTATION_PLAN.md` at the project root

Here's a summary of the key findings from the full audit:

**Critical bugs found (will cause runtime crashes):**
- `Announcement.is_emergency` column missing — repository already sorts by it
- `EventRequirement.requirement_value` column missing — eligibility service reads it
- `SocialFeedCard` capacity bar CSS has escaped backslash — bar always renders at 0 width

**Integration gaps (features built but disconnected):**
- `ApprovalInboxPage` uses mock data, not wired to API
- `cron_runner.py` doesn't exist — `schedule_event_reminders()` is never called
- "Register Now" and "Add to Calendar" buttons have no `onClick` handlers
- `ApprovalInboxPage` has no route in `AppRoutes.tsx`
- `eventsApi.approve` / `announcementsApi.approve` don't accept `"returned"`

**Security issues (from automated scan):**
- JWT tokens stored in `localStorage` (XSS risk)
- Path traversal in file upload routes
- No CSRF protection on state-changing requests
- Hardcoded test credentials in `LoginPage` and `RegisterPage`