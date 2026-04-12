# Couche : Utilitaire de test/demo
# Role : Simule des uplinks Chirpstack v4 pour alimenter le pipeline
# Genere : Payloads LoRaWAN realistes avec temperature/humidite aleatoires
# Usage : Lance par docker-compose ou manuellement pour tester le systeme

import os
import random
import signal
import time
import json
import logging
import threading
import uuid
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from app.config import MQTT_HOST, MQTT_PORT, MQTT_USER, MQTT_PASSWORD, MQTT_TLS, MQTT_CA_CERTS, DEVICE_EUIS, PUBLISH_INTERVAL
from app.logging_config import configure_logging
from app.payload_codec import encode_payload

logger = logging.getLogger("publisher")

# ─── Chirpstack v4 identifiers (fixed UUIDs for simulation) ─────────

TENANT_ID = "52f14cd4-c10a-4b72-8f52-6a7f3e2d1a00"
TENANT_NAME = "ExploreIOT"
APPLICATION_ID = os.environ.get("APPLICATION_ID", "a1b2c3d4-e5f6-7890-abcd-ef0123456789")
APPLICATION_NAME = "exploreiot-demo"
DEVICE_PROFILE_ID = "d4e5f6a7-b8c9-0123-4567-89abcdef0123"
DEVICE_PROFILE_NAME = "Dragino LHT65"
GATEWAY_ID = "0016c001ff10a567"

CAPTEURS = DEVICE_EUIS

# Frame counter per device (simulates real LoRaWAN fCnt)
_fcnt: dict[str, int] = {dev: 0 for dev in CAPTEURS}
_fcnt_lock = threading.Lock()


def generer_mesure(device_id: str) -> dict:
    """Generate a faithful Chirpstack v4 uplink JSON payload."""
    temperature = round(random.uniform(18.0, 35.0), 2)
    humidite = round(random.uniform(30.0, 90.0), 1)

    with _fcnt_lock:
        _fcnt[device_id] = _fcnt.get(device_id, 0) + 1
        fcnt_value = _fcnt[device_id]

    return {
        "deduplicationId": str(uuid.uuid4()),
        "time": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "deviceInfo": {
            "tenantId": TENANT_ID,
            "tenantName": TENANT_NAME,
            "applicationId": APPLICATION_ID,
            "applicationName": APPLICATION_NAME,
            "deviceProfileId": DEVICE_PROFILE_ID,
            "deviceProfileName": DEVICE_PROFILE_NAME,
            "devEui": device_id,
            "deviceClassEnabled": "CLASS_A",
            "tags": {},
        },
        "devAddr": f"01ab{device_id[-4:]}",
        "adr": True,
        "dr": 5,
        "fCnt": fcnt_value,
        "fPort": 1,
        "confirmed": False,
        "data": encode_payload(temperature, humidite),
        "object": {
            "temperature": temperature,
            "humidite": humidite,
        },
        "rxInfo": [
            {
                "gatewayId": GATEWAY_ID,
                "uplinkId": random.randint(10000, 99999),
                "rssi": random.randint(-100, -50),
                "snr": round(random.uniform(-5.0, 12.0), 1),
                "channel": random.randint(0, 7),
                "crcStatus": "CRC_OK",
                "context": "AAAA",
            }
        ],
        "txInfo": {
            "frequency": 868100000,
            "modulation": {
                "lora": {
                    "bandwidth": 125000,
                    "spreadingFactor": 7,
                    "codeRate": "CR_4_5",
                }
            },
        },
    }


# Callbacks MQTT
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        logger.info("Connecte au broker MQTT")
    else:
        logger.error("Connexion echouee: %s", reason_code)


def on_publish(client, userdata, mid, reason_code, properties):
    pass  # Silencieux — on logge manuellement


_shutdown = threading.Event()


def _handle_shutdown(signum, _frame):
    """Handle SIGTERM/SIGINT for graceful shutdown."""
    logger.info("Signal %s recu, arret en cours...", signal.Signals(signum).name)
    _shutdown.set()


def run_publisher():
    """Boucle principale du publisher."""
    configure_logging()

    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    # Setup client
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    if MQTT_USER:
        client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
    if MQTT_TLS:
        import ssl
        client.tls_set(
            ca_certs=MQTT_CA_CERTS if MQTT_CA_CERTS else None,
            cert_reqs=ssl.CERT_REQUIRED if MQTT_CA_CERTS else ssl.CERT_NONE,
        )
    client.on_connect = on_connect
    client.on_publish = on_publish

    logger.info("Connexion a %s:%s...", MQTT_HOST, MQTT_PORT)
    client.connect(MQTT_HOST, MQTT_PORT, 60)
    client.loop_start()

    time.sleep(1)  # Attendre la connexion

    logger.info("ExploreIOT Publisher — Demarrage")

    cycle = 0
    while not _shutdown.is_set():
        cycle += 1
        logger.debug("Cycle %d", cycle)

        for device_id in CAPTEURS:
            mesure = generer_mesure(device_id)
            topic = f"application/{APPLICATION_ID}/device/{device_id}/event/up"
            payload = json.dumps(mesure)

            client.publish(topic, payload, qos=1)
            logger.info(
                "%s -> T:%.2f°C H:%.1f%% [fCnt=%d]",
                device_id[-4:],
                mesure["object"]["temperature"],
                mesure["object"]["humidite"],
                mesure["fCnt"],
            )

        _shutdown.wait(PUBLISH_INTERVAL)

    logger.info("Arret du publisher")
    client.loop_stop()
    client.disconnect()


if __name__ == "__main__":
    run_publisher()
