"""Unified LoRaWAN payload codec for ExploreIOT.

Single source of truth for binary encoding/decoding of sensor payloads
(Chirpstack v4 JSON format).

Binary format (Dragino LHT65-compatible):
  Bytes 0-1: temperature × 100 (uint16, big-endian)
  Bytes 2-3: humidity × 10 (uint16, big-endian)
  Total: 4 bytes
"""

import base64
import logging
import re
import struct

logger = logging.getLogger(__name__)

DEVICE_ID_PATTERN = re.compile(r"^[a-fA-F0-9]{16}$")


def encode_payload(temperature: float, humidite: float) -> str:
    """Encode temperature/humidity as base64 binary (4 bytes, big-endian)."""
    temp_int = int(round(temperature * 100))
    hum_int = int(round(humidite * 10))
    raw = struct.pack(">HH", temp_int, hum_int)
    return base64.b64encode(raw).decode("utf-8")


def decode_payload(data_b64: str) -> dict | None:
    """Decode a base64 binary payload into temperature/humidity values.

    Returns:
        {"temperature": float, "humidite": float} or None on error.
    """
    try:
        raw = base64.b64decode(data_b64)
    except (ValueError, base64.binascii.Error) as e:
        logger.warning("Invalid base64 payload: %s", e)
        return None

    if len(raw) < 4:
        logger.warning("Payload too short (%d bytes, need 4)", len(raw))
        return None

    temp_int, hum_int = struct.unpack(">HH", raw[:4])
    return {
        "temperature": round(temp_int / 100, 2),
        "humidite": round(hum_int / 10, 1),
    }


def extract_device_id(payload: dict) -> str | None:
    """Extract devEui from a Chirpstack v4 JSON payload."""
    return payload.get("deviceInfo", {}).get("devEui") or None


def extract_data_b64(payload: dict) -> str | None:
    """Extract the base64-encoded data field from a Chirpstack v4 JSON payload."""
    return payload.get("data") or None


def validate_device_id(device_id: str) -> bool:
    """Validate that a device ID is a valid EUI-64 hex string (16 chars)."""
    return bool(DEVICE_ID_PATTERN.match(device_id))


def decode_chirpstack_payload(payload: dict) -> dict | None:
    """Decode a Chirpstack v4 JSON payload into normalized values.

    Tries the "object" field first (pre-decoded by Chirpstack codec),
    falls back to base64 "data" field.

    Returns dict with device_id, temperature, humidite or None on error.
    """
    device_id = extract_device_id(payload)
    if not device_id:
        logger.warning("Missing devEui in Chirpstack payload")
        return None

    if not validate_device_id(device_id):
        logger.warning("Invalid device ID format: %s", device_id)
        return None

    # Priority: "object" field (decoded by Chirpstack codec)
    obj = payload.get("object")
    if obj and "temperature" in obj and "humidite" in obj:
        temp_val = obj["temperature"]
        hum_val = obj["humidite"]
        if isinstance(temp_val, (int, float)) and isinstance(hum_val, (int, float)):
            return {
                "device_id": device_id,
                "temperature": float(temp_val),
                "humidite": float(hum_val),
            }
        logger.warning(
            "Non-numeric values in object field for device %s: temp=%r, hum=%r",
            device_id, temp_val, hum_val,
        )

    # Fallback: decode base64 "data" field
    data_b64 = extract_data_b64(payload)
    if not data_b64:
        logger.warning("Empty data field in payload for device %s", device_id)
        return None

    decoded = decode_payload(data_b64)
    if decoded is None:
        return None

    return {"device_id": device_id, **decoded}
