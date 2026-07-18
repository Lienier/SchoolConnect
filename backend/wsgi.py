"""WSGI entrypoint for production servers (gunicorn / waitress).

Usage:
    gunicorn wsgi:app            # Linux / macOS
    waitress-serve --call wsgi:create_app   # Windows
"""

from app.app import app, create_app

__all__ = ["app", "create_app"]
