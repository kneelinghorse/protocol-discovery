/**
 * Protocol Scaffolder
 * Generates protocol manifests, importers, and tests from templates
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { TemplateEngine } from './engine.js';

export class ProtocolScaffolder {
  /**
   * @param {TemplateEngine} templateEngine - Template engine instance
   * @param {Object} options - Scaffolder options
   */
  constructor(templateEngine, options = {}) {
    this.engine = templateEngine;
    // Default output anchored to app root regardless of cwd
    if (options.outputDir) {
      this.outputDir = options.outputDir;
    } else {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      this.outputDir = path.join(__dirname, '../../artifacts/scaffolds');
    }
  }

  /**
   * Generate protocol manifest from template
   * @param {string} type - Protocol type (api, data, event, semantic)
   * @param {Object} config - Manifest configuration
   * @returns {Promise<Object>} Generated manifest and metadata
   */
  async generateManifest(type, config = {}) {
    const validTypes = ['api', 'data', 'event', 'semantic'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid protocol type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    // Prepare variables
    const variables = {
      type,
      name: config.name || `${type}-protocol`,
      version: config.version || '1.0.0',
      description: config.description || `Generated ${type} protocol`,
      timestamp: new Date().toISOString(),
      author: config.author || 'protocol-discover',
      ...this.getTypeSpecificDefaults(type, config)
    };

    // Render template
    const templateName = `manifest-${type}.json`;
    const content = await this.engine.render(templateName, variables);

    // Parse and return
    const manifest = JSON.parse(content);
    const outputPath = path.join(this.outputDir, 'manifests', `${variables.name}.json`);

    return {
      manifest,
      content,
      outputPath,
      variables
    };
  }

  /**
   * Generate importer skeleton
   * @param {string} protocol - Protocol name
   * @param {Object} config - Importer configuration
   * @returns {Promise<Object>} Generated importer and metadata
   */
  async generateImporter(protocol, config = {}) {
    const className = this.toPascalCase(protocol);
    const filename = this.toKebabCase(protocol);

    const variables = {
      name: config.name || protocol,
      protocol,
      className: `${className}`,
      type: config.type || 'api',
      timestamp: new Date().toISOString()
    };

    const content = await this.engine.render('importer.js', variables);
    const outputPath = path.join(this.outputDir, 'importers', `${filename}-importer.js`);

    return {
      content,
      outputPath,
      variables,
      className: variables.className
    };
  }

  /**
   * Generate test scaffold
   * @param {string} protocol - Protocol or component name
   * @param {Object} config - Test configuration
   * @returns {Promise<Object>} Generated test and metadata
   */
  async generateTests(protocol, config = {}) {
    const className = config.className || this.toPascalCase(protocol);
    const filename = config.filename || this.toKebabCase(protocol);

    const variables = {
      name: config.name || protocol,
      className,
      filename,
      timestamp: new Date().toISOString()
    };

    const content = await this.engine.render('test.js', variables);
    const outputPath = path.join(this.outputDir, 'tests', `${filename}.test.js`);

    return {
      content,
      outputPath,
      variables
    };
  }

  /**
   * Generate complete protocol package
   * @param {string} type - Protocol type
   * @param {Object} config - Configuration
   * @returns {Promise<Object>} All generated files
   */
  async generateProtocol(type, config = {}) {
    const results = {};

    // Generate manifest
    results.manifest = await this.generateManifest(type, config);

    // Generate importer if requested
    if (config.includeImporter !== false) {
      const protocol = config.name || `${type}-protocol`;
      results.importer = await this.generateImporter(protocol, { type, ...config });
    }

    // Generate tests if requested
    if (config.includeTests !== false) {
      const protocol = config.name || `${type}-protocol`;
      results.tests = await this.generateTests(protocol, {
        className: results.importer?.className || this.toPascalCase(protocol),
        filename: this.toKebabCase(protocol) + '-importer'
      });
    }

    return results;
  }

  /**
   * Write generated content to files
   * @param {Object} results - Results from generate methods
   * @returns {Promise<string[]>} Written file paths
   */
  async writeFiles(results) {
    const written = [];

    for (const [key, result] of Object.entries(results)) {
      if (result.outputPath && result.content) {
        // Ensure directory exists
        await fs.mkdir(path.dirname(result.outputPath), { recursive: true });

        // Write file
        await fs.writeFile(result.outputPath, result.content, 'utf-8');
        written.push(result.outputPath);
      } else if (result.manifest) {
        // Handle manifest object
        await fs.mkdir(path.dirname(result.outputPath), { recursive: true });
        await fs.writeFile(
          result.outputPath,
          JSON.stringify(result.manifest, null, 2),
          'utf-8'
        );
        written.push(result.outputPath);
      }
    }

    return written;
  }

  /**
   * Get type-specific default values
   * @param {string} type - Protocol type
   * @param {Object} config - User config
   * @returns {Object} Default values
   */
  getTypeSpecificDefaults(type, config) {
    const defaults = {
      api: {
        baseUrl: config.baseUrl || 'https://api.example.com',
        authentication: config.authentication || 'bearer',
        endpoint_path: config.endpoint_path || '/v1/resource',
        endpoint_method: config.endpoint_method || 'GET',
        endpoint_description: config.endpoint_description || 'Main API endpoint'
      },
      data: {
        format: config.format || 'json',
        compression: config.compression || 'none'
      },
      event: {
        transport: config.transport || 'websocket',
        event_name: config.event_name || 'data.updated',
        event_description: config.event_description || 'Data update event'
      },
      semantic: {
        vocabulary: config.vocabulary || 'http://schema.org/',
        ontology: config.ontology || 'custom'
      }
    };

    return defaults[type] || {};
  }

  /**
   * Convert string to PascalCase
   * @param {string} str - Input string
   * @returns {string} PascalCase string
   */
  toPascalCase(str) {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^(.)/, (_, c) => c.toUpperCase());
  }

  /**
   * Convert string to kebab-case
   * @param {string} str - Input string
   * @returns {string} kebab-case string
   */
  toKebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * List available protocol types
   * @returns {string[]} Available types
   */
  getAvailableTypes() {
    return ['api', 'data', 'event', 'semantic'];
  }

  /**
   * Validate configuration
   * @param {string} type - Protocol type
   * @param {Object} config - Configuration
   * @returns {Object} Validation result
   */
  validateConfig(type, config) {
    const errors = [];

    if (!this.getAvailableTypes().includes(type)) {
      errors.push(`Invalid type: ${type}`);
    }

    if (config.name && !/^[a-zA-Z0-9-_]+$/.test(config.name)) {
      errors.push('Name must contain only alphanumeric characters, hyphens, and underscores');
    }

    if (config.version && !/^\d+\.\d+\.\d+$/.test(config.version)) {
      errors.push('Version must follow semver format (e.g., 1.0.0)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default ProtocolScaffolder;
