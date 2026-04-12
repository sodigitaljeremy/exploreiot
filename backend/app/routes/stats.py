"""Global statistics endpoint."""

from fastapi import APIRouter, Depends, Request

from app.config import RATE_LIMIT_DEFAULT
from app.rate_limit import limiter
from app.repositories.stats_repo import get_global_stats
from app.security import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])


@router.get("/stats")
@limiter.limit(RATE_LIMIT_DEFAULT)
def global_stats(request: Request):
    """Overview of the entire sensor fleet."""
    return {"success": True, "stats": get_global_stats()}
