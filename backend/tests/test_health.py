"""
tests/test_health.py
─────────────────────
Smoke tests for the health-check and route registration.
Run with: pytest tests/ -v
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_docs_available():
    response = client.get("/docs")
    assert response.status_code == 200


def test_transcribe_no_file_returns_422():
    """Endpoint should return 422 when no file is provided."""
    response = client.post("/api/v1/audio/transcribe")
    assert response.status_code == 422


def test_transcribe_unsupported_extension(tmp_path):
    """Endpoint should reject files with unsupported extensions."""
    bad_file = tmp_path / "test.xyz"
    bad_file.write_bytes(b"not audio")
    with open(bad_file, "rb") as f:
        response = client.post(
            "/api/v1/audio/transcribe",
            files={"file": ("test.xyz", f, "application/octet-stream")},
        )
    # AudioValidationError → 400
    assert response.status_code == 400
