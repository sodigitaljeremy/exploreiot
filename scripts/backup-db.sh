#!/bin/bash
set -euo pipefail

# PostgreSQL backup script for ExploreIOT
# Usage: ./scripts/backup-db.sh [backup_dir]
# Schedule: 0 2 * * * /path/to/backup-db.sh /path/to/backups

BACKUP_DIR="${1:-.backups}"
CONTAINER="${2:-exploreiot-dashboard-postgres-1}"
DB_USER="${DB_USER:-exploreiot}"
DB_NAME="${DB_NAME:-exploreiot}"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

echo "[$(date)] Starting backup..."
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
echo "[$(date)] Backup saved to $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Cleanup old backups
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Cleaned backups older than $RETENTION_DAYS days"
