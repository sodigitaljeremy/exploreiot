"""Rate limiting configuration using slowapi.

Separate module to avoid circular imports between main.py and route modules.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import RATE_LIMIT_DEFAULT

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],  # no global default; apply per-route
)
