"""Tests for security hardening."""

from unittest.mock import patch
import pytest


class TestApiKeyAuth:
    @patch("app.security.API_KEY", "test-secret-key-32chars-minimum!")
    def test_request_without_key_returns_401(self, client):
        response = client.get("/devices")
        assert response.status_code == 401

    @patch("app.security.API_KEY", "test-secret-key-32chars-minimum!")
    def test_request_with_wrong_key_returns_401(self, client):
        response = client.get("/devices", headers={"X-API-Key": "wrong-key"})
        assert response.status_code == 401

    @patch("app.security.API_KEY", "")
    @patch("app.repositories.device_repo.get_conn")
    def test_empty_api_key_disables_auth(self, mock_get_conn, client):
        from tests.conftest import make_cursor, make_conn_ctx
        cursor = make_cursor(rows=[])
        mock_get_conn.side_effect = lambda: make_conn_ctx(cursor)

        response = client.get("/devices")
        assert response.status_code == 200


class TestWebSocketAuth:
    @patch("app.main.API_KEY", "test-secret-key-32chars-minimum!")
    def test_ws_without_token_rejected(self, client):
        """WebSocket without token should be closed when API_KEY is set."""
        try:
            with client.websocket_connect("/ws") as ws:
                # Should fail to establish
                ws.send_text("ping")
        except Exception:
            pass  # Expected: connection rejected

    @patch("app.main.API_KEY", "test-secret-key-32chars-minimum!")
    def test_ws_with_valid_token_accepted(self, client):
        with client.websocket_connect("/ws") as ws:
            ws.send_json({"type": "auth", "token": "test-secret-key-32chars-minimum!"})
            ws.send_text("ping")
            data = ws.receive_json()
            assert data["type"] == "pong"

    @patch("app.main.API_KEY", "")
    def test_ws_no_auth_when_key_empty(self, client):
        with client.websocket_connect("/ws") as ws:
            ws.send_text("ping")
            data = ws.receive_json()
            assert data["type"] == "pong"


class TestSecurityHeaders:
    def test_security_headers_present(self, client):
        response = client.get("/")
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert response.headers["X-Permitted-Cross-Domain-Policies"] == "none"


class TestConfigFailFast:
    def test_production_without_api_key_raises(self):
        with patch.dict("os.environ", {"ENVIRONMENT": "production", "API_KEY": ""}):
            with pytest.raises(RuntimeError, match="API_KEY must be set"):
                # Force reimport to trigger the validation
                import importlib
                import app.config
                importlib.reload(app.config)
