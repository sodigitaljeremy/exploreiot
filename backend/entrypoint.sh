#!/bin/sh
set -e

# Wait for PostgreSQL and run migrations (only if DB_HOST is set)
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

    echo "Running database migrations..."
    alembic upgrade head
else
    echo "No DB_HOST set, skipping database wait and migrations."
fi

# Execute the original command
exec "$@"
