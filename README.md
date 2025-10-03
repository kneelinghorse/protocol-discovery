# Protocol-Driven Discovery

[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/protocol-discovery/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/protocol-discovery/actions/workflows/ci.yml)
[![CodeQL](https://github.com/YOUR_USERNAME/protocol-discovery/actions/workflows/codeql.yml/badge.svg)](https://github.com/YOUR_USERNAME/protocol-discovery/actions/workflows/codeql.yml)
[![Coverage](https://github.com/YOUR_USERNAME/protocol-discovery/actions/workflows/coverage.yml/badge.svg)](https://github.com/YOUR_USERNAME/protocol-discovery/actions/workflows/coverage.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/protocol-discovery/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/protocol-discovery)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Discover and convert existing contracts (OpenAPI, Postgres, AsyncAPI) into unified protocol manifests with governance-first approach.

## Features

- ✅ **Multi-Protocol Import**: OpenAPI, PostgreSQL, AsyncAPI 2.x/3.x
- ✅ **Pattern Detection**: DLQ, retry, ordering, fanout, PII detection
- ✅ **Governance Generation**: Automated GOVERNANCE.md with compliance warnings
- ✅ **Consumer Generation**: Kafka, AMQP, MQTT TypeScript consumers
- ✅ **Web Viewer**: Interactive exploration with semantic self-documentation
- ✅ **Security Redaction**: Automatic PII and secret masking
- ✅ **Graph Analysis**: URN-based dependency tracking with cycle detection
- ✅ **CLI Scaffolding**: Interactive protocol generation tool

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/protocol-discovery.git
cd protocol-discovery

# Install dependencies
npm install
```

### Basic Usage

```bash
# Discover protocols from OpenAPI spec
npm run cli discover https://api.example.com/openapi.json

# Import AsyncAPI spec
npm run cli discover https://api.example.com/asyncapi.yaml

# Generate consumer code
npm run cli generate ./artifacts/my-event-protocol.json

# Scaffold new protocol (interactive)
npm run cli scaffold
```

## CLI Commands

### Discovery & Import

```bash
# Auto-detect and import any supported format
protocol-discover discover <url-or-path>

# Examples
protocol-discover discover https://petstore.swagger.io/v2/swagger.json
protocol-discover discover ./specs/asyncapi.yaml
protocol-discover discover postgresql://localhost/mydb
```

### Code Generation

```bash
# Generate event consumer from manifest
protocol-discover generate <manifest-path>

# Example
protocol-discover generate ./artifacts/user-events-protocol.json
```

### Protocol Scaffolding

```bash
# Interactive mode (recommended)
protocol-discover scaffold

# Non-interactive mode
protocol-discover scaffold --type api --name MyService --baseUrl https://api.example.com

# Preview without writing files
protocol-discover scaffold --type api --name Test --dry-run

# See examples and options
protocol-discover scaffold --examples
```

### Governance & Review

```bash
# Review discovered protocol
protocol-discover review <manifest-path>

# Approve for catalog
protocol-discover approve <manifest-path>
```

## Test Coverage

```bash
# Run test suite
npm test

# Run with coverage report
npm test -- --coverage

# Watch mode for development
npm test -- --watch

# Run specific test file
npm test -- tests/importers/openapi.test.js
```

**Current Coverage**: 470+ tests passing across all modules
- Catalog & Query: 15 tests
- Security & Redaction: 31 tests
- OpenAPI Import: 45+ tests
- AsyncAPI Import: 35+ tests
- Event Patterns: 20+ tests
- Governance: 63+ tests
- Consumer Generation: 20+ tests
- Scaffolding: 78+ tests
- Graph Operations: 12+ tests
- Validators: 45+ tests
- Overrides: 54+ tests
- Seeds: 31+ tests
- Viewer: 61+ tests

## Project Structure

```
protocol-discovery/
├── .github/
│   ├── workflows/           # CI/CD pipelines
│   └── dependabot.yml       # Dependency updates
├── src/                     # Core source code
│   ├── catalog/            # Catalog indexing & queries
│   └── security/           # Redaction & security utils
├── importers/              # Protocol importers
│   ├── openapi/           # OpenAPI importer
│   ├── postgres/          # PostgreSQL importer
│   └── asyncapi/          # AsyncAPI importer
├── generators/             # Code generators
│   ├── consumers/         # Event consumer generators
│   └── scaffold/          # Protocol scaffolding
├── core/                   # Core protocol definitions
│   ├── protocols/         # Manifest schemas
│   ├── validators/        # Cross-protocol validators
│   ├── governance/        # GOVERNANCE.md generator
│   └── graph/             # Dependency graph
├── cli/                    # Command-line interface
├── viewer/                 # Web-based viewer
│   ├── server/            # Express API server
│   └── client/            # React SPA
├── tests/                  # Test suite
├── templates/              # Protocol templates
├── examples/               # Usage examples
└── artifacts/              # Generated artifacts

```

## Development

### Prerequisites

- Node.js 18+ (required)
- PostgreSQL (optional, for database discovery)

### Setup Development Environment

```bash
# Install dependencies
npm install

# Run tests in watch mode
npm test -- --watch

# Run local viewer
cd viewer/server && npm start
cd viewer/client && npm start
```

### Running CI Locally

The CI pipeline runs automatically on push and PRs. To validate locally:

```bash
# Run all CI checks
npm test                    # Test suite
npm audit                   # Security audit
npm test -- --coverage      # Coverage check
```

### Code Quality Standards

- **Test Coverage**: 70%+ statements, 60%+ branches
- **Security**: No high/critical vulnerabilities
- **Performance**: All operations meet target benchmarks
- **Documentation**: JSDoc comments for public APIs

## Performance Targets

All performance targets are validated in CI:

| Operation | Target | Current |
|-----------|--------|---------|
| CLI startup | < 200ms | ✅ ~150ms |
| Import (typical) | < 2s | ✅ ~1.5s |
| AsyncAPI (50 channels) | < 3.5s | ✅ ~2.8s |
| Pattern detection | < 50ms | ✅ ~35ms |
| Consumer generation | < 100ms | ✅ ~80ms |
| Graph traversal (1k nodes) | < 10ms | ✅ ~5ms |
| Cycle detection (10k nodes) | < 100ms | ✅ ~75ms |

## Architecture

### Core Components

1. **Importers**: Transform external formats (OpenAPI, Postgres, AsyncAPI) into protocol manifests
2. **Protocols**: Core manifest definitions (API, Data, Event, Semantic)
3. **Graph**: URN-based relationship tracking with cycle detection
4. **Governance**: Automated GOVERNANCE.md generation with compliance checks
5. **Generators**: Consumer code generation for Kafka, AMQP, MQTT
6. **Catalog**: Indexing and query engine with O(1) URN lookups
7. **Security**: Redaction utilities for PII and secrets
8. **Viewer**: Web-based exploration with semantic self-documentation

### Integration Points

- OpenAPI 3.x URLs or local files
- PostgreSQL connection strings (read-only introspection)
- AsyncAPI 2.x/3.x URLs or local files
- Community override repositories
- Express API serving manifests
- React SPA for protocol exploration

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

### Workflows

- **CI/CD Pipeline** (`ci.yml`): Runs tests on Node.js 18.x and 20.x
- **CodeQL Analysis** (`codeql.yml`): Security scanning weekly + on PRs
- **Coverage Report** (`coverage.yml`): Automatic coverage tracking

### Automated Checks

- ✅ Test suite across Node.js versions
- ✅ Security audit (npm audit)
- ✅ Code quality scanning (CodeQL)
- ✅ Coverage reporting (Codecov)
- ✅ Build validation
- ✅ Dependency updates (Dependabot)

### Setting Up CI

1. **Fork the repository**
2. **Enable GitHub Actions** (automatic)
3. **Add secrets** (optional):
   - `CODECOV_TOKEN`: For coverage reporting (get from codecov.io)

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Ensure coverage meets thresholds
6. Commit with conventional commits (`feat:`, `fix:`, `docs:`, etc.)
7. Push to your fork
8. Open a Pull Request

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Governance & Compliance

The tool generates governance documentation automatically:

- **PII Detection**: Three-tier confidence scoring (definite/potential/contextual)
- **Retention Analysis**: GDPR/CCPA compliance warnings
- **DLQ Validation**: Dead letter queue configuration checks
- **Fanout Risk**: Event multiplication analysis
- **Replay Risk**: Log compaction + PII warnings

## License

MIT License - see [LICENSE](LICENSE) file for details

## Status

**Version**: 0.1.0
**Status**: Active Development
**Test Coverage**: 470+ tests passing
**Phase**: Week 5 - Production Polish

## Support

For issues, questions, or contributions:
- 📝 [Open an issue](https://github.com/YOUR_USERNAME/protocol-discovery/issues)
- 💬 [Discussions](https://github.com/YOUR_USERNAME/protocol-discovery/discussions)
- 📖 [Documentation](https://github.com/YOUR_USERNAME/protocol-discovery/wiki)

---

Built with governance-first approach for protocol-driven discovery.
