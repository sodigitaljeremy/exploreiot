"""Tests for alert detection endpoint."""

from unittest.mock import patch
from decimal import Decimal
from datetime import datetime
from tests.conftest import make_cursor, make_conn_ctx


class TestAlertsEndpoint:
    @patch("app.repositories.alert_repo.get_conn")
    def test_alerts_no_alerts(self, mock_get_conn, client):
        cursor = make_cursor(rows=[])
        mock_get_conn.side_effect = lambda: make_conn_ctx(cursor)

        response = client.get("/alerts")
        assert response.status_code == 200
        data = response.json()
        assert data["nb_alertes"] == 0
        assert data["alertes"] == []

    @patch("app.repositories.alert_repo.get_conn")
    def test_alerts_temperature(self, mock_get_conn, client):
        # find_high_temperature_alerts and find_silent_sensors call get_conn separately
        cursor_temp = make_cursor(rows=[
            {"device_id": "a1b2c3d4e5f60001", "temperature": Decimal("35.50"),
             "recu_le": datetime(2025, 1, 1)}
        ])
        cursor_silent = make_cursor(rows=[])
        mock_get_conn.side_effect = [
            make_conn_ctx(cursor_temp),
            make_conn_ctx(cursor_silent),
        ]

        response = client.get("/alerts")
        assert response.status_code == 200
        data = response.json()
        assert data["nb_alertes"] == 1
        assert data["alertes"][0]["type"] == "TEMPERATURE_ELEVEE"
