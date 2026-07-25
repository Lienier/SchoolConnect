# SchoolConnect: Detailed System Requirement Specification & AI Execution Manual

> **Project Target:** SchoolConnect — School Bulletin and Event Registration System  
> **Status:** ~65–70% Complete. Core models, RBAC, database schema, and endpoints exist. Fine-grained algorithms, approval workflows, schedule conflict checks, eligibility matching, and role-specific UI views require full implementation.

---

## 1. Project Alignment & Micro-Detail Audit

### Is even the smallest detail being followed?
**Mostly YES in database schema & backend permissions, but several micro-details need completion in logic & UI:**

#### ✅ Micro-Details Currently Covered in Code:
- **Event Schema Details:** Title, Description, Category, Start/End Time, Venue/Location, Organizer, Capacity, Registration Deadline, Team Size (`max_team_size`), `is_team_event`, `approval_required`, and Attachment links (`backend/app/events/model.py`).
- **Granular Event Statuses:** `draft`, `pending_approval`, `approved`, `ongoing`, `completed`, `cancelled`, `archived`.
- **Registration Statuses:** `pending`, `approved`, `rejected`, `waitlisted`, `cancelled`, `attended`, `absent`.
- **RBAC Matrix:** `admin`, `teacher`, `student_council`, `student` with 40+ granular permission strings (`backend/app/permissions/constants.py`).

#### ⚠️ Micro-Details Incomplete or Missing (To Be Implemented):
1. **Team Code Join Mechanism (Step 7):** PRD states: *"For group activities, one student may create a team and invite other students using a team code."* Currently, `register_team` requires passing all `member_ids` upfront. It needs an auto-generated 6-character `team_code` so teammates can join independently.
2. **Multi-Field Search Scope (Step 6 & Algo 9):** Search must match `venue`, `organizer_name`, `grade_level`, `department`, in addition to `title` and `description`.
3. **Approval Status "Returned for Revision" (Step 3 & 5):** The system currently supports `approved` and `rejected`. Needs `returned` status so Student Council Officers can edit and resubmit drafts.
4. **Approver Name Record (Section 4):** Approver ID is saved (`reviewer_id`), but the UI must render *"Approved by Prof. Jane Doe"* on the event detail view.
5. **Deadline Cancellation Lock (Step 7):** Students should be blocked from cancelling after `registration_deadline` passes.

---

## 2. Important Security & UX Guardrails (Features Users SHOULD NOT Have)

While certain features might sound "logically correct" to a developer, they **must be restricted** for privacy, security, and administrative integrity:

```
[SECURITY & PRIVACY GUARDRAILS]
```

1. 🚫 **No Student-Facing Participant Contact Directories:**
   - *Why:* Showing full names, emails, and phone numbers of other registered students violates data privacy laws (FERPA / Data Privacy Act).
   - *Rule:* Students should ONLY see aggregate numbers (e.g. "34 / 50 slots filled") or names of members in their *own* private team. Only Teachers & Admins can export/view full participant lists.

2. 🚫 **No Stealth Post-Approval Edits by Student Council:**
   - *Why:* An officer could get a minor event approved, then edit the date, venue, or title to something unauthorized without teacher knowledge.
   - *Rule:* If a Student Council Officer modifies an already `approved` event or announcement, the system MUST automatically reset its status to `pending_approval`.

3. 🚫 **Immutable Audit Logs & Scope-Restricted Attendance:**
   - *Why:* Allowing teachers or officers to delete audit logs or alter attendance records for events they don't manage creates accountability risks.
   - *Rule:* Audit logs are read-only and restricted to Admins (`audit.view`). Attendance scanning is locked to assigned event organizers (`attendance.scan`).

4. 🚫 **Locked Cancellations After Deadline:**
   - *Why:* Last-minute cancellations disrupt tournament brackets, team rosters, and leave waitlisted students stranded.
   - *Rule:* The "Cancel Registration" button is disabled as soon as `registration_deadline` passes.

5. 🚫 **Manual Approval Override for Auditions/Screenings:**
   - *Why:* Auto-approving registrations for talent shows, singing contests, or esports tryouts bypasses organizer evaluation.
   - *Rule:* Events flagged with `approval_required = True` MUST keep registrations in `pending` status until manually reviewed by an organizer.

---

## 3. UI/UX Feature Upgrade: Facebook / Instagram Style Bulletin Feed

To replace static landing pages, the application root (`/`) and student bulletin (`/announcements`) will feature a **vibrant, interactive Social Feed**:

### 📱 Feed Design Specifications
1. **Pinned & Emergency Hero Banner:**
   - Urgent announcements display in a prominent red/gold alert carousel at the top of the feed.
2. **Instagram / Facebook Style Feed Cards:**
   - **Header:** Author avatar, Full Name, Role Badge (*Student Council*, *Faculty*, *Admin*), Department Chip, and Time Ago (*2 hours ago*).
   - **Content:** Headline title, rich text body, expandable tags (*#Sports*, *#Seminar*, *#SingingContest*).
   - **Media Frame:** High-resolution banner image with light-box preview on click.
   - **Event Meta Widget (for Event Posts):** Date & Time badge, Venue tag, Interactive Capacity Meter bar (*42 / 50 Filled*), and Registration Deadline badge.
   - **Quick Action Bar:** 
     - "Register Now" (triggers seamless modal or login redirect).
     - "Share / Copy Link".
     - "Add to Google/iCal Calendar".
3. **Tabbed Filter Bar:**
   - Quick toggles: `All Updates` | `Announcements` | `Upcoming Events` | `My Department`.
   - Live Search Input matching Title, Description, Organizer, Venue, and Category.

---

## 4. Complete Implementation Matrix of 10 System Algorithms

| # | Algorithm | Implementation Logic & Location | Status |
|---|---|---|---|
| **1** | **Role-Based Access Control** | `backend/app/permissions/constants.py` & `usePermissions` hook in frontend. | ✅ 90% |
| **2** | **Event Approval** | `EventApproval` model & Approval Inbox UI with Approve / Reject / Return. | 🟡 60% |
| **3** | **Duplicate Reg Prevention** | `RegistrationService.register()` checks `(user_id, event_id)`. | ✅ 100% |
| **4** | **Capacity & FIFO Waitlist** | `RegistrationService._add_to_waitlist()` & `_promote_waitlist()`. | ✅ 85% |
| **5** | **Schedule Conflict Detection**| **NEW:** Query active registrations for overlapping `(start_time, end_time)`. | ❌ 0% |
| **6** | **Eligibility Checking** | **NEW:** Match `StudentProfile` (year, department, course) vs `EventRequirement`. | 🟡 40% |
| **7** | **Announcement Prioritization**| **NEW:** SQL Query order `is_emergency DESC, is_pinned DESC, created_at DESC`. | 🟡 50% |
| **8** | **Notification Scheduling** | Background cron runner for 3-day, 1-day, and event-day reminders. | 🟡 50% |
| **9** | **Search and Filtering** | Multi-attribute search query in `EventService` & `AnnouncementService`. | 🟡 50% |
| **10**| **Attendance Percentage** | Formula: $\frac{\text{Attended}}{\text{Approved}} \times 100$ in `ReportsService`. | 🟡 50% |

---

## 5. Execution Steps for AI Agents & Developers

1. **Implement Backend Missing Algorithms (Conflict Check, Eligibility, Prioritization):**
   - Add `_check_schedule_conflict()` in `backend/app/registrations/service.py`.
   - Add `_check_eligibility()` in `backend/app/registrations/service.py`.
   - Update `list_query()` in `backend/app/announcements/repository.py` for prioritization sorting.
2. **Build Facebook/Instagram Style Bulletin Feed:**
   - Create `SocialFeedCard.tsx` and `HeroAlertBanner.tsx` in `frontend/src/features/announcements/components/`.
   - Upgrade `HomePage.tsx` to render the interactive social feed for both public and logged-in visitors.
3. **Build Approval Inbox Component:**
   - Create `ApprovalInboxPage.tsx` in `frontend/src/features/dashboards/` with Approve, Reject, and Return for Revision modals.
4. **Implement Team Code Invitation System:**
   - Add `team_code` string generator (e.g. `SC-8X92`) in `backend/app/registrations/model.py` and a `join_by_code()` service endpoint.

# SchoolConnect: System Requirement Specification & AI Agent Execution Guide
> **Project Target:** SchoolConnect — School Bulletin and Event Registration System  
> **Status:** Partially Reflected (~65–70% Complete). Core models, RBAC, database schema, and endpoints exist. Fine-grained algorithms, approval workflows, schedule conflict checks, eligibility matching, and role-specific UI views require full implementation.
---
## 1. Project Alignment Overview
Is this prompt/specification reflected in this project?  
**YES, the foundational structure strictly reflects this vision**, but key algorithmic rules, notification automation, and role-specific frontend views are incomplete or need end-to-end integration.
### ✅ What is ALREADY Implemented:
1. **Architecture & Stack:**
   - **Backend:** Flask application factory with Python 3.11+, SQLAlchemy ORM, Alembic migrations, PostgreSQL (`psycopg3`), and JWT access/refresh token rotation.
   - **Frontend:** React + TypeScript + Vite + TailwindCSS with Light (Navy accent) / Techy Dark mode toggle, Shadcn-style component primitives, and Skeleton loaders.
2. **User Roles & RBAC (Algorithm 1):**
   - 4 System Roles: `admin`, `teacher`, `student_council`, `student` defined in `backend/app/permissions/constants.py` and synced to the database via `seed.py`.
   - Granular permissions (e.g. `events.approve`, `announcements.create`, `registrations.manage`, `attendance.scan`).
3. **Database Schema:**
   - Full ERD reflecting Student/Teacher/Admin/Officer profiles, Events, Event Approvals, Announcements, Registrations, Teams, Waitlists, Attendance, Notifications, and Audit Logs.
4. **Basic Registration & Waitlisting (Algorithms 3 & 4):**
   - Duplicate registration prevention (`RegistrationService.register`).
   - Capacity limits with FIFO waitlist fallback (`_add_to_waitlist`, `_promote_waitlist`).
---
## 2. Gap Analysis & Missing Algorithmic Implementations
The following table summarizes the gap between the specification and current code:
|
#
|
 System Algorithm / Feature 
|
 Current Status 
|
 Required Action / Gap to Fill 
|
|
---
|
---
|
---
|
---
|
|
**
1
**
|
**
Role-Based Access Control
**
|
 Backend permissions defined; 
`usePermissions`
 hook exists. 
|
 Enforce Student Council restrictions in UI (proposals/drafts only; no publish/delete without approval). 
|
|
**
2
**
|
**
Event & Announcement Approval Workflow
**
|
`EventApproval`
 and 
`AnnouncementApproval`
 models exist. 
|
 Create Approval Inbox UI for Admins/Teachers to Approve, Reject, or Return for Revision with comments. 
|
|
**
3
**
|
**
Duplicate Registration Prevention
**
|
 Backend service prevents duplicate entries per event. 
|
 Add immediate UI state ("Already Registered") and user-friendly error banners. 
|
|
**
4
**
|
**
Event Capacity & Waitlist Algorithm
**
|
 FIFO waitlisting implemented in backend 
`RegistrationService`
. 
|
 Display waitlist position to students in UI; trigger notification on auto-promotion. 
|
|
**
5
**
|
**
Schedule Conflict Detection
**
|
 ❌ 
**
NOT IMPLEMENTED
**
|
 Add backend logic in 
`RegistrationService.register()`
 to check if start/end times overlap with student's active event registrations. 
|
|
**
6
**
|
**
Eligibility Checking Algorithm
**
|
 Basic requirements table exists. 
|
 Implement automated student profile matching (Grade level, Course, Section, Department, Organization membership) before allowing registration. 
|
|
**
7
**
|
**
Announcement Prioritization
**
|
 Basic list endpoint. 
|
 Add sorting/ordering logic: 
`Emergency/Urgent -> Pinned -> Expiration Date -> Post Date`
 in 
`AnnouncementService`
 and Bulletin UI. 
|
|
**
8
**
|
**
Notification Scheduling
**
|
 Notification models & in-app templates exist. 
|
 Build automated background task/scheduler (or cron runner) for 3-day deadline, 1-day event, and event-day reminders. 
|
|
**
9
**
|
**
Search & Filtering Algorithm
**
|
 Basic keyword filter. 
|
 Build multi-attribute search toolbar (category, grade level, course, date range, open/closed, team vs individual). 
|
|
**
10
**
|
**
Attendance Percentage Algorithm
**
|
 Attendance records exist (
`attended`
, 
`absent`
). 
|
 Implement calculation formula 
`(Attended / Approved) * 100`
 in 
`ReportsService`
 and display in Dashboard analytics cards. 
|
---
