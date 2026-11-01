#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

try {
  require.resolve('husky');
} catch {
  process.exit(0);
}

const result = spawnSync('husky', { stdio: 'inherit', shell: true });
process.exit(result.status === null ? 1 : result.status);
