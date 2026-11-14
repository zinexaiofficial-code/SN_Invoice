#!/usr/bin/env bash
# ==============================================================================
# SN INVOICE — PRODUCTION ROLLBACK SCRIPT FOR HOSTINGER VPS
# ==============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

TARGET_COMMIT="${1:-HEAD~1}"

echo "=========================================================="
echo "⏪ Rolling back SN Invoice to commit: $TARGET_COMMIT"
echo "=========================================================="

git checkout "$TARGET_COMMIT"

echo "🐳 Rebuilding and starting previous version..."
docker compose -f compose.yaml up -d --build --remove-orphans

echo "⏳ Verifying rollback container health..."
sleep 5
docker compose -f compose.yaml ps

echo "=========================================================="
echo "✅ Rollback completed!"
echo "=========================================================="

