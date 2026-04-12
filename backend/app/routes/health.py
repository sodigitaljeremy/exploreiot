"""Health check endpoints."""

from datetime import datetime

from fastapi import APIRouter, Request

from app.config import APP_VERSION, RATE_LIMIT_DEFAULT
from app.database import get_conn
from app.rate_limit import limiter

router = APIRouter()


@router.get("/")
@limiter.limit(RATE_LIMIT_DEFAULT)
def root(request: Request):
    """Service status."""
    return {
        "success": True,
        "service": "ExploreIOT Dashboard API",
        "version": APP_VERSION,
        "status": "ok",
    }


@router.get("/health")
@limiter.limit(RATE_LIMIT_DEFAULT)
def health_check(request: Request):
    """Check all subsystem health (API + database)."""
    health = {
        "api": True,
        "database": False,
        "timestamp": datetime.now().isoformat(),
    }
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                health["database"] = True
    except Exception:
        health["database"] = False

    health["status"] = "ok" if health["database"] else "degraded"
    return health
