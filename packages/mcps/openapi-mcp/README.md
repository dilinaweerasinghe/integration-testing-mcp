# OpenAPI MCP Server

A Model Context Protocol (MCP) server for parsing OpenAPI specifications and extracting IFS Cloud service metadata. Load specs, explore endpoints, extract schemas, and search operations through MCP tools.

[![npm version](https://img.shields.io/npm/v/@dilina0914/openapi-mcp.svg)](https://www.npmjs.com/package/@dilina0914/openapi-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

## Features

- **OpenAPI Parsing**: Load and parse OpenAPI 3.0 specifications from files or URLs
- **7 Powerful Tools**: Complete API discovery, schema extraction, and operation search
- **Endpoint Discovery**: List and filter API endpoints by tags, paths, or methods
- **Schema Extraction**: Extract entity schemas with data types, required fields, and examples
- **Operation Search**: Search operations by query, tag, or entity name
- **Multi-Spec Support**: Load and manage multiple specs simultaneously

## Prerequisites

- Node.js v20.0.0 or higher
- npm or pnpm package manager
- OpenAPI 3.0 specification files (JSON or YAML)

## Package Information

This package is **fully bundled** - all internal dependencies are included. No need to install additional `@ifs/*` packages.

| Property | Value |
|----------|-------|
| **Bundle Size** | ~35 KB |
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

Integrate the MCP server into VS Code to use API discovery tools directly in your editor.

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
    "openapi": {
      "command": "npx",
      "args": [
        "-y",
        "@dilina0914/openapi-mcp@1.0.0"
      ],
      "env": {
        "LOG_LEVEL": "info",
        "AUDIT_LOG_ENABLED": "true"
      }
    }
  }
}
```

**Step 3: Configure environment variables**

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No | `info` |
| `AUDIT_LOG_ENABLED` | Enable audit logging | No | `true` |
| `AUDIT_LOG_DIR` | Directory for audit logs | No | `./logs/audit` |

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
    "openapi": {
      "command": "npx",
      "args": [
        "-y",
        "@dilina0914/openapi-mcp@1.0.0"
      ],
      "env": {
        "LOG_LEVEL": "info"
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
    "openapi": {
      "command": "npx",
      "args": ["-y", "@dilina0914/openapi-mcp@1.0.0"],
      "env": {
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
npm install @dilina0914/openapi-mcp
```

**Step 2: Configure environment variables**

Windows (PowerShell):
```powershell
$env:LOG_LEVEL = "info"
$env:AUDIT_LOG_ENABLED = "true"
```

Windows (Command Prompt):
```cmd
set LOG_LEVEL=info
set AUDIT_LOG_ENABLED=true
```

Linux/macOS:
```bash
export LOG_LEVEL="info"
export AUDIT_LOG_ENABLED="true"
```

**Step 3: Run the server**

```bash
npx @dilina0914/openapi-mcp
```

## Quick Troubleshooting

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

### Schema Not Found

**Error:** `Schema not found: <name>`

**Solution:**
- Use `listSchemas` to see available schemas
- Schema names are case-sensitive
- Verify the schema exists in the spec

### File Access Errors

**Error:** `ENOENT: no such file or directory`

**Solution:**
- Use absolute paths for local files
- Verify file permissions
- For URLs, check network connectivity

## What's Included

### MCP Tools (7 total)

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

### Supported Features

| Feature | Description |
|---------|-------------|
| **OpenAPI 3.0** | Full support for OpenAPI 3.0 specifications |
| **JSON & YAML** | Parse both JSON and YAML spec formats |
| **File & URL** | Load specs from local files or remote URLs |
| **$ref Resolution** | Automatic resolution of schema references |
| **Multi-Spec** | Manage multiple specs simultaneously |

### Output Information

The MCP extracts and provides:

- API title, version, and description
- Endpoints with method, path, summary, and tags
- Operation parameters (path, query, header, cookie)
- Request body schemas with content types
- Response schemas for all status codes
- Entity schemas with properties, types, and constraints
- Required fields and default values
- Example values when available

## Tool Examples

### Load a Spec

```json
{
  "tool": "loadSpec",
  "arguments": {
    "source": "C:\\specs\\ifs-cloud-api.yaml",
    "specId": "ifs-cloud"
  }
}
```

**Response:**
```json
{
  "specId": "ifs-cloud",
  "title": "IFS Cloud API",
  "version": "1.0.0",
  "endpointCount": 245,
  "schemaCount": 89
}
```

### List Endpoints

```json
{
  "tool": "listEndpoints",
  "arguments": {
    "specId": "ifs-cloud",
    "tag": "CustomerOrder",
    "methods": ["GET", "POST"]
  }
}
```

**Response:**
```json
{
  "endpoints": [
    {
      "path": "/api/v1/customer-orders",
      "method": "GET",
      "summary": "List all customer orders",
      "tags": ["CustomerOrder"]
    },
    {
      "path": "/api/v1/customer-orders",
      "method": "POST",
      "summary": "Create a new customer order",
      "tags": ["CustomerOrder"]
    }
  ],
  "totalCount": 2
}
```

### Get Entity Schema

```json
{
  "tool": "getEntitySchema",
  "arguments": {
    "specId": "ifs-cloud",
    "schemaName": "CustomerOrder",
    "resolveRefs": true,
    "includeExamples": true
  }
}
```

**Response:**
```json
{
  "schema": {
    "name": "CustomerOrder",
    "type": "object",
    "properties": {
      "orderId": {
        "type": "string",
        "description": "Unique order identifier"
      },
      "customerId": {
        "type": "string",
        "required": true
      },
      "orderDate": {
        "type": "string",
        "format": "date-time"
      }
    },
    "required": ["customerId"]
  }
}
```

### Search Operations

```json
{
  "tool": "searchOperations",
  "arguments": {
    "specId": "ifs-cloud",
    "query": "create customer",
    "limit": 5
  }
}
```

### Get Operation Details

```json
{
  "tool": "getOperationDetails",
  "arguments": {
    "specId": "ifs-cloud",
    "path": "/api/v1/customer-orders",
    "method": "POST"
  }
}
```

### List All Schemas

```json
{
  "tool": "listSchemas",
  "arguments": {
    "specId": "ifs-cloud"
  }
}
```

**Response:**
```json
{
  "schemas": [
    { "name": "CustomerOrder", "type": "object", "description": "Customer order entity" },
    { "name": "OrderLine", "type": "object", "description": "Order line item" },
    { "name": "Customer", "type": "object", "description": "Customer entity" }
  ],
  "totalCount": 3
}
```

## Security Features

- **Audit Logging**: Complete audit trail of spec access
- **Input Validation**: File paths and parameters are validated
- **Memory Management**: Specs can be unloaded to free memory
- **No External Calls**: Specs are parsed locally (URLs are fetched once)

## License

Proprietary - IFS

## Links

- **GitHub Repository**: https://github.com/dilina0914/sar-mcp
- **npm Package**: https://www.npmjs.com/package/@dilina0914/openapi-mcp
- **Issues**: https://github.com/dilina0914/sar-mcp/issues

## Support

Contact the IFS QA Automation team for support.
