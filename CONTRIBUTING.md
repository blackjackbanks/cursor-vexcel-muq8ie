# Contributing to AI-enhanced Excel Add-in

Thank you for your interest in contributing to the AI-enhanced Excel Add-in project. This document provides comprehensive guidelines for development standards, workflow processes, and contribution procedures.

## Getting Started

### Prerequisites

- Node.js 18 LTS
- Python 3.11+
- VS Code with recommended extensions:
  - ESLint
  - Prettier
  - Python
  - markdownlint
  - GitLens
  - Azure Tools

### Development Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/ai-excel-addin.git
cd ai-excel-addin
```

2. Install dependencies:
```bash
npm install
python -m pip install -r requirements.txt
```

3. Configure VS Code settings:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Development Workflow

### Branch Naming Convention

- Feature: `feature/ISSUE-ID-brief-description`
- Bugfix: `fix/ISSUE-ID-brief-description`
- Documentation: `docs/ISSUE-ID-brief-description`
- Security: `security/ISSUE-ID-brief-description`

### Commit Message Standards

Follow conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes
- refactor: Code refactoring
- test: Adding/modifying tests
- chore: Maintenance tasks
- security: Security-related changes

### Development Process

1. Create feature branch from `main`
2. Implement changes following code standards
3. Write/update tests
4. Run local validation:
```bash
npm run validate
```
5. Submit PR with completed template

## Code Standards

### TypeScript Standards

- Use ESLint with @typescript-eslint/recommended
- Prettier for formatting
- Maximum line length: 100 characters
- Use strict TypeScript features:
  - strict: true
  - noImplicitAny: true
  - strictNullChecks: true

### Python Standards

- Follow PEP 8
- Use pylint with project-specific rules
- Black for formatting
- Type hints required for all functions

### Documentation Standards

- JSDoc for TypeScript files
- Google-style docstrings for Python
- README for each component
- API documentation using OpenAPI 3.0
- markdownlint for documentation files

## Testing Requirements

### Coverage Requirements

- Minimum coverage: 80%
- Target coverage: 95%
- Critical paths: 100%

### Test Types

1. Unit Tests
   - Jest for TypeScript
   - pytest for Python
   - Mock external dependencies

2. Integration Tests
   - End-to-end API tests
   - Excel Add-in integration tests
   - Cross-service communication tests

3. Security Tests
   - SAST using SonarQube
   - DAST using OWASP ZAP
   - Dependency scanning

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Security tests
npm run test:security

# All tests
npm run test
```

## Pull Request Process

### PR Requirements

1. Completed PR template
2. All tests passing
3. Code coverage meets minimum requirements
4. No linting errors
5. Security scan passed
6. Two approving reviews
7. Up-to-date with main branch

### Security Review

Security-related changes require:
1. Security team review
2. Vulnerability assessment
3. Compliance check
4. Threat modeling (for significant changes)

## Community Standards

### Communication Guidelines

- Be respectful and professional
- Use inclusive language
- Keep discussions technical and constructive
- Follow the code of conduct

### Support

- Technical questions: GitHub Discussions
- Bug reports: GitHub Issues
- Security vulnerabilities: See SECURITY.md

## Security Guidelines

### Secure Development

1. Follow OWASP Secure Coding Guidelines
2. Use approved security libraries
3. Implement proper input validation
4. Apply principle of least privilege

### Vulnerability Reporting

For security vulnerabilities:
1. Do NOT create public issues
2. Follow responsible disclosure in SECURITY.md
3. Use security@company.com for reporting
4. Encrypt sensitive communications with PGP

### Security Best Practices

- Keep dependencies updated
- Use security linters
- Implement proper error handling
- Follow zero-trust principles
- Use secure defaults

## License

By contributing, you agree that your contributions will be licensed under the project's license.

---

Last updated: [Current Date]
Version: 1.0.0