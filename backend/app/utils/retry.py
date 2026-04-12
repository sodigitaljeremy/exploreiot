"""Shared retry utility with exponential backoff."""

import logging
import time
from typing import TypeVar, Callable

logger = logging.getLogger(__name__)

T = TypeVar("T")


def retry_with_backoff(
    fn: Callable[[], T],
    *,
    max_retries: int = 5,
    base_delay: float = 2,
    max_delay: float = 30,
    exceptions: tuple = (Exception,),
    description: str = "operation",
) -> T:
    """Execute fn with exponential backoff retry.

    Raises RuntimeError if all retries are exhausted.
    """
    for attempt in range(max_retries):
        try:
            return fn()
        except exceptions as e:
            if attempt == max_retries - 1:
                raise RuntimeError(
                    f"{description} failed after {max_retries} attempts"
                ) from e
            delay = min(base_delay * (2 ** attempt), max_delay)
            logger.warning(
                "%s failed (attempt %d/%d), retry in %ds: %s",
                description, attempt + 1, max_retries, delay, e,
            )
            time.sleep(delay)
    # Unreachable, but satisfies type checker
    raise RuntimeError(f"{description} failed after {max_retries} attempts")
