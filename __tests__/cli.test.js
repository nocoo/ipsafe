const fs = require('fs');
const childProcess = require('child_process');
const IpSafe = require('../lib/ipsafe');

const BIN_PATH = require.resolve('../bin/ipsafe.js');

let consoleOutput;
let consoleErrors;

const originalArgv = process.argv;
const originalExit = process.exit;

async function runBin() {
  delete require.cache[BIN_PATH];
  await import(BIN_PATH + '?t=' + Date.now() + '_' + Math.random());
  await new Promise(resolve => setTimeout(resolve, 200));
}

beforeEach(() => {
  consoleOutput = [];
  consoleErrors = [];

  vi.spyOn(console, 'log').mockImplementation((...args) => consoleOutput.push(args.join(' ')));
  vi.spyOn(console, 'error').mockImplementation((...args) => consoleErrors.push(args.join(' ')));
  process.exit = vi.fn();

  vi.spyOn(fs, 'existsSync').mockReturnValue(false);
  vi.spyOn(fs, 'readFileSync').mockReturnValue('');
  vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
  vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  vi.spyOn(childProcess, 'spawn').mockImplementation(() => ({
    stdout: { on: () => {} },
    stderr: { on: () => {} },
    on: () => {},
    kill: () => {},
  }));
});

afterEach(() => {
  process.argv = originalArgv;
  process.exit = originalExit;
  vi.restoreAllMocks();
});

describe('bin/ipsafe CLI', () => {
  describe('--help', () => {
    it('should show help text', async () => {
      process.argv = ['node', 'ipsafe', '--help'];
      await runBin();

      const output = consoleOutput.join('\n');
      expect(output).toContain('ipsafe');
      expect(output).toContain('Usage:');
    });

    it('should show help with -h flag', async () => {
      process.argv = ['node', 'ipsafe', '-h'];
      await runBin();

      const output = consoleOutput.join('\n');
      expect(output).toContain('ipsafe');
    });
  });

  describe('no arguments', () => {
    it('should show help and exit with code 1', async () => {
      process.argv = ['node', 'ipsafe'];
      await runBin();

      const output = consoleOutput.join('\n');
      expect(output).toContain('ipsafe');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('--config', () => {
    it('should show configuration info', async () => {
      process.argv = ['node', 'ipsafe', '--config'];
      await runBin();

      const output = consoleOutput.join('\n');
      expect(output).toContain('Configuration');
    });

    it('should show no-config message when no config file exists', async () => {
      process.argv = ['node', 'ipsafe', '--config'];
      vi.spyOn(IpSafe.prototype, 'showConfigInfo').mockReturnValue({
        searchPaths: ['/tmp/a.json'],
        globalPath: '/tmp/g.json',
        currentConfig: {},
        activeConfigPath: null
      });
      await runBin();

      const output = consoleOutput.join('\n');
      expect(output).toContain('No config found');
    });
  });

  describe('--config-path', () => {
    it('should print global config path', async () => {
      process.argv = ['node', 'ipsafe', '--config-path'];
      await runBin();

      const output = consoleOutput.join('\n');
      expect(output).toContain('ipsafe');
    });
  });

  describe('--init', () => {
    it('should create global config successfully', async () => {
      process.argv = ['node', 'ipsafe', '--init'];
      await runBin();

      const output = consoleOutput.join('\n');
      expect(output).toContain('Global config created');
    });

    it('should handle error when config already exists', async () => {
      process.argv = ['node', 'ipsafe', '--init'];
      fs.existsSync.mockReturnValue(true);
      await runBin();

      const errors = consoleErrors.join('\n');
      expect(errors).toContain('Config already exists');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('command execution', () => {
    it('should execute command after successful network check', async () => {
      process.argv = ['node', 'ipsafe', 'echo', 'test'];
      vi.spyOn(IpSafe.prototype, 'checkNetworkWithRetries').mockResolvedValue(true);
      vi.spyOn(IpSafe.prototype, 'executeCommand').mockResolvedValue({
        stdout: 'test output',
        stderr: '',
        exitCode: 0
      });
      await runBin();

      const output = consoleOutput.join('\n');
      expect(output).toContain('Checking network connectivity');
      expect(output).toContain('Network connectivity verified');
      expect(output).toContain('Command completed successfully');
    });

    it('should handle network failure', async () => {
      process.argv = ['node', 'ipsafe', 'echo', 'test'];
      vi.spyOn(IpSafe.prototype, 'checkNetworkWithRetries').mockRejectedValue(new Error('Request timeout after 3000ms'));
      await runBin();

      const errors = consoleErrors.join('\n');
      expect(errors).toContain('Network connectivity failed');
      expect(errors).toContain('Command not executed for safety');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle command execution failure', async () => {
      process.argv = ['node', 'ipsafe', 'bad_cmd'];
      vi.spyOn(IpSafe.prototype, 'checkNetworkWithRetries').mockResolvedValue(true);
      vi.spyOn(IpSafe.prototype, 'executeCommand').mockRejectedValue(new Error('Command failed with exit code 127'));
      await runBin();

      const errors = consoleErrors.join('\n');
      expect(errors).toContain('Command execution failed');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
