"""WebSocket connection manager with connection limit and thread safety."""

import asyncio
import logging

from fastapi import WebSocket

from app.config import MAX_WS_CONNECTIONS

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections with broadcast and a hard cap."""

    def __init__(self, max_connections: int = MAX_WS_CONNECTIONS):
        self.active_connections: list[WebSocket] = []
        self._max_connections = max_connections
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, *, already_accepted: bool = False) -> bool:
        """Accept a WebSocket connection. Returns False if limit reached."""
        async with self._lock:
            if len(self.active_connections) >= self._max_connections:
                await websocket.close(code=1013, reason="Too many connections")
                return False
            if not already_accepted:
                await websocket.accept()
            self.active_connections.append(websocket)
            return True

    def disconnect(self, websocket: WebSocket):
        """Remove a connection from the active list."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Send a message to all connected clients, pruning dead connections.

        Backpressure: catch send failures and remove dead connections to prevent
        slow clients from blocking the broadcast to others.
        """
        async with self._lock:
            dead: list[WebSocket] = []
            for conn in self.active_connections:
                try:
                    await conn.send_json(message)
                except Exception:
                    # Connection failed; mark for removal
                    dead.append(conn)
            # Remove all dead connections after the loop
            for conn in dead:
                self.active_connections.remove(conn)


manager = ConnectionManager()
