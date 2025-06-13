#!/usr/bin/env node

const IpSafe = require('../lib/ipsafe');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: ipsafe <command>');
    console.log('Example: ipsafe "npm install"');
    process.exit(1);
  }

  const ipSafe = new IpSafe();
  const config = ipSafe.loadConfig();
  const command = args.join(' ');

  console.log(`Checking network connectivity to ${config.testUrl}...`);

  try {
    const result = await ipSafe.run(args);
    console.log('✓ Network connectivity verified');
    console.log(`Executing: ${command}`);
    
    if (result.stdout) {
      console.log(result.stdout);
    }
    if (result.stderr) {
      console.error(result.stderr);
    }
  } catch (error) {
    console.error(`✗ Network connectivity failed: ${error.message}`);
    console.error('Command not executed for safety');
    process.exit(1);
  }
}

main();