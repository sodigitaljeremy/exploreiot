"""Shared test fixtures for ExploreIOT API tests."""

import pytest
from unittest.mock import MagicMock
from contextlib import contextmanager
from fastapi.testclient import TestClient

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def make_cursor(rows=None, fetchone_result=None):
    """Create a mock psycopg2 cursor."""
    cursor = MagicMock()
    cursor.fetchall.return_value = rows or []
    cursor.fetchone.return_value = fetchone_result
    cursor.__enter__ = MagicMock(return_value=cursor)
    cursor.__exit__ = MagicMock(return_value=False)
    return cursor


@contextmanager
def make_conn_ctx(cursor):
    """Create a mock context manager for get_conn()."""
    conn = MagicMock()
    conn.cursor.return_value = cursor
    yield conn
