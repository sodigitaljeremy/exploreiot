"""Tests for Alembic migrations setup."""

import configparser
import importlib
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = BACKEND_DIR / "migrations"
VERSIONS_DIR = MIGRATIONS_DIR / "versions"


class TestAlembicSetup:
    def test_migrations_directory_exists(self):
        """Migrations directory must exist."""
        assert MIGRATIONS_DIR.is_dir()

    def test_versions_directory_exists(self):
        """Versions directory must contain at least one migration."""
        assert VERSIONS_DIR.is_dir()
        py_files = list(VERSIONS_DIR.glob("*.py"))
        assert len(py_files) >= 1, "No migration files found"

    def test_alembic_ini_parseable(self):
        """alembic.ini must be a valid INI file with expected sections."""
        ini_path = BACKEND_DIR / "alembic.ini"
        assert ini_path.is_file()
        config = configparser.RawConfigParser()
        config.read(ini_path)
        assert "alembic" in config.sections()
        assert config.get("alembic", "script_location").endswith("migrations")

    def test_env_py_exists(self):
        """env.py must exist in migrations directory."""
        assert (MIGRATIONS_DIR / "env.py").is_file()

    def test_initial_migration_has_upgrade_and_downgrade(self):
        """Each migration version must define upgrade() and downgrade()."""
        for py_file in VERSIONS_DIR.glob("*.py"):
            if py_file.name == "__init__.py":
                continue
            content = py_file.read_text()
            assert "def upgrade()" in content, (
                f"{py_file.name} missing upgrade()"
            )
            assert "def downgrade()" in content, (
                f"{py_file.name} missing downgrade()"
            )

    def test_initial_migration_creates_mesures_table(self):
        """Initial migration must create the mesures table."""
        migrations = sorted(VERSIONS_DIR.glob("*.py"))
        # Skip __init__.py
        migrations = [m for m in migrations if m.name != "__init__.py"]
        assert len(migrations) >= 1
        content = migrations[0].read_text()
        assert "mesures" in content

    def test_entrypoint_runs_migrations(self):
        """entrypoint.sh must call alembic upgrade head."""
        entrypoint = BACKEND_DIR / "entrypoint.sh"
        assert entrypoint.is_file()
        content = entrypoint.read_text()
        assert "alembic upgrade head" in content
