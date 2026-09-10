"""Compare read-only event serialization queries against the test database."""
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env.local', override=True)
if not os.environ.get('PERF_DATABASE_URL'):
    raise SystemExit('Test database configuration required')
os.environ['DATABASE_URL'] = os.environ['PERF_DATABASE_URL']
os.environ['FLASK_ENV'] = 'production'
os.environ['PGCONNECT_TIMEOUT'] = '10'

try:
    from app.app import app
    from app.extensions import db
    from app.events.model import Event
except ImportError as exc:
    missing_name = getattr(exc, 'name', None) or str(exc)
    raise SystemExit(
        f'Missing backend dependency: {missing_name}. '
        'From backend/, run "python -m pip install -r requirements.txt".'
    ) from exc

from sqlalchemy import event, select, text
from sqlalchemy.orm import selectinload

with app.app_context():
    for optimized in (False, True):
        db.session.remove()
        db.session.execute(text('SET TRANSACTION READ ONLY'))
        samples = []
        def before(conn, cursor, statement, parameters, context, many):
            context.perf_started = time.perf_counter()
        def after(conn, cursor, statement, parameters, context, many):
            samples.append(time.perf_counter() - context.perf_started)
        event.listen(db.engine, 'before_cursor_execute', before)
        event.listen(db.engine, 'after_cursor_execute', after)
        started = time.perf_counter()
        query = select(Event).where(Event.deleted_at.is_(None), Event.status == 'approved').order_by(Event.start_time.desc()).limit(20)
        if optimized:
            query = query.options(selectinload(Event.attachments), selectinload(Event.results))
        items = db.session.scalars(query).all()
        loaded = len(samples)
        payload = [item.to_dict() for item in items]
        print({'batched_relationships': optimized, 'events': len(payload), 'queries': len(samples), 'serialization_queries': len(samples) - loaded, 'sql_seconds': round(sum(samples), 2), 'elapsed_seconds': round(time.perf_counter() - started, 2)}, flush=True)
        event.remove(db.engine, 'before_cursor_execute', before)
        event.remove(db.engine, 'after_cursor_execute', after)
        db.session.rollback()
