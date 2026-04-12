# Couche : Service (logique metier)
# Role : Decode et valide les payloads MQTT Chirpstack v4
# Entree : JSON brut du broker → Sortie : messages structures pour WebSocket
# Principe SRP : logique pure, sans connexion MQTT ni ecriture DB

import logging
from datetime import datetime

from app.config import TEMP_RANGE, HUM_RANGE
from app.payload_codec import decode_chirpstack_payload

logger = logging.getLogger(__name__)


def validate_sensor_reading(temperature: float, humidite: float) -> bool:
    """Validate sensor readings against physical limits (Dragino LHT65 spec)."""
    if not (TEMP_RANGE[0] <= temperature <= TEMP_RANGE[1]):
        logger.warning("Temperature %.2f out of range %s, discarded", temperature, TEMP_RANGE)
        return False
    if not (HUM_RANGE[0] <= humidite <= HUM_RANGE[1]):
        logger.warning("Humidity %.1f out of range %s, discarded", humidite, HUM_RANGE)
        return False
    return True


def process_mqtt_payload(
    raw_payload: dict, topic: str
) -> tuple[dict | None, dict]:
    """Process a decoded MQTT JSON payload.

    Returns (mesure_message | None, debug_message).
    mesure_message is None if decoding fails or validation rejects the reading.
    """
    debug_msg = {
        "type": "debug_mqtt",
        "topic": topic,
        "payload": raw_payload,
        "timestamp": datetime.now().isoformat(),
    }

    decoded = decode_chirpstack_payload(raw_payload)
    if decoded is None:
        return None, debug_msg

    if not validate_sensor_reading(decoded["temperature"], decoded["humidite"]):
        return None, debug_msg

    mesure_msg = {
        "type": "new_mesure",
        "device_id": decoded["device_id"],
        "temperature": decoded["temperature"],
        "humidite": decoded["humidite"],
        "recu_le": datetime.now().isoformat(),
    }
    return mesure_msg, debug_msg
