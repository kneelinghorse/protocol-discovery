/**
 * CLI Scaffold Command
 * Generate protocol manifests, importers, and tests from templates
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import { execFile as _execFile } from 'child_process';
import { promisify } from 'util';
import { TemplateEngine } from '../../generators/scaffold/engine.js';
import { ProtocolScaffolder } from '../../generators/scaffold/protocol-scaffolder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFile = promisify(_execFile);

/**
 * Validate protocol name
 * @param {string} name - Protocol name to validate
 * @returns {boolean|string} true if valid, error message otherwise
 */
function validateName(name) {
  if (!name || name.trim().length === 0) {
    return 'Name is required';
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    return 'Name must start with a letter and contain only letters, numbers, hyphens, and underscores';
  }
  if (name.length > 50) {
    return 'Name must be 50 characters or less';
  }
  return true;
}

/**
 * Check git working tree status and warn if uncommitted changes
 * @param {string} cwd - Directory to run git commands in
 * @returns {Promise<{dirty: boolean, summary?: string}>}
 */
async function checkGitStatus(cwd) {
  try {
    // Ensure we're inside a git repo
    await execFile('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    const { stdout } = await execFile('git', ['status', '--porcelain'], { cwd });
    const dirty = stdout.trim().length > 0;
    return {
      dirty,
      summary: dirty ? stdout.trim().split('\n').slice(0, 10).join('\n') : undefined
    };
  } catch {
    // Not a git repo or git not available; treat as clean
    return { dirty: false };
  }
}

/**
 * Check if files already exist at output path
 * @param {string} outputDir - Output directory
 * @param {string} name - Protocol name
 * @param {string} type - Protocol type
 * @returns {Promise<{exists: boolean, files: string[]}>}
 */
async function checkExistingFiles(outputDir, name, type) {
  const kebabName = name.toLowerCase().replace(/[_\s]+/g, '-');
  const potentialFiles = [];

  if (['api', 'data', 'event', 'semantic'].includes(type)) {
    potentialFiles.push(
      path.join(outputDir, `${kebabName}-protocol.json`),
      path.join(outputDir, `${kebabName}-importer.js`),
      path.join(outputDir, `${kebabName}-importer.test.js`)
    );
  } else if (type === 'importer') {
    potentialFiles.push(
      path.join(outputDir, `${kebabName}-importer.js`),
      path.join(outputDir, `${kebabName}-importer.test.js`)
    );
  } else if (type === 'test') {
    potentialFiles.push(
      path.join(outputDir, `${kebabName}.test.js`)
    );
  }

  const existingFiles = [];
  for (const file of potentialFiles) {
    try {
      await fs.access(file);
      existingFiles.push(file);
    } catch {
      // File doesn't exist, which is fine
    }
  }

  return {
    exists: existingFiles.length > 0,
    files: existingFiles
  };
}

/**
 * Check directory permissions
 * @param {string} dir - Directory to check
 * @returns {Promise<{writable: boolean, error?: string}>}
 */
async function checkDirectoryPermissions(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
    // Try to write a test file
    const testFile = path.join(dir, '.write-test');
    await fs.writeFile(testFile, '');
    await fs.unlink(testFile);
    return { writable: true };
  } catch (error) {
    return {
      writable: false,
      error: error.message
    };
  }
}

/**
 * Run interactive prompts to gather scaffold configuration
 * @returns {Promise<object>} Scaffold configuration
 */
async function runInteractivePrompts() {
  console.log('🏗️  Interactive Protocol Scaffolder');
  console.log('─'.repeat(50));
  console.log('Answer the following questions to generate your protocol:\n');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'What type of protocol do you want to create?',
      choices: [
        { name: 'API Protocol - REST/HTTP service', value: 'api' },
        { name: 'Data Protocol - File format or data structure', value: 'data' },
        { name: 'Event Protocol - Event/messaging system', value: 'event' },
        { name: 'Semantic Protocol - Ontology/vocabulary', value: 'semantic' },
        { name: 'Importer Only - Standalone importer class', value: 'importer' },
        { name: 'Test Only - Test scaffold', value: 'test' }
      ]
    },
    {
      type: 'input',
      name: 'name',
      message: 'Protocol name:',
      validate: validateName
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description (optional):',
      default: (answers) => `Generated ${answers.type} protocol for ${answers.name}`
    },
    {
      type: 'input',
      name: 'version',
      message: 'Version:',
      default: '1.0.0'
    },
    {
      type: 'input',
      name: 'output',
      message: 'Output directory:',
      default: './artifacts/scaffolds'
    },
    {
      type: 'confirm',
      name: 'includeImporter',
      message: 'Include importer?',
      default: true,
      when: (answers) => ['api', 'data', 'event', 'semantic'].includes(answers.type)
    },
    {
      type: 'confirm',
      name: 'includeTests',
      message: 'Include tests?',
      default: true,
      when: (answers) => answers.type !== 'test'
    }
  ]);

  return answers;
}

/**
 * Display preview of files to be generated
 * @param {object} results - Generation results
 * @param {string} outputDir - Output directory
 */
function displayPreview(results, outputDir) {
  console.log('\n📄 Files to be generated:');
  console.log('─'.repeat(50));

  for (const [key, result] of Object.entries(results)) {
    if (result.outputPath) {
      const relativePath = path.relative(process.cwd(), result.outputPath);
      const size = Buffer.byteLength(result.content, 'utf8');
      console.log(`  ✓ ${relativePath} (${size} bytes)`);
    }
  }

  console.log('─'.repeat(50));
  console.log(`Output directory: ${path.resolve(outputDir)}`);
}

/**
 * Execute scaffold command
 * @param {object} args - Command arguments
 * @param {string} args.type - Protocol type (api, data, event, semantic, importer, test)
 * @param {string} args.name - Component name
 * @param {string} args.output - Output directory (default: ./artifacts/scaffolds)
 * @param {string} args.version - Version (default: 1.0.0)
 * @param {string} args.description - Description
 * @param {boolean} args.write - Write files to disk (default: false, requires confirmation)
 * @param {boolean} args.dryRun - Preview mode without writing (default: true for interactive)
 * @param {boolean} args.interactive - Run in interactive mode (default: true if no args)
 * @param {boolean} args.includeImporter - Include importer (default: true for protocols)
 * @param {boolean} args.includeTests - Include tests (default: true)
 * @param {boolean} args.examples - Show examples and exit
 * @param {boolean} args.force - Skip file existence checks
 */
export async function executeScaffoldCommand(args = {}) {
  // Handle examples flag
  if (args.examples) {
    return showScaffoldExamples();
  }

  // Determine if we should run in interactive mode
  const isInteractive = args.interactive !== false && !args.type && !args.name;

  let config;
  if (isInteractive) {
    // Run interactive prompts
    config = await runInteractivePrompts();
  } else {
    // Use provided arguments
    config = {
      type: args.type,
      name: args.name,
      output: args.output || './artifacts/scaffolds',
      version: args.version || '1.0.0',
      description: args.description,
      includeImporter: args.includeImporter !== false,
      includeTests: args.includeTests !== false,
      ...args
    };

    // Validate required arguments for non-interactive mode
    if (!config.type) {
      throw new Error('--type is required (api, data, event, semantic, importer, test)\nUse --examples to see usage examples or run without arguments for interactive mode');
    }

    if (!config.name) {
      throw new Error('--name is required\nUse --examples to see usage examples or run without arguments for interactive mode');
    }

    // Validate name
    const nameValidation = validateName(config.name);
    if (nameValidation !== true) {
      throw new Error(`Invalid name: ${nameValidation}`);
    }
  }

  const {
    type,
    name,
    output,
    version,
    description,
    write,
    dryRun,
    includeImporter,
    includeTests,
    force,
    ...extraConfig
  } = config;

  // Resolve output relative to app dir if path is not absolute
  const resolvedOutput = path.isAbsolute(output)
    ? output
    : path.join(__dirname, '../../', output);

  // Check directory permissions
  const permCheck = await checkDirectoryPermissions(resolvedOutput);
  if (!permCheck.writable) {
    throw new Error(`Cannot write to directory: ${resolvedOutput}\n${permCheck.error}`);
  }

  // Git status awareness (warn if uncommitted changes)
  try {
    const git = await checkGitStatus(process.cwd());
    if (git.dirty) {
      console.log('\n⚠️  Git: Uncommitted changes detected');
      if (git.summary) {
        console.log(git.summary.split('\n').map(l => `  ${l}`).join('\n'));
      }
      if (isInteractive) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Continue despite uncommitted changes?',
            default: true
          }
        ]);
        if (!proceed) {
          console.log('\n❌ Scaffold cancelled');
          return null;
        }
      } else {
        console.log('Proceeding. Use git commit or stash to clean working tree.');
      }
    }
  } catch {
    // Ignore git errors
  }

  // Check for existing files (unless --force is used)
  if (!force) {
    const existingCheck = await checkExistingFiles(resolvedOutput, name, type);
    if (existingCheck.exists) {
      console.log('\n⚠️  Warning: The following files already exist:');
      existingCheck.files.forEach(file => {
        console.log(`  - ${path.relative(process.cwd(), file)}`);
      });

      if (isInteractive) {
        const { overwrite } = await inquirer.prompt([{
          type: 'confirm',
          name: 'overwrite',
          message: 'Overwrite existing files?',
          default: false
        }]);

        if (!overwrite) {
          console.log('\n❌ Scaffold cancelled');
          return null;
        }
      } else {
        console.log('\nUse --force to overwrite existing files');
        throw new Error('Files already exist');
      }
    }
  }

  console.log('\n🏗️  Protocol Scaffolder');
  console.log('─'.repeat(50));
  console.log(`Type: ${type}`);
  console.log(`Name: ${name}`);
  console.log(`Output: ${output}`);
  console.log('─'.repeat(50));

  // Initialize engine and scaffolder
  const templateDir = path.join(__dirname, '../../templates');
  const engine = new TemplateEngine(templateDir);
  const scaffolder = new ProtocolScaffolder(engine, { outputDir: resolvedOutput });

  const startTime = Date.now();
  let results;

  try {
    // Handle different scaffold types
    switch (type) {
      case 'api':
      case 'data':
      case 'event':
      case 'semantic':
        // Generate full protocol package
        const config = {
          name,
          version,
          description: description || `Generated ${type} protocol for ${name}`,
          includeImporter,
          includeTests,
          ...extraConfig
        };

        // Validate config
        const validation = scaffolder.validateConfig(type, config);
        if (!validation.valid) {
          console.error('\n❌ Configuration errors:');
          validation.errors.forEach(err => console.error(`  - ${err}`));
          throw new Error('Invalid configuration');
        }

        results = await scaffolder.generateProtocol(type, config);
        break;

      case 'importer':
        // Generate standalone importer
        results = {
          importer: await scaffolder.generateImporter(name, {
            type: extraConfig.protocolType || 'api',
            ...extraConfig
          })
        };
        if (includeTests) {
          results.tests = await scaffolder.generateTests(name, {
            className: results.importer.className,
            filename: scaffolder.toKebabCase(name) + '-importer'
          });
        }
        break;

      case 'test':
        // Generate standalone test
        results = {
          tests: await scaffolder.generateTests(name, extraConfig)
        };
        break;

      default:
        throw new Error(`Unknown scaffold type: ${type}. Use: api, data, event, semantic, importer, test`);
    }

    const duration = Date.now() - startTime;

    // Display preview
    displayPreview(results, resolvedOutput);

    // Determine if we should write files
    let shouldWrite = write !== false; // default true unless explicitly false

    // If dryRun is set, do not write and do not prompt
    if (dryRun === true) {
      shouldWrite = false;
    } else if (isInteractive && write !== true) {
      // In interactive mode, confirm before writing (unless explicitly forced)
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Create these files?',
          default: true
        }
      ]);
      shouldWrite = confirm;
    } else if (write === false) {
      shouldWrite = false;
    }

    // Write files if confirmed
    if (shouldWrite) {
      console.log('\n💾 Writing files...');
      const written = await scaffolder.writeFiles(results);
      console.log(`✅ Wrote ${written.length} file(s)`);

      // Show where files were written
      console.log('\n📁 Output directory:');
      console.log(`  ${path.resolve(resolvedOutput)}`);
    } else {
      console.log('\n⚠️  Preview only - files not written');
      return results;
    }

    // Count files
    let fileCount = 0;
    for (const [key, result] of Object.entries(results)) {
      if (result.outputPath) {
        fileCount++;
      }
    }

    // Summary
    console.log('\n✅ Scaffold Complete');
    console.log('─'.repeat(50));
    console.log(`Files: ${fileCount}`);
    console.log(`Duration: ${duration}ms`);
    console.log('─'.repeat(50));

    // Show next steps
    console.log('\n📋 Next Steps:');
    if (results.manifest) {
      console.log('  1. Review and customize the generated manifest');
    }
    if (results.importer) {
      console.log('  2. Implement the detection and import logic in the importer');
    }
    if (results.tests) {
      console.log('  3. Add test cases to the generated test file');
    }
    console.log('  4. Run tests: npm test');

    return results;

  } catch (error) {
    console.error('\n❌ Scaffold failed:', error.message);
    throw error;
  }
}

/**
 * List available scaffold types
 */
export async function listScaffoldTypes() {
  console.log('Available scaffold types:');
  console.log('  api        - API protocol manifest');
  console.log('  data       - Data format protocol manifest');
  console.log('  event      - Event/messaging protocol manifest');
  console.log('  semantic   - Semantic/ontology protocol manifest');
  console.log('  importer   - Protocol importer class');
  console.log('  test       - Test scaffold');
}

/**
 * Show scaffold examples
 */
export async function showScaffoldExamples() {
  console.log('🏗️  Protocol Scaffolder - Examples\n');
  console.log('─'.repeat(50));

  console.log('\n📋 Interactive Mode (Recommended):');
  console.log('  npm --prefix app run cli scaffold');
  console.log('  (No arguments - will prompt for all options)\n');

  console.log('─'.repeat(50));
  console.log('\n📝 Non-Interactive Examples:\n');

  console.log('Generate API protocol:');
  console.log('  npm --prefix app run cli scaffold -- --type api --name MyService --baseUrl https://api.example.com\n');

  console.log('Generate data protocol:');
  console.log('  npm --prefix app run cli scaffold -- --type data --name LogFormat --format json\n');

  console.log('Generate event protocol:');
  console.log('  npm --prefix app run cli scaffold -- --type event --name Notifications --transport websocket\n');

  console.log('Generate semantic protocol:');
  console.log('  npm --prefix app run cli scaffold -- --type semantic --name Vocabulary --vocab schema.org\n');

  console.log('Generate standalone importer:');
  console.log('  npm --prefix app run cli scaffold -- --type importer --name CustomFormat\n');

  console.log('Generate test only:');
  console.log('  npm --prefix app run cli scaffold -- --type test --name MyComponent\n');

  console.log('─'.repeat(50));
  console.log('\n🔧 Options:\n');
  console.log('  --type          Protocol type (api, data, event, semantic, importer, test)');
  console.log('  --name          Component name');
  console.log('  --description   Description (optional)');
  console.log('  --version       Version (default: 1.0.0)');
  console.log('  --output        Output directory (default: ./artifacts/scaffolds)');
  console.log('  --dry-run       Preview without writing files');
  console.log('  --force         Overwrite existing files without prompting');
  console.log('  --examples      Show this help message\n');

  console.log('─'.repeat(50));
  console.log('\n💡 Tips:\n');
  console.log('  • Run without arguments for interactive mode');
  console.log('  • Use --dry-run to preview generated files');
  console.log('  • Files are previewed before writing in interactive mode');
  console.log('  • Existing files will be detected and you\'ll be prompted to overwrite\n');
}

export default { executeScaffoldCommand, listScaffoldTypes, showScaffoldExamples };
