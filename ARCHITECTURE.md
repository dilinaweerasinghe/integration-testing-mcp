# SAR/TAR MCP Tooling System - Architecture Document

## Executive Summary

This document describes the architecture for an MCP (Model Context Protocol) based tooling system that supports SAR/TAR (Service Automation REST / Test Automation REST) test automation for Cloud ERP integration testing.

The system provides three specialized MCP servers that an AI agent can invoke to:
- Capture HTTP traffic from Cloud ERP services
- Discover API metadata from OpenAPI specifications
- Validate generated TAR test files against standards

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SAR/TAR Test Automation Agent                       │
│                    (Claude / AI Model with Agent Prompt)                     │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          │ MCP Protocol (stdio/HTTP)
                                          │
┌─────────────────────────────────────────┴───────────────────────────────────┐
│                              MCP Server Layer                                │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  HTTP Capture MCP   │  │   OpenAPI MCP       │  │  TAR Validator MCP  │  │
│  │                     │  │                     │  │                     │  │
│  │  • Browser Control  │  │  • Spec Parsing     │  │  • .mkd Parsing     │  │
│  │  • Request Capture  │  │  • Entity Extract   │  │  • AAA Validation   │  │
│  │  • Response Schema  │  │  • Type Mapping     │  │  • Naming Rules     │  │
│  │  • Header Redaction │  │  • Path Discovery   │  │  • Pattern Check    │  │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘  │
└─────────────┼────────────────────────┼────────────────────────┼─────────────┘
              │                        │                        │
┌─────────────┴────────────────────────┴────────────────────────┴─────────────┐
│                              Shared Libraries                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────┐ │
│  │  Security      │  │  Logging       │  │  Schemas       │  │  Config    │ │
│  │  • Redaction   │  │  • Structured  │  │  • JSON Schema │  │  • Env     │ │
│  │  • Allowlist   │  │  • Audit Trail │  │  • Types       │  │  • Secrets │ │
│  │  • Sandboxing  │  │  • Correlation │  │  • Validation  │  │  • Domains │ │
│  └────────────────┘  └────────────────┘  └────────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           External Dependencies                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │
│  │  Playwright    │  │  OpenAPI Specs │  │  TAR Files     │                 │
│  │  (Chromium)    │  │  (.yaml/.json) │  │  (.mkd)        │                 │
│  └────────────────┘  └────────────────┘  └────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### 1. HTTP Capture MCP Server

**Purpose**: Safely capture HTTP traffic from Cloud ERP web interfaces using headless browser automation.

**Capabilities**:
| Tool Name | Description |
|-----------|-------------|
| `openUrl` | Opens a URL in headless Chromium with request interception |
| `captureRequests` | Returns all captured HTTP requests with redacted headers |
| `getResponseSchema` | Infers JSON schema from captured response payloads |
| `closeBrowser` | Terminates browser session and clears captured data |

**Security Controls**:
- Domain allowlist enforcement (only approved Cloud ERP domains)
- Automatic redaction of `Authorization`, `Cookie`, `Set-Cookie` headers
- Request/response body size limits
- Session isolation per capture
- No credential storage

### 2. OpenAPI / Metadata MCP Server

**Purpose**: Parse and extract actionable metadata from Cloud ERP OpenAPI specifications.

**Capabilities**:
| Tool Name | Description |
|-----------|-------------|
| `loadSpec` | Loads an OpenAPI spec from file path or URL |
| `listEndpoints` | Returns all available API endpoints with methods |
| `getEntitySchema` | Extracts entity schema including keys and data types |
| `getOperationDetails` | Returns full operation details (params, body, responses) |
| `searchOperations` | Searches operations by tag, path pattern, or description |

**Output Format**:
- Agent-consumable JSON with ERP-specific annotations
- Entity key identification
- Required vs optional field mapping
- TAR-compatible type hints

### 3. TAR Validator MCP Server

**Purpose**: Validate generated TAR test files against SAR/TAR standards.

**Capabilities**:
| Tool Name | Description |
|-----------|-------------|
| `validateFile` | Full validation of a single .mkd file |
| `validateSuite` | Validates all .mkd files in a test suite directory |
| `checkMetadata` | Validates only the metadata block |
| `checkAaaStructure` | Validates Arrange-Act-Assert structure |
| `checkNamingConventions` | Validates camelCase and naming rules |
| `checkSubstitutionPatterns` | Validates {#}, {%}, {$} patterns |

**Validation Rules**:
- Metadata completeness (author, date, tags, description)
- AAA section presence and ordering
- Variable naming (camelCase enforcement)
- Substitution pattern syntax
- Reference integrity

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Typical Agent Workflow                            │
└──────────────────────────────────────────────────────────────────────────┘

1. Discovery Phase
   ┌─────────┐      loadSpec()        ┌─────────────┐
   │  Agent  │ ───────────────────▶  │ OpenAPI MCP │
   └─────────┘                        └─────────────┘
        │                                   │
        │      listEndpoints()              │
        │ ◀─────────────────────────────────┘
        │
2. Capture Phase (if needed)
        │      openUrl(ifsCloudUrl)   ┌──────────────┐
        │ ───────────────────────▶   │ HTTP Capture │
        │                             │     MCP      │
        │      captureRequests()      └──────────────┘
        │ ◀─────────────────────────────────┘
        │
3. Generation Phase
        │
        │ (Agent generates .mkd files using prompt rules)
        │
4. Validation Phase
        │      validateFile(path)     ┌──────────────┐
        │ ───────────────────────▶   │ TAR Validator│
        │                             │     MCP      │
        │      ValidationResult       └──────────────┘
        │ ◀─────────────────────────────────┘
        │
5. Iteration
        │ (Agent fixes issues based on validation results)
        ▼
```

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 1: Domain Allowlist                                                │
│ • Only approved *.ifscloud.com, *.ifs.com domains                       │
│ • Configurable per environment                                           │
│ • Rejects all non-allowlisted URLs before browser launch                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 2: Request/Response Filtering                                      │
│ • Size limits on captured payloads (default: 10MB)                      │
│ • Content-type filtering (JSON/XML only)                                │
│ • Binary content rejection                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 3: Header Redaction                                                │
│ • Authorization: [REDACTED]                                             │
│ • Cookie / Set-Cookie: [REDACTED]                                       │
│ • X-API-Key: [REDACTED]                                                 │
│ • Custom patterns configurable                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 4: Session Isolation                                               │
│ • Fresh browser context per capture session                             │
│ • No persistent storage                                                  │
│ • Automatic cleanup on session end                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 5: Audit Logging                                                   │
│ • All MCP tool invocations logged                                       │
│ • Correlation IDs for request tracing                                   │
│ • No sensitive data in logs                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Sensitive Header Redaction

Default redacted headers:
- `Authorization`
- `Cookie`
- `Set-Cookie`
- `X-API-Key`
- `X-Auth-Token`
- `X-Session-Token`
- `Proxy-Authorization`

---

## Extension Points

### Adding New MCP Servers

1. Create new directory under `/packages/mcps/`
2. Implement `McpServer` interface from `@shared/mcp-core`
3. Register tools with JSON Schema definitions
4. Add to MCP configuration manifest
5. Document in `/docs/mcp-servers/`

### Custom Validators

The TAR Validator MCP supports plugin validators:

```typescript
interface TarValidationPlugin {
  name: string;
  severity: 'error' | 'warning' | 'info';
  validate(ast: TarDocument): ValidationResult[];
}
```

### Custom Redaction Rules

Extend redaction patterns via configuration:

```json
{
  "redaction": {
    "headers": ["X-Custom-Secret"],
    "bodyPatterns": ["password", "apiKey"],
    "responsePatterns": ["ssn", "creditCard"]
  }
}
```

---

## Deployment Models

### Model 1: Local Development (stdio)

```
┌─────────────────────┐     stdio      ┌─────────────────────┐
│   Cursor / Claude   │ ◀────────────▶ │   MCP Servers       │
│   (Agent Host)      │                │   (Local Process)   │
└─────────────────────┘                └─────────────────────┘
```

### Model 2: Shared Team Server (HTTP)

```
┌─────────────────────┐                ┌─────────────────────┐
│   Developer 1       │ ──────────┐    │                     │
└─────────────────────┘           │    │   MCP Gateway       │
                                  ├───▶│   (HTTP Server)     │
┌─────────────────────┐           │    │                     │
│   Developer 2       │ ──────────┘    └─────────────────────┘
└─────────────────────┘
```

### Model 3: CI/CD Pipeline

```
┌─────────────────────┐     Docker     ┌─────────────────────┐
│   CI Pipeline       │ ◀────────────▶ │   MCP Containers    │
│   (GitHub Actions)  │                │   (Isolated)        │
└─────────────────────┘                └─────────────────────┘
```

---

## Non-Functional Requirements

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| Startup Time | < 3s | Lazy browser initialization |
| Memory Usage | < 512MB per MCP | Resource limits, cleanup |
| Concurrent Sessions | 5 | Session pool with queuing |
| Request Timeout | 30s | Configurable per tool |
| Log Retention | 30 days | Structured JSON logs |
| Spec File Size | < 50MB | Streaming parser |

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | Node.js 20 LTS | Enterprise support, async I/O |
| Language | TypeScript 5.x | Type safety, IDE support |
| Browser | Playwright + Chromium | Cross-platform, headless |
| OpenAPI Parser | @readme/openapi-parser | Full spec support |
| Markdown Parser | remark + custom plugins | Extensible AST |
| MCP SDK | @modelcontextprotocol/sdk | Official MCP implementation |
| Logging | pino | High performance JSON logging |
| Validation | zod | Runtime type validation |
| Testing | vitest | Fast, TypeScript native |

---
