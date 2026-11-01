#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const patchDir = path.join(__dirname, '..', 'patches');
if (!fs.existsSync(patchDir)) {
  process.exit(0);
}

const patchPackageBin = require.resolve('patch-package/index.js');

execFileSync(process.execPath, [patchPackageBin], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});
