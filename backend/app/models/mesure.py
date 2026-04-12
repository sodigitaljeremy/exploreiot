"""Domain models for sensor measurements."""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class SensorReading:
    """A decoded sensor reading before persistence."""

    device_id: str
    temperature: float
    humidite: float
    recu_le: datetime | None = None


@dataclass
class Mesure(SensorReading):
    """A persisted measurement with database ID."""

    id: int | None = None
