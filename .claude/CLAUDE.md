# IPSAFE Project Knowledge

## Project Overview
This is a Node.js CLI tool named "ipsafe" that validates network connectivity before executing commands. The tool helps prevent failed operations by checking if the network is accessible before running potentially network-dependent commands.

## Architecture

### Core Components
1. **bin/ipsafe.js** - CLI entry point with user interaction
2. **lib/ipsafe.js** - Core IpSafe class with business logic
3. **ipsafe.config.json** - Configuration file for connectivity settings

### Key Classes
- **IpSafe** - Main class handling connectivity checks and command execution
  - `loadConfig()` - Loads configuration from file or uses defaults
  - `testConnectivity()` - Tests network connectivity to specified URL
  - `checkNetworkWithRetries()` - Implements retry logic
  - `executeCommand()` - Executes the command after successful connectivity check
  - `run()` - Main entry point for the CLI

## Configuration System
The tool uses a JSON configuration file with these options:
- `testUrl`: URL to test connectivity (default: https://www.google.com)
- `timeout`: Request timeout in milliseconds (default: 5000)
- `retries`: Number of retry attempts (default: 1)

## Connectivity Rules
- **Success**: HTTP status 200-399, response within timeout, no network errors
- **Failure**: HTTP status 400+, timeout, network errors, all retries exhausted

## Development Standards

### Code Quality
- ESLint configuration: eslint.config.js (ESLint v9+ format)
- Jest testing framework with coverage reporting
- CommonJS module system
- Node.js >= 14.0.0 requirement

### Testing
- Unit tests in __tests__/ipsafe.test.js
- Mocking of fs, child_process, and HTTP modules
- Coverage tracking for lib/ and bin/ directories
- 11 test cases covering all major functionality

### Scripts
- `npm test` - Run Jest unit tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues

## Development Workflow

### Before Committing
Always run these commands to ensure code quality:
```bash
npm run lint
npm test
```

### Testing the CLI
Test the CLI tool locally:
```bash
node bin/ipsafe.js "echo 'Test command'"
```

## Future Enhancements Roadmap
1. API response validation (check specific parameters)
2. Multiple test endpoints support
3. Connection quality metrics
4. Exponential backoff retry strategy
5. Command-type specific validation strategies

## Package Information
- Package name: ipsafe
- Author: nocoo
- License: MIT
- Main entry: bin/ipsafe.js
- Keywords: cli, network, connectivity, safe, command

## File Structure
```
ipsafe/
├── bin/ipsafe.js           # CLI executable
├── lib/ipsafe.js           # Core logic
├── __tests__/ipsafe.test.js # Unit tests
├── ipsafe.config.json      # Default config
├── eslint.config.js        # ESLint configuration
├── jest.config.js          # Jest configuration
├── package.json            # Package definition
├── LICENSE                 # MIT license
├── README.md               # Documentation
└── .claude/CLAUDE.md       # This knowledge file
```

## Troubleshooting

### Common Issues
1. **ESLint errors**: Use `npm run lint:fix` to auto-fix
2. **Test failures**: Check mocking in tests, ensure proper async handling
3. **Timeout issues**: Adjust timeout in config for slow networks
4. **Permission denied**: Ensure bin/ipsafe.js is executable (`chmod +x`)

### Debug Commands
```bash
# Test connectivity manually
node -e "const IpSafe = require('./lib/ipsafe'); const ip = new IpSafe(); ip.testConnectivity({testUrl: 'https://www.google.com', timeout: 5000}).then(console.log).catch(console.error)"

# Check config loading
node -e "const IpSafe = require('./lib/ipsafe'); const ip = new IpSafe(); console.log(ip.loadConfig())"
```