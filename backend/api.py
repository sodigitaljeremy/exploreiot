"""Backwards-compatible entrypoint. Use app.main:app for new deployments."""

from app.main import app  # noqa: F401
