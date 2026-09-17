#!/usr/bin/env node

const { checkNetworkSafe } = require('../index');

/**
 * CLI integration for tools like Claude Code
 * Usage: node claude-code.js [config-path]
 * Exit codes: 0 = safe, 1 = unsafe
 */
async function main() {
  const configPath = process.argv[2] || null;
  const isSafe = await checkNetworkSafe(configPath);
  console.log(isSafe ? 'SAFE' : 'UNSAFE');
  process.exit(isSafe ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { main };
