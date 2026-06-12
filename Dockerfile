# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install ALL deps (including devDependencies for prisma generate)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# ── Stage 2: Production ────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

# Install openssl (needed by Prisma on Alpine) + dumb-init for signal handling
RUN apk add --no-cache openssl dumb-init

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy Prisma schema + generated client from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy application source
COPY server.js ./
COPY src ./src
COPY public ./public

# Create uploads directory for site images
RUN mkdir -p uploads/sites

# Copy entrypoint script and ensure Unix line endings + executable
COPY docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Entrypoint runs migrations + seed before starting the server
CMD ["./docker-entrypoint.sh"]
