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
    now = utcnow()
    for index in range(25):
        start = now + timedelta(days=10 + index % 10, minutes=index * 5)
        event = Event(title=f"QA Pagination {index:02}", organizer_id=teacher.id, start_time=start, end_time=start+timedelta(hours=1), status="approved", capacity=100, created_at=now-timedelta(days=2))
        db.session.add(event); db.session.flush()
        db.session.add(Registration(event_id=event.id, user_id=student.id, status="pending" if index == 0 else "approved", created_at=now-timedelta(days=25-index)))
    db.session.add(Notification(user_id=student.id, title="QA Keyboard Notification", body="Synthetic keyboard notification", category="system", status="unread"))
    db.session.commit()
print("Added 25 synthetic events/registrations and one keyboard notification.")
