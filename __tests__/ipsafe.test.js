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

  describe('platform-specific config paths', () => {
    it('should use Windows AppData path on win32', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      const originalAppData = process.env.APPDATA;
      process.env.APPDATA = 'C:\\Users\\Test\\AppData\\Roaming';

      const winIpSafe = new IpSafe();
      const expected = path.join('C:\\Users\\Test\\AppData\\Roaming', 'ipsafe', 'config.json');
      expect(winIpSafe.configPaths).toContainEqual(expected);

      if (originalAppData === undefined) delete process.env.APPDATA;
      else process.env.APPDATA = originalAppData;
    });

    it('should fall back to default AppData path when env var not set', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      const originalAppData = process.env.APPDATA;
      delete process.env.APPDATA;

      const winIpSafe = new IpSafe();
      const expected = path.join(os.homedir(), 'AppData', 'Roaming', 'ipsafe', 'config.json');
      expect(winIpSafe.configPaths).toContainEqual(expected);

      if (originalAppData !== undefined) process.env.APPDATA = originalAppData;
    });

    it('should fall back to default AppData path in getGlobalConfigPath', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      const originalAppData = process.env.APPDATA;
      delete process.env.APPDATA;

      const expected = path.join(os.homedir(), 'AppData', 'Roaming', 'ipsafe', 'config.json');
      expect(ipSafe.getGlobalConfigPath()).toBe(expected);

      if (originalAppData !== undefined) process.env.APPDATA = originalAppData;
    });

    it('should fall back to default XDG path when env var not set', () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');
      const originalXdg = process.env.XDG_CONFIG_HOME;
      delete process.env.XDG_CONFIG_HOME;

      const expected = path.join(os.homedir(), '.config', 'ipsafe', 'config.json');
      expect(ipSafe.getGlobalConfigPath()).toBe(expected);

      if (originalXdg !== undefined) process.env.XDG_CONFIG_HOME = originalXdg;
    });
  });

  describe('loadConfig edge cases', () => {
    it('should not show tip when showTip is false and no config found', () => {
      fs.existsSync.mockReturnValue(false);
      const logSpy = vi.spyOn(console, 'log').mockImplementation();

      ipSafe.loadConfig(false);

      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('initGlobalConfig edge cases', () => {
    it('should not call mkdirSync when dir already exists', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.writeFileSync.mockReturnValue(undefined);

      await ipSafe.initGlobalConfig({ force: true });

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('testConnectivity edge cases', () => {
    it('should use default port and method when not provided', async () => {
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
      const requestSpy = vi.fn((options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });
      http.request = requestSpy;

      const config = { testUrl: 'http://example.com/path?q=1', timeout: 3000 };
      await ipSafe.testConnectivity(config);

      const opts = requestSpy.mock.calls[0][0];
      expect(opts.port).toBe(80);
      expect(opts.method).toBe('GET');
      expect(opts.path).toBe('/path?q=1');
      expect(opts.headers['User-Agent']).toContain('ipsafe/');
    });

    it('should use https default port 443', async () => {
      const mockRequest = {
        on: vi.fn(),
        end: vi.fn(),
        destroy: vi.fn(),
        setTimeout: vi.fn()
      };
      const mockResponse = { statusCode: 200, statusMessage: 'OK', headers: {}, on: vi.fn() };
      const https = require('https');
      const requestSpy = vi.fn((options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });
      https.request = requestSpy;

      const config = { testUrl: 'https://example.com', timeout: 3000 };
      await ipSafe.testConnectivity(config);

      expect(requestSpy.mock.calls[0][0].port).toBe(443);
    });
  });

  describe('executeCommand signal & timeout cleanup', () => {
    it('should not crash when commandTimeout is 0', async () => {
      const { spawn } = childProcess;
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      spawn.mockImplementation(() => {
        setTimeout(() => {
          const closeCb = mockChild.on.mock.calls.find(c => c[0] === 'close')?.[1];
          if (closeCb) closeCb(0);
        }, 10);
        return mockChild;
      });

      const result = await ipSafe.executeCommand('echo hi', { commandTimeout: 0 });
      expect(result.exitCode).toBe(0);
    });

    it('should not crash when no config provided', async () => {
      const { spawn } = childProcess;
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      spawn.mockImplementation(() => {
        setTimeout(() => {
          const closeCb = mockChild.on.mock.calls.find(c => c[0] === 'close')?.[1];
          if (closeCb) closeCb(0);
        }, 10);
        return mockChild;
      });

      const result = await ipSafe.executeCommand('echo hi');
      expect(result.exitCode).toBe(0);
    });

    it('should clear timeout in signal handler when SIGINT fires', async () => {
      const { spawn } = childProcess;
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      const processOnSpy = vi.spyOn(process, 'on');
      const sigintHandlers = [];
      processOnSpy.mockImplementation((event, handler) => {
        if (event === 'SIGINT') sigintHandlers.push(handler);
        return process;
      });

      spawn.mockImplementation(() => {
        setTimeout(() => {
          // Trigger SIGINT handler manually
          sigintHandlers.forEach(h => h());
          const closeCb = mockChild.on.mock.calls.find(c => c[0] === 'close')?.[1];
          if (closeCb) closeCb(0);
        }, 10);
        return mockChild;
      });

      await ipSafe.executeCommand('echo hi', { commandTimeout: 30000 });
      expect(mockChild.kill).toHaveBeenCalledWith('SIGINT');
    });
  });

  describe('parseCommand quote handling', () => {
    it('should handle mixed quote types', () => {
      expect(ipSafe.parseCommand('echo \'it"s\' fine')).toEqual(['echo', 'it"s', 'fine']);
    });

    it('should handle trailing space', () => {
      expect(ipSafe.parseCommand('echo hi ')).toEqual(['echo', 'hi']);
    });
  });

  describe('checkContent uppercase regex', () => {
    it('should match regex case-insensitively', () => {
      const config = { searchText: 'HELLO', searchType: 'regex' };
      expect(ipSafe.checkContent('hello world', config)).toBe(true);
    });
  });

  describe('additional branch coverage', () => {
    it('should not show tip when config is found even if showTip true', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{}');
      const logSpy = vi.spyOn(console, 'log').mockImplementation();

      ipSafe.loadConfig(true);

      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Tip:'));
      logSpy.mockRestore();
    });

    it('should write to stdout when not in test env', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { spawn } = childProcess;
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      spawn.mockImplementation(() => {
        setTimeout(() => {
          const stdoutCb = mockChild.stdout.on.mock.calls.find(c => c[0] === 'data')?.[1];
          if (stdoutCb) stdoutCb(Buffer.from('out'));
          const stderrCb = mockChild.stderr.on.mock.calls.find(c => c[0] === 'data')?.[1];
          if (stderrCb) stderrCb(Buffer.from('err'));
          const closeCb = mockChild.on.mock.calls.find(c => c[0] === 'close')?.[1];
          if (closeCb) closeCb(0);
        }, 10);
        return mockChild;
      });

      await ipSafe.executeCommand('echo hi');
      expect(stdoutSpy).toHaveBeenCalled();

      process.env.NODE_ENV = originalNodeEnv;
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    });

    it('should handle URL without search query', async () => {
      const mockRequest = {
        on: vi.fn(),
        end: vi.fn(),
        destroy: vi.fn(),
        setTimeout: vi.fn()
      };
      const mockResponse = { statusCode: 200, statusMessage: 'OK', headers: {}, on: vi.fn() };
      const https = require('https');
      const requestSpy = vi.fn((options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });
      https.request = requestSpy;

      const config = {
        testUrl: 'https://example.com:8443/p',
        timeout: 3000,
        method: 'POST',
        userAgent: 'custom/1.0',
        headers: { 'X-Custom': '1' }
      };
      await ipSafe.testConnectivity(config);

      const opts = requestSpy.mock.calls[0][0];
      expect(opts.port).toBe('8443');
      expect(opts.method).toBe('POST');
      expect(opts.headers['User-Agent']).toBe('custom/1.0');
      expect(opts.headers['X-Custom']).toBe('1');
    });

    it('should pass URL search params through', async () => {
      const mockRequest = { on: vi.fn(), end: vi.fn(), destroy: vi.fn(), setTimeout: vi.fn() };
      const mockResponse = { statusCode: 200, statusMessage: 'OK', headers: {}, on: vi.fn() };
      const http = require('http');
      const requestSpy = vi.fn((options, cb) => { setTimeout(() => cb(mockResponse), 10); return mockRequest; });
      http.request = requestSpy;

      await ipSafe.testConnectivity({ testUrl: 'http://example.com/x', timeout: 3000 });
      expect(requestSpy.mock.calls[0][0].path).toBe('/x');
    });

    it('should handle XDG_CONFIG_HOME when set', () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux');
      const original = process.env.XDG_CONFIG_HOME;
      process.env.XDG_CONFIG_HOME = '/custom/xdg';

      const inst = new IpSafe();
      expect(inst.configPaths).toContainEqual('/custom/xdg/ipsafe/config.json');
      expect(inst.getGlobalConfigPath()).toBe('/custom/xdg/ipsafe/config.json');

      if (original === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = original;
    });

    it('should handle APPDATA when set in getConfigPaths', () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32');
      const original = process.env.APPDATA;
      process.env.APPDATA = 'C:\\AppData';

      const inst = new IpSafe();
      expect(inst.configPaths).toContainEqual(path.join('C:\\AppData', 'ipsafe', 'config.json'));
      expect(inst.getGlobalConfigPath()).toBe(path.join('C:\\AppData', 'ipsafe', 'config.json'));

      if (original === undefined) delete process.env.APPDATA;
      else process.env.APPDATA = original;
    });

    it('should handle each interactive command', async () => {
      const { spawn } = childProcess;
      const interactives = ['claude', 'vim', 'nano', 'less', 'more', 'top', 'htop'];

      for (const cmd of interactives) {
        const mockChild = { stdout: null, stderr: null, on: vi.fn(), kill: vi.fn() };
        spawn.mockImplementation(() => {
          setTimeout(() => {
            const cb = mockChild.on.mock.calls.find(c => c[0] === 'close')?.[1];
            if (cb) cb(0);
          }, 5);
          return mockChild;
        });
        await ipSafe.executeCommand(cmd);
      }
    });

    it('should handle uppercase interactive command', async () => {
      const { spawn } = childProcess;
      const mockChild = { stdout: null, stderr: null, on: vi.fn(), kill: vi.fn() };
      spawn.mockImplementation(() => {
        setTimeout(() => {
          const cb = mockChild.on.mock.calls.find(c => c[0] === 'close')?.[1];
          if (cb) cb(0);
        }, 5);
        return mockChild;
      });
      await ipSafe.executeCommand('VIM file');
      expect(spawn).toHaveBeenCalledWith('VIM', ['file'], { stdio: ['inherit', 'inherit', 'inherit'] });
    });
  });
});
