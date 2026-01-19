# HTTP Capture MCP Server

A Model Context Protocol (MCP) server for capturing HTTP traffic using headless Playwright browser automation. Navigate pages, interact with elements, fill forms, and capture API calls with payloads and responses through MCP tools.

[![npm version](https://img.shields.io/npm/v/@dilina0914/http-capture-mcp.svg)](https://www.npmjs.com/package/@dilina0914/http-capture-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

## Features

- **HTTP Traffic Capture**: Intercept and capture all HTTP requests/responses with full payloads
- **17 Powerful Tools**: Complete browser automation, form handling, and data capture
- **Browser Automation**: Navigate pages, click elements, fill forms, handle modals
- **API Interception**: Capture API calls triggered by user interactions
- **Form Interactions**: Handle text inputs, dropdowns, checkboxes, and form submissions
- **Screenshots**: Capture screenshots during automation for debugging

## Prerequisites

- Node.js v20.0.0 or higher
- npm or pnpm package manager
- Playwright browsers (see installation below)

## Package Information

This package is **fully bundled** - all internal dependencies are included.

| Property | Value |
|----------|-------|
| **Bundle Size** | ~63 KB |
| **Node.js** | ≥20.0.0 |
| **Module Type** | ESM |
| **TypeScript** | Included |

### Peer Dependencies

The following dependencies are required and must be installed separately:

```bash
# Required: Install Playwright
npm install playwright
npx playwright install chromium

# Auto-installed when using npx
@modelcontextprotocol/sdk ^1.0.0
```

**Note:** Playwright browsers (~200MB) need to be installed separately. Run `npx playwright install chromium` after installation.

## Integration Options

Choose the integration method that works best for your workflow:

### Option 1: VS Code Integration

Integrate the MCP server into VS Code to use HTTP capture tools directly in your editor.

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
    "http-capture": {
      "command": "npx",
      "args": [
        "-y",
        "@dilina0914/http-capture-mcp@3.0.0"
      ],
      "env": {
        "BROWSER_HEADLESS": "true",
        "LOG_LEVEL": "info",
        "MAX_CAPTURE_SIZE_MB": "10"
      }
    }
  }
}
```

**Step 3: Configure environment variables**

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `BROWSER_HEADLESS` | Run browser in headless mode | No | `true` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No | `info` |
| `MAX_CAPTURE_SIZE_MB` | Max response body size to capture in MB | No | `10` |
| `MAX_SESSIONS` | Maximum concurrent browser sessions | No | `5` |
| `AUDIT_LOG_ENABLED` | Enable audit logging | No | `true` |
| `AUDIT_LOG_DIR` | Audit log directory | No | `./logs/audit` |

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
    "http-capture": {
      "command": "npx",
      "args": [
        "-y",
        "@dilina0914/http-capture-mcp@3.0.0"
      ],
      "env": {
        "BROWSER_HEADLESS": "true",
        "LOG_LEVEL": "info",
        "MAX_CAPTURE_SIZE_MB": "10"
      }
    }
  }
}
```

Example with visible browser (for debugging):

```json
{
  "mcpServers": {
    "http-capture": {
      "command": "npx",
      "args": ["-y", "@dilina0914/http-capture-mcp@3.0.0"],
      "env": {
        "BROWSER_HEADLESS": "false",
        "LOG_LEVEL": "debug"
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
    "http-capture": {
      "command": "npx",
      "args": ["-y", "@dilina0914/http-capture-mcp@3.0.0"],
      "env": {
        "BROWSER_HEADLESS": "true",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Option 4: Local Development

Run the server directly for development or testing.

**Step 1: Install the package**

```bash
npm install @dilina0914/http-capture-mcp
```

**Step 2: Install Playwright browsers**

```bash
npx playwright install chromium
```

**Step 3: Configure environment variables**

Windows (PowerShell):
```powershell
$env:BROWSER_HEADLESS = "true"
$env:LOG_LEVEL = "info"
$env:MAX_CAPTURE_SIZE_MB = "10"
```

Windows (Command Prompt):
```cmd
set BROWSER_HEADLESS=true
set LOG_LEVEL=info
set MAX_CAPTURE_SIZE_MB=10
```

Linux/macOS:
```bash
export BROWSER_HEADLESS="true"
export LOG_LEVEL="info"
export MAX_CAPTURE_SIZE_MB="10"
```

**Step 4: Run the server**

```bash
npx @dilina0914/http-capture-mcp
```

## Quick Troubleshooting

### Browser Not Found

**Error:** `browserType.launch: Executable doesn't exist`

**Solution:**
- Install Playwright browsers: `npx playwright install chromium`
- Ensure you have sufficient disk space
- On Linux, install required dependencies: `npx playwright install-deps`

### Page Not Loading

**Error:** `Navigation timeout` or page not responding

**Solution:**
- Check the URL is correct and accessible
- Increase timeout if the page loads slowly
- Verify network connectivity
- Check if the site blocks automated browsers

### Session Not Found

**Error:** `Session not found: <sessionId>`

**Solution:**
- Ensure you're using the correct session ID from `openUrl`
- Check if the session was closed or timed out
- Use `listSessions` to see active sessions

### Selector Not Found

**Error:** `Element not found` or `Timeout waiting for selector`

**Solution:**
- Verify the CSS selector is correct
- Use `getPageInfo` to see visible elements on the page
- Wait for the element to appear with `waitForSelector`
- Try alternative selectors (text, data attributes, etc.)

### Memory Issues

**Error:** `Out of memory` or browser crashes

**Solution:**
- Reduce `MAX_CAPTURE_SIZE_MB` to capture smaller responses
- Close unused sessions with `closeBrowser`
- Reduce `MAX_SESSIONS` limit
- Restart the server periodically

### Environment Variable Issues

**Error:** Configuration not applied

**Solution:**
- Restart your IDE after setting environment variables
- For VS Code/Cursor: Ensure variables are in the `mcp.json` file
- Verify the JSON syntax in your configuration file

## What's Included

### MCP Tools (17 total)

#### Session Management

| Tool | Description |
|------|-------------|
| `openUrl` | Opens URL and starts capturing HTTP traffic |
| `closeBrowser` | Closes browser session and clears captured data |
| `listSessions` | Lists all active capture sessions |
| `clearCapturedRequests` | Clears captured requests for a session |

#### Page Interaction

| Tool | Description |
|------|-------------|
| `click` | Clicks an element by CSS selector or text content |
| `fill` | Fills an input field with text |
| `type` | Types text with keyboard events (useful for autocomplete) |
| `selectOption` | Selects option in a dropdown/select element |
| `check` | Checks a checkbox or radio button |
| `uncheck` | Unchecks a checkbox |
| `pressKey` | Presses a keyboard key (Enter, Tab, Escape, etc.) |
| `waitForSelector` | Waits for an element to appear on the page |
| `waitForModal` | Waits for a modal/dialog to appear |

#### Form Handling

| Tool | Description |
|------|-------------|
| `fillForm` | Fills multiple form fields at once |
| `getFormFields` | Gets all form fields in a container |
| `submitForm` | Submits a form by clicking submit button or pressing Enter |

#### Data Capture

| Tool | Description |
|------|-------------|
| `getCapturedRequests` | Gets all captured HTTP requests with filters |
| `getPageInfo` | Gets page URL, title, and visible elements |
| `screenshot` | Takes a screenshot of the page |
| `evaluate` | Executes JavaScript in the page context |

### Captured Request Data

For each intercepted HTTP request, the following data is captured:

| Field | Description |
|-------|-------------|
| `method` | HTTP method (GET, POST, PUT, DELETE, etc.) |
| `url` | Full request URL |
| `requestHeaders` | Request headers (sensitive headers redacted) |
| `requestBody` | Request payload (for POST/PUT/PATCH) |
| `responseStatus` | HTTP status code |
| `responseHeaders` | Response headers |
| `responseBody` | Response body (up to MAX_CAPTURE_SIZE_MB) |
| `duration` | Request duration in milliseconds |
| `timestamp` | ISO timestamp of the request |

## Tool Examples

### Open URL and Capture Traffic

```json
{
  "tool": "openUrl",
  "arguments": {
    "url": "https://example.com/login",
    "waitForNetworkIdle": true
  }
}
```

**Response:**
```json
{
  "sessionId": "session-abc123",
  "pageTitle": "Login - Example",
  "pageUrl": "https://example.com/login",
  "capturedRequests": 5
}
```

### Click Button and Capture API

```json
{
  "tool": "click",
  "arguments": {
    "sessionId": "session-abc123",
    "selector": "#submit-button"
  }
}
```

### Fill a Form

```json
{
  "tool": "fillForm",
  "arguments": {
    "sessionId": "session-abc123",
    "containerSelector": "#loginForm",
    "fieldsJson": "[{\"selector\": \"#username\", \"value\": \"user@example.com\"}, {\"selector\": \"#password\", \"value\": \"secret\", \"type\": \"password\"}]"
  }
}
```

### Select Dropdown Option

```json
{
  "tool": "selectOption",
  "arguments": {
    "sessionId": "session-abc123",
    "selector": "#country",
    "value": "US"
  }
}
```

### Get Captured API Requests

```json
{
  "tool": "getCapturedRequests",
  "arguments": {
    "sessionId": "session-abc123",
    "filterUrl": "api",
    "filterMethod": "POST"
  }
}
```

**Response:**
```json
{
  "requests": [
    {
      "method": "POST",
      "url": "https://example.com/api/login",
      "requestHeaders": { "Content-Type": "application/json" },
      "requestBody": { "username": "user@example.com", "password": "[REDACTED]" },
      "responseStatus": 200,
      "responseBody": { "token": "jwt-token-here", "user": { "id": 123 } },
      "duration": 245
    }
  ]
}
```

### Take Screenshot

```json
{
  "tool": "screenshot",
  "arguments": {
    "sessionId": "session-abc123",
    "path": "C:\\screenshots\\login-page.png",
    "fullPage": true
  }
}
```

### Get Page Info

```json
{
  "tool": "getPageInfo",
  "arguments": {
    "sessionId": "session-abc123"
  }
}
```

**Response:**
```json
{
  "url": "https://example.com/dashboard",
  "title": "Dashboard - Example",
  "buttons": [
    { "text": "Submit", "selector": "#submit-btn" },
    { "text": "Cancel", "selector": "#cancel-btn" }
  ],
  "inputs": [
    { "name": "search", "type": "text", "selector": "#search-input" }
  ],
  "links": [
    { "text": "Home", "href": "/home" }
  ]
}
```

## Security Features

- **Domain Allowlist**: Configurable allowed domains (via security.json)
- **Header Redaction**: Automatic removal of sensitive headers (Authorization, Cookie, etc.)
- **Body Redaction**: Pattern-based redaction of passwords and tokens
- **Session Isolation**: Fresh browser context per session
- **Audit Logging**: Complete audit trail of all operations
- **Request Size Limits**: Configurable max capture size to prevent memory issues

## Use Cases

1. **API Discovery**: Navigate to Cloud ERP pages and capture API calls
2. **Test Recording**: Record user interactions and capture API traffic for test generation
3. **Form Testing**: Automate form filling and capture form submissions
4. **Integration Testing**: Verify API payloads and responses
5. **Debugging**: Capture HTTP traffic to debug API issues

## License

MIT

## Links

- **GitHub Repository**: https://github.com/dilinaweerasinghe/integration-testing-mcp
- **npm Package**: https://www.npmjs.com/package/@dilina0914/http-capture-mcp
- **Issues**: https://github.com/dilinaweerasinghe/integration-testing-mcp/issues

## Support

Open an issue on the GitHub repository for support.
