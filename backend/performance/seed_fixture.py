"""Create synthetic browsing data only in an explicitly selected empty database.

From backend: python -m performance.seed_fixture
Never reads DATABASE_URL from the project's .env as a fallback.
"""
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path


def main():
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env.local', override=True)
    target = os.environ.get('PERF_DATABASE_URL', '')
    if not target or os.environ.get('PERF_CONFIRM_EMPTY_DATABASE') != 'yes':
        raise SystemExit('Set PERF_DATABASE_URL to a separate migrated empty database and PERF_CONFIRM_EMPTY_DATABASE=yes')
    if not os.environ.get('SECRET_KEY') or not os.environ.get('JWT_SECRET_KEY'):
        raise SystemExit('Set the test service SECRET_KEY and JWT_SECRET_KEY explicitly')
    os.environ['DATABASE_URL'] = target
    os.environ['FLASK_ENV'] = 'production'
    from app.app import create_app
    from app.extensions import db
    from app.auth.model import User
    from app.announcements.model import Announcement
    from app.events.model import Event
    from flask_jwt_extended import create_access_token
    from seed import seed_rbac
    from app.permissions.model import Role

    count = int(os.environ.get('PERF_USERS', '100'))
    if not 1 <= count <= 1000:
        raise SystemExit('PERF_USERS must be between 1 and 1000')
    app = create_app('production')
    with app.app_context():
        # Fail before changing RBAC or data if pointed at an existing app database.
        if db.session.scalar(db.select(db.func.count()).select_from(User)):
            raise SystemExit('Refusing fixture creation: database already contains users')
        seed_rbac()
        role = db.session.scalar(db.select(Role).where(Role.name == 'student'))
        now = datetime.now(timezone.utc)
        users = [User(id=uuid.uuid4(), email=f'perf-{i}@example.test', full_name=f'Performance Student {i}', status='active', email_verified=True, roles=[role]) for i in range(count)]
        db.session.add_all(users)
        db.session.flush()
        for i in range(200):
            db.session.add(Announcement(title=f'Fixture announcement {i}', body='Synthetic bulletin content. ' * 30, author_id=users[i % count].id, status='published', target_audience=['all'], published_at=now))
        for i in range(100):
            db.session.add(Event(title=f'Fixture event {i}', organizer_id=users[i % count].id, status='approved', start_time=now + timedelta(days=30), end_time=now + timedelta(days=31), capacity=100))
        user_ids = [user.id for user in users]
        db.session.commit()
        output = Path(__file__).parent / 'results'
        output.mkdir(exist_ok=True)
        tokens = [{'access_token': create_access_token(identity=str(identity), expires_delta=timedelta(hours=2))} for identity in user_ids]
        (output / 'accounts.json').write_text(json.dumps(tokens), encoding='utf-8')
        print(f'Created {count} students, 200 announcements, 100 events; tokens saved to performance/results/accounts.json')


if __name__ == '__main__':
    main()
