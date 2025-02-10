# Excel Add-in Core Service

Enterprise-grade backend service providing core functionality for the AI-enhanced Excel Add-in, including formula generation, version control, and data management capabilities.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Architecture](#architecture)
  - [Core Components](#core-components)
  - [API Design](#api-design)
  - [Security Model](#security-model)
- [Development](#development)
  - [Build](#build)
  - [Testing](#testing)
  - [Code Quality](#code-quality)
- [Deployment](#deployment)
  - [Docker](#docker)
  - [Kubernetes](#kubernetes)
  - [Monitoring](#monitoring)
- [API Documentation](#api-documentation)
  - [Formula Endpoints](#formula-endpoints)
  - [Version Control](#version-control)
  - [Error Handling](#error-handling)
- [Security](#security)
  - [Authentication](#authentication)
  - [Authorization](#authorization)
  - [Data Protection](#data-protection)
- [Performance](#performance)
  - [Caching Strategy](#caching-strategy)
  - [Rate Limiting](#rate-limiting)
  - [Circuit Breakers](#circuit-breakers)
- [Maintenance](#maintenance)
  - [Logging](#logging)
  - [Monitoring](#monitoring-1)
  - [Troubleshooting](#troubleshooting)

## Overview

The Core Service is a critical component of the AI-enhanced Excel Add-in, providing:

- AI-powered formula generation and optimization
- Enterprise-grade version control system
- Secure data management and transformation
- Real-time collaboration features
- Comprehensive audit logging

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0 or pnpm >= 8.0.0
- Redis >= 6.2
- Azure subscription for cloud services
- Docker for containerization

### Installation

```bash
# Clone the repository
git clone https://github.com/excel-ai/excel-ai.git

# Navigate to core service
cd src/backend/services/core

# Install dependencies
pnpm install

# Build the service
pnpm build
```

### Configuration

1. Create `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Azure Configuration
AZURE_AD_TENANT_ID=your_tenant_id
AZURE_AD_CLIENT_ID=your_client_id
AZURE_AD_CLIENT_SECRET=your_client_secret

# JWT Configuration
JWT_SECRET=your_jwt_secret
TOKEN_EXPIRY=1h

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Application Insights
APPINSIGHTS_INSTRUMENTATIONKEY=your_instrumentation_key
```

## Architecture

### Core Components

The service follows a modular architecture with the following key components:

- **API Layer**: Express.js based REST API with comprehensive middleware chain
- **Service Layer**: Business logic implementation with TypeDI dependency injection
- **Data Layer**: TypeORM based data access with Redis caching
- **Security Layer**: Multi-layered security with JWT authentication and RBAC

### API Design

RESTful API endpoints with:

- OpenAPI/Swagger documentation
- Versioned endpoints
- Comprehensive validation
- Rate limiting
- Circuit breaker patterns

### Security Model

Multi-layered security approach:

- Azure AD integration
- JWT-based authentication
- Role-based access control
- Request validation
- Data encryption
- Audit logging

## Development

### Build

```bash
# Development build with watch mode
pnpm start:dev

# Production build
pnpm build
pnpm start
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Type checking
pnpm typecheck
```

## Deployment

### Docker

```bash
# Build Docker image
pnpm docker:build

# Run container
pnpm docker:run
```

### Kubernetes

Deployment manifests available in `/k8s` directory:

- Deployment configuration
- Service configuration
- Ingress rules
- Resource limits
- Horizontal Pod Autoscaling

### Monitoring

- Application Insights integration
- Prometheus metrics
- Custom health checks
- Performance monitoring
- Error tracking

## API Documentation

### Formula Endpoints

```typescript
POST /api/v1/formula/suggest
POST /api/v1/formula/validate
POST /api/v1/formula/optimize
```

### Version Control

```typescript
POST /api/v1/version
GET /api/v1/version/:id
GET /api/v1/version/workbook/:workbookId
POST /api/v1/version/:id/revert
```

### Error Handling

Standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {},
    "correlationId": "unique-id"
  }
}
```

## Security

### Authentication

- Azure AD integration
- JWT token validation
- Token refresh mechanism
- Device fingerprinting

### Authorization

- Role-based access control
- Permission-based actions
- Tenant isolation
- Resource-level permissions

### Data Protection

- TLS 1.3 encryption
- Data at rest encryption
- Sensitive data masking
- Audit logging

## Performance

### Caching Strategy

- Redis caching
- Multi-level cache
- Cache invalidation
- Cache warming

### Rate Limiting

- Per-endpoint limits
- Tenant-based quotas
- Sliding window algorithm
- Custom rate limit headers

### Circuit Breakers

- Service protection
- Fallback mechanisms
- Auto-recovery
- Health monitoring

## Maintenance

### Logging

- Structured logging
- Log rotation
- Log levels
- Correlation IDs

### Monitoring

- Health checks
- Performance metrics
- Error tracking
- Usage analytics

### Troubleshooting

- Debug logging
- Error correlation
- Performance profiling
- Request tracing