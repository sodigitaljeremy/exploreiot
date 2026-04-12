"""Thread-safe ring buffer for recent MQTT messages (debug/inspection).

Stores the last N MQTT messages in memory for the protocol inspector.
No database persistence — purely in-memory for real-time debugging.
"""

import threading
from collections import deque
from datetime import datetime


class MqttRingBuffer:
    """Thread-safe ring buffer for MQTT messages."""

    def __init__(self, maxlen: int = 50):
        self._buffer: deque[dict] = deque(maxlen=maxlen)
        self._lock = threading.Lock()

    def append(self, topic: str, payload: dict, qos: int = 0):
        """Add an MQTT message to the buffer."""
        entry = {
            "topic": topic,
            "payload": payload,
            "qos": qos,
            "timestamp": datetime.now().isoformat(),
        }
        with self._lock:
            self._buffer.append(entry)

    def get_recent(self, limit: int = 50) -> list[dict]:
        """Return the most recent messages (newest first)."""
        with self._lock:
            items = list(self._buffer)
        return list(reversed(items))[:limit]

    def __len__(self) -> int:
        with self._lock:
            return len(self._buffer)


# Singleton instance
mqtt_buffer = MqttRingBuffer()
