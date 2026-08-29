erDiagram
    %% ============================================================
    %% SchoolConnect - Entity Relationship Diagram
    %% Generated from SQLAlchemy models
    %% ============================================================

    

    %% ============================================================
    %% USER PROFILES (1:1 with USERS)
    %% ============================================================

    STUDENT_PROFILES {
        uuid id PK,FK
        varchar student_number UK
        uuid department_id FK
        uuid section_id FK
        smallint year_level
        date birth_date
    }

    TEACHER_PROFILES {
        uuid id PK,FK
        varchar employee_number UK
        uuid department_id FK
        varchar position
        date hire_date
    }

    ADMINISTRATOR_PROFILES {
        uuid id PK,FK
        varchar employee_number UK
        varchar position
    }

    OFFICER_PROFILES {
        uuid id PK,FK
        uuid organization_id FK
        varchar position
        date term_start
        date term_end
    }

    %% ============================================================
    %% RBAC (ROLE-BASED ACCESS CONTROL)
    %% ============================================================

    ROLES {
        uuid id PK
        varchar name UK
        varchar display_name
        text description
        boolean is_system
        int priority
        timestamptz created_at
    }

    PERMISSIONS {
        uuid id PK
        varchar name UK "e.g. events.approve"
        varchar resource "e.g. events"
        varchar action "e.g. approve"
        text description
    }

    USER_ROLES {
        uuid user_id PK,FK
        uuid role_id PK,FK
        uuid assigned_by FK
        timestamptz created_at
    }

    ROLE_PERMISSIONS {
        uuid role_id PK,FK
        uuid permission_id PK,FK
    }

    %% ============================================================
    %% SCHOOL STRUCTURE
    %% ============================================================

    DEPARTMENTS {
        uuid id PK
        varchar name
        varchar code UK
        text description
        uuid head_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    COURSES {
        uuid id PK
        uuid department_id FK
        varchar name
        varchar code
        timestamptz created_at
    }

    SECTIONS {
        uuid id PK
        uuid course_id FK
        uuid semester_id FK
        varchar name
        timestamptz created_at
    }

    ORGANIZATIONS {
        uuid id PK
        varchar name
        text description
        varchar category
        uuid adviser_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    ACADEMIC_YEARS {
        uuid id PK
        varchar name UK
        date start_date
        date end_date
        boolean is_current
        timestamptz created_at
    }

    SEMESTERS {
        uuid id PK
        uuid academic_year_id FK
        varchar name
        date start_date
        date end_date
        timestamptz created_at
    }

    %% ============================================================
    %% EVENTS MODULE
    %% ============================================================

    EVENT_CATEGORIES {
        uuid id PK
        varchar name UK
        varchar slug UK
        text description
        varchar color
    }

    EVENTS {
        uuid id PK
        varchar title
        text description
        uuid category_id FK
        uuid organizer_id FK
        uuid organization_id FK
        varchar status "draft|pending_approval|approved|ongoing|completed|cancelled|archived"
        timestamptz start_time
        timestamptz end_time
        varchar location
        int capacity
        timestamptz registration_deadline
        boolean is_team_event
        int max_team_size
        boolean approval_required
        uuid banner_file_id FK
        int view_count
        timestamptz created_at
        timestamptz updated_at
        uuid created_by
        uuid updated_by
        timestamptz deleted_at
    }

    EVENT_ATTACHMENTS {
        uuid id PK
        uuid event_id FK
        uuid file_id FK
    }

    EVENT_REQUIREMENTS {
        uuid id PK
        uuid event_id FK
        varchar requirement_type
        text description
        boolean is_mandatory
    }

    EVENT_APPROVALS {
        uuid id PK
        uuid event_id FK
        uuid reviewer_id FK
        varchar decision "pending|approved|rejected"
        text comment
        timestamptz decided_at
        timestamptz created_at
    }

    CALENDAR_EVENTS {
        uuid id PK
        uuid event_id FK
        varchar title
        timestamptz start_time
        timestamptz end_time
        boolean all_day
        varchar color
        boolean is_public
    }

    %% ============================================================
    %% ANNOUNCEMENTS MODULE
    %% ============================================================

    ANNOUNCEMENT_CATEGORIES {
        uuid id PK
        varchar name UK
        varchar slug UK
        text description
        varchar color
    }

    ANNOUNCEMENTS {
        uuid id PK
        varchar title
        text body
        varchar summary
        uuid category_id FK
        uuid author_id FK
        varchar priority "normal|important|urgent"
        varchar status "draft|pending_approval|published|archived"
        timestamptz published_at
        timestamptz expires_at
        json target_audience
        boolean is_pinned
        int view_count
        timestamptz created_at
        timestamptz updated_at
        uuid created_by
        uuid updated_by
        timestamptz deleted_at
    }

    ANNOUNCEMENT_APPROVALS {
        uuid id PK
        uuid announcement_id FK
        uuid reviewer_id FK
        varchar decision "pending|approved|rejected"
        text comment
        timestamptz decided_at
        timestamptz created_at
    }

    UPLOADED_FILES {
        uuid id PK
        uuid uploader_id FK
        varchar filename
        varchar original_name
        varchar content_type
        int size_bytes
        varchar storage_backend
        text storage_path
        text url
        varchar entity_type
        uuid entity_id
        timestamptz created_at
    }

    ANNOUNCEMENT_ATTACHMENTS {
        uuid id PK
        uuid announcement_id FK
        uuid file_id FK
    }

    %% ============================================================
    %% REGISTRATIONS MODULE
    %% ============================================================

    TEAMS {
        uuid id PK
        uuid event_id FK
        varchar name
        uuid leader_id FK
        timestamptz created_at
    }

    TEAM_MEMBERS {
        uuid id PK
        uuid team_id FK
        uuid user_id FK
        varchar role "leader|member"
        timestamptz joined_at
    }

    REGISTRATIONS {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        uuid team_id FK
        varchar status "pending|approved|rejected|waitlisted|cancelled|attended|absent"
        text notes
        uuid reviewed_by FK
        timestamptz reviewed_at
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    WAITLISTS {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        int position
        boolean promoted
        timestamptz created_at
    }

    %% ============================================================
    %% ATTENDANCE MODULE
    %% ============================================================

    ATTENDANCE {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        uuid registration_id FK
        varchar status "present|absent|excused|late"
        timestamptz check_in_at
        timestamptz check_out_at
        varchar method "manual|qr|nfc"
        uuid recorded_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    ATTENDANCE_LOGS {
        uuid id PK
        uuid attendance_id FK
        uuid event_id FK
        uuid user_id FK
        varchar action
        varchar method
        uuid actor_id
        timestamptz created_at
    }

    QR_TOKENS {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        varchar token UK
        timestamptz expires_at
        boolean used
        timestamptz used_at
        timestamptz created_at
    }

    %% ============================================================
    %% NOTIFICATIONS MODULE
    %% ============================================================

    NOTIFICATION_TEMPLATES {
        uuid id PK
        varchar code UK
        varchar title
        text body
        varchar channel "in_app|email|sms"
        timestamptz created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        varchar title
        text body
        varchar category "general|event|announcement|registration|attendance|system"
        varchar status "unread|read|archived"
        varchar entity_type
        uuid entity_id
        timestamptz read_at
        timestamptz created_at
    }

    NOTIFICATION_LOGS {
        uuid id PK
        uuid notification_id FK
        uuid user_id FK
        varchar channel "in_app|email|sms|push"
        varchar recipient
        varchar status "queued|sent|failed|bounced"
        text error
        timestamptz sent_at
        timestamptz created_at
    }

    %% ============================================================
    %% AUDIT MODULE
    %% ============================================================

    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar entity_type
        uuid entity_id
        json old_values
        json new_values
        text ip_address
        text user_agent
        timestamptz created_at
    }

    %% ============================================================
    %% RELATIONSHIPS
    %% ============================================================

    %% Auth -> Profiles (1:1)
    USERS ||--|| STUDENT_PROFILES : "profile"
    USERS ||--|| TEACHER_PROFILES : "profile"
    USERS ||--|| ADMINISTRATOR_PROFILES : "profile"
    USERS ||--|| OFFICER_PROFILES : "profile"

    %% Auth -> Tokens (1:N)
    USERS ||--o{ REFRESH_TOKENS : "has"
    USERS ||--o{ OAUTH_ACCOUNTS : "has"
    USERS ||--o{ PASSWORD_RESET_TOKENS : "has"
    USERS ||--o{ EMAIL_VERIFICATION_TOKENS : "has"

    %% Auth -> RBAC (N:M)
    USERS }|--o{ USER_ROLES : "assigned"
    ROLES }|--o{ USER_ROLES : "assigned_to"
    ROLES }|--o{ ROLE_PERMISSIONS : "has"
    PERMISSIONS }|--o{ ROLE_PERMISSIONS : "granted_to"

    %% College Structure
    DEPARTMENTS ||--o{ COURSES : "offers"
    COURSES ||--o{ SECTIONS : "has"
    SEMESTERS ||--o{ SECTIONS : "contains"
    ACADEMIC_YEARS ||--o{ SEMESTERS : "contains"
    DEPARTMENTS ||--o{ STUDENT_PROFILES : "enrolled_in"
    DEPARTMENTS ||--o{ TEACHER_PROFILES : "assigned_to"
    DEPARTMENTS ||--o{ USERS : "headed_by (head_id)"

    %% Organizations
    ORGANIZATIONS ||--o{ OFFICER_PROFILES : "member_of"
    ORGANIZATIONS ||--o{ USERS : "advised_by (adviser_id)"
    ORGANIZATIONS ||--o{ EVENTS : "organizes"

    %% Academic Structure
    ACADEMIC_YEARS ||--o{ SEMESTERS : "contains"
    SEMESTERS ||--o{ SECTIONS : "contains"
    COURSES ||--o{ SECTIONS : "offered_in"
    SECTIONS ||--o{ STUDENT_PROFILES : "enrolled_in"

    %% Events
    EVENT_CATEGORIES ||--o{ EVENTS : "categorizes"
    USERS ||--o{ EVENTS : "organizes (organizer_id)"
    ORGANIZATIONS ||--o{ EVENTS : "hosts"
    UPLOADED_FILES ||--o{ EVENTS : "banner (banner_file_id)"
    EVENTS ||--o{ EVENT_ATTACHMENTS : "has"
    UPLOADED_FILES ||--o{ EVENT_ATTACHMENTS : "attached_to"
    EVENTS ||--o{ EVENT_REQUIREMENTS : "requires"
    EVENTS ||--o{ EVENT_APPROVALS : "has_approvals"
    USERS ||--o{ EVENT_APPROVALS : "reviews"
    EVENTS ||--|| CALENDAR_EVENTS : "calendar_entry"

    %% Announcements
    ANNOUNCEMENT_CATEGORIES ||--o{ ANNOUNCEMENTS : "categorizes"
    USERS ||--o{ ANNOUNCEMENTS : "authored_by (author_id)"
    ANNOUNCEMENTS ||--o{ ANNOUNCEMENT_APPROVALS : "has_approvals"
    USERS ||--o{ ANNOUNCEMENT_APPROVALS : "reviews"
    ANNOUNCEMENTS ||--o{ ANNOUNCEMENT_ATTACHMENTS : "has"
    UPLOADED_FILES ||--o{ ANNOUNCEMENT_ATTACHMENTS : "attached_to"

    %% Registrations
    EVENTS ||--o{ TEAMS : "allows_teams"
    USERS ||--o{ TEAMS : "leads (leader_id)"
    TEAMS ||--o{ TEAM_MEMBERS : "has_members"
    USERS ||--o{ TEAM_MEMBERS : "is_member"
    EVENTS ||--o{ REGISTRATIONS : "receives"
    USERS ||--o{ REGISTRATIONS : "registers"
    TEAMS ||--o{ REGISTRATIONS : "team_registration"
    USERS ||--o{ REGISTRATIONS : "reviews (reviewed_by)"
    EVENTS ||--o{ WAITLISTS : "has_waitlist"
    USERS ||--o{ WAITLISTS : "waitlisted"

    %% Attendance
    EVENTS ||--o{ ATTENDANCE : "tracks"
    USERS ||--o{ ATTENDANCE : "attends"
    REGISTRATIONS ||--o{ ATTENDANCE : "linked_to"
    USERS ||--o{ ATTENDANCE : "recorded_by (recorded_by)"
    ATTENDANCE ||--o{ ATTENDANCE_LOGS : "logs"
    EVENTS ||--o{ ATTENDANCE_LOGS : "logged_for"
    USERS ||--o{ ATTENDANCE_LOGS : "actor"
    EVENTS ||--o{ QR_TOKENS : "issues"
    USERS ||--o{ QR_TOKENS : "assigned_to"

    %% Notifications
    USERS ||--o{ NOTIFICATIONS : "receives"
    NOTIFICATIONS ||--o{ NOTIFICATION_LOGS : "delivery_log"
    USERS ||--o{ NOTIFICATION_LOGS : "delivery_target"
    NOTIFICATION_TEMPLATES ||--o{ NOTIFICATIONS : "from_template"

    %% Uploads
    USERS ||--o{ UPLOADED_FILES : "uploads"
    UPLOADED_FILES ||--o{ EVENT_ATTACHMENTS : "attached_to_event"
    UPLOADED_FILES ||--o{ ANNOUNCEMENT_ATTACHMENTS : "attached_to_announcement"
    UPLOADED_FILES ||--o{ EVENTS : "banner_image"

    %% Audit
    USERS ||--o{ AUDIT_LOGS : "performed_by"
