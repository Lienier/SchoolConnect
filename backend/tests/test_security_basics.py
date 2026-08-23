"""Regression tests for security-sensitive application behavior."""

import pytest

from app.app import create_app


def test_invalid_request_models_return_422_without_input_values():
    app = create_app("testing")
    response = app.test_client().post(
        "/api/auth/login", json={"email": "not-an-email", "password": "secret"}
    )

    assert response.status_code == 422
    body = response.get_json()
    assert body["error_code"] == "validation_error"
    assert all("input" not in item for item in body["errors"])


def test_upload_download_requires_authentication():
    app = create_app("testing")
    response = app.test_client().get("/api/uploads/unknown.pdf")

    assert response.status_code == 401


def test_production_rejects_placeholder_secrets(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "change-me-in-env")
    monkeypatch.setenv("JWT_SECRET_KEY", "replace-with-a-long-random-string")

    with pytest.raises(RuntimeError, match="Production requires"):
        create_app("production")
