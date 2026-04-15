const { checkNetworkSafe, executeIfSafe } = require('../lib/check-safe');
const IpSafe = require('../lib/ipsafe');

jest.mock('fs');
jest.mock('child_process');

describe('check-safe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkNetworkSafe', () => {
    it('should return true when network check passes', async () => {
      jest.spyOn(IpSafe.prototype, 'loadConfig').mockReturnValue({
        testUrl: 'https://www.google.com',
        timeout: 3000,
        retries: 0
      });
      jest.spyOn(IpSafe.prototype, 'checkNetworkWithRetries').mockResolvedValue(true);

      const result = await checkNetworkSafe();

      expect(result).toBe(true);
    });

    it('should return false when network check fails', async () => {
      jest.spyOn(IpSafe.prototype, 'loadConfig').mockReturnValue({
        testUrl: 'https://www.google.com',
        timeout: 3000,
        retries: 0
      });
      jest.spyOn(IpSafe.prototype, 'checkNetworkWithRetries').mockRejectedValue(new Error('timeout'));

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await checkNetworkSafe();

      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should accept custom config path', async () => {
      jest.spyOn(IpSafe.prototype, 'loadConfig').mockReturnValue({
        testUrl: 'https://example.com',
        timeout: 3000,
        retries: 0
      });
      jest.spyOn(IpSafe.prototype, 'checkNetworkWithRetries').mockResolvedValue(true);

      const result = await checkNetworkSafe('/custom/config.json');

      expect(result).toBe(true);
    });
  });

  describe('executeIfSafe', () => {
    it('should execute command when network is safe', async () => {
      jest.spyOn(IpSafe.prototype, 'loadConfig').mockReturnValue({
        testUrl: 'https://www.google.com',
        timeout: 3000,
        retries: 0
      });
      jest.spyOn(IpSafe.prototype, 'checkNetworkWithRetries').mockResolvedValue(true);
      jest.spyOn(IpSafe.prototype, 'executeCommand').mockResolvedValue({
        stdout: 'output',
        stderr: '',
        exitCode: 0
      });

      const result = await executeIfSafe('echo hello');

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        stdout: 'output',
        stderr: '',
        exitCode: 0
      });
    });

    it('should block command when network check fails', async () => {
      jest.spyOn(IpSafe.prototype, 'loadConfig').mockReturnValue({
        testUrl: 'https://www.google.com',
        timeout: 3000,
        retries: 0
      });
      jest.spyOn(IpSafe.prototype, 'checkNetworkWithRetries').mockRejectedValue(new Error('timeout'));

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await executeIfSafe('echo hello');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network safety check failed');
      warnSpy.mockRestore();
    });

    it('should return error when command execution fails', async () => {
      jest.spyOn(IpSafe.prototype, 'loadConfig').mockReturnValue({
        testUrl: 'https://www.google.com',
        timeout: 3000,
        retries: 0
      });
      jest.spyOn(IpSafe.prototype, 'checkNetworkWithRetries').mockResolvedValue(true);
      jest.spyOn(IpSafe.prototype, 'executeCommand').mockRejectedValue(new Error('command failed'));

      const result = await executeIfSafe('bad_command');

      expect(result.success).toBe(false);
      expect(result.error).toBe('command failed');
    });
  });
});
