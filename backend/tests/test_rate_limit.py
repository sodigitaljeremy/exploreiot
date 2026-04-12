"""Tests for rate limiting configuration."""

from app.rate_limit import limiter
from app.config import RATE_LIMIT_DEFAULT


class TestRateLimitConfig:
    def test_limiter_initialized(self):
        """Limiter instance must be available."""
        assert limiter is not None

    def test_rate_limit_default_format(self):
        """Default rate limit must be a valid format."""
        # slowapi expects format like "30/minute"
        parts = RATE_LIMIT_DEFAULT.split("/")
        assert len(parts) == 2
        assert parts[0].isdigit()
        assert parts[1] in ("second", "minute", "hour", "day")

    def test_health_rate_limited_but_generous(self, client):
        """Health endpoints should accept reasonable traffic."""
        for _ in range(5):
            response = client.get("/")
            assert response.status_code == 200

    def test_limiter_attached_to_app(self, client):
        """Limiter must be attached to app state."""
        assert hasattr(client.app.state, "limiter")
        assert client.app.state.limiter is limiter
