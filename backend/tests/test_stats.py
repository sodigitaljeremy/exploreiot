"""Tests for statistics endpoint."""

from unittest.mock import patch
from decimal import Decimal
from datetime import datetime


class TestStatsEndpoint:
    @patch("app.repositories.stats_repo.get_conn")
    def test_stats_returns_data(self, mock_get_conn, client):
        from tests.conftest import make_cursor, make_conn_ctx
        cursor = make_cursor(fetchone_result={
            "nb_devices": 3, "total_mesures": 100,
            "temp_moyenne_globale": Decimal("24.50"),
            "derniere_activite": datetime(2025, 1, 1),
        })
        mock_get_conn.side_effect = lambda: make_conn_ctx(cursor)

        response = client.get("/stats")
        assert response.status_code == 200
        stats = response.json()["stats"]
        assert stats["nb_devices"] == 3
        assert stats["total_mesures"] == 100
