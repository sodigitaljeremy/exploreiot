"""Tests for device endpoints."""

from unittest.mock import patch
from decimal import Decimal
from datetime import datetime
from tests.conftest import make_cursor, make_conn_ctx

# Valid EUI-64 hex IDs for testing
DEVICE_EUI_1 = "a1b2c3d4e5f60001"
DEVICE_EUI_2 = "a1b2c3d4e5f60002"


class TestDevicesEndpoint:
    @patch("app.repositories.device_repo.get_conn")
    def test_devices_returns_list(self, mock_get_conn, client):
        fake_rows = [
            {"device_id": DEVICE_EUI_1, "nb_mesures": 10,
             "temp_moyenne": Decimal("25.50"), "temp_min": Decimal("20.00"),
             "temp_max": Decimal("31.00"), "derniere_mesure": datetime(2025, 1, 1)}
        ]
        cursor = make_cursor(rows=fake_rows)
        mock_get_conn.side_effect = lambda: make_conn_ctx(cursor)

        response = client.get("/devices")
        assert response.status_code == 200
        devices = response.json()["devices"]
        assert len(devices) == 1
        assert devices[0]["device_id"] == DEVICE_EUI_1

    @patch("app.repositories.device_repo.get_conn")
    def test_devices_empty(self, mock_get_conn, client):
        cursor = make_cursor(rows=[])
        mock_get_conn.side_effect = lambda: make_conn_ctx(cursor)

        response = client.get("/devices")
        assert response.status_code == 200
        assert response.json()["devices"] == []


class TestMetricsEndpoint:
    @patch("app.repositories.device_repo.get_conn")
    def test_metrics_device_not_found(self, mock_get_conn, client):
        cursor = make_cursor(fetchone_result={"n": 0})
        mock_get_conn.side_effect = lambda: make_conn_ctx(cursor)

        response = client.get(f"/devices/{DEVICE_EUI_1}/metrics")
        assert response.status_code == 404
        assert response.json()["error"] == "Device not found"

    @patch("app.repositories.device_repo.get_conn")
    def test_metrics_returns_data(self, mock_get_conn, client):
        # device_exists and get_device_metrics both call get_conn separately
        # We need to handle multiple calls
        cursor_exists = make_cursor(fetchone_result={"n": 5})
        cursor_metrics = make_cursor(rows=[
            {"id": 1, "device_id": DEVICE_EUI_1, "temperature": Decimal("25.00"),
             "humidite": Decimal("60.00"), "recu_le": datetime(2025, 1, 1)}
        ])
        mock_get_conn.side_effect = [
            make_conn_ctx(cursor_exists),
            make_conn_ctx(cursor_metrics),
        ]

        response = client.get(f"/devices/{DEVICE_EUI_1}/metrics?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data["device_id"] == DEVICE_EUI_1
        assert len(data["mesures"]) == 1

    @patch("app.repositories.device_repo.get_conn")
    def test_metrics_custom_limit(self, mock_get_conn, client):
        cursor_exists = make_cursor(fetchone_result={"n": 1})
        cursor_metrics = make_cursor(rows=[])
        mock_get_conn.side_effect = [
            make_conn_ctx(cursor_exists),
            make_conn_ctx(cursor_metrics),
        ]

        response = client.get(f"/devices/{DEVICE_EUI_1}/metrics?limit=50")
        assert response.status_code == 200

    def test_metrics_limit_validation_too_high(self, client):
        """Limit > 1000 should return 422."""
        response = client.get(f"/devices/{DEVICE_EUI_1}/metrics?limit=9999")
        assert response.status_code == 422

    def test_metrics_limit_validation_negative(self, client):
        """Negative limit should return 422."""
        response = client.get(f"/devices/{DEVICE_EUI_1}/metrics?limit=-1")
        assert response.status_code == 422

    def test_metrics_invalid_device_id(self, client):
        """Invalid device ID format should return 400."""
        response = client.get("/devices/invalid-id/metrics")
        assert response.status_code == 400
        assert "Invalid device ID" in response.json()["error"]
