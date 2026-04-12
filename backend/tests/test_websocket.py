"""Tests for WebSocket endpoint."""


class TestWebSocketEndpoint:
    def test_ws_connect_and_ping(self, client):
        with client.websocket_connect("/ws") as ws:
            ws.send_text("ping")
            data = ws.receive_json()
            assert data["type"] == "pong"

    def test_ws_multiple_pings(self, client):
        with client.websocket_connect("/ws") as ws:
            for _ in range(3):
                ws.send_text("ping")
                data = ws.receive_json()
                assert data["type"] == "pong"
