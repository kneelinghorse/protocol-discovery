/**
 * Tests for apply-changes CLI tool
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_PATH = path.join(__dirname, '../../src/cli/apply-changes.ts');
const TEST_WORKSPACE = path.join(__dirname, '.test-workspace');

describe('apply-changes CLI', () => {
  beforeEach(async () => {
    // Create test workspace
    await fs.mkdir(TEST_WORKSPACE, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test workspace
    try {
      await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('URN parsing', () => {
    it('should parse valid URN correctly', async () => {
      const discoveryData = {
        timestamp: '2025-10-03T00:00:00Z',
        protocols: [
          {
            urn: 'urn:protocol:api:payments:stripe-api:v1.0.0',
            manifest: {
              apiVersion: '1.0.0',
              metadata: { name: 'Stripe API' }
            }
          }
        ]
      };

      const discoveryPath = path.join(TEST_WORKSPACE, 'discovered.json');
      const manifestDir = path.join(TEST_WORKSPACE, 'manifests');

      await fs.writeFile(discoveryPath, JSON.stringify(discoveryData, null, 2));

      // Run CLI with dry-run to avoid actual file writes during test
      const output = execSync(
        `npx tsx ${CLI_PATH} --input ${discoveryPath} --manifest-dir ${manifestDir} --dry-run`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Created: 1 files');
      expect(output).toContain('Dry run mode');
      expect(output).toContain('manifests/api/payments/stripe-api-v1.0.0.json');
    });

    it('should reject invalid URN format', async () => {
      const discoveryData = {
        timestamp: '2025-10-03T00:00:00Z',
        protocols: [
          {
            urn: 'invalid-urn',
            manifest: { test: true }
          }
        ]
      };

      const discoveryPath = path.join(TEST_WORKSPACE, 'discovered.json');
      const manifestDir = path.join(TEST_WORKSPACE, 'manifests');

      await fs.writeFile(discoveryPath, JSON.stringify(discoveryData, null, 2));

      // Should exit with error
      expect(() => {
        execSync(
          `npx tsx ${CLI_PATH} --input ${discoveryPath} --manifest-dir ${manifestDir}`,
          { encoding: 'utf-8' }
        );
      }).toThrow();
    });
  });

  describe('file operations', () => {
    it('should create new manifest files', async () => {
      const discoveryData = {
        timestamp: '2025-10-03T00:00:00Z',
        protocols: [
          {
            urn: 'urn:protocol:data:analytics:user-events:v2.0.0',
            manifest: {
              dataset: { name: 'user_events' },
              schema: { fields: {} }
            }
          }
        ]
      };

      const discoveryPath = path.join(TEST_WORKSPACE, 'discovered.json');
      const manifestDir = path.join(TEST_WORKSPACE, 'manifests');

      await fs.writeFile(discoveryPath, JSON.stringify(discoveryData, null, 2));

      execSync(
        `npx tsx ${CLI_PATH} --input ${discoveryPath} --manifest-dir ${manifestDir} --verbose`,
        { encoding: 'utf-8' }
      );

      // Verify file was created
      const expectedPath = path.join(manifestDir, 'data/analytics/user-events-v2.0.0.json');
      const content = await fs.readFile(expectedPath, 'utf-8');
      const manifest = JSON.parse(content);

      expect(manifest.dataset.name).toBe('user_events');
    });

    it('should update existing manifest files', async () => {
      const manifestDir = path.join(TEST_WORKSPACE, 'manifests');
      const existingPath = path.join(manifestDir, 'api/payments/stripe-api-v1.0.0.json');

      // Create existing file
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(
        existingPath,
        JSON.stringify({ version: 'old' }, null, 2)
      );

      const discoveryData = {
        timestamp: '2025-10-03T00:00:00Z',
        protocols: [
          {
            urn: 'urn:protocol:api:payments:stripe-api:v1.0.0',
            manifest: {
              version: 'new',
              metadata: { updated: true }
            }
          }
        ]
      };

      const discoveryPath = path.join(TEST_WORKSPACE, 'discovered.json');
      await fs.writeFile(discoveryPath, JSON.stringify(discoveryData, null, 2));

      execSync(
        `npx tsx ${CLI_PATH} --input ${discoveryPath} --manifest-dir ${manifestDir}`,
        { encoding: 'utf-8' }
      );

      // Verify file was updated
      const content = await fs.readFile(existingPath, 'utf-8');
      const manifest = JSON.parse(content);

      expect(manifest.version).toBe('new');
      expect(manifest.metadata.updated).toBe(true);
    });

    it('should create directory structure if not exists', async () => {
      const discoveryData = {
        timestamp: '2025-10-03T00:00:00Z',
        protocols: [
          {
            urn: 'urn:protocol:event:kafka:order-created:v1.0.0',
            manifest: { eventType: 'order.created' }
          }
        ]
      };

      const discoveryPath = path.join(TEST_WORKSPACE, 'discovered.json');
      const manifestDir = path.join(TEST_WORKSPACE, 'manifests');

      await fs.writeFile(discoveryPath, JSON.stringify(discoveryData, null, 2));

      execSync(
        `npx tsx ${CLI_PATH} --input ${discoveryPath} --manifest-dir ${manifestDir}`,
        { encoding: 'utf-8' }
      );

      // Verify directory structure was created
      const expectedPath = path.join(manifestDir, 'event/kafka/order-created-v1.0.0.json');
      const exists = await fs.access(expectedPath).then(() => true).catch(() => false);

      expect(exists).toBe(true);
    });
  });

  describe('catalog updates', () => {
    it('should update catalog index when flag is set', async () => {
      const discoveryData = {
        timestamp: '2025-10-03T00:00:00Z',
        protocols: [
          {
            urn: 'urn:protocol:api:payments:stripe-api:v1.0.0',
            manifest: { name: 'stripe' }
          },
          {
            urn: 'urn:protocol:data:analytics:events:v1.0.0',
            manifest: { name: 'events' }
          }
        ]
      };

      const discoveryPath = path.join(TEST_WORKSPACE, 'discovered.json');
      const manifestDir = path.join(TEST_WORKSPACE, 'manifests');

      await fs.writeFile(discoveryPath, JSON.stringify(discoveryData, null, 2));

      execSync(
        `npx tsx ${CLI_PATH} --input ${discoveryPath} --manifest-dir ${manifestDir} --update-catalog`,
        { encoding: 'utf-8' }
      );

      // Verify catalog was created
      const catalogPath = path.join(manifestDir, 'catalog.json');
      const catalogContent = await fs.readFile(catalogPath, 'utf-8');
      const catalog = JSON.parse(catalogContent);

      expect(catalog.totalProtocols).toBe(2);
      expect(catalog.byKind.api).toHaveLength(1);
      expect(catalog.byKind.data).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should report errors for individual protocols', async () => {
      const discoveryData = {
        timestamp: '2025-10-03T00:00:00Z',
        protocols: [
          {
            urn: 'invalid-format',
            manifest: { test: true }
          }
        ]
      };

      const discoveryPath = path.join(TEST_WORKSPACE, 'discovered.json');
      const manifestDir = path.join(TEST_WORKSPACE, 'manifests');

      await fs.writeFile(discoveryPath, JSON.stringify(discoveryData, null, 2));

      expect(() => {
        execSync(
          `npx tsx ${CLI_PATH} --input ${discoveryPath} --manifest-dir ${manifestDir}`,
          { encoding: 'utf-8' }
        );
      }).toThrow();
    });

    it('should handle missing discovery file', () => {
      const manifestDir = path.join(TEST_WORKSPACE, 'manifests');

      expect(() => {
        execSync(
          `npx tsx ${CLI_PATH} --input nonexistent.json --manifest-dir ${manifestDir}`,
          { encoding: 'utf-8' }
        );
      }).toThrow();
    });
  });

  describe('dry-run mode', () => {
    it('should not create files in dry-run mode', async () => {
      const discoveryData = {
        timestamp: '2025-10-03T00:00:00Z',
        protocols: [
          {
            urn: 'urn:protocol:api:test:example:v1.0.0',
            manifest: { test: true }
          }
        ]
      };

      const discoveryPath = path.join(TEST_WORKSPACE, 'discovered.json');
      const manifestDir = path.join(TEST_WORKSPACE, 'manifests');

      await fs.writeFile(discoveryPath, JSON.stringify(discoveryData, null, 2));

      const output = execSync(
        `npx tsx ${CLI_PATH} --input ${discoveryPath} --manifest-dir ${manifestDir} --dry-run`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Dry run mode');

      // Verify no files were created
      const manifestDirExists = await fs.access(manifestDir)
        .then(() => true)
        .catch(() => false);

      // Directory might be created but should be empty
      if (manifestDirExists) {
        const files = await fs.readdir(manifestDir, { recursive: true });
        expect(files.filter(f => f.endsWith('.json'))).toHaveLength(0);
      }
    });
  });

  describe('verbose output', () => {
    it('should provide detailed output in verbose mode', async () => {
      const discoveryData = {
        timestamp: '2025-10-03T00:00:00Z',
        protocols: [
          {
            urn: 'urn:protocol:api:test:example:v1.0.0',
            manifest: { test: true }
          }
        ]
      };

      const discoveryPath = path.join(TEST_WORKSPACE, 'discovered.json');
      const manifestDir = path.join(TEST_WORKSPACE, 'manifests');

      await fs.writeFile(discoveryPath, JSON.stringify(discoveryData, null, 2));

      const output = execSync(
        `npx tsx ${CLI_PATH} --input ${discoveryPath} --manifest-dir ${manifestDir} --verbose`,
        { encoding: 'utf-8' }
      );

      expect(output).toContain('Processing 1 protocols');
      expect(output).toContain('Created:');
    });
  });
});
