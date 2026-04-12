"""Tests for subscriber.py — message handling, DB save, reconnection."""

import sys
import os
import json
from unittest.mock import MagicMock, patch, PropertyMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.payload_codec import encode_payload


class TestSauvegarderMesure:
    """Test the sauvegarder_mesure function with mock DB."""

    def test_inserts_correct_values(self):
        from subscriber import sauvegarder_mesure

        conn = MagicMock()
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        conn.cursor.return_value = cursor

        sauvegarder_mesure(conn, "a1b2c3d4e5f60001", 24.5, 65.3)

        cursor.execute.assert_called_once()
        args = cursor.execute.call_args
        sql = args[0][0]
        params = args[0][1]
        assert "INSERT INTO mesures" in sql
        assert params == ("a1b2c3d4e5f60001", 24.5, 65.3)
        # commit is now called by on_message, not sauvegarder_mesure
        conn.commit.assert_not_called()

    def test_insert_with_extreme_values(self):
        from subscriber import sauvegarder_mesure

        conn = MagicMock()
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        conn.cursor.return_value = cursor

        sauvegarder_mesure(conn, "a1b2c3d4e5f60001", -40.0, 0.0)
        params = cursor.execute.call_args[0][1]
        assert params == ("a1b2c3d4e5f60001", -40.0, 0.0)


class TestOnMessage:
    """Test the on_message callback with mock DB and MQTT message."""

    def _make_mqtt_msg(self, device_id, temperature, humidite):
        """Build a mock MQTT message with Chirpstack v4 payload."""
        payload = {
            "deviceInfo": {"devEui": device_id},
            "data": encode_payload(temperature, humidite),
            "object": {
                "temperature": temperature,
                "humidite": humidite,
            },
        }
        msg = MagicMock()
        msg.payload = json.dumps(payload).encode()
        return msg

    @patch("subscriber.validate_sensor_reading", return_value=True)
    @patch("subscriber.get_db_conn")
    @patch("subscriber.write_heartbeat")
    def test_valid_message_saves_to_db(self, mock_heartbeat, mock_get_conn, mock_validate):
        from subscriber import on_message

        conn = MagicMock()
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        conn.cursor.return_value = cursor
        mock_get_conn.return_value = conn

        msg = self._make_mqtt_msg("a1b2c3d4e5f60001", 25.0, 60.0)
        on_message(None, None, msg)

        cursor.execute.assert_called_once()
        conn.commit.assert_called_once()
        mock_heartbeat.assert_called()

    @patch("subscriber.get_db_conn")
    def test_invalid_json_does_not_crash(self, mock_get_conn):
        from subscriber import on_message

        msg = MagicMock()
        msg.payload = b"not json"
        # Should not raise
        on_message(None, None, msg)
        mock_get_conn.assert_not_called()

    @patch("subscriber.get_db_conn")
    def test_missing_device_info_skips(self, mock_get_conn):
        from subscriber import on_message

        payload = {"data": encode_payload(25.0, 60.0)}
        msg = MagicMock()
        msg.payload = json.dumps(payload).encode()
        on_message(None, None, msg)
        mock_get_conn.assert_not_called()

    @patch("subscriber.validate_sensor_reading", return_value=True)
    @patch("subscriber.get_db_conn")
    @patch("subscriber.write_heartbeat")
    def test_db_error_resets_connection(self, mock_heartbeat, mock_get_conn, mock_validate):
        import psycopg2
        from subscriber import on_message
        import subscriber

        conn = MagicMock()
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        conn.cursor.return_value = cursor
        cursor.execute.side_effect = psycopg2.OperationalError("connection lost")
        # Need to make commit raise instead (the OperationalError is caught at a higher level)
        conn.commit.side_effect = psycopg2.OperationalError("connection lost")
        mock_get_conn.return_value = conn

        msg = self._make_mqtt_msg("a1b2c3d4e5f60001", 25.0, 60.0)

        # Store original _conn
        original_conn = subscriber._conn
        subscriber._conn = conn

        on_message(None, None, msg)

        # After error, _conn should be reset to None
        assert subscriber._conn is None

        # Restore
        subscriber._conn = original_conn


    @patch("subscriber.validate_sensor_reading", return_value=True)
    @patch("subscriber.get_db_conn")
    @patch("subscriber.write_heartbeat")
    def test_integrity_error_triggers_rollback(self, mock_heartbeat, mock_get_conn, mock_validate):
        import psycopg2
        from subscriber import on_message
        import subscriber

        conn = MagicMock()
        type(conn).closed = PropertyMock(return_value=False)
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        conn.cursor.return_value = cursor
        conn.commit.side_effect = psycopg2.IntegrityError("duplicate key")
        mock_get_conn.return_value = conn

        msg = self._make_mqtt_msg("a1b2c3d4e5f60001", 25.0, 60.0)

        original_conn = subscriber._conn
        subscriber._conn = conn

        on_message(None, None, msg)
        conn.rollback.assert_called_once()

        subscriber._conn = original_conn

    @patch("subscriber.validate_sensor_reading", return_value=True)
    @patch("subscriber.get_db_conn")
    @patch("subscriber.write_heartbeat")
    def test_data_error_triggers_rollback(self, mock_heartbeat, mock_get_conn, mock_validate):
        import psycopg2
        from subscriber import on_message
        import subscriber

        conn = MagicMock()
        type(conn).closed = PropertyMock(return_value=False)
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        conn.cursor.return_value = cursor
        conn.commit.side_effect = psycopg2.DataError("numeric field overflow")
        mock_get_conn.return_value = conn

        msg = self._make_mqtt_msg("a1b2c3d4e5f60001", 25.0, 60.0)

        original_conn = subscriber._conn
        subscriber._conn = conn

        on_message(None, None, msg)
        conn.rollback.assert_called_once()

        subscriber._conn = original_conn


class TestGetDbConn:
    """Test DB connection with retry logic."""

    @patch("subscriber.psycopg2.connect")
    def test_successful_connection(self, mock_connect):
        import subscriber

        original_conn = subscriber._conn
        subscriber._conn = None

        mock_conn = MagicMock()
        type(mock_conn).closed = PropertyMock(return_value=False)
        mock_connect.return_value = mock_conn

        result = subscriber.get_db_conn()
        assert result is mock_conn
        mock_connect.assert_called_once()

        subscriber._conn = original_conn

    @patch("subscriber.psycopg2.connect")
    def test_reuses_existing_connection(self, mock_connect):
        import subscriber

        original_conn = subscriber._conn
        mock_conn = MagicMock()
        type(mock_conn).closed = PropertyMock(return_value=False)
        subscriber._conn = mock_conn

        result = subscriber.get_db_conn()
        assert result is mock_conn
        mock_connect.assert_not_called()

        subscriber._conn = original_conn
