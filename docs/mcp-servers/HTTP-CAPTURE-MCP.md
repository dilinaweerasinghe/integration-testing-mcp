# HTTP Capture MCP Server

## Overview

The HTTP Capture MCP server provides tools for capturing HTTP traffic from Cloud ERP web interfaces using headless browser automation with Playwright.

## Purpose

When developing TAR test cases, you often need to:
1. Discover the actual HTTP requests made by Cloud ERP UIs
2. Understand request/response payloads and schemas
3. Capture authentication flows and API patterns

This MCP server enables safe, enterprise-ready HTTP traffic capture without browser extensions.

## Tools

### `openUrl`

Opens a URL in a headless browser and starts capturing HTTP traffic.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | string | Yes | URL to open (must be in domain allowlist) |
| `timeoutMs` | integer | No | Navigation timeout (default: 30000) |
| `waitForNetworkIdle` | boolean | No | Wait for network idle (default: true) |

**Returns**:
```json
{
  "sessionId": "abc-123",
  "status": "capturing",
  "capturedCount": 15
}
```

**Example**:
```
openUrl(url: "https://mycompany.ifscloud.com/main/ifsapplications/web/page/CustomerHandling")
```

---

### `captureRequests`

Returns all captured HTTP requests from a session with redacted sensitive headers.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID from openUrl |
| `filterMethod` | string | No | Filter by HTTP method |
| `filterPathPattern` | string | No | Filter by URL path regex |
| `includeResponses` | boolean | No | Include response data (default: true) |

**Returns**:
```json
{
  "requests": [
    {
      "id": "req-001",
      "method": "GET",
      "url": "https://mycompany.ifscloud.com/api/v1/customers",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "[REDACTED]"
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "response": {
        "status": 200,
        "statusText": "OK",
        "headers": { "Content-Type": "application/json" },
        "body": "{...}",
        "responseTimeMs": 125
      }
    }
  ],
  "totalCount": 1
}
```

---

### `getResponseSchema`

Infers JSON Schema from captured response payloads.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID |
| `requestUrl` | string | Yes | URL pattern to match |
| `mergeMultiple` | boolean | No | Merge schemas from multiple responses (default: true) |

**Returns**:
```json
{
  "schema": {
    "type": "object",
    "properties": {
      "customerId": { "type": "string" },
      "name": { "type": "string" },
      "email": { "type": "string", "format": "email" }
    },
    "required": ["customerId", "name"]
  },
  "matchedRequests": 3
}
```

---

### `closeBrowser`

Closes a browser session and clears captured data.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `sessionId` | string | Yes | Session ID to close |

---

### `listSessions`

Lists all active capture sessions.

**Returns**:
```json
{
  "sessions": [
    {
      "id": "abc-123",
      "url": "https://mycompany.ifscloud.com/...",
      "createdAt": "2024-01-15T10:30:00Z",
      "capturedCount": 42
    }
  ]
}
```

## Security

### Domain Allowlist

Only URLs matching the configured domain allowlist are allowed:
- `*.ifscloud.com`
- `*.ifs.com`
- `*.ifsapplications.com`
- `localhost`

Attempts to access other domains will be blocked.

### Header Redaction

The following headers are automatically redacted:
- `Authorization`
- `Cookie` / `Set-Cookie`
- `X-API-Key`
- `X-Auth-Token`
- `X-Session-Token`
- And more (see security config)

### Body Redaction

Sensitive patterns are redacted from request/response bodies:
- Passwords
- API keys
- Tokens
- Connection strings

### Session Isolation

Each capture session:
- Uses a fresh browser context
- Has no persistent storage
- Is cleaned up automatically on close

## Configuration

Environment variables:
```bash
LOG_LEVEL=info           # Log level
BROWSER_HEADLESS=true    # Run headless
MAX_CAPTURE_SIZE_MB=10   # Max body size to capture
MAX_SESSIONS=5           # Max concurrent sessions
```

## Usage Example

```
# 1. Open URL and start capturing
openUrl(url: "https://company.ifscloud.com/main/page/CustomerList")
# Returns: { sessionId: "sess-001", ... }

# 2. Interact with the page (user navigates in browser)
# ... HTTP traffic is being captured ...

# 3. Get captured requests
captureRequests(sessionId: "sess-001", filterMethod: "POST")
# Returns: Array of captured POST requests

# 4. Infer schema from responses
getResponseSchema(sessionId: "sess-001", requestUrl: "/api/customers")
# Returns: JSON Schema of customer response

# 5. Close session
closeBrowser(sessionId: "sess-001")
```
