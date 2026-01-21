# SAR/TAR MCP Tooling System

A collection of Model Context Protocol (MCP) servers for SAR/TAR test automation in Cloud ERP integration testing. Run tests, capture HTTP traffic, validate TAR files, and analyze results through MCP tools.

## Features

- **SAR Test MCP**: Run TAR tests using ScriptARest.exe, validate files, analyze results
- **HTTP Capture MCP**: Capture HTTP traffic using headless Playwright browser automation
- **OpenAPI MCP**: Parse OpenAPI specs and extract Cloud ERP service metadata
- **34 Powerful Tools**: Complete test execution, validation, browser automation, API discovery, and data capture
- **Result Analysis**: Parse test output, identify errors, suggest fixes
- **Security**: Domain allowlist, header redaction, audit logging

## Prerequisites

- Node.js v20.0.0 or higher
- npm or pnpm package manager
- ScriptARest.exe (for SAR Test MCP - test execution)
- Access to Cloud ERP server (for test execution)

## Available MCP Servers

| Server | npm Package | Bundle Size | Description |
|--------|-------------|-------------|-------------|
| **SAR Test MCP** | `@dilina0914/sar-test-mcp` | ~87 KB | Run and validate SAR/TAR test files |
| **HTTP Capture MCP** | `@dilina0914/http-capture-mcp` | ~63 KB | Capture HTTP traffic with browser automation |
| **OpenAPI MCP** | `@dilina0914/openapi-mcp` | ~35 KB | Parse OpenAPI specs and extract metadata |

All packages are **fully bundled** with enterprise-grade practices:
- Tree-shaking for minimal bundle size
- Source maps for debugging
- ESM module format
- Node.js 20+ target

---

## Integration Options

Choose the integration method that works best for your workflow:

### Option 1: VS Code Integration

Integrate the MCP servers into VS Code to use tools directly in your editor.

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
    },
    "http-capture": {
      "command": "npx",
      "args": [
        "-y",
        "@dilina0914/http-capture-mcp@6.0.0"
      ],
      "env": {
        "BROWSER_HEADLESS": "true",
        "LOG_LEVEL": "info"
      }
    },
    "openapi": {
      "command": "npx",
      "args": [
        "-y",
        "@dilina0914/openapi-mcp@6.0.0"
      ],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Step 3: Configure environment variables**

#### SAR Test MCP Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SAR_SCRIPT_A_REST_PATH` | Full path to ScriptARest.exe | Yes (for running tests) |
| `SAR_SERVER_URL` | Cloud ERP server URL | Yes (for running tests) |
| `SAR_USERNAME` | Authentication username | Yes (for running tests) |
| `SAR_PASSWORD` | Authentication password | Yes (for running tests) |
| `SAR_TIMEOUT_MS` | Timeout in milliseconds | No (default: 600000) |

#### HTTP Capture MCP Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `BROWSER_HEADLESS` | Run browser in headless mode | No | `true` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No | `info` |
| `MAX_CAPTURE_SIZE_MB` | Max response body size to capture | No | `10` |
| `MAX_SESSIONS` | Maximum concurrent browser sessions | No | `5` |

#### OpenAPI MCP Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No | `info` |
| `AUDIT_LOG_ENABLED` | Enable audit logging | No | `true` |
| `AUDIT_LOG_DIR` | Directory for audit logs | No | `./logs/audit` |

**Step 4: Restart VS Code**

Close and reopen VS Code to load the MCP server configuration.

---

### Option 2: Cursor IDE Integration

Cursor IDE has built-in support for MCP servers, making integration straightforward.

**Step 1: Open Cursor Settings**

1. Open Cursor IDE
2. Go to Settings (File > Preferences > Settings or Ctrl/Cmd + ,)
3. Search for "MCP" or navigate to the MCP configuration section

**Step 2: Add MCP Server Configuration**

In the MCP settings, add the servers with the following configuration:

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
    },
    "http-capture": {
      "command": "npx",
      "args": [
        "-y",
        "@dilina0914/http-capture-mcp@6.0.0"
      ],
      "env": {
        "BROWSER_HEADLESS": "true",
        "LOG_LEVEL": "info",
        "MAX_CAPTURE_SIZE_MB": "10"
      }
    },
    "openapi": {
      "command": "npx",
      "args": [
        "-y",
        "@dilina0914/openapi-mcp@6.0.0"
      ],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Example: SAR Test MCP Only**

```json
{
  "mcpServers": {
    "sar-test": {
      "command": "npx",
      "args": ["-y", "@dilina0914/sar-test-mcp@6.0.0"],
      "env": {
        "SAR_SCRIPT_A_REST_PATH": "C:\\Users\\YourName\\Downloads\\ScriptARest\\ScriptARest.exe",
        "SAR_SERVER_URL": "https://your-erp-server.example.com",
        "SAR_USERNAME": "your_username",
        "SAR_PASSWORD": "your_password"
      }
    }
  }
}
```

**Example: HTTP Capture MCP with Visible Browser (for debugging)**

```json
{
  "mcpServers": {
    "http-capture": {
      "command": "npx",
      "args": ["-y", "@dilina0914/http-capture-mcp@6.0.0"],
      "env": {
        "BROWSER_HEADLESS": "false",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

**Example: OpenAPI MCP Only**

```json
{
  "mcpServers": {
    "openapi": {
      "command": "npx",
      "args": ["-y", "@dilina0914/openapi-mcp@6.0.0"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Step 3: Save and Restart**

Save the configuration and restart Cursor IDE to activate the MCP servers.

---

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
    },
    "http-capture": {
      "command": "npx",
      "args": ["-y", "@dilina0914/http-capture-mcp@6.0.0"],
      "env": {
        "BROWSER_HEADLESS": "true",
        "LOG_LEVEL": "info"
      }
    },
    "openapi": {
      "command": "npx",
      "args": ["-y", "@dilina0914/openapi-mcp@6.0.0"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

---

### Option 4: Local Development

Run the servers directly for development or testing.

**Step 1: Clone and Install**

```bash
git clone https://github.com/dilinaweerasinghe/integration-testing-mcp.git
cd integration-testing-mcp
pnpm install
```

**Step 2: Build the packages**

```bash
pnpm build
```

**Step 3: Configure Environment Variables**

Windows (PowerShell):
```powershell
# SAR Test MCP
$env:SAR_SCRIPT_A_REST_PATH = "C:\Path\To\ScriptARest.exe"
$env:SAR_SERVER_URL = "https://your-erp-server.com"
$env:SAR_USERNAME = "your_username"
$env:SAR_PASSWORD = "your_password"

# HTTP Capture MCP
$env:BROWSER_HEADLESS = "true"
$env:LOG_LEVEL = "info"
```

Windows (Command Prompt):
```cmd
:: SAR Test MCP
set SAR_SCRIPT_A_REST_PATH=C:\Path\To\ScriptARest.exe
set SAR_SERVER_URL=https://your-erp-server.com
set SAR_USERNAME=your_username
set SAR_PASSWORD=your_password

:: HTTP Capture MCP
set BROWSER_HEADLESS=true
set LOG_LEVEL=info
```

Linux/macOS:
```bash
# SAR Test MCP
export SAR_SCRIPT_A_REST_PATH="/path/to/ScriptARest"
export SAR_SERVER_URL="https://your-erp-server.com"
export SAR_USERNAME="your_username"
export SAR_PASSWORD="your_password"

# HTTP Capture MCP
export BROWSER_HEADLESS="true"
export LOG_LEVEL="info"
```

**Step 4: Install Playwright browsers (for HTTP Capture MCP)**

```bash
npx playwright install chromium
```

**Step 5: Run the MCP servers**

```bash
# Run SAR Test MCP
node packages/mcps/tar-validator-mcp/dist/index.js

# Run HTTP Capture MCP
node packages/mcps/http-capture-mcp/dist/index.js

# Run OpenAPI MCP
node packages/mcps/openapi-mcp/dist/index.js
```

Or use the package scripts:

```bash
pnpm mcp:sar-test
pnpm mcp:http-capture
pnpm mcp:openapi
```

---

## Quick Troubleshooting

### ScriptARest Not Found

**Error:** `ScriptARest.exe not found at: <path>`

**Solution:**
- Verify the path in `SAR_SCRIPT_A_REST_PATH` is correct
- Use absolute paths, not relative paths
- On Windows, use double backslashes (`\\`) or forward slashes (`/`)

### Authentication Failed

**Error:** `401 Unauthorized` or `Connection failed: Invalid credentials`

**Solution:**
- Verify `SAR_USERNAME` and `SAR_PASSWORD` are correct
- Check if the user has access to the Cloud ERP server
- Verify the server URL is correct and accessible

### Browser Not Found

**Error:** `browserType.launch: Executable doesn't exist`

**Solution:**
- Install Playwright browsers: `npx playwright install chromium`
- Ensure you have sufficient disk space
- On Linux, install required dependencies: `npx playwright install-deps`

### Environment Variable Issues

**Error:** `Test runner not configured` or variables not recognized

**Solution:**
- Restart your IDE after setting environment variables
- For VS Code/Cursor: Ensure variables are in the `mcp.json` file
- Verify the JSON syntax in your configuration file (check for missing commas, quotes)

### Session Not Found

**Error:** `Session not found: <sessionId>`

**Solution:**
- Ensure you're using the correct session ID from `openUrl`
- Check if the session was closed or timed out
- Use `listSessions` to see active sessions

### Spec Not Found

**Error:** `Spec not found: <specId>. Use loadSpec first.`

**Solution:**
- Load the spec first using the `loadSpec` tool
- Verify the specId returned from `loadSpec`
- Specs are stored in memory and lost when server restarts

### Invalid OpenAPI Spec

**Error:** `Failed to parse OpenAPI spec`

**Solution:**
- Verify the file is valid JSON or YAML
- Ensure it's a valid OpenAPI 3.0 specification
- Check file path or URL accessibility

---

## What's Included

### SAR Test MCP Tools (10 total)

#### Test Execution

| Tool | Description |
|------|-------------|
| `configureRunner` | Configure ScriptARest path and credentials |
| `runTest` | Execute a TAR test file and get results |
| `analyzeResults` | Analyze raw ScriptARest output |
| `getRunnerStatus` | Check runner configuration status |

#### Validation

| Tool | Description |
|------|-------------|
| `validateFile` | Full validation of a .mkd file |
| `validateContent` | Validate TAR content from string input |
| `validateSuite` | Validate all .mkd files in a directory |
| `checkAaaStructure` | Check Arrange-Act-Assert structure |
| `checkCommands` | Validate TAR command syntax |
| `getValidationRules` | Get current validation rules |

### HTTP Capture MCP Tools (17 total)

#### Session Management

| Tool | Description |
|------|-------------|
| `openUrl` | Opens URL and starts capturing HTTP traffic |
| `closeBrowser` | Closes browser session and clears data |
| `listSessions` | Lists all active capture sessions |
| `clearCapturedRequests` | Clears captured requests for session |

#### Page Interaction

| Tool | Description |
|------|-------------|
| `click` | Clicks an element by selector or text |
| `fill` | Fills an input field with text |
| `type` | Types text with keyboard events |
| `selectOption` | Selects option in dropdown |
| `check` / `uncheck` | Toggle checkboxes/radio buttons |
| `pressKey` | Press a keyboard key |
| `waitForSelector` | Wait for element to appear |
| `waitForModal` | Wait for modal/dialog to appear |

#### Form Handling

| Tool | Description |
|------|-------------|
| `fillForm` | Fill multiple form fields at once |
| `getFormFields` | Get all form fields in a container |
| `submitForm` | Submit a form |

#### Data Capture

| Tool | Description |
|------|-------------|
| `getCapturedRequests` | Get all captured HTTP requests |
| `getPageInfo` | Get page URL, title, and visible elements |
| `screenshot` | Take a screenshot |
| `evaluate` | Execute JavaScript in page context |

### OpenAPI MCP Tools (7 total)

#### Spec Management

| Tool | Description |
|------|-------------|
| `loadSpec` | Load an OpenAPI spec from file path or URL |
| `unloadSpec` | Unload a previously loaded spec from memory |

#### Endpoint Discovery

| Tool | Description |
|------|-------------|
| `listEndpoints` | List all API endpoints with filtering options |
| `getOperationDetails` | Get full operation details by ID or path/method |
| `searchOperations` | Search operations by query, tag, or entity name |

#### Schema Extraction

| Tool | Description |
|------|-------------|
| `listSchemas` | List all schemas/entities defined in the spec |
| `getEntitySchema` | Extract detailed entity schema with data types |

---

## Security Features

- **Credential Protection**: Passwords are never exposed in responses or logs
- **Domain Allowlist**: Configurable allowed domains for HTTP capture
- **Header Redaction**: Automatic removal of sensitive headers (Authorization, Cookie, etc.)
- **Body Redaction**: Pattern-based redaction of passwords and tokens
- **Session Isolation**: Fresh browser context per session
- **Audit Logging**: Complete audit trail of all operations
- **Input Validation**: File paths and parameters are validated

---

## Project Structure

```
SAR-MCP/
├── config/                         # Configuration files
│   ├── mcp-servers.json            # MCP server registration
│   ├── security.json               # Security settings
│   └── tar-validation-rules.json   # Validation rules
├── docs/                           # Documentation
│   └── PUBLISHING.md               # npm publishing guide
├── packages/
│   ├── mcps/                       # MCP servers
│   │   ├── http-capture-mcp/       # HTTP Capture MCP
│   │   ├── openapi-mcp/            # OpenAPI MCP
│   │   └── tar-validator-mcp/      # SAR Test MCP
│   └── shared/                     # Shared libraries
│       ├── mcp-core/               # MCP base classes
│       ├── security/               # Security utilities
│       └── logging/                # Logging utilities
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

---

## Development

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @dilina0914/sar-test-mcp build
pnpm --filter @dilina0914/http-capture-mcp build
pnpm --filter @dilina0914/openapi-mcp build
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter @dilina0914/sar-test-mcp test
```

### Linting

```bash
pnpm lint
pnpm format
```

---

## License


## Links

- **GitHub Repository**: https://github.com/dilinaweerasinghe/integration-testing-mcp
- **SAR Test MCP npm**: https://www.npmjs.com/package/@dilina0914/sar-test-mcp
- **HTTP Capture MCP npm**: https://www.npmjs.com/package/@dilina0914/http-capture-mcp
- **OpenAPI MCP npm**: https://www.npmjs.com/package/@dilina0914/openapi-mcp
- **Issues**: https://github.com/dilinaweerasinghe/integration-testing-mcp/issues

