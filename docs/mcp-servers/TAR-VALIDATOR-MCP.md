# TAR Validator MCP Server

## Overview

The TAR Validator MCP server validates TAR test files (.mkd) against SAR/TAR standards, ensuring generated tests are compliant and ready for execution.

## Purpose

TAR (Test Automation REST) files must follow specific standards:
1. Proper metadata/frontmatter
2. Arrange-Act-Assert (AAA) structure
3. camelCase variable naming
4. Correct substitution patterns

This MCP server validates all these requirements and provides actionable feedback.

## Tools

### `validateFile`

Performs full validation of a TAR test file against all SAR/TAR standards.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | string | Yes | Path to .mkd file |
| `strictMode` | boolean | No | Treat warnings as errors (default: true) |

**Returns**:
```json
{
  "valid": false,
  "file": "/tests/customer-create.mkd",
  "errors": [
    {
      "code": "META002",
      "message": "Missing required metadata field: author",
      "severity": "error",
      "line": 1,
      "suggestion": "Add the 'author' field to the frontmatter"
    }
  ],
  "warnings": [],
  "document": { "..." }
}
```

---

### `validateContent`

Validates TAR content directly without reading from file.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | string | Yes | TAR file content |
| `filename` | string | No | Optional filename for reporting |
| `strictMode` | boolean | No | Strict mode (default: true) |

---

### `validateSuite`

Validates all .mkd files in a test suite directory.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `directoryPath` | string | Yes | Path to test suite directory |
| `recursive` | boolean | No | Search subdirectories (default: true) |
| `stopOnError` | boolean | No | Stop on first error (default: false) |

**Returns**:
```json
{
  "totalFiles": 25,
  "validFiles": 23,
  "invalidFiles": 2,
  "results": [
    { "file": "test1.mkd", "valid": true, "errorCount": 0, "warningCount": 1 },
    { "file": "test2.mkd", "valid": false, "errorCount": 2, "warningCount": 0 }
  ]
}
```

---

### `checkMetadata`

Validates only the metadata/frontmatter block.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | string | Yes | TAR file content |

**Returns**:
```json
{
  "valid": true,
  "issues": [],
  "metadata": {
    "title": "Create Customer Test",
    "description": "Tests customer creation endpoint",
    "author": "John Doe",
    "created": "2024-01-15",
    "tags": ["customer", "create", "api"]
  }
}
```

---

### `checkAaaStructure`

Validates the Arrange-Act-Assert structure.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | string | Yes | TAR file content |

**Returns**:
```json
{
  "valid": true,
  "issues": [],
  "sections": {
    "arrange": true,
    "act": true,
    "assert": true
  }
}
```

---

### `checkNamingConventions`

Validates variable naming conventions (camelCase).

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | string | Yes | TAR file content |

**Returns**:
```json
{
  "valid": false,
  "issues": [
    {
      "code": "NAME001",
      "message": "Variable \"Customer_ID\" does not follow camelCase naming convention",
      "severity": "error",
      "line": 15,
      "suggestion": "Use camelCase: \"customerId\""
    }
  ],
  "variables": [
    { "name": "customerId", "valid": true },
    { "name": "Customer_ID", "valid": false, "suggestion": "customerId" }
  ]
}
```

---

### `checkSubstitutionPatterns`

Validates substitution patterns ({#}, {%}, {$}).

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `content` | string | Yes | TAR file content |

**Returns**:
```json
{
  "valid": true,
  "issues": [],
  "patterns": [
    { "pattern": "{#CreateCustomer}", "type": "utilReference", "valid": true },
    { "pattern": "{%customerId}", "type": "dataSubstitution", "valid": true },
    { "pattern": "{$API_BASE_URL}", "type": "envVariable", "valid": true }
  ]
}
```

---

### `getValidationRules`

Returns the current validation rules configuration.

**Returns**:
```json
{
  "metadata": {
    "name": "metadata",
    "enabled": true,
    "severity": "error",
    "options": { "requiredFields": ["title", "description", "author", "created", "tags"] }
  },
  "aaa": { "..." },
  "naming": { "..." },
  "patterns": { "..." }
}
```

## Validation Rules

### Metadata Rules

| Code | Severity | Description |
|------|----------|-------------|
| META001 | Error | Missing metadata block |
| META002 | Error | Missing required field |
| META003 | Error | Empty required field value |
| META004 | Warning | Title too short |
| META005 | Warning | Title too long |
| META006 | Error | Invalid date format |
| META007 | Warning | Invalid modified date |
| META008 | Error | Tags not an array |
| META009 | Warning | Empty tags array |

### AAA Structure Rules

| Code | Severity | Description |
|------|----------|-------------|
| AAA001 | Error | Missing Act section |
| AAA002 | Error | Missing Assert section |
| AAA003 | Error | Incorrect section order |
| AAA004 | Warning | Multiple Act sections |
| AAA005 | Info | Multiple Assert sections |
| AAA006 | Error | Empty Assert section |
| AAA007 | Warning | No HTTP operation in Act |

### Naming Rules

| Code | Severity | Description |
|------|----------|-------------|
| NAME001 | Error | Variable not camelCase |
| NAME002 | Warning | Undefined variable |
| NAME003 | Info | Unused variable |

### Pattern Rules

| Code | Severity | Description |
|------|----------|-------------|
| PAT001 | Error | Invalid Test Util format |
| PAT002 | Error | Invalid data substitution |
| PAT003 | Error | Invalid env variable |
| PAT004 | Error | Unknown pattern type |
| PAT005 | Error | Malformed pattern |

## Pattern Formats

### Test Util Reference: `{#UtilName}`
- Prefix: `#`
- Case: PascalCase
- Example: `{#CreateCustomer}`, `{#GetAuthToken}`

### Data Substitution: `{%variableName}`
- Prefix: `%`
- Case: camelCase
- Example: `{%customerId}`, `{%orderNumber}`

### Environment Variable: `{$ENV_VAR}`
- Prefix: `$`
- Case: UPPER_SNAKE_CASE
- Example: `{$API_BASE_URL}`, `{$AUTH_TOKEN}`

## Usage Example

```
# Validate a single file
validateFile(filePath: "./tests/customer/create-customer.mkd")

# Validate test content directly
validateContent(content: "---\ntitle: Test\n---\n## Act\nGET /api/test")

# Validate entire test suite
validateSuite(directoryPath: "./tests", recursive: true)

# Check specific aspects
checkMetadata(content: "...")
checkAaaStructure(content: "...")
checkNamingConventions(content: "...")
checkSubstitutionPatterns(content: "...")
```
