# OpenAPI Metadata MCP Server

## Overview

The OpenAPI MCP server parses OpenAPI specifications and extracts service metadata for IFS Cloud integration testing.

## Purpose

When generating TAR test cases, you need:
1. Available API endpoints and their methods
2. Entity schemas with data types and keys
3. Request/response formats
4. Parameter requirements

This MCP server provides structured access to this metadata.

## Tools

### `loadSpec`

Loads an OpenAPI specification from a file path or URL.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `source` | string | Yes | File path or URL to OpenAPI spec |
| `specId` | string | No | Custom identifier (auto-generated if not provided) |

**Returns**:
```json
{
  "specId": "ifs-customer-api",
  "title": "IFS Cloud Customer API",
  "version": "1.0.0",
  "endpointCount": 45,
  "schemaCount": 28
}
```

---

### `listEndpoints`

Lists all API endpoints from a loaded spec.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `specId` | string | Yes | Spec ID from loadSpec |
| `tag` | string | No | Filter by tag name |
| `pathPattern` | string | No | Filter by path regex |
| `methods` | string[] | No | Filter by HTTP methods |

**Returns**:
```json
{
  "endpoints": [
    {
      "method": "GET",
      "path": "/customers/{customerId}",
      "operationId": "getCustomerById",
      "summary": "Get customer by ID",
      "tags": ["Customers"]
    }
  ],
  "totalCount": 1
}
```

---

### `getEntitySchema`

Extracts entity schema including keys, data types, and required fields.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `specId` | string | Yes | Spec ID |
| `schemaName` | string | Yes | Name of schema to extract |
| `resolveRefs` | boolean | No | Resolve $ref references (default: true) |
| `includeExamples` | boolean | No | Include example values (default: true) |

**Returns**:
```json
{
  "schema": {
    "name": "Customer",
    "type": "object",
    "description": "Customer entity",
    "properties": [
      {
        "name": "customerId",
        "type": "string",
        "required": true,
        "description": "Unique customer identifier"
      },
      {
        "name": "name",
        "type": "string",
        "required": true,
        "maxLength": 100
      },
      {
        "name": "email",
        "type": "string",
        "format": "email",
        "required": false
      }
    ],
    "required": ["customerId", "name"],
    "keys": ["customerId"],
    "examples": {
      "customerId": "CUST001",
      "name": "Acme Corporation"
    }
  }
}
```

---

### `getOperationDetails`

Returns full operation details including parameters, request body, and responses.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `specId` | string | Yes | Spec ID |
| `operationId` | string | No | Operation ID (if known) |
| `path` | string | No | Endpoint path (with method) |
| `method` | string | No | HTTP method (required with path) |

**Returns**:
```json
{
  "operation": {
    "operationId": "createCustomer",
    "method": "POST",
    "path": "/customers",
    "summary": "Create a new customer",
    "tags": ["Customers"],
    "pathParameters": [],
    "queryParameters": [],
    "headerParameters": [
      {
        "name": "X-Correlation-Id",
        "in": "header",
        "required": false,
        "type": "string"
      }
    ],
    "requestBody": {
      "required": true,
      "content": [
        {
          "mediaType": "application/json",
          "schema": { "type": "object", "..." }
        }
      ]
    },
    "responses": [
      {
        "statusCode": "201",
        "description": "Customer created",
        "content": [...]
      }
    ]
  }
}
```

---

### `searchOperations`

Searches operations by various criteria.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `specId` | string | Yes | Spec ID |
| `query` | string | No | Search text (matches description, summary, operationId) |
| `tag` | string | No | Filter by tag |
| `entityName` | string | No | Find operations for entity |
| `limit` | integer | No | Max results (default: 20) |

---

### `listSchemas`

Lists all schemas/entities defined in the spec.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `specId` | string | Yes | Spec ID |

**Returns**:
```json
{
  "schemas": [
    { "name": "Customer", "type": "object", "description": "..." },
    { "name": "Order", "type": "object", "description": "..." }
  ],
  "totalCount": 2
}
```

---

### `unloadSpec`

Unloads a previously loaded spec from memory.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `specId` | string | Yes | Spec ID to unload |

## Usage Example

```
# 1. Load the OpenAPI spec
loadSpec(source: "./specs/ifs-customer-api.yaml", specId: "customer-api")
# Returns: { specId: "customer-api", endpointCount: 45, ... }

# 2. List available endpoints
listEndpoints(specId: "customer-api", tag: "Customers")
# Returns: Array of customer-related endpoints

# 3. Get entity schema for test generation
getEntitySchema(specId: "customer-api", schemaName: "Customer")
# Returns: Detailed schema with keys and types

# 4. Get operation details for specific endpoint
getOperationDetails(specId: "customer-api", operationId: "createCustomer")
# Returns: Full operation details including request body schema

# 5. Search for related operations
searchOperations(specId: "customer-api", entityName: "customer")
# Returns: All operations related to customers
```

## IFS-Specific Features

### Key Detection

The extractor attempts to identify IFS entity keys by:
1. Looking for `x-ifs-keys` extension
2. Matching common patterns (ends with `Id`, `Key`, `Code`)
3. Using required fields as fallback

### Type Mapping

OpenAPI types are mapped to TAR-compatible hints:
- `string` + `format: date` → Date substitution
- `string` + `format: uuid` → UUID generation
- `integer` → Numeric substitution
