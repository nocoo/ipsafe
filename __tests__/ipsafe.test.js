const IpSafe = require('../lib/ipsafe');
const fs = require('fs');
const path = require('path');
const os = require('os');
const pkg = require('../package.json');

const childProcess = require('child_process');

describe('IpSafe', () => {
  let ipSafe;
  const mockConfigPath = '/test/config.json';

  beforeEach(() => {
    ipSafe = new IpSafe(mockConfigPath);
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('');
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    vi.spyOn(childProcess, 'spawn').mockImplementation(() => {
      throw new Error('spawn not configured for this test');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config paths', () => {
      const defaultIpSafe = new IpSafe();
      expect(defaultIpSafe.configPaths).toContain(path.join(process.cwd(), 'ipsafe.config.json'));
    });

    it('should initialize with custom config path', () => {
      expect(ipSafe.configPaths).toEqual([mockConfigPath]);
    });

    it('should have correct default config values', () => {
      expect(ipSafe.defaultConfig).toEqual({
        testUrl: 'https://www.google.com',
        timeout: 3000,
        retries: 1,
        method: 'GET',
        userAgent: `ipsafe/${pkg.version}`,
        checkContent: false,
        searchText: null,
        searchType: 'contains',
        headers: {},
        commandTimeout: 0
      });
    });
  });

  describe('getConfigPaths', () => {
    it('should include cwd config as first path', () => {
      const defaultIpSafe = new IpSafe();
      expect(defaultIpSafe.configPaths[0]).toBe(path.join(process.cwd(), 'ipsafe.config.json'));
    });

    it('should include XDG config path on non-Windows', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(os, 'platform');
      vi.spyOn(os, 'platform').mockReturnValue('darwin');

      const defaultIpSafe = new IpSafe();
      const xdgPath = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'ipsafe', 'config.json');
      expect(defaultIpSafe.configPaths).toContainEqual(xdgPath);

      if (originalPlatform) {
        Object.defineProperty(os, 'platform', originalPlatform);
      }
    });

    it('should include home directory config path', () => {
      const defaultIpSafe = new IpSafe();
      const homePath = path.join(os.homedir(), '.ipsafe.json');
      expect(defaultIpSafe.configPaths).toContainEqual(homePath);
    });
  });

  describe('getGlobalConfigPath', () => {
    it('should return XDG config path on non-Windows', () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');
      const expected = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'ipsafe', 'config.json');
      expect(ipSafe.getGlobalConfigPath()).toBe(expected);
    });

    it('should return AppData config path on Windows', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      const homeDir = os.homedir();
      const expected = path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'ipsafe', 'config.json');
      expect(ipSafe.getGlobalConfigPath()).toBe(expected);
    });
  });

  describe('loadConfig', () => {
    it('should return default config when file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const config = ipSafe.loadConfig();

      expect(config).toEqual({
        testUrl: 'https://www.google.com',
        timeout: 3000,
        retries: 1,
        method: 'GET',
        userAgent: `ipsafe/${pkg.version}`,
        checkContent: false,
        searchText: null,
        searchType: 'contains',
        headers: {},
        commandTimeout: 0
      });
    });

    it('should merge custom config with defaults', () => {
      const customConfig = {
        testUrl: 'https://example.com',
        timeout: 3000
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(customConfig));

      const config = ipSafe.loadConfig();

      expect(config).toEqual({
        testUrl: 'https://example.com',
        timeout: 3000,
        retries: 1,
        method: 'GET',
        userAgent: `ipsafe/${pkg.version}`,
        checkContent: false,
        searchText: null,
        searchType: 'contains',
        headers: {},
        commandTimeout: 0
      });
    });

    it('should return default config on JSON parse error', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      const config = ipSafe.loadConfig();

      expect(config).toEqual({
        testUrl: 'https://www.google.com',
        timeout: 3000,
        retries: 1,
        method: 'GET',
        userAgent: `ipsafe/${pkg.version}`,
        checkContent: false,
        searchText: null,
        searchType: 'contains',
        headers: {},
        commandTimeout: 0
      });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should show tip when no config found and showTip is true', () => {
      fs.existsSync.mockReturnValue(false);
      const logSpy = vi.spyOn(console, 'log').mockImplementation();

      ipSafe.loadConfig(true);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Tip:'));
      logSpy.mockRestore();
    });
  });

  describe('initGlobalConfig', () => {
    it('should create config directory and write config file', async () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockReturnValue(undefined);
      fs.writeFileSync.mockReturnValue(undefined);

      const result = await ipSafe.initGlobalConfig();

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(typeof result).toBe('string');
    });

    it('should throw if config exists and force is not set', async () => {
      fs.existsSync.mockReturnValue(true);

      await expect(ipSafe.initGlobalConfig()).rejects.toThrow('Config already exists');
    });

    it('should overwrite config when force is true', async () => {
      fs.existsSync.mockImplementation(() => {
        // Dir exists, file exists
        return true;
      });
      fs.writeFileSync.mockReturnValue(undefined);

      const result = await ipSafe.initGlobalConfig({ force: true });

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(typeof result).toBe('string');
    });

    it('should merge custom options into config', async () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockReturnValue(undefined);
      fs.writeFileSync.mockReturnValue(undefined);

      await ipSafe.initGlobalConfig({ testUrl: 'https://custom.com', force: true });

      const writeCall = fs.writeFileSync.mock.calls[0];
      const written = JSON.parse(writeCall[1]);
      expect(written.testUrl).toBe('https://custom.com');
      expect(written.force).toBeUndefined();
    });
  });

  describe('showConfigInfo', () => {
    it('should return config info with active config path', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{}');

      const info = ipSafe.showConfigInfo();

      expect(info).toHaveProperty('searchPaths');
      expect(info).toHaveProperty('globalPath');
      expect(info).toHaveProperty('currentConfig');
      expect(info.activeConfigPath).toBe(mockConfigPath);
    });

    it('should return null activeConfigPath when no config found', () => {
      fs.existsSync.mockReturnValue(false);

      const info = ipSafe.showConfigInfo();

      expect(info.activeConfigPath).toBeNull();
    });
  });

  describe('checkContent', () => {
    it('should return true when no searchText', () => {
      expect(ipSafe.checkContent('data', { searchText: null })).toBe(true);
    });

    it('should match using contains search (case-insensitive)', () => {
      const config = { searchText: 'hello', searchType: 'contains' };
      expect(ipSafe.checkContent('Say Hello World', config)).toBe(true);
    });

    it('should return false when contains search does not match', () => {
      const config = { searchText: 'missing', searchType: 'contains' };
      expect(ipSafe.checkContent('hello world', config)).toBe(false);
    });

    it('should match using regex search', () => {
      const config = { searchText: '\\d{3}', searchType: 'regex' };
      expect(ipSafe.checkContent('code 200 ok', config)).toBe(true);
    });

    it('should return false when regex does not match', () => {
      const config = { searchText: '\\d{5}', searchType: 'regex' };
      expect(ipSafe.checkContent('code 200 ok', config)).toBe(false);
    });

    it('should throw on invalid regex', () => {
      const config = { searchText: '[invalid', searchType: 'regex' };
      expect(() => ipSafe.checkContent('data', config)).toThrow('Invalid regex pattern');
    });
  });

  describe('checkNetworkWithRetries', () => {
    it('should succeed on first try', async () => {
      vi.spyOn(ipSafe, 'testConnectivity').mockResolvedValue(true);

      const result = await ipSafe.checkNetworkWithRetries({ retries: 2 });
      expect(result).toBe(true);
      expect(ipSafe.testConnectivity).toHaveBeenCalledTimes(1);
    });

    it('should retry and succeed on second try', async () => {
      vi.spyOn(ipSafe, 'testConnectivity')
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce(true);

      const result = await ipSafe.checkNetworkWithRetries({ retries: 1 });
      expect(result).toBe(true);
      expect(ipSafe.testConnectivity).toHaveBeenCalledTimes(2);
    });

    it('should throw after exhausting retries', async () => {
      vi.spyOn(ipSafe, 'testConnectivity')
        .mockRejectedValue(new Error('connection failed'));

      await expect(
        ipSafe.checkNetworkWithRetries({ retries: 1 })
      ).rejects.toThrow('connection failed');
      expect(ipSafe.testConnectivity).toHaveBeenCalledTimes(2);
    });
  });

  describe('parseCommand', () => {
    it('should parse simple command', () => {
      expect(ipSafe.parseCommand('echo hello')).toEqual(['echo', 'hello']);
    });

    it('should handle double-quoted arguments', () => {
      expect(ipSafe.parseCommand('echo "hello world"')).toEqual(['echo', 'hello world']);
    });

    it('should handle single-quoted arguments', () => {
      expect(ipSafe.parseCommand('echo \'hello world\'')).toEqual(['echo', 'hello world']);
    });

    it('should handle multiple spaces', () => {
      expect(ipSafe.parseCommand('echo   hello   world')).toEqual(['echo', 'hello', 'world']);
    });

    it('should handle empty string', () => {
      expect(ipSafe.parseCommand('')).toEqual([]);
    });
  });

  describe('testConnectivity', () => {
    it('should resolve true for successful HTTP request', async () => {
      const mockRequest = {
        on: vi.fn(),
        end: vi.fn(),
        destroy: vi.fn(),
        setTimeout: vi.fn()
      };

      const mockResponse = {
        statusCode: 200,
        statusMessage: 'OK',
        headers: {},
        on: vi.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(callback, 10);
          }
        })
      };

      const https = require('https');
      https.request = vi.fn((options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      const config = { testUrl: 'https://www.google.com', timeout: 3000 };

      const result = await ipSafe.testConnectivity(config);

      expect(result).toBe(true);
      expect(https.request).toHaveBeenCalled();
    });

    it('should reject for HTTP error status', async () => {
      const mockRequest = {
        on: vi.fn(),
        end: vi.fn(),
        destroy: vi.fn(),
        setTimeout: vi.fn()
      };

      const mockResponse = {
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        headers: {},
        on: vi.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(callback, 10);
          }
        })
      };

      const https = require('https');
      https.request = vi.fn((options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      const config = { testUrl: 'https://www.google.com', timeout: 3000 };

      await expect(ipSafe.testConnectivity(config)).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should use http client for http:// URLs', async () => {
      const mockRequest = {
        on: vi.fn(),
        end: vi.fn(),
        destroy: vi.fn(),
        setTimeout: vi.fn()
      };

      const mockResponse = {
        statusCode: 200,
        statusMessage: 'OK',
        headers: {},
        on: vi.fn()
      };

      const http = require('http');
      http.request = vi.fn((options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      const config = { testUrl: 'http://example.com', timeout: 3000 };

      const result = await ipSafe.testConnectivity(config);

      expect(result).toBe(true);
      expect(http.request).toHaveBeenCalled();
    });

    it('should check content when checkContent is enabled', async () => {
      const mockRequest = {
        on: vi.fn(),
        end: vi.fn(),
        destroy: vi.fn(),
        setTimeout: vi.fn()
      };

      const mockResponse = {
        statusCode: 200,
        statusMessage: 'OK',
        headers: {},
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from('Hello World')), 5);
          }
          if (event === 'end') {
            setTimeout(callback, 15);
          }
        })
      };

      const https = require('https');
      https.request = vi.fn((options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      const config = {
        testUrl: 'https://www.google.com',
        timeout: 3000,
        checkContent: true,
        searchText: 'hello',
        searchType: 'contains'
      };

      const result = await ipSafe.testConnectivity(config);

      expect(result).toBe(true);
    });

    it('should reject when content check fails', async () => {
      const mockRequest = {
        on: vi.fn(),
        end: vi.fn(),
        destroy: vi.fn(),
        setTimeout: vi.fn()
      };

      const mockResponse = {
        statusCode: 200,
        statusMessage: 'OK',
        headers: {},
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from('some data')), 5);
          }
          if (event === 'end') {
            setTimeout(callback, 15);
          }
        })
      };

      const https = require('https');
      https.request = vi.fn((options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      const config = {
        testUrl: 'https://www.google.com',
        timeout: 3000,
        checkContent: true,
        searchText: 'notfound',
        searchType: 'contains'
      };

      await expect(ipSafe.testConnectivity(config)).rejects.toThrow('Content check failed');
    });

    it('should reject on request timeout', async () => {
      const mockRequest = {
        on: vi.fn(),
        end: vi.fn(),
        destroy: vi.fn(),
        setTimeout: vi.fn((timeout, callback) => {
          setTimeout(callback, 10);
        })
      };

      const https = require('https');
      https.request = vi.fn(() => mockRequest);

      const config = { testUrl: 'https://www.google.com', timeout: 100 };

      await expect(ipSafe.testConnectivity(config)).rejects.toThrow('Request timeout');
    });

    it('should reject on request error', async () => {
      const mockRequest = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('ENOTFOUND')), 10);
          }
        }),
        end: vi.fn(),
        destroy: vi.fn(),
        setTimeout: vi.fn()
      };

      const https = require('https');
      https.request = vi.fn(() => mockRequest);

      const config = { testUrl: 'https://nonexistent.example.com', timeout: 3000 };

      await expect(ipSafe.testConnectivity(config)).rejects.toThrow('ENOTFOUND');
    });

    it('should reject on content check error with invalid regex', async () => {
      const mockRequest = {
        on: vi.fn(),
        end: vi.fn(),
        destroy: vi.fn(),
        setTimeout: vi.fn()
      };

      const mockResponse = {
        statusCode: 200,
        statusMessage: 'OK',
        headers: {},
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(Buffer.from('data')), 5);
          }
          if (event === 'end') {
            setTimeout(callback, 15);
          }
        })
      };

      const https = require('https');
      https.request = vi.fn((options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      const config = {
        testUrl: 'https://www.google.com',
        timeout: 3000,
        checkContent: true,
        searchText: '[invalid',
        searchType: 'regex'
      };

      await expect(ipSafe.testConnectivity(config)).rejects.toThrow('Content check error');
    });
  });

  describe('executeCommand', () => {
    it('should execute command successfully', async () => {
      const { spawn } = childProcess;
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      spawn.mockImplementation(() => {
        setTimeout(() => {
          const stdoutCallback = mockChild.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
          if (stdoutCallback) stdoutCallback(Buffer.from('command output\n'));

          const closeCallback = mockChild.on.mock.calls.find(call => call[0] === 'close')?.[1];
          if (closeCallback) closeCallback(0);
        }, 10);

        return mockChild;
      });

      const result = await ipSafe.executeCommand('echo hello');

      expect(result).toEqual({
        stdout: 'command output',
        stderr: '',
        exitCode: 0
      });
      expect(spawn).toHaveBeenCalledWith('echo', ['hello'], { stdio: ['inherit', 'pipe', 'pipe'] });
    });

    it('should reject on command error', async () => {
      const { spawn } = childProcess;
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      spawn.mockImplementation(() => {
        setTimeout(() => {
          const closeCallback = mockChild.on.mock.calls.find(call => call[0] === 'close')?.[1];
          if (closeCallback) closeCallback(1);
        }, 10);

        return mockChild;
      });

      await expect(ipSafe.executeCommand('invalid command')).rejects.toThrow('Command failed with exit code 1');
    });

    it('should reject on spawn error', async () => {
      const { spawn } = childProcess;
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      spawn.mockImplementation(() => {
        setTimeout(() => {
          const errorCallback = mockChild.on.mock.calls.find(call => call[0] === 'error')?.[1];
          if (errorCallback) errorCallback(new Error('spawn ENOENT'));
        }, 10);

        return mockChild;
      });

      await expect(ipSafe.executeCommand('nonexistent_cmd')).rejects.toThrow('spawn ENOENT');
    });

    it('should capture stderr output', async () => {
      const { spawn } = childProcess;
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      spawn.mockImplementation(() => {
        setTimeout(() => {
          const stderrCallback = mockChild.stderr.on.mock.calls.find(call => call[0] === 'data')?.[1];
          if (stderrCallback) stderrCallback(Buffer.from('warning message\n'));

          const closeCallback = mockChild.on.mock.calls.find(call => call[0] === 'close')?.[1];
          if (closeCallback) closeCallback(0);
        }, 10);

        return mockChild;
      });

      const result = await ipSafe.executeCommand('some_command');

      expect(result.stderr).toBe('warning message');
    });

    it('should use interactive stdio for interactive commands', async () => {
      const { spawn } = childProcess;
      const mockChild = {
        stdout: null,
        stderr: null,
        on: vi.fn(),
        kill: vi.fn()
      };

      spawn.mockImplementation(() => {
        setTimeout(() => {
          const closeCallback = mockChild.on.mock.calls.find(call => call[0] === 'close')?.[1];
          if (closeCallback) closeCallback(0);
        }, 10);

        return mockChild;
      });

      await ipSafe.executeCommand('vim file.txt');

      expect(spawn).toHaveBeenCalledWith('vim', ['file.txt'], { stdio: ['inherit', 'inherit', 'inherit'] });
    });

    it('should handle command timeout', async () => {
      const { spawn } = childProcess;
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      spawn.mockImplementation(() => {
        // Don't fire close — let timeout trigger instead
        return mockChild;
      });

      vi.useFakeTimers();

      const promise = ipSafe.executeCommand('slow_cmd', { commandTimeout: 5000 });

      vi.advanceTimersByTime(5000);

      await expect(promise).rejects.toThrow('Command timeout after 5000ms');
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');

      vi.useRealTimers();
    });

    it('should clean up timeout on exit', async () => {
      const { spawn } = childProcess;
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      spawn.mockImplementation(() => {
        setTimeout(() => {
          // Fire exit event first
          const exitCallback = mockChild.on.mock.calls.find(call => call[0] === 'exit')?.[1];
          if (exitCallback) exitCallback(0);

          // Then close event
          const closeCallback = mockChild.on.mock.calls.find(call => call[0] === 'close')?.[1];
          if (closeCallback) closeCallback(0);
        }, 10);

        return mockChild;
      });

      const result = await ipSafe.executeCommand('echo hi', { commandTimeout: 30000 });

      expect(result.exitCode).toBe(0);
    });
  });

  describe('run', () => {
    it('should throw error when no arguments provided', async () => {
      await expect(ipSafe.run([])).rejects.toThrow('No command provided');
    });

    it('should execute command after successful connectivity check', async () => {
      fs.existsSync.mockReturnValue(false);

      vi.spyOn(ipSafe, 'testConnectivity').mockResolvedValue(true);
      vi.spyOn(ipSafe, 'executeCommand').mockResolvedValue({
        stdout: 'success',
        stderr: ''
      });

      const result = await ipSafe.run(['echo', 'test']);

      expect(result).toEqual({
        stdout: 'success',
        stderr: ''
      });
    });

    it('should join args into a single command string', async () => {
      fs.existsSync.mockReturnValue(false);

      vi.spyOn(ipSafe, 'testConnectivity').mockResolvedValue(true);
      const execSpy = vi.spyOn(ipSafe, 'executeCommand').mockResolvedValue({
        stdout: '',
        stderr: ''
      });

      await ipSafe.run(['npm', 'install', '--save']);

      expect(execSpy).toHaveBeenCalledWith('npm install --save', expect.any(Object));
    });
  });
});
