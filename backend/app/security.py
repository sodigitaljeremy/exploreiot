"""API authentication and security utilities."""

import hmac
import logging

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from app.config import API_KEY

logger = logging.getLogger(__name__)

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str | None = Security(api_key_header)):
    """Verify API key using constant-time comparison to prevent timing attacks.

    If API_KEY is empty, authentication is disabled (development mode).
    """
    if not API_KEY:
        return
    if api_key is None or not hmac.compare_digest(api_key, API_KEY):
        logger.warning("Auth failure: invalid or missing API key")
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
