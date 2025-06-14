const IpSafe = require('./ipsafe');

/**
 * Check if network is safe before executing commands
 * @param {string|null} configPath - Optional config file path
 * @returns {Promise<boolean>} - true if network check passes
 */
async function checkNetworkSafe(configPath = null) {
  try {
    const ipSafe = new IpSafe(configPath);
    const config = ipSafe.loadConfig();
    await ipSafe.checkNetworkWithRetries(config);
    return true;
  } catch (error) {
    console.warn(`⚠️  \x1b[33mNetwork safety check failed:\x1b[0m ${error.message}`);
    return false;
  }
}

/**
 * Execute command only if network check passes
 * @param {string} command - Command to execute
 * @param {string|null} configPath - Optional config file path
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
async function executeIfSafe(command, configPath = null) {
  const isSafe = await checkNetworkSafe(configPath);
  
  if (!isSafe) {
    return {
      success: false,
      error: '🚫 Network safety check failed - command blocked for security'
    };
  }
  
  try {
    const ipSafe = new IpSafe(configPath);
    const result = await ipSafe.executeCommand(command);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { checkNetworkSafe, executeIfSafe };