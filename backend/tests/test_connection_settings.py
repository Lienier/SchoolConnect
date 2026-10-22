from pathlib import Path

from app.app import create_app
from app.config.settings import TestingConfig, _database_engine_options


def test_postgres_connection_waits_are_bounded(monkeypatch):
    monkeypatch.setenv("DATABASE_CONNECT_TIMEOUT_SECONDS", "3")
    monkeypatch.setenv("DATABASE_POOL_TIMEOUT_SECONDS", "5")
    options = _database_engine_options("postgresql+psycopg://localhost/example")
    assert options["connect_args"]["connect_timeout"] == 3
    assert options["pool_timeout"] == 5


def test_sqlite_does_not_receive_postgres_connection_options():
    assert _database_engine_options("sqlite:///:memory:") == {"pool_pre_ping": True}


def test_relative_upload_folder_resolves_from_backend_root(monkeypatch):
    monkeypatch.setattr(TestingConfig, "UPLOAD_FOLDER", "uploads")
    app = create_app("testing")
    backend_root = Path(__file__).resolve().parents[1]
    assert Path(app.config["UPLOAD_FOLDER"]) == backend_root / "uploads"


def test_absolute_upload_folder_is_preserved(monkeypatch, tmp_path):
    monkeypatch.setattr(TestingConfig, "UPLOAD_FOLDER", str(tmp_path))
    app = create_app("testing")
    assert Path(app.config["UPLOAD_FOLDER"]) == tmp_path.resolve()
