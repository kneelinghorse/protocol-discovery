# Protocol Manifests

This directory contains discovered and validated protocol manifests organized by type.

## Directory Structure

```
manifests/
├── api/          # API Protocol manifests
├── data/         # Data Protocol manifests
├── event/        # Event Protocol manifests
├── semantic/     # Semantic Protocol manifests
└── catalog.json  # Auto-generated catalog index
```

## File Naming Convention

Protocol manifests follow the naming pattern:
```
{kind}/{namespace}/{name}-{version}.json
```

Example:
```
api/payments/stripe-api-v1.0.0.json
data/analytics/user-events-v2.0.0.json
event/kafka/order-created-v1.0.0.json
```

## URN Format

Each protocol is identified by a URN:
```
urn:protocol:{kind}:{namespace}:{name}:{version}
```

Example:
```
urn:protocol:api:payments:stripe-api:v1.0.0
urn:protocol:data:analytics:user-events:v2.0.0
urn:protocol:event:kafka:order-created:v1.0.0
```

## Automated Updates

Manifests in this directory are automatically updated by the Protocol Discovery workflow:
- **Workflow:** `.github/workflows/protocol-discovery.yml`
- **Schedule:** Nightly at 2 AM UTC
- **Tool:** `npx tsx src/cli/apply-changes.ts`

When changes are detected, an automated PR is created with:
- Updated manifest files
- Governance report
- Validation results

## Manual Usage

To manually apply discovered changes:

```bash
npx tsx src/cli/apply-changes.ts \
  --input discovered.json \
  --manifest-dir manifests/ \
  --update-catalog \
  --verbose
```

Options:
- `--dry-run` - Preview changes without writing files
- `--update-catalog` - Update catalog.json index
- `--verbose` - Show detailed output

## Catalog Index

The `catalog.json` file is automatically maintained and provides:
- Total protocol count
- Protocols grouped by kind
- File paths for each protocol

This index is used by the protocol viewer and other tooling.
