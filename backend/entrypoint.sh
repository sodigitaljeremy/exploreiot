#!/bin/sh
set -e

# Wait for PostgreSQL to be ready (max 30 seconds)
if [ -n "$DB_HOST" ]; then
    echo "Waiting for PostgreSQL at $DB_HOST:${DB_PORT:-5432}..."
    timeout=30
    elapsed=0
    while ! pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -q 2>/dev/null; do
        elapsed=$((elapsed + 1))
        if [ "$elapsed" -ge "$timeout" ]; then
            echo "ERROR: PostgreSQL not ready after ${timeout}s"
            exit 1
        fi
        sleep 1
    done
    echo "PostgreSQL is ready."
fi

# Run Alembic migrations before starting the application
echo "Running database migrations..."
alembic upgrade head

# Execute the original command
exec "$@"
