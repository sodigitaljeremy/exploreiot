"""Tests for publisher.py — Chirpstack v4 message structure and fCnt."""

import sys
import os
import base64

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from publisher import generer_mesure, CAPTEURS, _fcnt, _fcnt_lock
from app.payload_codec import decode_payload


class TestGenererMesure:
    """Verify that generer_mesure produces valid Chirpstack v4 JSON."""

    def test_required_top_level_fields(self):
        msg = generer_mesure("a1b2c3d4e5f60001")
        required = [
            "deduplicationId", "time", "deviceInfo", "devAddr",
            "adr", "dr", "fCnt", "fPort", "confirmed", "data",
            "object", "rxInfo", "txInfo",
        ]
        for field in required:
            assert field in msg, f"Missing required field: {field}"

    def test_device_info_structure(self):
        msg = generer_mesure("a1b2c3d4e5f60001")
        di = msg["deviceInfo"]
        assert di["devEui"] == "a1b2c3d4e5f60001"
        assert "tenantId" in di
        assert "applicationId" in di
        assert "deviceProfileId" in di
        assert "deviceProfileName" in di

    def test_object_field_contains_values(self):
        msg = generer_mesure("a1b2c3d4e5f60001")
        obj = msg["object"]
        assert "temperature" in obj
        assert "humidite" in obj
        assert 18.0 <= obj["temperature"] <= 35.0
        assert 30.0 <= obj["humidite"] <= 90.0

    def test_data_field_is_valid_base64(self):
        msg = generer_mesure("a1b2c3d4e5f60001")
        decoded = decode_payload(msg["data"])
        assert decoded is not None
        assert "temperature" in decoded
        assert "humidite" in decoded

    def test_data_matches_object(self):
        """Base64 data should encode the same values as the object field."""
        msg = generer_mesure("a1b2c3d4e5f60001")
        decoded = decode_payload(msg["data"])
        assert decoded["temperature"] == msg["object"]["temperature"]
        assert decoded["humidite"] == msg["object"]["humidite"]

    def test_fcnt_increments(self):
        """Each call should increment fCnt for the same device."""
        device = "a1b2c3d4e5f60001"
        msg1 = generer_mesure(device)
        msg2 = generer_mesure(device)
        assert msg2["fCnt"] == msg1["fCnt"] + 1

    def test_fcnt_independent_per_device(self):
        """Different devices should have independent fCnt counters."""
        dev_a = "a1b2c3d4e5f60001"
        dev_b = "a1b2c3d4e5f60002"
        msg_a = generer_mesure(dev_a)
        msg_b = generer_mesure(dev_b)
        # They should not share the same counter value
        # (they can be equal if both start fresh, but calling again should diverge)
        msg_a2 = generer_mesure(dev_a)
        assert msg_a2["fCnt"] == msg_a["fCnt"] + 1

    def test_rx_info_structure(self):
        msg = generer_mesure("a1b2c3d4e5f60001")
        assert len(msg["rxInfo"]) >= 1
        rx = msg["rxInfo"][0]
        assert "gatewayId" in rx
        assert "rssi" in rx
        assert "snr" in rx
        assert rx["crcStatus"] == "CRC_OK"

    def test_tx_info_structure(self):
        msg = generer_mesure("a1b2c3d4e5f60001")
        tx = msg["txInfo"]
        assert tx["frequency"] == 868100000
        assert "lora" in tx["modulation"]
        lora = tx["modulation"]["lora"]
        assert lora["bandwidth"] == 125000
        assert lora["spreadingFactor"] in range(7, 13)

    def test_capteurs_loaded_from_config(self):
        """CAPTEURS should contain at least the default 3 devices."""
        assert len(CAPTEURS) >= 3
        assert "a1b2c3d4e5f60001" in CAPTEURS
