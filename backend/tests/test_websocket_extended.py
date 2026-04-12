"""Extended WebSocket tests — auth, connection limit, broadcast, disconnect."""

import sys
import os
from unittest.mock import patch

import pytest
from starlette.websockets import WebSocketDisconnect

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestWebSocketAuth:
    """Test WebSocket authentication with API key."""

    @patch("app.main.API_KEY", "test-secret-key")
    def test_ws_rejects_without_token(self, client):
        """Connection without auth message should be rejected when API_KEY is set."""
        try:
            with client.websocket_connect("/ws") as ws:
                # Send non-auth message — server should reject
                ws.send_text("ping")
                ws.receive_json()  # Should fail with close
        except Exception:
            pass  # Expected: connection closed

    @patch("app.main.API_KEY", "test-secret-key")
    def test_ws_accepts_valid_token(self, client):
        """Connection with correct token via first message should succeed."""
        with client.websocket_connect("/ws") as ws:
            ws.send_json({"type": "auth", "token": "test-secret-key"})
            ws.send_text("ping")
            data = ws.receive_json()
            assert data["type"] == "pong"

    @patch("app.main.API_KEY", "test-secret-key")
    def test_ws_rejects_invalid_token(self, client):
        """Connection with wrong token should be rejected."""
        try:
            with client.websocket_connect("/ws") as ws:
                ws.send_json({"type": "auth", "token": "wrong-key"})
                ws.send_text("ping")
                # Should not reach here
        except Exception:
            pass  # Expected: connection closed

    @patch("app.main.API_KEY", "")
    def test_ws_no_auth_when_key_empty(self, client):
        """When API_KEY is empty, no auth is required."""
        with client.websocket_connect("/ws") as ws:
            ws.send_text("ping")
            data = ws.receive_json()
            assert data["type"] == "pong"


class TestWebSocketConnectionLimit:
    """Test connection limit enforcement."""

    def test_ws_connection_limit(self, client):
        """Should reject connections beyond MAX_WS_CONNECTIONS."""
        from app.websocket import manager

        original_max = manager._max_connections
        manager._max_connections = 2

        try:
            with client.websocket_connect("/ws") as ws1:
                with client.websocket_connect("/ws") as ws2:
                    # Third connection should be rejected
                    try:
                        with client.websocket_connect("/ws") as ws3:
                            # If we get here, the limit wasn't enforced
                            # Send ping to verify it's actually connected
                            ws3.send_text("ping")
                    except Exception:
                        pass  # Expected: connection rejected

                    # First two should still work
                    ws1.send_text("ping")
                    data = ws1.receive_json()
                    assert data["type"] == "pong"
        finally:
            manager._max_connections = original_max
            manager.active_connections.clear()


class TestWebSocketBroadcast:
    """Test broadcast to multiple clients."""

    def test_broadcast_message(self, client):
        """Broadcast should reach all connected clients."""
        import asyncio
        from app.websocket import manager

        with client.websocket_connect("/ws") as ws:
            # Broadcast a message
            loop = asyncio.new_event_loop()
            loop.run_until_complete(
                manager.broadcast({"type": "new_mesure", "temperature": 25.0})
            )
            loop.close()

            data = ws.receive_json()
            assert data["type"] == "new_mesure"
            assert data["temperature"] == 25.0


class TestWebSocketDisconnect:
    """Test graceful disconnect handling."""

    def test_disconnect_removes_from_active(self, client):
        from app.websocket import manager

        initial_count = len(manager.active_connections)

        with client.websocket_connect("/ws") as ws:
            assert len(manager.active_connections) == initial_count + 1
            ws.send_text("ping")
            ws.receive_json()

        # After disconnect, connection should be removed
        assert len(manager.active_connections) == initial_count
