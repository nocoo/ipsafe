const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const { URL } = require('url');

class IpSafe {
  constructor(configPath = null) {
    this.configPaths = configPath ? [configPath] : this.getConfigPaths();
    this.defaultConfig = {
      testUrl: 'https://www.google.com',
      timeout: 3000,
      retries: 1,
      method: 'GET',
      userAgent: 'ipsafe/1.0.2',
      checkContent: false,
      searchText: null,
      searchType: 'contains', // 'contains' or 'regex'
      headers: {},
      commandTimeout: 0 // 0 = no timeout for commands
    };
  }

  getConfigPaths() {
    const homeDir = os.homedir();
    const platform = os.platform();
    
    const paths = [
      // 1. Project-specific config (highest priority)
      path.join(process.cwd(), 'ipsafe.config.json'),
      
      // 2. User global config (platform-specific)
      ...(platform === 'win32' ? [
        // Windows: AppData
        path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'ipsafe', 'config.json'),
        path.join(homeDir, '.ipsafe.json')
      ] : [
        // macOS/Linux: XDG config standard
        path.join(process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'), 'ipsafe', 'config.json'),
        path.join(homeDir, '.ipsafe.json')
      ])
    ];
    
    return paths;
  }

  getGlobalConfigPath() {
    const homeDir = os.homedir();
    const platform = os.platform();
    
    if (platform === 'win32') {
      return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'ipsafe', 'config.json');
    } else {
      return path.join(process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'), 'ipsafe', 'config.json');
    }
  }

  loadConfig(showTip = process.env.NODE_ENV !== 'test') {
    let finalConfig = { ...this.defaultConfig };
    let configFound = false;
    
    // Search through config paths in priority order
    for (const configPath of this.configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          finalConfig = { ...finalConfig, ...config };
          configFound = true;
          break; // Use first found config (highest priority)
        }
      } catch (error) {
        console.warn(`⚠️  Warning: Failed to load config from ${configPath}: ${error.message}`);
      }
    }
    
    if (!configFound && showTip) {
      // Show helpful message only once for first-time users
      const globalPath = this.getGlobalConfigPath();
      console.log(`💡 ${'\x1b[90m'}Tip: Create a global config at ${globalPath} or run 'ipsafe --init'${'\x1b[0m'}`);
    }
    
    return finalConfig;
  }

  async initGlobalConfig(options = {}) {
    const globalPath = this.getGlobalConfigPath();
    const configDir = path.dirname(globalPath);
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Check if config already exists
    if (fs.existsSync(globalPath) && !options.force) {
      throw new Error(`Config already exists at ${globalPath}. Use --force to overwrite.`);
    }
    
    // Create config with custom options or defaults
    const config = { ...this.defaultConfig, ...options };
    delete config.force; // Remove force flag from config
    
    fs.writeFileSync(globalPath, JSON.stringify(config, null, 2));
    return globalPath;
  }

  showConfigInfo() {
    const info = {
      searchPaths: this.configPaths,
      globalPath: this.getGlobalConfigPath(),
      currentConfig: this.loadConfig(false), // Don't show tip when showing config info
      activeConfigPath: null
    };
    
    // Find which config is actually being used
    for (const configPath of this.configPaths) {
      if (fs.existsSync(configPath)) {
        info.activeConfigPath = configPath;
        break;
      }
    }
    
    return info;
  }

  async testConnectivity(config) {
    return new Promise((resolve, reject) => {
      const url = new URL(config.testUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: config.method || 'GET',
        headers: {
          'User-Agent': config.userAgent || 'ipsafe/1.0.2',
          ...config.headers
        }
      };

      const req = client.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (!config.checkContent || !config.searchText) {
            resolve(true);
            return;
          }

          // Collect response data for content checking
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
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
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });

      req.setTimeout(config.timeout, () => {
        req.destroy();
        reject(new Error(`Request timeout after ${config.timeout}ms`));
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  checkContent(data, config) {
    if (!config.searchText) return true;
    
    if (config.searchType === 'regex') {
      try {
        const regex = new RegExp(config.searchText, 'i');
        return regex.test(data);
      } catch {
        throw new Error('Invalid regex pattern');
      }
    } else {
      // Default to contains search (case-insensitive)
      return data.toLowerCase().includes(config.searchText.toLowerCase());
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

  executeCommand(command, config = {}) {
    return new Promise((resolve, reject) => {
      // Parse command into program and arguments
      const args = command.split(' ');
      const program = args.shift();
      
      const child = spawn(program, args, {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      // Stream stdout in real-time
      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        // Only write to stdout if not in test environment
        if (process.env.NODE_ENV !== 'test') {
          process.stdout.write(output);
        }
      });

      // Stream stderr in real-time
      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        // Only write to stderr if not in test environment
        if (process.env.NODE_ENV !== 'test') {
          process.stderr.write(output);
        }
      });

      // Handle command completion
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code });
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Optional timeout handling
      let timeoutId;
      if (config.commandTimeout && config.commandTimeout > 0) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Command timeout after ${config.commandTimeout}ms`));
        }, config.commandTimeout);
      }

      // Signal handling for graceful interruption
      const handleSignal = (signal) => {
        if (timeoutId) clearTimeout(timeoutId);
        child.kill(signal);
      };

      process.on('SIGINT', () => handleSignal('SIGINT'));
      process.on('SIGTERM', () => handleSignal('SIGTERM'));

      // Clean up timeout when process exits
      child.on('exit', () => {
        if (timeoutId) clearTimeout(timeoutId);
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
    return await this.executeCommand(command, config);
  }
}

module.exports = IpSafe;