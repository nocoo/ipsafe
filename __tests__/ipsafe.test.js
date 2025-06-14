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
    it('should initialize with default config path', () => {
      const defaultIpSafe = new IpSafe();
      expect(defaultIpSafe.configFile).toBe(path.join(process.cwd(), 'ipsafe.config.json'));
    });

    it('should initialize with custom config path', () => {
      expect(ipSafe.configFile).toBe(mockConfigPath);
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
        headers: {}
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
        headers: {}
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
        headers: {}
      });
      expect(consoleSpy).toHaveBeenCalledWith('Warning: Failed to load config file, using defaults');
      
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
      const { exec } = require('child_process');
      const mockChild = { 
        once: jest.fn(),
        kill: jest.fn()
      };
      exec.mockImplementation((command, options, callback) => {
        // Handle both old and new signatures
        if (typeof options === 'function') {
          callback = options;
        }
        setTimeout(() => callback(null, 'command output', ''), 10);
        return mockChild;
      });

      const result = await ipSafe.executeCommand('echo hello');
      
      expect(result).toEqual({
        stdout: 'command output',
        stderr: ''
      });
    });

    it('should reject on command error', async () => {
      const { exec } = require('child_process');
      const mockChild = { 
        once: jest.fn(),
        kill: jest.fn()
      };
      const error = new Error('Command failed');
      exec.mockImplementation((command, options, callback) => {
        // Handle both old and new signatures
        if (typeof options === 'function') {
          callback = options;
        }
        setTimeout(() => callback(error, '', ''), 10);
        return mockChild;
      });

      await expect(ipSafe.executeCommand('invalid command')).rejects.toThrow('Command failed');
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