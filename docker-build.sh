#!/bin/bash
# ──────────────────────────────────────────────────────────────
#  Master IP — Build & Export Script
#  Run this on your LOCAL machine (with internet access)
#
#  Produces: master-ip-images.tar
#  Contains: master-ip:latest + postgres:15-alpine
# ──────────────────────────────────────────────────────────────
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Master IP — Build & Export"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Pull PostgreSQL image (if not already present)
echo ""
echo "📦  Pulling postgres:15-alpine..."
docker pull postgres:15-alpine

# 2. Build the app image
echo ""
echo "🔨  Building master-ip:latest (no-cache to ensure latest code)..."
docker build --no-cache -t master-ip:latest .

# 3. Save both images into a single tar
echo ""
echo "💾  Exporting images to master-ip-images.tar..."
docker save -o master-ip-images.tar master-ip:latest postgres:15-alpine

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Done! Transfer to server:"
echo ""
echo "  scp master-ip-images.tar nexxuz@192.168.204.107:~/"
echo ""
echo "  Then on the server:"
echo "  sudo docker load -i ~/master-ip-images.tar"
echo "  cd ~/master-ip && docker compose down && docker compose up -d"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
