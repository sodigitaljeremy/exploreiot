"""Centralized configuration loaded from environment variables.

Single source of truth for all settings — no os.environ.get() calls elsewhere.
"""

import json
import os
import pathlib

# ─── Application ────────────────────────────────────────────

APP_VERSION = "0.4.0"

# ─── Database ────────────────────────────────────────────────

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_NAME = os.environ.get("DB_NAME", "exploreiot")
DB_USER = os.environ.get("DB_USER", "exploreiot")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")

DB_CONFIG = {
    "host": DB_HOST,
    "port": DB_PORT,
    "dbname": DB_NAME,
    "user": DB_USER,
    "password": DB_PASSWORD,
}

DB_POOL_MIN = int(os.environ.get("DB_POOL_MIN", "2"))
DB_POOL_MAX = int(os.environ.get("DB_POOL_MAX", "10"))
DB_STATEMENT_TIMEOUT = os.environ.get("DB_STATEMENT_TIMEOUT", "30000")

# ─── MQTT ────────────────────────────────────────────────────

MQTT_HOST = os.environ.get("MQTT_HOST", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
MQTT_TOPIC = os.environ.get("MQTT_TOPIC", "application/+/device/+/event/up")
MQTT_USER = os.environ.get("MQTT_USER", "")
MQTT_PASSWORD = os.environ.get("MQTT_PASSWORD", "")
MQTT_TLS = os.environ.get("MQTT_TLS", "").lower() in ("1", "true", "yes")
MQTT_CA_CERTS = os.environ.get("MQTT_CA_CERTS", "")

# ─── Chirpstack ──────────────────────────────────────────────

CHIRPSTACK_ENABLED = os.environ.get("CHIRPSTACK_ENABLED", "false").lower() == "true"
CHIRPSTACK_API_URL = os.environ.get("CHIRPSTACK_API_URL", "localhost:8080")
CHIRPSTACK_API_KEY = os.environ.get("CHIRPSTACK_API_KEY", "")

# ─── Alerts ──────────────────────────────────────────────────

ALERT_TEMP_THRESHOLD = float(os.environ.get("ALERT_TEMP_THRESHOLD", "33"))
ALERT_SILENCE_MINUTES = int(os.environ.get("ALERT_SILENCE_MINUTES", "10"))

# ─── Security ────────────────────────────────────────────────

API_KEY = os.environ.get("API_KEY", "")
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGIN", "http://localhost:3000").split(",")
    if o.strip()
]

# ─── WebSocket ───────────────────────────────────────────────

MAX_WS_CONNECTIONS = int(os.environ.get("MAX_WS_CONNECTIONS", "50"))

# ─── Sensor physical limits (Dragino LHT65 specifications) ──

TEMP_RANGE = (-40.0, 85.0)
HUM_RANGE = (0.0, 100.0)

# ─── Rate Limiting ──────────────────────────────────────────

RATE_LIMIT_DEFAULT = os.environ.get("RATE_LIMIT_DEFAULT", "30/minute")

# ─── API ─────────────────────────────────────────────────────

METRICS_LIMIT_DEFAULT = 20
METRICS_LIMIT_MAX = 1000

# ─── Publisher ──────────────────────────────────────────────

PUBLISH_INTERVAL = int(os.environ.get("PUBLISH_INTERVAL", "5"))

def _load_default_device_ids() -> list[str]:
    """Load device IDs from shared/device-ids.json (single source of truth).

    Checks two locations:
    - /shared/device-ids.json (Docker mount)
    - ../../shared/device-ids.json (local development)
    """
    candidates = [
        pathlib.Path("/shared/device-ids.json"),
        pathlib.Path(__file__).resolve().parent.parent.parent / "shared" / "device-ids.json",
    ]
    for path in candidates:
        try:
            data = json.loads(path.read_text())
            return [d["id"] for d in data["devices"]]
        except Exception:
            continue
    return ["a1b2c3d4e5f60001", "a1b2c3d4e5f60002", "a1b2c3d4e5f60003"]

DEVICE_EUIS = [
    e.strip()
    for e in os.environ.get(
        "DEVICE_EUIS", ",".join(_load_default_device_ids())
    ).split(",")
    if e.strip()
]

# ─── Subscriber ─────────────────────────────────────────────

SUBSCRIBER_MAX_RETRIES = int(os.environ.get("SUBSCRIBER_MAX_RETRIES", "10"))
SUBSCRIBER_BASE_DELAY = int(os.environ.get("SUBSCRIBER_BASE_DELAY", "2"))
DATA_RETENTION_DAYS = int(os.environ.get("DATA_RETENTION_DAYS", "90"))

# ─── Startup validation ──────────────────────────────────────

ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")

import logging as _logging
_config_logger = _logging.getLogger("config")
if not API_KEY:
    if ENVIRONMENT == "production":
        raise RuntimeError("API_KEY must be set in production mode")
    _config_logger.critical("API_KEY is empty — authentication is DISABLED")

if MQTT_USER and not MQTT_PASSWORD:
    raise RuntimeError("MQTT_PASSWORD must be set when MQTT_USER is configured")

if ENVIRONMENT == "production":
    if DB_PASSWORD == "change_me_in_production":
        raise RuntimeError("DB_PASSWORD must be changed from default in production mode")
    if MQTT_PASSWORD == "exploreiot_mqtt":
        raise RuntimeError("MQTT_PASSWORD must be changed from default in production mode")
