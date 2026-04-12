"""Tests for the unified payload codec (Chirpstack v4)."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.payload_codec import (
    encode_payload,
    decode_payload,
    extract_device_id,
    extract_data_b64,
    validate_device_id,
    decode_chirpstack_payload,
)


class TestEncodePayload:
    def test_basic_encode(self):
        result = encode_payload(24.50, 65.3)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_round_trip(self):
        """Encode then decode should return original values."""
        encoded = encode_payload(24.50, 65.3)
        decoded = decode_payload(encoded)
        assert decoded is not None
        assert decoded["temperature"] == 24.50
        assert decoded["humidite"] == 65.3

    def test_round_trip_zero_values(self):
        encoded = encode_payload(0.0, 0.0)
        decoded = decode_payload(encoded)
        assert decoded is not None
        assert decoded["temperature"] == 0.0
        assert decoded["humidite"] == 0.0

    def test_round_trip_boundary_values(self):
        encoded = encode_payload(85.0, 100.0)
        decoded = decode_payload(encoded)
        assert decoded is not None
        assert decoded["temperature"] == 85.0
        assert decoded["humidite"] == 100.0

    def test_rounding(self):
        """Values should be rounded properly."""
        encoded = encode_payload(24.555, 65.35)
        decoded = decode_payload(encoded)
        assert decoded is not None
        assert decoded["temperature"] == 24.56
        assert decoded["humidite"] == 65.4


class TestDecodePayload:
    def test_valid_payload(self):
        result = decode_payload("AYgCKg==")
        assert result is not None
        assert "temperature" in result
        assert "humidite" in result

    def test_short_payload(self):
        """Payload with fewer than 4 bytes should return None."""
        import base64
        short = base64.b64encode(b"\x01\x02").decode()
        assert decode_payload(short) is None

    def test_invalid_base64(self):
        assert decode_payload("!!!invalid!!!") is None

    def test_empty_string(self):
        result = decode_payload("")
        assert result is None


class TestExtractDeviceId:
    def test_chirpstack_format(self):
        payload = {"deviceInfo": {"devEui": "a1b2c3d4e5f60001"}}
        assert extract_device_id(payload) == "a1b2c3d4e5f60001"

    def test_missing_dev_eui(self):
        payload = {"deviceInfo": {}}
        assert extract_device_id(payload) is None

    def test_no_device_info(self):
        payload = {}
        assert extract_device_id(payload) is None


class TestExtractDataB64:
    def test_chirpstack_format(self):
        payload = {"data": "AYgCKg=="}
        assert extract_data_b64(payload) == "AYgCKg=="

    def test_empty_data(self):
        payload = {"data": ""}
        assert extract_data_b64(payload) is None

    def test_missing_data(self):
        payload = {}
        assert extract_data_b64(payload) is None


class TestValidateDeviceId:
    def test_valid_eui64(self):
        assert validate_device_id("a1b2c3d4e5f60001") is True

    def test_valid_uppercase(self):
        assert validate_device_id("A1B2C3D4E5F60001") is True

    def test_too_short(self):
        assert validate_device_id("a1b2c3d4") is False

    def test_too_long(self):
        assert validate_device_id("a1b2c3d4e5f600011") is False

    def test_invalid_chars(self):
        assert validate_device_id("g1b2c3d4e5f60001") is False

    def test_with_prefix(self):
        """EUI with 'eui-' prefix should fail (not raw hex)."""
        assert validate_device_id("eui-a1b2c3d4e5f6") is False

    def test_empty_string(self):
        assert validate_device_id("") is False


class TestDecodeChirpstackPayload:
    """Tests for the unified Chirpstack v4 decode function with type validation."""

    def test_object_null_temperature_falls_back_to_data(self):
        payload = {
            "deviceInfo": {"devEui": "a1b2c3d4e5f60001"},
            "data": encode_payload(24.5, 65.3),
            "object": {"temperature": None, "humidite": 55.0},
        }
        result = decode_chirpstack_payload(payload)
        assert result is not None
        assert result["temperature"] == 24.5

    def test_object_string_values_falls_back_to_data(self):
        payload = {
            "deviceInfo": {"devEui": "a1b2c3d4e5f60001"},
            "data": encode_payload(24.5, 65.3),
            "object": {"temperature": "hot", "humidite": "wet"},
        }
        result = decode_chirpstack_payload(payload)
        assert result is not None
        assert result["temperature"] == 24.5

    def test_object_non_numeric_no_data_returns_none(self):
        payload = {
            "deviceInfo": {"devEui": "a1b2c3d4e5f60001"},
            "object": {"temperature": "hot", "humidite": "wet"},
        }
        result = decode_chirpstack_payload(payload)
        assert result is None
