"""Tests for health check endpoints."""

from unittest.mock import patch
from tests.conftest import make_cursor, make_conn_ctx


class TestRootEndpoint:
    def test_root_returns_status(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_root_returns_version(self, client):
        response = client.get("/")
        assert "version" in response.json()


class TestHealthEndpoint:
    @patch("app.routes.health.get_conn")
    def test_health_ok(self, mock_get_conn, client):
        cursor = make_cursor()
        mock_get_conn.side_effect = lambda: make_conn_ctx(cursor)

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["api"] is True
        assert data["database"] is True
        assert data["status"] == "ok"

    @patch("app.routes.health.get_conn")
    def test_health_db_down(self, mock_get_conn, client):
        mock_get_conn.side_effect = Exception("DB down")

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["api"] is True
        assert data["database"] is False
        assert data["status"] == "degraded"
