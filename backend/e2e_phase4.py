"""One-off E2E smoke test for Phase 4 endpoints using Flask's test client."""

import json
from app.app import create_app

app = create_app("development")
c = app.test_client()


def auth(email="admin@school.edu", password="password123"):
    r = c.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.get_json()
    return {"Authorization": f"Bearer {r.get_json()['data']['access_token']}"}


h = auth()


def show(label, r):
    j = r.get_json()
    print(f"\n[{label}] {r.status_code} success={j.get('success')}")
    if not j.get("success"):
        print("  ERR:", j.get("message"), j.get("error_code"))
        return j
    if "meta" in j:
        print("  meta:", j["meta"])
    print("  data:", json.dumps(j.get("data"))[:400])
    return j


# ---- Roles ----
roles = show("list roles", c.get("/api/roles?page=1&page_size=10", headers=h))
created = show(
    "create role registrar",
    c.post(
        "/api/roles",
        headers=h,
        json={"name": "registrar", "display_name": "Registrar",
              "permissions": ["departments.view", "courses.view"]},
    ),
)
rid = created["data"]["id"]
show(
    "clone role",
    c.post(f"/api/roles/{rid}/clone", headers=h,
           json={"name": "registrar_asst", "display_name": "Registrar Assistant"}),
)
show(
    "assign perms",
    c.put(f"/api/roles/{rid}/permissions", headers=h,
          json={"permissions": ["departments.view", "departments.manage", "courses.view"]}),
)
perms = show("list permissions", c.get("/api/roles/permissions", headers=h))
show("search roles", c.get("/api/roles?search=reg", headers=h))

# ---- School structure ----
dept = show(
    "create department",
    c.post("/api/school/departments", headers=h,
           json={"name": "Computer Science", "code": "CS", "description": "CS dept"}),
)
did = dept["data"]["id"]
course = show(
    "create course",
    c.post("/api/school/courses", headers=h,
           json={"department_id": did, "name": "BSCS", "code": "BSCS"}),
)
cid = course["data"]["id"]
ay = show(
    "create academic year",
    c.post("/api/school/academic-years", headers=h,
           json={"name": "2025-2026", "start_date": "2025-06-01", "end_date": "2026-05-31",
                 "is_current": True}),
)
yid = ay["data"]["id"]
sem = show(
    "create semester",
    c.post("/api/school/semesters", headers=h,
           json={"academic_year_id": yid, "name": "1st Sem", "start_date": "2025-06-01",
                 "end_date": "2025-10-31"}),
)
sid = sem["data"]["id"]
show(
    "create section",
    c.post("/api/school/sections", headers=h,
           json={"course_id": cid, "semester_id": sid, "name": "A"}),
)
show("list courses filter dept", c.get(f"/api/school/courses?department_id={did}", headers=h))
show("search departments", c.get("/api/school/departments?search=comp", headers=h))

# ---- User management ----
show("list users search", c.get("/api/users?search=admin&role=admin", headers=h))
uid = roles["data"][0]["id"] if False else None
# get first user id from list
ul = c.get("/api/users?page=1&page_size=1", headers=h).get_json()
first_uid = ul["data"][0]["id"]
show("disable user", c.post(f"/api/users/{first_uid}/disable", headers=h))
show("reactivate user", c.post(f"/api/users/{first_uid}/reactivate", headers=h))
show("admin reset pw", c.post(f"/api/users/{first_uid}/reset-password", headers=h,
                              json={"new_password": "newpassword123"}))
show("user activity", c.get(f"/api/users/{first_uid}/activity", headers=h))

# ---- Dashboard ----
show("dashboard stats", c.get("/api/dashboard/stats", headers=h))

# ---- Negative: system role delete blocked ----
def _system_role_id():
    r = c.get("/api/roles?search=admin", headers=h).get_json()
    for d in r["data"]:
        if d["name"] == "admin":
            return d["id"]
    return r["data"][0]["id"]


show("delete system role (should fail)", c.delete("/api/roles/" + _system_role_id(), headers=h))

print("\nALL E2E CALLS COMPLETED")
