# 🛡️ ipsafe

> A simple CLI tool that validates network connectivity before executing commands

[![npm version](https://badge.fury.io/js/ipsafe.svg)](https://badge.fury.io/js/ipsafe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 What is ipsafe?

`ipsafe` is a command-line tool that checks a network condition before executing any command. If the condition passes, it executes the command. If the condition fails, it blocks execution.

**Default behavior**: Fetches `https://www.google.com` and checks if the HTTP status code is 2xx.

## 📦 Installation

```bash
npm install -g ipsafe
```

## 🎯 Usage

Simply prefix any command with `ipsafe`:

```bash
# Check connectivity before npm install
ipsafe "npm install"

# Verify connection before git operations  
ipsafe "git push origin main"

# Safe API calls
ipsafe "curl https://api.example.com/data"
```

### Output Example

```bash
$ ipsafe "npm install"
Checking network connectivity to https://www.google.com...
✓ Network connectivity verified
Executing: npm install
# ... npm install output
```

## ⚙️ Configuration

Create an `ipsafe.config.json` file in your project root to customize the connectivity check:

```json
{
  "testUrl": "https://www.google.com",
  "timeout": 3000,
  "retries": 1,
  "method": "GET",
  "userAgent": "ipsafe/1.0.2",
  "checkContent": false,
  "searchText": null,
  "searchType": "contains",
  "headers": {}
}
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `testUrl` | `https://www.google.com` | URL to test connectivity against |
| `timeout` | `3000` | Request timeout in milliseconds |
| `retries` | `1` | Number of retry attempts |
| `method` | `GET` | HTTP method to use |
| `userAgent` | `ipsafe/1.0.2` | User-Agent header |
| `checkContent` | `false` | Enable content validation |
| `searchText` | `null` | Text/pattern to search for in response |
| `searchType` | `contains` | Search method: `contains` or `regex` |
| `headers` | `{}` | Custom HTTP headers |

## 🔧 How it Works

1. **Condition Check**: Makes HTTP request to configured URL
2. **Status Validation**: Verifies HTTP status code is 2xx (200-299)
3. **Content Validation** (optional): Searches for specific text/pattern in response
4. **Command Execution**: If all checks pass, executes the provided command
5. **Blocking**: If any check fails, blocks command execution

## 📝 Examples

### Basic Usage (Default Google Check)
```bash
# Uses default https://www.google.com check
ipsafe "npm install express"
```

### Custom URL Check
```json
{
  "testUrl": "https://api.github.com"
}
```

### IP Location Service Example
```json
{
  "testUrl": "https://iplocate.io/api/lookup",
  "method": "GET",
  "checkContent": true,
  "searchText": "ip",
  "searchType": "contains",
  "headers": {
    "Accept": "application/json"
  }
}
```

### Content Validation with Regex
```json
{
  "testUrl": "https://httpbin.org/json",
  "checkContent": true,
  "searchText": "\"slideshow\".*\"title\"",
  "searchType": "regex"
}
```

### Custom Headers and Authentication
```json
{
  "testUrl": "https://api.private.com/health",
  "headers": {
    "Authorization": "Bearer your-api-key",
    "Accept": "application/json"
  },
  "checkContent": true,
  "searchText": "healthy"
}
```

## ✅ Success Conditions

The tool considers the condition **successful** when:
- HTTP status code is 2xx (200-299)
- Response is received within timeout period
- No network errors occur
- Content validation passes (if enabled)

## ❌ Failure Conditions

The tool considers the condition **failed** when:
- HTTP status code is not 2xx
- Request times out
- Network errors (DNS resolution, connection refused, etc.)
- Content validation fails (if enabled)
- All retry attempts are exhausted

## 🛠️ Development

```bash
git clone <repository-url>
cd ipsafe
npm install
npm test          # Run tests
npm run lint      # Run linter
```

## 📄 License

MIT © [nocoo](https://github.com/nocoo)

## 💡 Why ipsafe?

Have you ever started a long-running command only to realize you're offline? `ipsafe` prevents this frustration by checking connectivity first.

Perfect for:
- 🏠 Remote work with unstable connections
- ✈️ Working while traveling  
- 🔄 CI/CD pipelines requiring network validation
- 🛡️ Any script that depends on internet connectivity