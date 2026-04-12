"""Tests for custom error handling."""

from unittest.mock import patch
from decimal import Decimal
from datetime import datetime
from tests.conftest import make_cursor, make_conn_ctx

DEVICE_EUI_1 = "a1b2c3d4e5f60001"


class TestCustomErrors:
    @patch("app.repositories.device_repo.get_conn")
    def test_not_found_returns_404(self, mock_get_conn, client):
        cursor = make_cursor(fetchone_result={"n": 0})
        mock_get_conn.side_effect = lambda: make_conn_ctx(cursor)

        response = client.get(f"/devices/{DEVICE_EUI_1}/metrics")
        assert response.status_code == 404
        assert response.json()["error"] == "Device not found"

    def test_validation_error_returns_400(self, client):
        response = client.get("/devices/invalid-id/metrics")
        assert response.status_code == 400
        assert "Invalid device ID" in response.json()["error"]

    @patch("app.repositories.device_repo.get_conn")
    def test_success_field_present(self, mock_get_conn, client):
        cursor = make_cursor(rows=[])
        mock_get_conn.side_effect = lambda: make_conn_ctx(cursor)

        response = client.get("/devices")
        assert response.status_code == 200
        assert response.json()["success"] is True
