"""Debug endpoints for protocol inspection and system status."""

import time

from fastapi import APIRouter, Depends, Request

from app.config import APP_VERSION, RATE_LIMIT_DEFAULT, PUBLISH_INTERVAL
from app.database import get_conn
from app.debug_buffer import mqtt_buffer
from app.mqtt_handler import is_mqtt_connected
from app.rate_limit import limiter
from app.security import verify_api_key
from app.websocket import manager

router = APIRouter(tags=["debug"], dependencies=[Depends(verify_api_key)])

_start_time = time.time()


@router.get("/debug/recent-messages")
@limiter.limit(RATE_LIMIT_DEFAULT)
def recent_messages(request: Request, limit: int = 50):
    """Return recent MQTT messages from the in-memory ring buffer."""
    capped = min(limit, 50)
    return {"success": True, "messages": mqtt_buffer.get_recent(capped)}


@router.get("/status")
@limiter.limit(RATE_LIMIT_DEFAULT)
def system_status(request: Request):
    """Return full system status for the ConnectionStatus panel."""
    # Database
    db_ok = False
    mesure_count = 0
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) AS n FROM mesures")
                row = cur.fetchone()
                mesure_count = row["n"] if row else 0
                db_ok = True
    except Exception:
        db_ok = False

    # MQTT
    mqtt_connected = is_mqtt_connected()
    mqtt_messages = len(mqtt_buffer)

    # WebSocket
    ws_clients = len(manager.active_connections)

    return {
        "success": True,
        "api": True,
        "version": APP_VERSION,
        "uptime_seconds": int(time.time() - _start_time),
        "database": {
            "connected": db_ok,
            "mesure_count": mesure_count,
        },
        "mqtt": {
            "connected": mqtt_connected,
            "buffer_size": mqtt_messages,
        },
        "websocket": {
            "clients": ws_clients,
        },
        "publisher": {
            "interval_seconds": PUBLISH_INTERVAL,
        },
    }
