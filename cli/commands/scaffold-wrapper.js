/**
 * CommonJS wrapper for ESM scaffold command
 */

async function executeScaffoldCommand(args) {
  const { executeScaffoldCommand: esmExecute } = await import('./scaffold.js');
  return esmExecute(args);
}

async function listScaffoldTypes() {
  const { listScaffoldTypes: esmList } = await import('./scaffold.js');
  return esmList();
}

async function showScaffoldExamples() {
  const { showScaffoldExamples: esmShow } = await import('./scaffold.js');
  return esmShow();
}

module.exports = {
  executeScaffoldCommand,
  listScaffoldTypes,
  showScaffoldExamples
};
