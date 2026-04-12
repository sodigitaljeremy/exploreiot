"""Alert detection endpoint."""

from datetime import timedelta

from fastapi import APIRouter, Depends, Request

from app.config import ALERT_TEMP_THRESHOLD, ALERT_SILENCE_MINUTES, RATE_LIMIT_DEFAULT
from app.models.alert import AlertType
from app.rate_limit import limiter
from app.repositories.alert_repo import find_high_temperature_alerts, find_silent_sensors
from app.security import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])


@router.get("/alerts")
@limiter.limit(RATE_LIMIT_DEFAULT)
def check_alerts(request: Request):
    """Detect anomalies: high temperature and silent sensors."""
    alertes = []
    silence_interval = timedelta(minutes=ALERT_SILENCE_MINUTES)

    for row in find_high_temperature_alerts(ALERT_TEMP_THRESHOLD, silence_interval):
        alertes.append({
            "type": AlertType.TEMPERATURE_ELEVEE,
            "device_id": row["device_id"],
            "valeur": float(row["temperature"]),
            "seuil": ALERT_TEMP_THRESHOLD,
            "message": (
                f"Temperature {row['temperature']}°C detected "
                f"(threshold: {ALERT_TEMP_THRESHOLD}°C)"
            ),
            "recu_le": row["recu_le"],
        })

    for row in find_silent_sensors(silence_interval):
        alertes.append({
            "type": AlertType.CAPTEUR_SILENCIEUX,
            "device_id": row["device_id"],
            "message": f"No data received for over {ALERT_SILENCE_MINUTES} minutes",
            "derniere_mesure": row["derniere_mesure"],
        })

    return {"success": True, "nb_alertes": len(alertes), "alertes": alertes}
