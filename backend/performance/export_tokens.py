"""Refresh tokens for existing synthetic accounts without changing database rows."""
import json
import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv


def main():
    folder = Path(__file__).parent
    load_dotenv(folder / '.env.local', override=True)
    target = os.environ.get('PERF_DATABASE_URL')
    if not target or not os.environ.get('JWT_SECRET_KEY') or not os.environ.get('SECRET_KEY'):
        raise SystemExit('Configure the test database and signing keys first')
    os.environ['DATABASE_URL'] = target
    os.environ['FLASK_ENV'] = 'production'
    os.environ.setdefault('PGCONNECT_TIMEOUT', '10')
    from app.app import app
    from app.auth.model import User
    from app.announcements.model import Announcement
    from app.events.model import Event
    from app.extensions import db
    from flask_jwt_extended import create_access_token
    with app.app_context():
        rows = db.session.execute(db.select(User.id, User.email).where(User.status == 'active')).all()
        import re
        fixture = [identity for identity, email in rows if re.fullmatch(r'perf-\d+@example\.test', email)]
        if not fixture or len(fixture) != len(rows):
            raise SystemExit('Expected only active synthetic accounts; refusing export')
        announcements = db.session.scalar(db.select(db.func.count()).select_from(Announcement))
        events = db.session.scalar(db.select(db.func.count()).select_from(Event))
        output = folder / 'results'
        output.mkdir(exist_ok=True)
        tokens = [{'access_token': create_access_token(identity=str(identity), expires_delta=timedelta(hours=2))} for identity in fixture]
        (output / 'accounts.json').write_text(json.dumps(tokens), encoding='utf-8')
        print(f'Exported {len(tokens)} test tokens. Database contains {announcements} announcements and {events} events.')


if __name__ == '__main__':
    main()
