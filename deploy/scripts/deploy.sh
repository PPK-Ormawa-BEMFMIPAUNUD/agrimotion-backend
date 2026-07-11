#!/bin/bash
# deploy.sh
# One-click deployment script for Ubuntu VPS

set -e

echo "🚀 Starting Deployment Process..."

# Pull latest code
echo "📦 Pulling latest changes from Git..."
git pull origin master

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build new images
echo "🏗️ Building new Docker images..."
docker-compose build --no-cache

# Start containers in background
echo "🟢 Starting containers..."
docker-compose up -d

# Show status
echo "✅ Deployment finished successfully!"
docker-compose ps
