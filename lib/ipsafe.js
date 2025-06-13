const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

class IpSafe {
  constructor(configPath = null) {
    this.configFile = configPath || path.join(process.cwd(), 'ipsafe.config.json');
    this.defaultConfig = {
      testUrl: 'https://www.google.com',
      timeout: 3000,
      retries: 1,
      checkContent: false,
      searchText: null,
      searchType: 'contains', // 'contains', 'regex'
      responseType: 'auto', // 'auto', 'html', 'json'
      followRedirects: true,
      maxRedirects: 5,
      headers: {}
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

  async testConnectivity(config, redirectCount = 0) {
    return new Promise((resolve, reject) => {
      const url = new URL(config.testUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ipsafe/1.0.2; +https://github.com/nocoo/ipsafe)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          ...config.headers
        }
      };

      const req = client.request(options, (res) => {
        // Handle redirects
        if (config.followRedirects && 
            [301, 302, 303, 307, 308].includes(res.statusCode) && 
            res.headers.location) {
          
          if (redirectCount >= config.maxRedirects) {
            reject(new Error(`Too many redirects (${redirectCount})`));
            return;
          }
          
          // Update URL for redirect
          const redirectConfig = { ...config, testUrl: res.headers.location };
          this.testConnectivity(redirectConfig, redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        // Handle response based on encoding
        let stream = res;
        const encoding = res.headers ? res.headers['content-encoding'] : null;
        
        if (encoding === 'gzip') {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          stream = res.pipe(zlib.createInflate());
        }

        let data = '';
        
        // Collect response data if content checking is enabled
        if (config.checkContent && config.searchText) {
          stream.on('data', (chunk) => {
            data += chunk;
          });
        }
        
        stream.on('end', () => {
          // Check status code first
          if (res.statusCode >= 200 && res.statusCode < 400) {
            // If content checking is disabled, resolve immediately
            if (!config.checkContent || !config.searchText) {
              resolve(true);
              return;
            }
            
            // Content checking logic
            try {
              const contentMatch = this.checkContent(data, config);
              if (contentMatch) {
                resolve(true);
              } else {
                reject(new Error(`Content check failed: "${config.searchText}" not found`));
              }
            } catch (error) {
              reject(new Error(`Content check error: ${error.message}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });

      // Set timeout with compatibility check
      if (req.setTimeout) {
        req.setTimeout(config.timeout, () => {
          req.destroy();
          reject(new Error(`Request timeout after ${config.timeout}ms`));
        });
      } else {
        // Fallback timeout mechanism
        const timeoutId = setTimeout(() => {
          req.destroy();
          reject(new Error(`Request timeout after ${config.timeout}ms`));
        }, config.timeout);
        
        req.on('end', () => clearTimeout(timeoutId));
        req.on('error', () => clearTimeout(timeoutId));
      }

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  checkContent(data, config) {
    if (!config.searchText) return true;
    
    let content = data;
    
    // Handle JSON response type
    if (config.responseType === 'json' || 
        (config.responseType === 'auto' && this.isJSON(data))) {
      try {
        const jsonData = JSON.parse(data);
        content = JSON.stringify(jsonData);
      } catch {
        throw new Error('Invalid JSON response');
      }
    }
    
    // Apply search logic
    if (config.searchType === 'regex') {
      try {
        const regex = new RegExp(config.searchText, 'i');
        return regex.test(content);
      } catch {
        throw new Error('Invalid regex pattern');
      }
    } else {
      // Default to contains search (case-insensitive)
      return content.toLowerCase().includes(config.searchText.toLowerCase());
    }
  }

  isJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
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