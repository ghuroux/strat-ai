# MCP Commerce Server - Dockerfile
# Multi-retailer browser automation server for StratAI

FROM node:22-slim

# Install Chromium dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install Playwright browsers
RUN npx playwright install chromium

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Create profiles directory
RUN mkdir -p /data/profiles

# Set environment variables
ENV NODE_ENV=production
ENV MCP_PORT=9223
ENV MCP_HEADLESS=true
ENV MCP_PROFILES_DIR=/data/profiles
ENV MCP_SESSION_TTL=1800000

# Expose port
EXPOSE 9223

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9223/health || exit 1

# Start server
CMD ["node", "dist/index.js"]
