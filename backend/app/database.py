"""Database connection pool for the API server."""

import logging
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
import psycopg2.pool

from app.config import DB_CONFIG, DB_POOL_MIN, DB_POOL_MAX, DB_STATEMENT_TIMEOUT
logger = logging.getLogger(__name__)

# ─── Connection Pool (API server) ────────────────────────────

_pool: psycopg2.pool.SimpleConnectionPool | None = None


def get_pool() -> psycopg2.pool.SimpleConnectionPool:
    """Return the shared connection pool, creating it lazily."""
    global _pool
    if _pool is None or _pool.closed:
        _pool = psycopg2.pool.SimpleConnectionPool(
            minconn=DB_POOL_MIN,
            maxconn=DB_POOL_MAX,
            **DB_CONFIG,
            cursor_factory=psycopg2.extras.RealDictCursor,
            options=f"-c statement_timeout={DB_STATEMENT_TIMEOUT}",
        )
    return _pool


def close_pool():
    """Close all connections in the pool."""
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


@contextmanager
def get_conn():
    """Borrow a connection from the pool, return it automatically."""
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
    except Exception:
        if not conn.closed:
            try:
                conn.rollback()
            except Exception:
                pass
        raise
    finally:
        if not conn.closed:
            pool.putconn(conn)
