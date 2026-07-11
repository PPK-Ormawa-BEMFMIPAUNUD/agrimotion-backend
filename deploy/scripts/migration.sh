#!/bin/bash
# migration.sh
# Script to run Prisma migrations inside the backend container

set -e

CONTAINER_NAME="agrimotion_backend"

echo "🔄 Running Prisma migrations on production database..."
docker exec -it "$CONTAINER_NAME" npx prisma migrate deploy

echo "✅ Migrations completed successfully!"
