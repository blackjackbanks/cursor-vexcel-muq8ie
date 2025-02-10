# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /build

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies including dev dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Add labels
LABEL maintainer="Excel Add-in Team" \
      version="${npm_package_version}" \
      description="Core Service for Excel Add-in"

# Set working directory
WORKDIR /app

# Install production dependencies
RUN apk add --no-cache tini curl

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /bin/sh -D nodejs

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built assets from builder
COPY --from=builder --chown=nodejs:nodejs /build/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules

# Create log directory with correct permissions
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app/logs

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HEALTHCHECK_INTERVAL=30 \
    HEALTHCHECK_TIMEOUT=10 \
    HEALTHCHECK_RETRIES=3

# Switch to non-root user
USER nodejs

# Create volume mount points
VOLUME ["/app/logs", "/app/node_modules"]

# Expose port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=5s \
            --retries=3 \
            CMD curl -f http://localhost:3000/health || exit 1

# Use tini as init process
ENTRYPOINT ["/sbin/tini", "--"]

# Set the startup command
CMD ["node", "dist/app.js"]