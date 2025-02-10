# syntax=docker/dockerfile:1.4

# ===== Base Stage =====
FROM node:18-alpine AS base
LABEL maintainer="Excel AI Team"

# Security updates and build essentials
RUN apk update && apk upgrade && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    && rm -rf /var/cache/apk/*

# Set secure npm configurations
RUN npm config set audit true \
    && npm config set fund false \
    && npm config set loglevel warn

# Create non-root user
RUN addgroup -S nonroot && \
    adduser -S nonroot -G nonroot

# Set working directory with proper permissions
WORKDIR /app
RUN chown -R nonroot:nonroot /app

# ===== Dependencies Stage =====
FROM base AS dependencies

# Copy package files with checksums
COPY --chown=nonroot:nonroot package*.json lerna.json ./
COPY --chown=nonroot:nonroot services/*/package*.json ./services/
COPY --chown=nonroot:nonroot shared/package*.json ./shared/

# Install and bootstrap workspace
RUN npm ci && \
    npm install -g lerna@7.1.4 && \
    lerna bootstrap --hoist && \
    npm audit fix

# Cache mount points
VOLUME ["/root/.npm", "/root/.pip-cache"]

# ===== TypeScript Builder Stage =====
FROM dependencies AS typescript-builder

# Copy source code
COPY --chown=nonroot:nonroot . .

# Build TypeScript services
RUN lerna run build --scope=@excel-ai/core-service \
    --scope=@excel-ai/data-service \
    --scope=@excel-ai/gateway-service

# Run security checks
RUN npm audit && \
    npm run lint

# ===== Python Builder Stage =====
FROM python:3.11-slim AS python-builder

WORKDIR /app

# Install security updates
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy Python service files
COPY --chown=nonroot:nonroot services/ai-service/requirements.txt ./services/ai-service/
COPY --chown=nonroot:nonroot services/ai-service/src ./services/ai-service/src

# Install Python dependencies
RUN pip install --no-cache-dir -r services/ai-service/requirements.txt && \
    pip install pip-audit && \
    pip-audit

# ===== Production Stage =====
FROM base AS production

# Copy built assets
COPY --from=typescript-builder --chown=nonroot:nonroot /app/services/*/dist ./services/
COPY --from=python-builder --chown=nonroot:nonroot /app/services/ai-service ./services/ai-service

# Set production environment
ENV NODE_ENV=production \
    PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    NODE_OPTIONS=--max-old-space-size=4096

# Security headers
ENV SECURITY_HEADERS='{"Content-Security-Policy": "default-src '\''self'\''", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY"}'

# Set resource limits
ENV MEMORY_LIMIT=4G \
    CPU_LIMIT=2

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Switch to non-root user
USER nonroot

# Expose service ports
EXPOSE 3000 3001 8000 8080

# Start services based on environment variable
CMD ["sh", "-c", "\
    if [ \"$SERVICE_NAME\" = \"ai-service\" ]; then \
        cd services/ai-service && python -m src.main; \
    elif [ \"$SERVICE_NAME\" = \"core-service\" ]; then \
        node services/core-service/dist/main.js; \
    elif [ \"$SERVICE_NAME\" = \"data-service\" ]; then \
        node services/data-service/dist/main.js; \
    elif [ \"$SERVICE_NAME\" = \"gateway-service\" ]; then \
        node services/gateway-service/dist/main.js; \
    else \
        echo \"Invalid SERVICE_NAME specified\"; \
        exit 1; \
    fi"]