const IpSafe = require('../lib/ipsafe');
const fs = require('fs');

jest.mock('fs');
jest.mock('child_process');

// Capture console output
let consoleOutput;
let consoleErrors;
let processExitCode;

// Save originals
const originalArgv = process.argv;
const originalExit = process.exit;

beforeEach(() => {
  consoleOutput = [];
  consoleErrors = [];
  processExitCode = null;

  jest.spyOn(console, 'log').mockImplementation((...args) => consoleOutput.push(args.join(' ')));
  jest.spyOn(console, 'error').mockImplementation((...args) => consoleErrors.push(args.join(' ')));
  process.exit = jest.fn((code) => { processExitCode = code; });

  jest.clearAllMocks();
  // Reset module cache so bin/ipsafe.js runs fresh
  jest.resetModules();
});

afterEach(() => {
  process.argv = originalArgv;
  process.exit = originalExit;
  jest.restoreAllMocks();
});

describe('bin/ipsafe CLI', () => {
  describe('--help', () => {
    it('should show help text', async () => {
      process.argv = ['node', 'ipsafe', '--help'];
      // We need to handle the async main() call
      await jest.isolateModulesAsync(async () => {
        // Need to mock fs before requiring
        jest.mock('fs');
        require('../bin/ipsafe.js');
        // Wait for async main to finish
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const output = consoleOutput.join('\n');
      expect(output).toContain('ipsafe');
      expect(output).toContain('Usage:');
    });

    it('should show help with -h flag', async () => {
      process.argv = ['node', 'ipsafe', '-h'];
      await jest.isolateModulesAsync(async () => {
        jest.mock('fs');
        require('../bin/ipsafe.js');
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const output = consoleOutput.join('\n');
      expect(output).toContain('ipsafe');
    });
  });

  describe('no arguments', () => {
    it('should show help and exit with code 1', async () => {
      process.argv = ['node', 'ipsafe'];
      await jest.isolateModulesAsync(async () => {
        jest.mock('fs');
        require('../bin/ipsafe.js');
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const output = consoleOutput.join('\n');
      expect(output).toContain('ipsafe');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('--config', () => {
    it('should show configuration info', async () => {
      process.argv = ['node', 'ipsafe', '--config'];
      await jest.isolateModulesAsync(async () => {
        const mockFs = require('fs');
        mockFs.existsSync = jest.fn().mockReturnValue(false);
        require('../bin/ipsafe.js');
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const output = consoleOutput.join('\n');
      expect(output).toContain('Configuration');
    });
  });

  describe('--config-path', () => {
    it('should print global config path', async () => {
      process.argv = ['node', 'ipsafe', '--config-path'];
      await jest.isolateModulesAsync(async () => {
        jest.mock('fs');
        require('../bin/ipsafe.js');
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const output = consoleOutput.join('\n');
      expect(output).toContain('ipsafe');
    });
  });

  describe('--init', () => {
    it('should create global config successfully', async () => {
      process.argv = ['node', 'ipsafe', '--init'];
      await jest.isolateModulesAsync(async () => {
        const mockFs = require('fs');
        mockFs.existsSync = jest.fn().mockReturnValue(false);
        mockFs.mkdirSync = jest.fn();
        mockFs.writeFileSync = jest.fn();
        require('../bin/ipsafe.js');
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const output = consoleOutput.join('\n');
      expect(output).toContain('Global config created');
    });

    it('should handle error when config already exists', async () => {
      process.argv = ['node', 'ipsafe', '--init'];
      await jest.isolateModulesAsync(async () => {
        const mockFs = require('fs');
        mockFs.existsSync = jest.fn().mockReturnValue(true);
        require('../bin/ipsafe.js');
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const errors = consoleErrors.join('\n');
      expect(errors).toContain('Config already exists');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('command execution', () => {
    it('should execute command after successful network check', async () => {
      process.argv = ['node', 'ipsafe', 'echo', 'test'];

      await jest.isolateModulesAsync(async () => {
        const mockFs = require('fs');
        mockFs.existsSync = jest.fn().mockReturnValue(false);

        // Mock the IpSafe prototype methods
        const MockIpSafe = require('../lib/ipsafe');
        jest.spyOn(MockIpSafe.prototype, 'checkNetworkWithRetries').mockResolvedValue(true);
        jest.spyOn(MockIpSafe.prototype, 'executeCommand').mockResolvedValue({
          stdout: 'test output',
          stderr: '',
          exitCode: 0
        });

        require('../bin/ipsafe.js');
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const output = consoleOutput.join('\n');
      expect(output).toContain('Checking network connectivity');
      expect(output).toContain('Network connectivity verified');
      expect(output).toContain('Command completed successfully');
    });

    it('should handle network failure', async () => {
      process.argv = ['node', 'ipsafe', 'echo', 'test'];

      await jest.isolateModulesAsync(async () => {
        const mockFs = require('fs');
        mockFs.existsSync = jest.fn().mockReturnValue(false);

        const MockIpSafe = require('../lib/ipsafe');
        jest.spyOn(MockIpSafe.prototype, 'checkNetworkWithRetries').mockRejectedValue(new Error('Request timeout after 3000ms'));

        require('../bin/ipsafe.js');
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const errors = consoleErrors.join('\n');
      expect(errors).toContain('Network connectivity failed');
      expect(errors).toContain('Command not executed for safety');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle command execution failure', async () => {
      process.argv = ['node', 'ipsafe', 'bad_cmd'];

      await jest.isolateModulesAsync(async () => {
        const mockFs = require('fs');
        mockFs.existsSync = jest.fn().mockReturnValue(false);

        const MockIpSafe = require('../lib/ipsafe');
        jest.spyOn(MockIpSafe.prototype, 'checkNetworkWithRetries').mockResolvedValue(true);
        jest.spyOn(MockIpSafe.prototype, 'executeCommand').mockRejectedValue(new Error('Command failed with exit code 127'));

        require('../bin/ipsafe.js');
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const errors = consoleErrors.join('\n');
      expect(errors).toContain('Command execution failed');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
