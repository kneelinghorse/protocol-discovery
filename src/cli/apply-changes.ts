#!/usr/bin/env node

/**
 * Apply discovered protocol changes to the repository
 *
 * This CLI tool reads discovery results and writes protocol manifests
 * to the appropriate locations in the manifest directory structure.
 *
 * Usage:
 *   npx tsx src/cli/apply-changes.ts --input discovered-redacted.json --manifest-dir manifests/
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Command } from 'commander';

interface DiscoveredProtocol {
  urn: string;
  manifest: any;
  metadata?: {
    discoveredAt: string;
    source: string;
  };
}

interface DiscoveryResults {
  timestamp: string;
  protocols: DiscoveredProtocol[];
  summary?: {
    total: number;
    byKind: Record<string, number>;
  };
}

/**
 * Parse a URN into its components
 * Format: urn:protocol:{kind}:{namespace}:{name}:{version}
 */
function parseUrn(urn: string): {
  kind: string;
  namespace: string;
  name: string;
  version: string;
} {
  const parts = urn.split(':');
  if (parts.length !== 6 || parts[0] !== 'urn' || parts[1] !== 'protocol') {
    throw new Error(`Invalid URN format: ${urn}`);
  }

  return {
    kind: parts[2],
    namespace: parts[3],
    name: parts[4],
    version: parts[5],
  };
}

/**
 * Generate file path for a protocol manifest based on its URN
 */
function getManifestPath(manifestDir: string, urn: string): string {
  const { kind, namespace, name, version } = parseUrn(urn);

  // Structure: manifests/{kind}/{namespace}/{name}-{version}.json
  return path.join(manifestDir, kind, namespace, `${name}-${version}.json`);
}

/**
 * Apply discovered changes to the manifest directory
 */
async function applyChanges(
  discoveredPath: string,
  manifestDir: string,
  options: { dryRun?: boolean; verbose?: boolean } = {}
): Promise<void> {
  const { dryRun = false, verbose = false } = options;

  // Read discovery results
  const discoveredContent = await fs.readFile(discoveredPath, 'utf-8');
  const discovered: DiscoveryResults = JSON.parse(discoveredContent);

  if (verbose) {
    console.log(`📋 Processing ${discovered.protocols.length} protocols from ${discoveredPath}`);
  }

  const updates: string[] = [];
  const creates: string[] = [];
  const errors: Array<{ urn: string; error: string }> = [];

  // Process each protocol
  for (const protocol of discovered.protocols) {
    try {
      const { urn, manifest } = protocol;
      const filePath = getManifestPath(manifestDir, urn);

      // Check if file already exists
      let exists = false;
      try {
        await fs.access(filePath);
        exists = true;
      } catch {
        exists = false;
      }

      if (dryRun) {
        if (exists) {
          updates.push(filePath);
        } else {
          creates.push(filePath);
        }
        continue;
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Write manifest with pretty formatting
      await fs.writeFile(
        filePath,
        JSON.stringify(manifest, null, 2) + '\n',
        'utf-8'
      );

      if (exists) {
        updates.push(filePath);
        if (verbose) console.log(`✅ Updated: ${filePath}`);
      } else {
        creates.push(filePath);
        if (verbose) console.log(`✨ Created: ${filePath}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push({ urn: protocol.urn, error: errorMsg });
      console.error(`❌ Failed to process ${protocol.urn}: ${errorMsg}`);
    }
  }

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   Created: ${creates.length} files`);
  console.log(`   Updated: ${updates.length} files`);
  console.log(`   Errors:  ${errors.length} protocols`);

  if (dryRun) {
    console.log('\n🔍 Dry run mode - no files were modified');
    if (creates.length > 0) {
      console.log('\nWould create:');
      creates.forEach(f => console.log(`   + ${f}`));
    }
    if (updates.length > 0) {
      console.log('\nWould update:');
      updates.forEach(f => console.log(`   ~ ${f}`));
    }
  }

  if (errors.length > 0) {
    console.error('\n⚠️  Errors occurred:');
    errors.forEach(({ urn, error }) => {
      console.error(`   ${urn}: ${error}`);
    });
    process.exit(1);
  }

  console.log(`\n✅ Applied changes successfully${dryRun ? ' (dry run)' : ''}`);
}

/**
 * Update catalog index with all discovered protocols
 */
async function updateCatalogIndex(
  manifestDir: string,
  protocols: DiscoveredProtocol[],
  options: { dryRun?: boolean; verbose?: boolean } = {}
): Promise<void> {
  const { dryRun = false, verbose = false } = options;

  const catalogPath = path.join(manifestDir, 'catalog.json');

  // Group protocols by kind
  const byKind: Record<string, Array<{ urn: string; path: string }>> = {};

  for (const protocol of protocols) {
    const { kind } = parseUrn(protocol.urn);
    if (!byKind[kind]) {
      byKind[kind] = [];
    }

    const relativePath = path.relative(
      manifestDir,
      getManifestPath(manifestDir, protocol.urn)
    );

    byKind[kind].push({
      urn: protocol.urn,
      path: relativePath,
    });
  }

  const catalog = {
    generated: new Date().toISOString(),
    totalProtocols: protocols.length,
    byKind,
  };

  if (dryRun) {
    if (verbose) {
      console.log('\n📚 Would update catalog:');
      console.log(JSON.stringify(catalog, null, 2));
    }
    return;
  }

  await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf-8');

  if (verbose) {
    console.log(`\n📚 Updated catalog: ${catalogPath}`);
  }
}

// CLI setup
const program = new Command();

program
  .name('apply-changes')
  .description('Apply discovered protocol changes to manifest directory')
  .version('0.1.0')
  .requiredOption('-i, --input <path>', 'Path to discovered protocols JSON file')
  .requiredOption('-m, --manifest-dir <path>', 'Path to manifest directory')
  .option('-d, --dry-run', 'Preview changes without writing files')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--update-catalog', 'Update catalog index after applying changes')
  .action(async (options) => {
    try {
      await applyChanges(options.input, options.manifestDir, {
        dryRun: options.dryRun,
        verbose: options.verbose,
      });

      if (options.updateCatalog) {
        const discoveredContent = await fs.readFile(options.input, 'utf-8');
        const discovered: DiscoveryResults = JSON.parse(discoveredContent);

        await updateCatalogIndex(options.manifestDir, discovered.protocols, {
          dryRun: options.dryRun,
          verbose: options.verbose,
        });
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
