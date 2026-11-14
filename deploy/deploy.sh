#!/usr/bin/env bash
# ==============================================================================
# SN INVOICE — PRODUCTION DEPLOYMENT SCRIPT FOR HOSTINGER VPS
# ==============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "=========================================================="
echo "🚀 Starting SN Invoice Deployment on Hostinger VPS"
echo "=========================================================="

# 1. Environment file check
if [ ! -f .env.production ]; then
  echo "❌ Error: .env.production file not found!"
  echo "Please copy .env.production.example to .env.production and configure your variables."
  exit 1
fi

# 2. Pull latest code from GitHub
echo "📥 Pulling latest release from GitHub..."
git pull origin main

# 3. Build & start Docker containers
echo "🐳 Building and starting Docker container..."
docker compose -f compose.yaml up -d --build --remove-orphans

# 4. Wait for application to be healthy
echo "⏳ Waiting for health check verification..."
MAX_RETRIES=15
COUNT=0
HEALTHY=false

while [ $COUNT -lt $MAX_RETRIES ]; do
  if docker compose -f compose.yaml ps sn-invoice | grep -q "healthy"; then
    HEALTHY=true
    break
  fi
  echo -n "."
  sleep 2
  COUNT=$((COUNT + 1))
done
echo ""

if [ "$HEALTHY" = true ]; then
  echo "✅ Application deployed successfully and is HEALTHY!"
  docker compose -f compose.yaml ps
else
  echo "⚠️ Health check timed out. Checking container logs:"
  docker compose -f compose.yaml logs --tail=40 sn-invoice
  exit 1
fi

echo "=========================================================="
echo "🎉 SN Invoice is running on 127.0.0.1:${APP_PORT:-3000}"
echo "=========================================================="
