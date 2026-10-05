"""Additional synthetic pagination/keyboard preconditions, outside the UI driver."""
import os, sys
from pathlib import Path
from datetime import timedelta
fixture = Path(sys.argv[1])
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "backend"))
os.environ["FLASK_ENV"] = "testing"
os.environ["TEST_DATABASE_URL"] = "sqlite:///" + (fixture / "ui.sqlite").as_posix()
from app.app import app
from app.extensions import db
from app.auth.model import User
from app.events.model import Event
from app.registrations.model import Registration
from app.notifications.model import Notification
from app.utils.datetime import utcnow
with app.app_context():
    teacher = db.session.scalar(db.select(User).where(User.email == "teacher@qa.schoolconnect.example"))
    student = db.session.scalar(db.select(User).where(User.email == "student@qa.schoolconnect.example"))
    import uuid, json
    manifest = json.loads((fixture / "manifest.json").read_text())
    event = db.session.get(Event, uuid.UUID(manifest["events"]["live"]))
    event.capacity = 200
    for index in range(105):
        user = User(email=f"roster-{index:03}@qa.schoolconnect.example", full_name=f"QA Roster {index:03}", status="active", email_verified=True)
        db.session.add(user); db.session.flush()
        db.session.add(Registration(event_id=event.id, user_id=user.id, status="approved"))
    db.session.commit()
    print("Added 105 synthetic participants to a 200-capacity event.")
