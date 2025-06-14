#!/usr/bin/env node

const IpSafe = require('../lib/ipsafe');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Helper functions for colored output
const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`;
const success = (text) => colorize(text, 'green');
const error = (text) => colorize(text, 'red');
const info = (text) => colorize(text, 'cyan');
const warning = (text) => colorize(text, 'yellow');
const dim = (text) => colorize(text, 'gray');

function showHelp() {
  console.log(`🛡️  ${info('ipsafe')} - Network safety CLI`);
  console.log('');
  console.log(`${colorize('Usage:', 'bright')}`);
  console.log(`  ipsafe <command>           ${dim('Execute command after network check')}`);
  console.log(`  ipsafe --init              ${dim('Create global configuration')}`);
  console.log(`  ipsafe --config            ${dim('Show current configuration')}`);
  console.log(`  ipsafe --config-path       ${dim('Show global config file path')}`);
  console.log(`  ipsafe --help              ${dim('Show this help')}`);
  console.log('');
  console.log(`${colorize('Examples:', 'bright')}`);
  console.log(`  ipsafe "npm install"       ${dim('Safe npm install')}`);
  console.log(`  ipsafe "ping -c 3 google.com"  ${dim('Safe ping with streaming')}`);
  console.log(`  ipsafe --init              ${dim('Setup global config')}`);
}

async function handleInit(args) {
  const ipSafe = new IpSafe();
  const force = args.includes('--force');
  
  try {
    const configPath = await ipSafe.initGlobalConfig({ force });
    console.log(`✅ ${success('Global config created at:')} ${configPath}`);
    console.log(`💡 ${dim('Edit this file to customize your network checks')}`);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}

function handleConfigInfo() {
  const ipSafe = new IpSafe();
  const configInfo = ipSafe.showConfigInfo();
  
  console.log(`🛡️  ${info('ipsafe Configuration')}`);
  console.log('');
  
  if (configInfo.activeConfigPath) {
    console.log(`📂 ${success('Active config:')} ${configInfo.activeConfigPath}`);
  } else {
    console.log(`📂 ${warning('No config found, using defaults')}`);
  }
  
  console.log(`🏠 ${dim('Global config path:')} ${configInfo.globalPath}`);
  console.log('');
  
  console.log(`⚙️  ${colorize('Current settings:', 'bright')}`);
  console.log(JSON.stringify(configInfo.currentConfig, null, 2));
  console.log('');
  
  console.log(`🔍 ${dim('Config search order:')}`);
  configInfo.searchPaths.forEach((path, index) => {
    const exists = require('fs').existsSync(path);
    const status = exists ? success('✓') : dim('✗');
    console.log(`  ${index + 1}. ${status} ${path}`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    process.exit(1);
  }

  // Handle config commands
  if (args[0] === '--init') {
    await handleInit(args.slice(1));
    return;
  }
  
  if (args[0] === '--config') {
    handleConfigInfo();
    return;
  }
  
  if (args[0] === '--config-path') {
    const ipSafe = new IpSafe();
    console.log(ipSafe.getGlobalConfigPath());
    return;
  }

  if (args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  const ipSafe = new IpSafe();
  const config = ipSafe.loadConfig();
  const command = args.join(' ');

  console.log(`🔍 ${info('Checking network connectivity to')} ${dim(config.testUrl)}...`);

  try {
    console.log(`✅ ${success('Network connectivity verified')}`);
    console.log(`🚀 ${info('Executing:')} ${colorize(command, 'bright')}`);
    console.log(''); // Add blank line before command output
    
    await ipSafe.run(args);
    console.log(`\n✨ ${success('Command completed successfully')}`);
  } catch (err) {
    console.error(`❌ ${error('Network connectivity failed:')} ${err.message}`);
    console.error(`🚫 ${warning('Command not executed for safety')}`);
    process.exit(1);
  }
}

main();