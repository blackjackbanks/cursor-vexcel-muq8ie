# Build stage
FROM python:3.11-slim AS builder

# Set working directory for build
WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Install security scanning tools
RUN pip install --no-cache-dir safety bandit

# Copy source code
COPY src/ src/

# Run security checks
RUN safety check
RUN bandit -r src/

# Production stage
FROM nvidia/cuda:11.8.0-base-ubuntu22.04

# Install Python and required system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/

# Copy application source
COPY --from=builder /build/src/ /app/src/

# Set environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    APP_ENV=production \
    TZ=UTC

# Create non-root user
RUN groupadd -r ai-service && \
    useradd -r -g ai-service -s /bin/false ai-service && \
    chown -R ai-service:ai-service /app

# Set container labels
LABEL maintainer="DevOps Team" \
      version="1.0.0" \
      description="AI Service for Excel formula processing" \
      build-date=${BUILD_DATE} \
      vcs-ref=${VCS_REF}

# Expose port
EXPOSE 8000

# Switch to non-root user
USER ai-service

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Configure resource limits
ENV NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Set the entrypoint
ENTRYPOINT ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--log-config", "/app/src/logging.conf"]