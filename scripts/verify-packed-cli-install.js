#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ipsafe-packed-install-'));

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    stdio: 'pipe',
    ...options,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`${cmd} ${args.join(' ')} failed with status ${result.status}`);
  }
  return result;
}

try {
  const packDir = path.join(tmpRoot, 'pack');
  fs.mkdirSync(packDir);
  run('npm', ['pack', '--ignore-scripts', '--pack-destination', packDir], { cwd: repoRoot });
  const tarball = fs.readdirSync(packDir).find((name) => name.endsWith('.tgz'));
  if (!tarball) {
    throw new Error('npm pack did not produce a tarball');
  }

  const installDir = path.join(tmpRoot, 'install');
  fs.mkdirSync(installDir);
  run('npm', ['install', path.join(packDir, tarball)], {
    cwd: installDir,
    env: { ...process.env, npm_config_ignore_scripts: 'false' },
  });

  const cliPath = path.join(installDir, 'node_modules', 'ipsafe', 'bin', 'ipsafe.js');
  if (!fs.existsSync(cliPath)) {
    throw new Error(`packed install missing CLI at ${cliPath}`);
  }

  run(process.execPath, [cliPath, '--help'], { cwd: installDir });
  process.stdout.write('verify-packed-cli-install: ok\n');
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
