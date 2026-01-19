# ============================================================================
# StratAI Dockerfile
# ============================================================================
# Multi-stage build for optimal production image size
#
# Build:   docker build -t stratai:latest .
# Run:     docker run -p 3000:3000 --env-file .env stratai:latest
# ============================================================================

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the SvelteKit app
RUN npm run build

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application
COPY --from=builder /app/build ./build

# Copy fresh-install scripts (for database setup)
COPY --from=builder /app/fresh-install ./fresh-install
COPY --from=builder /app/scripts/setup-db.sh ./scripts/setup-db.sh
COPY --from=builder /app/src/lib/server/persistence ./src/lib/server/persistence

# Install psql for database setup (optional, can be removed if not needed)
RUN apk add --no-cache postgresql-client

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 stratai && \
    chown -R stratai:nodejs /app

USER stratai

# Expose port (default SvelteKit adapter-node port)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Environment variables (override at runtime)
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "build"]
