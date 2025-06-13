const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

class IpSafe {
  constructor(configPath = null) {
    this.configFile = configPath || path.join(process.cwd(), 'ipsafe.config.json');
    this.defaultConfig = {
      testUrl: 'https://www.google.com',
      timeout: 5000,
      retries: 1
    };
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        return { ...this.defaultConfig, ...config };
      }
    } catch {
      console.warn('Warning: Failed to load config file, using defaults');
    }
    return this.defaultConfig;
  }

  async testConnectivity(config) {
    return new Promise((resolve, reject) => {
      const url = new URL(config.testUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        timeout: config.timeout,
        headers: {
          'User-Agent': 'ipsafe/1.0.0'
        }
      };

      // Overall timeout wrapper to prevent hanging
      const overallTimeout = setTimeout(() => {
        req.destroy();
        reject(new Error(`Overall request timeout after ${config.timeout}ms`));
      }, config.timeout);

      const req = client.request(options, (res) => {
        clearTimeout(overallTimeout);
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });

      req.on('timeout', () => {
        clearTimeout(overallTimeout);
        req.destroy();
        reject(new Error(`Request timeout after ${config.timeout}ms`));
      });

      req.on('error', (error) => {
        clearTimeout(overallTimeout);
        reject(error);
      });

      req.end();
    });
  }

  async checkNetworkWithRetries(config) {
    for (let i = 0; i <= config.retries; i++) {
      try {
        await this.testConnectivity(config);
        return true;
      } catch (error) {
        if (i === config.retries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  executeCommand(command, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const child = exec(command, { timeout }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
      
      // Additional timeout handling
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);
      
      child.once('exit', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  async run(args) {
    if (args.length === 0) {
      throw new Error('No command provided');
    }

    const command = args.join(' ');
    const config = this.loadConfig();

    await this.checkNetworkWithRetries(config);
    
    // Use shorter timeout for ping commands
    const timeout = command.toLowerCase().includes('ping') ? 10000 : 30000;
    return await this.executeCommand(command, timeout);
  }
}

module.exports = IpSafe;