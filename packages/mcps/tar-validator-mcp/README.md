# SAR Test MCP Server

A Model Context Protocol (MCP) server for running and validating SAR/TAR test files for Cloud ERP integration testing. Execute tests, analyze results, validate syntax, and get fix suggestions through MCP tools.

[![npm version](https://img.shields.io/npm/v/@dilina0914/sar-test-mcp.svg)](https://www.npmjs.com/package/@dilina0914/sar-test-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

## Features

- **Test Execution**: Run TAR test files using ScriptARest.exe command line tool
- **10 Powerful Tools**: Complete test execution, validation, result analysis, and fix suggestions
- **Output Parsing**: Parse ScriptARest output to extract test results, errors, and performance metrics
- **Error Detection**: Identify 404, 401, 422, 500 errors with context-aware fix suggestions
- **TAR Validation**: Validate syntax, structure, commands, and AAA patterns
- **Performance Analysis**: Track server call statistics and identify slow operations

## Prerequisites

- Node.js v20.0.0 or higher
- npm or pnpm package manager
- ScriptARest.exe (for test execution)
- Access to Cloud ERP server (for test execution)

## Package Information

This package is **fully bundled** - all internal dependencies are included.

| Property | Value |
|----------|-------|
| **Bundle Size** | ~87 KB |
| **Node.js** | ≥20.0.0 |
| **Module Type** | ESM |
| **TypeScript** | Included |

### Peer Dependencies

The following dependencies are required and must be installed separately (or will be auto-installed):

```bash
# Auto-installed when using npx
@modelcontextprotocol/sdk ^1.0.0
```

## Integration Options

Choose the integration method that works best for your workflow:

### Option 1: VS Code Integration

Integrate the MCP server into VS Code to use test tools directly in your editor.

**Step 1: Create the MCP configuration folder**

In your project root directory, create a `.vscode` folder:

```bash
mkdir .vscode
```

**Step 2: Create the MCP configuration file**

Inside the `.vscode` folder, create a file named `mcp.json` with the following content:

```json
{
  "servers": {
    "sar-test": {
      "command": "npx",
      "args": [
        "-y",
        "@dilina0914/sar-test-mcp@6.0.0"
      ],
      "env": {
        "SAR_SCRIPT_A_REST_PATH": "C:\\Path\\To\\ScriptARest.exe",
        "SAR_SERVER_URL": "https://your-erp-server.com",
        "SAR_USERNAME": "your_username",
        "SAR_PASSWORD": "your_password"
      }
    }
  }
}
```

**Step 3: Configure environment variables**

| Variable | Description | Required |
|----------|-------------|----------|
| `SAR_SCRIPT_A_REST_PATH` | Full path to ScriptARest.exe | Yes (for running tests) |
| `SAR_SERVER_URL` | Cloud ERP server URL | Yes (for running tests) |
| `SAR_USERNAME` | Authentication username | Yes (for running tests) |
| `SAR_PASSWORD` | Authentication password | Yes (for running tests) |
| `SAR_TIMEOUT_MS` | Timeout in milliseconds | No (default: 600000) |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No (default: info) |

**Step 4: Restart VS Code**

Close and reopen VS Code to load the MCP server configuration.

### Option 2: Cursor IDE Integration

Cursor IDE has built-in support for MCP servers, making integration straightforward.

**Step 1: Open Cursor Settings**

1. Open Cursor IDE
2. Go to Settings (File > Preferences > Settings or Ctrl/Cmd + ,)
3. Search for "MCP" or navigate to the MCP configuration section

**Step 2: Add MCP Server Configuration**

In the MCP settings, add a new server with the following configuration:

```json
{
  "mcpServers": {
    "sar-test": {
      "command": "npx",
      "args": [
        "-y",
        "@dilina0914/sar-test-mcp@6.0.0"
      ],
      "env": {
        "SAR_SCRIPT_A_REST_PATH": "C:\\Path\\To\\ScriptARest.exe",
        "SAR_SERVER_URL": "https://your-erp-server.com",
        "SAR_USERNAME": "your_username",
        "SAR_PASSWORD": "your_password",
        "SAR_TIMEOUT_MS": "600000"
      }
    }
  }
}
```

**Step 3: Save and Restart**

Save the configuration and restart Cursor IDE to activate the MCP server.

### Option 3: Claude Desktop Integration

Add to your Claude Desktop configuration file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sar-test": {
      "command": "npx",
      "args": ["-y", "@dilina0914/sar-test-mcp@6.0.0"],
      "env": {
        "SAR_SCRIPT_A_REST_PATH": "C:\\Path\\To\\ScriptARest.exe",
        "SAR_SERVER_URL": "https://your-erp-server.com",
        "SAR_USERNAME": "your_username",
        "SAR_PASSWORD": "your_password"
      }
    }
  }
}
```

### Option 4: Local Development

Run the server directly for development or testing.

**Step 1: Install the package**

```bash
npm install @dilina0914/sar-test-mcp
```

**Step 2: Configure environment variables**

Windows (PowerShell):
```powershell
$env:SAR_SCRIPT_A_REST_PATH = "C:\Path\To\ScriptARest.exe"
$env:SAR_SERVER_URL = "https://your-erp-server.com"
$env:SAR_USERNAME = "your_username"
$env:SAR_PASSWORD = "your_password"
```

Windows (Command Prompt):
```cmd
set SAR_SCRIPT_A_REST_PATH=C:\Path\To\ScriptARest.exe
set SAR_SERVER_URL=https://your-erp-server.com
set SAR_USERNAME=your_username
set SAR_PASSWORD=your_password
```

Linux/macOS:
```bash
export SAR_SCRIPT_A_REST_PATH="/path/to/ScriptARest"
export SAR_SERVER_URL="https://your-erp-server.com"
export SAR_USERNAME="your_username"
export SAR_PASSWORD="your_password"
```

**Step 3: Run the server**

```bash
npx @dilina0914/sar-test-mcp
```

## Quick Troubleshooting

### ScriptARest Not Found

**Error:** `ScriptARest.exe not found at: <path>`

**Solution:**
- Verify the path in `SAR_SCRIPT_A_REST_PATH` is correct
- Use absolute paths, not relative paths
- On Windows, use double backslashes (`\\`) or forward slashes (`/`)
- Ensure ScriptARest.exe has execute permissions

### Connection Issues

**Error:** `Connection failed: Invalid credentials` or `401 Unauthorized`

**Solution:**
- Verify `SAR_USERNAME` and `SAR_PASSWORD` are correct
- Check if the user has access to the Cloud ERP server
- Verify the server URL is correct and accessible

### Test File Not Found

**Error:** `Test file not found: <path>`

**Solution:**
- Verify the file path is correct
- Use absolute paths for test files
- Check file permissions

### Timeout Errors

**Error:** `Test execution timed out`

**Solution:**
- Increase `SAR_TIMEOUT_MS` (default: 600000 = 10 minutes)
- Check if the server is responding slowly
- Verify network connectivity

### Environment Variable Issues

**Error:** `Test runner not configured`

**Solution:**
- Restart your IDE after setting environment variables
- For VS Code/Cursor: Ensure variables are in the `mcp.json` file
- Verify the JSON syntax in your configuration file
- Use `getRunnerStatus` tool to check configuration

## What's Included

### MCP Tools (10 total)

#### Test Execution Tools

| Tool | Description |
|------|-------------|
| `configureRunner` | Configure ScriptARest path and server credentials |
| `runTest` | Execute a TAR test file and get parsed results |
| `analyzeResults` | Analyze raw ScriptARest output |
| `getRunnerStatus` | Check runner configuration status |

#### Validation Tools

| Tool | Description |
|------|-------------|
| `validateFile` | Full validation of a .mkd file against SAR/TAR standards |
| `validateContent` | Validate TAR content from string input |
| `validateSuite` | Validate all .mkd files in a directory |
| `checkAaaStructure` | Check Arrange-Act-Assert structure (Test Cases) |
| `checkCommands` | Validate TAR command syntax and usage |
| `getValidationRules` | Get current validation rules and settings |

### Supported TAR File Types

| Type | Description | AAA Required |
|------|-------------|--------------|
| Test Data | Setup/cleanup data scripts | No |
| Test Util | Reusable utility scripts | No |
| Test Case | Individual test with assertions | Yes |
| Test Suite | Collection of test cases | No |
| Test Collection | Collection of test suites | No |

### Error Detection

The MCP detects and provides suggestions for:

| Error Type | HTTP Code | Description |
|------------|-----------|-------------|
| Not Found | 404 | Missing entities or incorrect URLs |
| Unauthorized | 401 | Authentication failures |
| Validation | 422 | Business rule violations |
| Server Error | 500 | Backend issues |
| Assert Failed | - | Test assertion mismatches |
| High Failure Rate | - | Data dependency issues (>10% failures) |

### Output Parsing

Parses ScriptARest output to extract:

- Test name, status, and execution time
- Server call counts (total, failed)
- Assert counts (total, failed)
- Exception counts
- Individual command results with HTTP status codes
- Server call performance statistics (count, avg, min, max)

## Tool Examples

### Run a Test

```json
{
  "tool": "runTest",
  "arguments": {
    "filePath": "C:\\tests\\CreateCustomer.mkd"
  }
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "testName": "CreateCustomer",
    "status": "Passed",
    "timeSeconds": 12.5,
    "serverCalls": 5,
    "failedServerCalls": 0,
    "asserts": 2,
    "failedAsserts": 0,
    "exceptions": 0
  },
  "errors": [],
  "warnings": [],
  "analysis": {
    "summary": "Test CreateCustomer passed successfully in 12.50s with 5 server calls.",
    "issues": []
  }
}
```

### Validate a File

```json
{
  "tool": "validateFile",
  "arguments": {
    "filePath": "C:\\tests\\CreateCustomer.mkd",
    "strictMode": true
  }
}
```

### Analyze Test Output

```json
{
  "tool": "analyzeResults",
  "arguments": {
    "rawOutput": "IFS Script-A-Rest v 2.4.0\n..."
  }
}
```

### Check Runner Status

```json
{
  "tool": "getRunnerStatus",
  "arguments": {}
}
```

**Response:**
```json
{
  "configured": true,
  "config": {
    "scriptARestPath": "C:\\Path\\To\\ScriptARest.exe",
    "serverUrl": "https://your-erp-server.com",
    "username": "your_username",
    "hasPassword": true,
    "timeoutMs": 600000
  },
  "validation": {
    "valid": true,
    "errors": []
  }
}
```

## Security Features

- **Credential Protection**: Passwords are never exposed in responses or logs
- **Input Validation**: File paths and parameters are validated
- **Audit Logging**: Complete audit trail of tool invocations
- **Timeout Protection**: Configurable timeouts prevent runaway processes

## License

MIT

## Links

- **GitHub Repository**: https://github.com/dilinaweerasinghe/integration-testing-mcp
- **npm Package**: https://www.npmjs.com/package/@dilina0914/sar-test-mcp
- **Issues**: https://github.com/dilinaweerasinghe/integration-testing-mcp/issues

## Support

Open an issue on the GitHub repository for support.
