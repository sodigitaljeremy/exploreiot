"""ExploreIOT Dashboard API — FastAPI application.

Slim entrypoint: registers route modules, middleware, and lifecycle hooks.
Business logic lives in dedicated modules (routes/, security, mqtt_handler).
"""

# Couche : Point d'entree FastAPI
# Role : Initialise l'app, enregistre routes/middlewares, gere le lifecycle
# Lifecycle : startup → set_event_loop + start_mqtt | shutdown → stop_mqtt + close_db
# WebSocket : /ws endpoint avec auth first-message pattern

import asyncio
import hmac
import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.audit import AuditMiddleware
from app.config import API_KEY, APP_VERSION, CORS_ORIGINS
from app.database import close_pool
from app.logging_config import configure_logging
from app.mqtt_handler import set_event_loop, start_mqtt, stop_mqtt
from app.rate_limit import limiter
from app.websocket import manager
from app.errors import register_error_handlers
from app.security_headers import SecurityHeadersMiddleware
from app.routes import health, devices, alerts, stats, debug

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application lifecycle: start MQTT on boot, cleanup on shutdown."""
    configure_logging()
    set_event_loop(asyncio.get_running_loop())
    mqtt_thread = threading.Thread(target=start_mqtt, daemon=True)
    mqtt_thread.start()
    yield
    stop_mqtt()
    close_pool()


app = FastAPI(
    title="ExploreIOT Dashboard API",
    description="IoT sensor supervision API — LoRaWAN pipeline",
    version=APP_VERSION,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(AuditMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["Content-Type", "X-API-Key"],
)

app.add_middleware(SecurityHeadersMiddleware)

register_error_handlers(app)

# ─── Route modules ───────────────────────────────────────────

app.include_router(health.router)
app.include_router(devices.router)
app.include_router(alerts.router)
app.include_router(stats.router)
app.include_router(debug.router)


# ─── WebSocket ───────────────────────────────────────────────


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time sensor data push.

    Validates API key via first message (not query string, to avoid log exposure).
    """
    try:
        await websocket.accept()
    except Exception as e:
        logger.warning("WS accept failed from %s: %s", websocket.client, e)
        return

    if API_KEY:
        try:
            data = await asyncio.wait_for(websocket.receive_json(), timeout=5)
            if data.get("type") != "auth" or not hmac.compare_digest(
                data.get("token", ""), API_KEY
            ):
                try:
                    await websocket.close(code=4001, reason="Unauthorized")
                except Exception:
                    pass
                return
        except asyncio.TimeoutError:
            logger.warning("WS auth timeout from %s", websocket.client)
            try:
                await websocket.close(code=4001, reason="Auth timeout")
            except Exception:
                pass
            return
        except Exception as e:
            logger.warning("WS auth error from %s: %s", websocket.client, e)
            try:
                await websocket.close(code=4001, reason="Auth error")
            except Exception:
                pass
            return

    connected = await manager.connect(websocket, already_accepted=True)
    if not connected:
        return

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
