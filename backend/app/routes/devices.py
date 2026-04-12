"""Device listing and metrics endpoints."""

from fastapi import APIRouter, Depends, Query, Request

from app.config import METRICS_LIMIT_DEFAULT, METRICS_LIMIT_MAX, RATE_LIMIT_DEFAULT
from app.errors import NotFoundError, ValidationError
from app.payload_codec import validate_device_id
from app.rate_limit import limiter
from app.repositories.device_repo import (
    device_exists,
    get_device_metrics,
    list_devices_with_stats,
)
from app.security import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])

VALID_SINCE_VALUES = {"1h", "6h", "24h", "7d"}

SINCE_TO_INTERVAL = {
    "1h": "1 hour",
    "6h": "6 hours",
    "24h": "24 hours",
    "7d": "7 days",
}


@router.get("/devices")
@limiter.limit(RATE_LIMIT_DEFAULT)
def list_devices(request: Request):
    """List all known sensors with their stats over the last 24h."""
    return {"success": True, "devices": list_devices_with_stats()}


@router.get("/devices/{device_id}/metrics")
@limiter.limit(RATE_LIMIT_DEFAULT)
def device_metrics(
    request: Request,
    device_id: str,
    limit: int = Query(default=METRICS_LIMIT_DEFAULT, ge=1, le=METRICS_LIMIT_MAX),
    since: str | None = Query(default=None),
):
    """Return measurement history for a specific sensor."""
    if not validate_device_id(device_id):
        raise ValidationError("Invalid device ID format")
    if since and since not in VALID_SINCE_VALUES:
        raise ValidationError(
            f"Invalid since value. Must be one of: {', '.join(sorted(VALID_SINCE_VALUES))}"
        )

    if not device_exists(device_id):
        raise NotFoundError("Device")

    interval = SINCE_TO_INTERVAL.get(since) if since else None
    mesures = get_device_metrics(device_id, limit, interval)
    return {"success": True, "device_id": device_id, "mesures": mesures}
