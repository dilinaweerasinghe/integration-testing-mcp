# Folder Structure

This document explains the monorepo structure and responsibilities of each component.

## Overview

```
SAR-MCP/
├── config/                          # Configuration files
│   ├── schemas/                     # JSON Schema definitions
│   │   └── mcp-config.schema.json   # Schema for MCP configuration
│   ├── mcp-servers.json             # MCP server registration config
│   ├── security.json                # Security settings (allowlist, redaction)
│   └── tar-validation-rules.json    # TAR validation rules
│
├── docs/                            # Documentation
│   ├── FOLDER-STRUCTURE.md          # This file
│   ├── mcp-servers/                 # MCP server documentation
│   └── security/                    # Security guidelines
│
├── packages/                        # Monorepo packages
│   ├── mcps/                        # MCP Server implementations
│   │   ├── http-capture-mcp/        # HTTP traffic capture server
│   │   ├── openapi-mcp/             # OpenAPI metadata server
│   │   └── tar-validator-mcp/       # TAR file validation server
│   │
│   └── shared/                      # Shared libraries
│       ├── mcp-core/                # Core MCP utilities
│       ├── security/                # Security utilities
│       └── logging/                 # Logging infrastructure
│
├── package.json                     # Root package.json
├── pnpm-workspace.yaml              # pnpm workspace config
├── tsconfig.json                    # Root TypeScript config
├── ARCHITECTURE.md                  # Architecture documentation
└── README.md                        # Project README
```

---

## Package Details

### `/packages/mcps/` - MCP Server Implementations

Each MCP server is a standalone package that can be run independently.

#### `http-capture-mcp`

**Purpose**: Captures HTTP traffic from IFS Cloud using headless Playwright browser.

**Structure**:
```
http-capture-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── types.ts              # Type definitions
│   ├── browser/
│   │   └── browser-manager.ts  # Playwright browser lifecycle
│   ├── capture/
│   │   └── request-capture.ts  # HTTP request interception
│   └── schema/
│       └── schema-inferrer.ts  # JSON schema inference
├── package.json
└── tsconfig.json
```

**Responsibilities**:
- Launch and manage headless Chromium browser
- Intercept and record HTTP requests/responses
- Redact sensitive headers and body content
- Infer JSON schemas from response payloads
- Enforce domain allowlist

**Tools Provided**:
| Tool | Description |
|------|-------------|
| `openUrl` | Opens URL in browser, starts capturing |
| `captureRequests` | Returns captured requests with redaction |
| `getResponseSchema` | Infers JSON schema from responses |
| `closeBrowser` | Closes session, clears data |
| `listSessions` | Lists active capture sessions |

---

#### `openapi-mcp`

**Purpose**: Parses OpenAPI specifications and extracts service metadata for IFS Cloud.

**Structure**:
```
openapi-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── types.ts              # Type definitions
│   ├── parser/
│   │   └── spec-parser.ts    # OpenAPI spec parser
│   ├── extractor/
│   │   └── entity-extractor.ts  # Entity schema extraction
│   └── mapper/
│       └── operation-mapper.ts  # Operation details mapping
├── package.json
└── tsconfig.json
```

**Responsibilities**:
- Parse OpenAPI 3.x specifications (JSON/YAML)
- Extract endpoint information
- Map entity schemas with IFS-specific annotations
- Identify key fields and data types
- Search and filter operations

**Tools Provided**:
| Tool | Description |
|------|-------------|
| `loadSpec` | Loads OpenAPI spec from file/URL |
| `listEndpoints` | Lists all API endpoints |
| `getEntitySchema` | Extracts entity schema with keys |
| `getOperationDetails` | Full operation details |
| `searchOperations` | Search by query/tag/entity |
| `listSchemas` | Lists all schemas |
| `unloadSpec` | Unloads spec from memory |

---

#### `tar-validator-mcp`

**Purpose**: Validates TAR test files against SAR/TAR standards.

**Structure**:
```
tar-validator-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── types.ts              # Type definitions
│   ├── parser/
│   │   └── tar-parser.ts     # TAR markdown parser
│   └── validators/
│       ├── metadata-validator.ts   # Frontmatter validation
│       ├── aaa-validator.ts        # AAA structure validation
│       ├── naming-validator.ts     # camelCase validation
│       └── pattern-validator.ts    # Substitution patterns
├── package.json
└── tsconfig.json
```

**Responsibilities**:
- Parse TAR markdown (.mkd) files
- Validate metadata/frontmatter completeness
- Enforce Arrange-Act-Assert structure
- Check variable naming conventions
- Validate substitution patterns ({#}, {%}, {$})

**Tools Provided**:
| Tool | Description |
|------|-------------|
| `validateFile` | Full validation of .mkd file |
| `validateContent` | Validate content directly |
| `validateSuite` | Validate directory of tests |
| `checkMetadata` | Validate metadata only |
| `checkAaaStructure` | Validate AAA structure |
| `checkNamingConventions` | Validate variable names |
| `checkSubstitutionPatterns` | Validate patterns |
| `getValidationRules` | Get current rules |

---

### `/packages/shared/` - Shared Libraries

Shared code used by all MCP servers.

#### `mcp-core`

**Purpose**: Core MCP infrastructure and base classes.

**Provides**:
- `BaseMcpServer` - Abstract base class for MCP servers
- `ToolRegistry` - Tool registration and invocation
- Type definitions for MCP protocol
- Schema builder utilities
- Result type for consistent error handling

---

#### `security`

**Purpose**: Security utilities for enterprise requirements.

**Provides**:
- `HeaderRedactor` - Redacts sensitive HTTP headers
- `BodyRedactor` - Redacts sensitive data from bodies
- `DomainAllowlist` - URL validation against allowlist
- `InputSanitizer` - Input validation and sanitization

---

#### `logging`

**Purpose**: Structured logging and audit trails.

**Provides**:
- `McpLogger` - Structured JSON logging with Pino
- `AuditLogger` - Security audit logging
- Correlation ID support
- Tool invocation logging

---

## Configuration Files

### `/config/mcp-servers.json`

Registers all MCP servers with their startup configuration:
- Command and arguments
- Transport type (stdio/HTTP)
- Environment variables
- Enabled/disabled state

### `/config/security.json`

Security configuration:
- Domain allowlist patterns
- Sensitive header list
- Body redaction patterns
- Request size limits
- Session isolation settings

### `/config/tar-validation-rules.json`

TAR validation rules:
- Required metadata fields
- AAA structure requirements
- Variable naming rules
- Substitution pattern formats

---

## Development Workflow

### Building

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @ifs/http-capture-mcp build
```

### Running MCP Servers

```bash
# Run specific server
pnpm mcp:http-capture
pnpm mcp:openapi
pnpm mcp:tar-validator

# Run all servers
pnpm mcp:all
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @ifs/tar-validator-mcp test
```

---

## Package Dependencies

```
@ifs/http-capture-mcp
├── @ifs/mcp-core
├── @ifs/security
└── @ifs/logging

@ifs/openapi-mcp
├── @ifs/mcp-core
├── @ifs/security
└── @ifs/logging

@ifs/tar-validator-mcp
├── @ifs/mcp-core
└── @ifs/logging
```

---

## Adding New MCP Servers

1. Create directory under `/packages/mcps/`
2. Initialize with `package.json` and `tsconfig.json`
3. Extend `BaseMcpServer` from `@ifs/mcp-core`
4. Implement `registerTools()` method
5. Add to `/config/mcp-servers.json`
6. Document in `/docs/mcp-servers/`
