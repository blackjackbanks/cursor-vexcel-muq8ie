# AI-Enhanced Excel Add-in Backend Services

Enterprise-grade backend services for the AI-enhanced Excel Add-in, providing secure, scalable, and high-performance API endpoints for formula generation, data management, and version control.

## Architecture Overview

The backend system implements a microservices architecture with the following core components:

- **API Gateway**: Secure entry point handling authentication, rate limiting, and request routing
- **AI Service**: Formula generation and optimization using OpenAI integration
- **Core Service**: Business logic and orchestration
- **Data Service**: Data persistence and transformation

### System Requirements

- Node.js >= 18.0.0
- Python >= 3.11 (AI Service)
- Redis >= 6.2
- PostgreSQL >= 14
- Docker >= 20.10
- Kubernetes >= 1.25

## Getting Started

### Prerequisites

1. Install required tools:
```bash
# Node.js and npm
nvm install 18
nvm use 18

# Python and pip (for AI Service)
pyenv install 3.11
pyenv global 3.11

# Docker and Kubernetes
brew install docker kubectl
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Installation

1. Install dependencies and bootstrap services:
```bash
npm install
npm run bootstrap
```

2. Build all services:
```bash
npm run build
```

3. Start development environment:
```bash
# Using Docker Compose
docker-compose up

# Or start services individually
npm run start:dev
```

## Development

### Project Structure
```
src/backend/
├── services/
│   ├── ai/          # AI Service (Python)
│   ├── core/        # Core Service (Node.js)
│   ├── data/        # Data Service (Node.js)
│   ├── gateway/     # API Gateway (Node.js)
│   └── shared/      # Shared types and utilities
├── docker-compose.yml
└── package.json
```

### Development Workflow

1. Start development environment:
```bash
npm run start:dev
```

2. Run tests:
```bash
npm run test
npm run test:coverage
```

3. Lint and format code:
```bash
npm run lint
npm run format
```

## API Documentation

### Core Endpoints

| Endpoint | Method | Rate Limit | Description |
|----------|---------|------------|-------------|
| `/api/v1/formula/suggest` | POST | 100/min | Get AI formula suggestions |
| `/api/v1/data/clean` | POST | 20/min | Clean and transform data |
| `/api/v1/version/{id}` | GET | 200/min | Retrieve version history |
| `/api/v1/changes/batch` | POST | 50/min | Apply batch changes |

### Authentication

The system implements OAuth 2.0 with JWT tokens and enhanced security features:

- Token fingerprinting
- Device-based validation
- Refresh token rotation
- Rate limiting per endpoint
- Comprehensive session management

## Deployment

### Production Deployment

1. Build Docker images:
```bash
docker-compose build
```

2. Deploy to Kubernetes:
```bash
kubectl apply -f k8s/
```

### Infrastructure

The system is deployed on Azure with:

- AKS for container orchestration
- Azure Redis Cache for session management
- Azure SQL Database for persistence
- Azure Key Vault for secrets
- Application Insights for monitoring

## Security

### Security Features

- OAuth 2.0 + JWT authentication
- Role-based access control (RBAC)
- Rate limiting and DDoS protection
- Data encryption at rest and in transit
- Comprehensive audit logging
- Security headers and XSS protection

### Security Configuration

1. SSL/TLS Configuration:
- TLS 1.2/1.3 only
- Strong cipher suites
- HSTS enabled
- Perfect forward secrecy

2. API Security:
- Rate limiting per endpoint
- Request validation
- Input sanitization
- CORS configuration

## Monitoring and Logging

### Monitoring Stack

- Azure Application Insights
- Prometheus metrics
- Grafana dashboards
- Custom health checks

### Logging

- Structured JSON logging
- Log rotation
- Correlation IDs
- Audit logging for security events

## Maintenance

### Update Procedures

1. Database migrations:
```bash
npm run migration:generate
npm run migration:run
```

2. Dependency updates:
```bash
npm run security:audit
npm update
```

### Backup Strategy

- Automated daily backups
- Point-in-time recovery
- Geo-replication
- 30-day retention

## Support

### Troubleshooting

1. Check service health:
```bash
kubectl get pods
kubectl logs <pod-name>
```

2. View application logs:
```bash
kubectl logs -f -l app=excel-ai
```

### Performance Optimization

- Redis caching
- Connection pooling
- Query optimization
- Load balancing

## License

MIT License - see LICENSE file for details.