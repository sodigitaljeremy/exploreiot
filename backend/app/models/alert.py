"""Domain models for alerts."""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class AlertType(str, Enum):
    """Types of alerts detected by the system."""

    TEMPERATURE_ELEVEE = "TEMPERATURE_ELEVEE"
    CAPTEUR_SILENCIEUX = "CAPTEUR_SILENCIEUX"


@dataclass
class Alert:
    """An alert detected by the system."""

    type: AlertType
    device_id: str
    message: str
    valeur: float | None = None
    seuil: float | None = None
    recu_le: datetime | None = None
    derniere_mesure: datetime | None = None
