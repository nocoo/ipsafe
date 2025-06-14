const IpSafe = require('../lib/ipsafe');
const fs = require('fs');
const path = require('path');

jest.mock('fs');
jest.mock('child_process');

describe('IpSafe', () => {
  let ipSafe;
  const mockConfigPath = '/test/config.json';

  beforeEach(() => {
    ipSafe = new IpSafe(mockConfigPath);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config paths', () => {
      const defaultIpSafe = new IpSafe();
      expect(defaultIpSafe.configPaths).toContain(path.join(process.cwd(), 'ipsafe.config.json'));
    });

    it('should initialize with custom config path', () => {
      expect(ipSafe.configPaths).toEqual([mockConfigPath]);
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
        userAgent: 'ipsafe/1.0.2',
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
        userAgent: 'ipsafe/1.0.2',
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
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const config = ipSafe.loadConfig();
      
      expect(config).toEqual({
        testUrl: 'https://www.google.com',
        timeout: 3000,
        retries: 1,
        method: 'GET',
        userAgent: 'ipsafe/1.0.2',
        checkContent: false,
        searchText: null,
        searchType: 'contains',
        headers: {},
        commandTimeout: 0
      });
      expect(consoleSpy).toHaveBeenCalledWith('⚠️  Warning: Failed to load config from /test/config.json: Unexpected token \'i\', "invalid json" is not valid JSON');
      
      consoleSpy.mockRestore();
    });
  });

  describe('testConnectivity', () => {
    it('should resolve true for successful HTTP request', async () => {
      const mockRequest = {
        on: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn(),
        setTimeout: jest.fn()
      };
      
      const mockResponse = {
        statusCode: 200,
        statusMessage: 'OK',
        headers: {},
        on: jest.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(callback, 10);
          }
        })
      };

      const https = require('https');
      https.request = jest.fn((options, callback) => {
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
        on: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn(),
        setTimeout: jest.fn()
      };
      
      const mockResponse = {
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        headers: {},
        on: jest.fn((event, callback) => {
          if (event === 'end') {
            setTimeout(callback, 10);
          }
        })
      };

      const https = require('https');
      https.request = jest.fn((options, callback) => {
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      const config = { testUrl: 'https://www.google.com', timeout: 3000 };
      
      await expect(ipSafe.testConnectivity(config)).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('executeCommand', () => {
    it('should execute command successfully', async () => {
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn()
      };

      spawn.mockImplementation(() => {
        // Simulate successful command execution
        setTimeout(() => {
          // Simulate stdout data
          const stdoutCallback = mockChild.stdout.on.mock.calls.find(call => call[0] === 'data')?.[1];
          if (stdoutCallback) stdoutCallback(Buffer.from('command output\n'));
          
          // Simulate close event with success
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
      const { spawn } = require('child_process');
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn()
      };

      spawn.mockImplementation(() => {
        setTimeout(() => {
          // Simulate close event with error
          const closeCallback = mockChild.on.mock.calls.find(call => call[0] === 'close')?.[1];
          if (closeCallback) closeCallback(1);
        }, 10);
        
        return mockChild;
      });

      await expect(ipSafe.executeCommand('invalid command')).rejects.toThrow('Command failed with exit code 1');
    });
  });

  describe('run', () => {
    it('should throw error when no arguments provided', async () => {
      await expect(ipSafe.run([])).rejects.toThrow('No command provided');
    });

    it('should execute command after successful connectivity check', async () => {
      fs.existsSync.mockReturnValue(false);
      
      jest.spyOn(ipSafe, 'testConnectivity').mockResolvedValue(true);
      jest.spyOn(ipSafe, 'executeCommand').mockResolvedValue({
        stdout: 'success',
        stderr: ''
      });

      const result = await ipSafe.run(['echo', 'test']);
      
      expect(result).toEqual({
        stdout: 'success',
        stderr: ''
      });
    });
  });
});