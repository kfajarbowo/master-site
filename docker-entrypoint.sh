#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Master IP Server — Docker Entrypoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Run Prisma migrations ──────────────────────────────────────
echo "📦  Running database migrations..."
npx prisma migrate deploy

# ── Run seed (idempotent — uses upsert) ────────────────────────
echo "🌱  Seeding database..."
node prisma/seed.js

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Starting server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Start the Node.js server ───────────────────────────────────
exec node server.js
