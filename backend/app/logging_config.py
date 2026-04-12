"""Centralized logging configuration.

Call configure_logging() once at application startup to get consistent
structured output across all modules.
"""

import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """Configure root logger with structured format."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
        force=True,
    )
