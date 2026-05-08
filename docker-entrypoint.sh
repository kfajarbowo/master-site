#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Master IP Server — Docker Entrypoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Run Prisma migrations ──────────────────────────────────────
echo "📦  Running database migrations..."
npx prisma migrate deploy

# ── Run seed only if database is empty ─────────────────────────
SITE_COUNT=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.site.count().then(c => { console.log(c); p.\$disconnect(); });
")

if [ "$SITE_COUNT" = "0" ]; then
  echo "🌱  Database empty — seeding..."
  node prisma/seed.js
else
  echo "⏭️  Database has $SITE_COUNT sites — skipping seed."
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Starting server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Start the Node.js server ───────────────────────────────────
exec node server.js
