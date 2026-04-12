"""Domain models for devices."""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class DeviceStats:
    """Aggregated statistics for a device over a time window."""

    device_id: str
    nb_mesures: int
    temp_moyenne: float
    temp_min: float
    temp_max: float
    derniere_mesure: datetime | None = None
