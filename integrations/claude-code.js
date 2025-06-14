#!/usr/bin/env node

const { checkNetworkSafe } = require('../index');

/**
 * CLI integration for tools like Claude Code
 * Usage: node claude-code.js [config-path]
 * Exit codes: 0 = safe, 1 = unsafe, 2 = error
 */
async function main() {
  const configPath = process.argv[2] || null;
  
  try {
    const isSafe = await checkNetworkSafe(configPath);
    
    if (isSafe) {
      console.log('SAFE');
      process.exit(0);
    } else {
      console.log('UNSAFE');
      process.exit(1);
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };