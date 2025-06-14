# CLI Tool Integration

## For Claude Code Integration

### Method 1: Library Import
```javascript
const { checkNetworkSafe, executeIfSafe } = require('ipsafe');

// Before executing any network-related command
async function safeExecute(command) {
  const result = await executeIfSafe(command);
  if (result.success) {
    console.log('✓ Command executed safely');
    return result.result;
  } else {
    console.error('✗ Command blocked:', result.error);
    throw new Error(result.error);
  }
}

// Usage in Claude Code
await safeExecute('npm install package-name');
await safeExecute('git clone https://github.com/user/repo.git');
```

### Method 2: Environment Check
```bash
# Claude Code could run this before network operations
node /path/to/ipsafe/integrations/claude-code.js
if [ $? -eq 0 ]; then
  echo "Network is safe, proceeding..."
  # Execute command
else
  echo "Network check failed, blocking command"
  exit 1
fi
```

### Method 3: Pre-command Hook
```javascript
// In Claude Code's command execution pipeline
const { checkNetworkSafe } = require('ipsafe');

async function executeCommand(cmd) {
  // Check if command involves network operations
  const networkCommands = ['npm', 'git', 'curl', 'wget', 'pip'];
  const isNetworkCmd = networkCommands.some(nc => cmd.includes(nc));
  
  if (isNetworkCmd) {
    const isSafe = await checkNetworkSafe();
    if (!isSafe) {
      throw new Error('Network safety check failed - command blocked');
    }
  }
  
  // Proceed with normal command execution
  return executeNormalCommand(cmd);
}
```

## Environment Variables
Set these to customize behavior:
```bash
export IPSAFE_CONFIG="/path/to/custom/config.json"
export IPSAFE_ENABLED="true"  # false to disable checks
```