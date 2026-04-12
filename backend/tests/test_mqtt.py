"""Tests for MQTT payload validation and Chirpstack decoding."""

import sys
import os
import base64

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.mqtt_service import validate_sensor_reading
from app.payload_codec import decode_chirpstack_payload, encode_payload


class TestSensorValidation:
    def test_valid_reading(self):
        assert validate_sensor_reading(25.0, 60.0) is True

    def test_temperature_too_high(self):
        assert validate_sensor_reading(100.0, 60.0) is False

    def test_temperature_too_low(self):
        assert validate_sensor_reading(-50.0, 60.0) is False

    def test_humidity_over_100(self):
        assert validate_sensor_reading(25.0, 150.0) is False

    def test_humidity_negative(self):
        assert validate_sensor_reading(25.0, -10.0) is False

    def test_boundary_min(self):
        """Exact minimum values should be accepted."""
        assert validate_sensor_reading(-40.0, 0.0) is True

    def test_boundary_max(self):
        """Exact maximum values should be accepted."""
        assert validate_sensor_reading(85.0, 100.0) is True

    def test_just_outside_range(self):
        """Values just outside the range should be rejected."""
        assert validate_sensor_reading(85.01, 50.0) is False
        assert validate_sensor_reading(25.0, 100.1) is False
        assert validate_sensor_reading(-40.01, 50.0) is False


class TestChirpstackPayloadDecoding:
    """Tests for Chirpstack v4 JSON payload decoding."""

    def _make_payload(self, temp: float, hum: float, dev_eui: str = "a1b2c3d4e5f60001"):
        """Build a Chirpstack v4 payload dict with base64 data."""
        return {
            "deviceInfo": {"devEui": dev_eui},
            "data": encode_payload(temp, hum),
        }

    def test_valid_payload(self):
        payload = self._make_payload(24.50, 65.3)
        result = decode_chirpstack_payload(payload)
        assert result is not None
        assert result["device_id"] == "a1b2c3d4e5f60001"
        assert result["temperature"] == 24.50
        assert result["humidite"] == 65.3

    def test_missing_device_info(self):
        payload = {"data": "AYgCKg=="}
        result = decode_chirpstack_payload(payload)
        assert result is None

    def test_empty_data_field(self):
        payload = {"deviceInfo": {"devEui": "abc123"}, "data": ""}
        result = decode_chirpstack_payload(payload)
        assert result is None

    def test_missing_data_field(self):
        payload = {"deviceInfo": {"devEui": "abc123"}}
        result = decode_chirpstack_payload(payload)
        assert result is None

    def test_short_payload(self):
        """Payload with fewer than 4 bytes should return None."""
        payload = {
            "deviceInfo": {"devEui": "abc123"},
            "data": base64.b64encode(b"\x01\x02").decode("utf-8"),
        }
        result = decode_chirpstack_payload(payload)
        assert result is None

    def test_invalid_base64(self):
        payload = {"deviceInfo": {"devEui": "abc123"}, "data": "!!!invalid!!!"}
        result = decode_chirpstack_payload(payload)
        assert result is None

    def test_object_field_priority(self):
        """When 'object' field is present, it should be used over base64 'data'."""
        payload = {
            "deviceInfo": {"devEui": "a1b2c3d4e5f60001"},
            "data": encode_payload(10.0, 20.0),  # different values
            "object": {
                "temperature": 25.16,
                "humidite": 84.0,
            },
        }
        result = decode_chirpstack_payload(payload)
        assert result is not None
        assert result["device_id"] == "a1b2c3d4e5f60001"
        assert result["temperature"] == 25.16
        assert result["humidite"] == 84.0

    def test_object_field_incomplete_falls_back_to_data(self):
        """If 'object' is missing a key, fall back to base64 'data'."""
        payload = {
            "deviceInfo": {"devEui": "a1b2c3d4e5f60001"},
            "data": encode_payload(24.50, 65.3),
            "object": {"temperature": 25.16},  # missing humidite
        }
        result = decode_chirpstack_payload(payload)
        assert result is not None
        assert result["temperature"] == 24.50
        assert result["humidite"] == 65.3

    def test_object_field_only_no_data(self):
        """When only 'object' is present (no 'data'), it should work."""
        payload = {
            "deviceInfo": {"devEui": "a1b2c3d4e5f60001"},
            "object": {
                "temperature": 22.5,
                "humidite": 55.0,
            },
        }
        result = decode_chirpstack_payload(payload)
        assert result is not None
        assert result["temperature"] == 22.5
        assert result["humidite"] == 55.0
