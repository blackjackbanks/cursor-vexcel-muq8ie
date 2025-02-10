# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies and security tools
RUN apk add --no-cache python3 make g++ git curl \
    && curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies with exact versions
RUN npm ci --production=false

# Copy source code
COPY . .

# Run security audit
RUN npm audit

# Build TypeScript application
RUN npm run build

# Run security scan
RUN trivy filesystem --exit-code 1 --severity HIGH,CRITICAL .

# Prune development dependencies
RUN npm prune --production

# Stage 2: Production runtime
FROM nginx:1.25-alpine

# Set environment variables
ENV NODE_ENV=production
ENV PORT=80
ENV NGINX_WORKER_PROCESSES=auto
ENV NGINX_WORKER_CONNECTIONS=1024

# Create nginx user and group with specific UID/GID
RUN addgroup -g 101 -S nginx \
    && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Install security updates and dependencies
RUN apk update && apk upgrade \
    && apk add --no-cache \
        curl \
        tzdata \
        openssl \
    && rm -rf /var/cache/apk/*

# Configure security permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run/nginx \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run/nginx \
    && chmod -R 755 /var/cache/nginx /var/log/nginx /var/run/nginx

# Copy NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf
RUN chown nginx:nginx /etc/nginx/nginx.conf \
    && chmod 644 /etc/nginx/nginx.conf

# Generate Diffie-Hellman parameters for enhanced SSL security
RUN openssl dhparam -out /etc/nginx/dhparam.pem 2048

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Setup health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Configure read-only root filesystem
RUN chmod 755 /usr/share/nginx/html \
    && chmod 755 /var/run \
    && chmod 755 /var/cache/nginx \
    && chmod 755 /var/log/nginx

# Set resource limits
RUN ulimit -n 65535

# Enable security modules
RUN sed -i \
    -e 's/access_log.*/access_log syslog:server=unix:\/dev\/log combined;/' \
    -e 's/error_log.*/error_log syslog:server=unix:\/dev\/log error;/' \
    /etc/nginx/nginx.conf

# Configure audit logging
RUN mkdir -p /var/log/audit \
    && chown nginx:nginx /var/log/audit \
    && chmod 755 /var/log/audit

# Expose port
EXPOSE 80

# Set user
USER nginx

# Add metadata labels
LABEL maintainer="Excel Add-in Team" \
      version="1.0.0" \
      description="API Gateway for Excel Add-in Backend Services" \
      security.scan.date="${BUILD_DATE}" \
      build.version="${BUILD_VERSION}" \
      com.microsoft.excel.addin.component="api-gateway"

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]