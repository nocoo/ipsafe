# 🛡️ ipsafe

> A CLI tool that validates network connectivity and content before executing commands

[![npm version](https://badge.fury.io/js/ipsafe.svg)](https://badge.fury.io/js/ipsafe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 What is ipsafe?

`ipsafe` is a command-line safety net that checks your network connectivity and optionally validates response content before executing potentially network-dependent commands. It helps prevent failed operations and wasted time by verifying you have a stable internet connection and the expected service responses.

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
  "checkContent": false,
  "searchText": null,
  "searchType": "contains",
  "responseType": "auto",
  "followRedirects": true,
  "maxRedirects": 5,
  "headers": {}
}
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `testUrl` | `https://www.google.com` | URL to test connectivity against |
| `timeout` | `3000` | Request timeout in milliseconds |
| `retries` | `1` | Number of retry attempts |
| `checkContent` | `false` | Enable content validation |
| `searchText` | `null` | Text/pattern to search for in response |
| `searchType` | `contains` | Search method: `contains` or `regex` |
| `responseType` | `auto` | Response type: `auto`, `html`, or `json` |
| `followRedirects` | `true` | Follow HTTP redirects |
| `maxRedirects` | `5` | Maximum redirects to follow |
| `headers` | `{}` | Custom HTTP headers |

## 🔧 Connectivity and Validation Rules

The tool considers validation **successful** when:
- ✅ The test URL responds with HTTP status 200-399
- ✅ Response is received within the timeout period
- ✅ No network errors occur
- ✅ Content validation passes (if enabled)

The tool considers validation **failed** when:
- ❌ HTTP status 400+ is received
- ❌ Request times out
- ❌ Network errors (DNS resolution, connection refused, etc.)
- ❌ Content validation fails (if enabled)
- ❌ All retry attempts are exhausted

### Content Validation

When `checkContent` is enabled, the tool will:
- Download the response content
- Apply the specified search method (`contains` or `regex`)
- Validate the `searchText` exists in the response
- Support both HTML and JSON response types

## 🛠️ Development

### Prerequisites
- Node.js >= 14.0.0

### Setup
```bash
git clone <repository-url>
cd ipsafe
npm install
```

### Scripts
```bash
npm test          # Run unit tests
npm run lint      # Run ESLint
npm run lint:fix  # Fix linting issues
```

### Project Structure
```
ipsafe/
├── bin/
│   └── ipsafe.js       # CLI entry point
├── lib/
│   └── ipsafe.js       # Core logic
├── __tests__/
│   └── ipsafe.test.js  # Unit tests
├── ipsafe.config.json  # Default configuration
└── package.json
```

## 🧪 Testing

The project includes comprehensive unit tests using Jest:

```bash
npm test
```

Coverage report is generated in the `coverage/` directory.

## 🌟 Advanced Usage Examples

### Basic Connectivity Check
```json
{
  "testUrl": "https://www.google.com",
  "timeout": 3000
}
```

### API Health Check with JSON Content Validation
```json
{
  "testUrl": "https://api.github.com/status",
  "checkContent": true,
  "searchText": "good",
  "searchType": "contains",
  "responseType": "json"
}
```

### Website Content Validation with Regex
```json
{
  "testUrl": "https://example.com",
  "checkContent": true,
  "searchText": "Welcome.*Home",
  "searchType": "regex",
  "responseType": "html"
}
```

### Custom Headers and Authentication
```json
{
  "testUrl": "https://api.private.com/health",
  "headers": {
    "Authorization": "Bearer your-token",
    "Accept": "application/json"
  },
  "checkContent": true,
  "searchText": "healthy"
}
```

## 📝 Future Enhancements

- 🌐 Multiple test endpoints
- 📊 Connection quality metrics
- 🔄 Automatic retry with exponential backoff
- 📱 Different validation strategies per command type

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Run linter: `npm run lint`
6. Commit changes: `git commit -am 'Add feature'`
7. Push to branch: `git push origin feature-name`
8. Submit a pull request

## 📄 License

MIT © [nocoo](https://github.com/nocoo)

## 💡 Why ipsafe?

Have you ever started a long-running `npm install` only to realize you're offline? Or initiated a `git push` that hangs because of network issues? `ipsafe` solves these frustrations by providing a quick connectivity check before executing your commands.

Perfect for:
- 🏠 Remote work with unstable connections
- ✈️ Working while traveling
- 🔄 CI/CD pipelines that need network and service validation
- 🛡️ Any script that depends on internet connectivity
- 🏥 Health checks for APIs and services
- 🔍 Content validation for web scraping scripts