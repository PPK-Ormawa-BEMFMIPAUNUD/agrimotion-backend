#!/bin/bash
# restore.sh
# Script to restore PostgreSQL database from a backup file

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Please provide the backup file path."
  echo "Usage: ./restore.sh <path_to_backup_file>"
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="agrimotion_db"
DB_USER="agrimotion"
DB_NAME="agrimotion"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found at $BACKUP_FILE"
  exit 1
fi

echo "⚠️ WARNING: This will overwrite the current database."
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Restore cancelled."
    exit 1
fi

echo "🔄 Restoring database from $BACKUP_FILE..."
cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean

echo "✅ Database restored successfully!"
