#!/bin/bash
# backup.sh
# Script to backup PostgreSQL database from Docker container

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="agrimotion_db"
DB_USER="agrimotion"
DB_NAME="agrimotion"

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"

echo "📦 Starting backup for database: $DB_NAME"

docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c > "$BACKUP_FILE"

echo "✅ Backup successfully saved to $BACKUP_FILE"
