# Couche : Infrastructure MQTT
# Role : Gere le client paho-mqtt (connexion, souscription, lifecycle)
# Flow : Broker MQTT → _on_mqtt_message → mqtt_service.process_mqtt_payload → websocket.broadcast
# Note : Ne persiste PAS en base — seul subscriber.py ecrit en PostgreSQL

import asyncio
import json
import logging
import threading

import paho.mqtt.client as mqtt

from app.config import MQTT_HOST, MQTT_PORT, MQTT_TOPIC, MQTT_USER, MQTT_PASSWORD, MQTT_TLS, MQTT_CA_CERTS
from app.debug_buffer import mqtt_buffer
from app.services.mqtt_service import process_mqtt_payload
from app.websocket import manager

logger = logging.getLogger(__name__)

_loop: asyncio.AbstractEventLoop | None = None
_mqtt_client: mqtt.Client | None = None
_mqtt_lock = threading.Lock()


def set_event_loop(loop: asyncio.AbstractEventLoop):
    """Store the asyncio event loop for cross-thread coroutine scheduling."""
    global _loop
    with _mqtt_lock:
        _loop = loop


def _on_mqtt_message(_client, _userdata, msg):
    """Decode MQTT payload and broadcast to WebSocket clients."""
    with _mqtt_lock:
        loop = _loop
    if loop is None:
        return
    try:
        payload = json.loads(msg.payload.decode("utf-8"))

        # Store raw MQTT message in debug ring buffer
        mqtt_buffer.append(msg.topic, payload, qos=msg.qos)

        # Delegate processing to service layer
        mesure_msg, debug_msg = process_mqtt_payload(payload, msg.topic)

        if mesure_msg:
            asyncio.run_coroutine_threadsafe(manager.broadcast(mesure_msg), loop)
        asyncio.run_coroutine_threadsafe(manager.broadcast(debug_msg), loop)

    except json.JSONDecodeError as e:
        logger.warning("MQTT JSON decode error on topic %s: %s", msg.topic, e)
    except Exception:
        logger.exception("Unexpected error processing MQTT message")


def start_mqtt():
    """Start the MQTT client in a background thread."""
    global _mqtt_client
    with _mqtt_lock:
        try:
            _mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            if MQTT_USER:
                _mqtt_client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
            if MQTT_TLS:
                import ssl
                _mqtt_client.tls_set(
                    ca_certs=MQTT_CA_CERTS if MQTT_CA_CERTS else None,
                    cert_reqs=ssl.CERT_REQUIRED if MQTT_CA_CERTS else ssl.CERT_NONE,
                )
            _mqtt_client.on_message = _on_mqtt_message
            _mqtt_client.connect(MQTT_HOST, MQTT_PORT, 60)
            _mqtt_client.subscribe(MQTT_TOPIC)
            _mqtt_client.loop_start()
            logger.info("MQTT connected to %s:%s on topic %s", MQTT_HOST, MQTT_PORT, MQTT_TOPIC)
        except Exception as e:
            logger.warning("MQTT connection failed: %s (WebSocket will work without MQTT)", e)


def is_mqtt_connected() -> bool:
    """Check if the MQTT client is currently connected."""
    return _mqtt_client is not None and _mqtt_client.is_connected()


def stop_mqtt():
    """Stop the MQTT client and disconnect."""
    global _mqtt_client
    with _mqtt_lock:
        if _mqtt_client is not None:
            _mqtt_client.loop_stop()
            _mqtt_client.disconnect()
            _mqtt_client = None
