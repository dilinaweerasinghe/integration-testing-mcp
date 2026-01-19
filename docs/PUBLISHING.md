# Publishing MCP Packages to npm Registry

This guide covers publishing the SAR Test MCP and HTTP Capture MCP packages to npm.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Package Preparation](#package-preparation)
- [Publishing to npm](#publishing-to-npm)
- [Publishing to Private Registry](#publishing-to-private-registry)
- [Versioning](#versioning)
- [CI/CD Integration](#cicd-integration)

---

## Prerequisites

### 1. npm Account

```bash
# Create an npm account at https://www.npmjs.com/signup
# Or for organization registry, get access from your admin

# Login to npm
npm login

# Verify login
npm whoami
```

### 2. Required Tools

```bash
# Ensure you have Node.js 20+ and pnpm
node --version  # Should be 20+
pnpm --version  # Should be 8+
```

### 3. Build Verification

```bash
# Clean and rebuild all packages
pnpm clean
pnpm install
pnpm build

# Run tests to ensure everything works
pnpm test
```

---

## Package Preparation

### Important: Handling Workspace Dependencies

The MCPs currently use `workspace:*` dependencies for shared internal packages. Before publishing, you have two options:

#### Option A: Publish Shared Packages First (Recommended)

1. Publish shared packages to npm first (internal packages)

2. Update MCP packages to use published versions

#### Option B: Bundle Dependencies

Use a bundler like `esbuild` or `tsup` to bundle all dependencies into a single file:

```bash
# Install bundler
pnpm add -D tsup

# Add to package.json scripts
"scripts": {
  "bundle": "tsup src/index.ts --format esm --dts"
}
```

#### Option C: Use pnpm publish (Auto-converts workspace:*)

pnpm automatically converts `workspace:*` to actual versions when publishing:

```bash
# This will convert workspace:* to ^1.0.0 (current version) automatically
pnpm --filter @dilina0914/sar-test-mcp publish
```

### 1. Update package.json Files

#### SAR Test MCP (`packages/mcps/tar-validator-mcp/package.json`)

```json
{
  "name": "@dilina0914/sar-test-mcp",
  "version": "1.0.0",
  "description": "MCP server for running and validating SAR/TAR test files",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "sar-test-mcp": "./dist/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "mcp",
    "model-context-protocol",
    "ifs",
    "sar",
    "tar",
    "test-automation",
    "integration-testing"
  ],
  "author": "Dilina Weerasinghe",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/dilinaweerasinghe/integration-testing-mcp.git",
    "directory": "packages/mcps/tar-validator-mcp"
  },
  "homepage": "https://github.com/dilinaweerasinghe/integration-testing-mcp#readme",
  "bugs": {
    "url": "https://github.com/dilinaweerasinghe/integration-testing-mcp/issues"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "publishConfig": {
    "access": "restricted",
    "registry": "https://registry.npmjs.org/"
  }
}
```

#### HTTP Capture MCP (`packages/mcps/http-capture-mcp/package.json`)

```json
{
  "name": "@dilina0914/http-capture-mcp",
  "version": "1.0.0",
  "description": "MCP server for capturing HTTP traffic using Playwright",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "http-capture-mcp": "./dist/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "mcp",
    "model-context-protocol",
    "http-capture",
    "playwright",
    "browser-automation",
    "api-testing"
  ],
  "author": "Dilina Weerasinghe",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/dilinaweerasinghe/integration-testing-mcp.git",
    "directory": "packages/mcps/http-capture-mcp"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "publishConfig": {
    "access": "restricted",
    "registry": "https://registry.npmjs.org/"
  }
}
```

### 2. Create Package README Files

Create `packages/mcps/tar-validator-mcp/README.md`:

```markdown
# @dilina0914/sar-test-mcp

MCP (Model Context Protocol) server for running and validating SAR/TAR test files.

## Installation

\`\`\`bash
npm install @dilina0914/sar-test-mcp
\`\`\`

## Usage

### As MCP Server

Add to your MCP client configuration:

\`\`\`json
{
  "mcpServers": {
    "sar-test": {
      "command": "npx",
      "args": ["@dilina0914/sar-test-mcp"],
      "env": {
        "SAR_SCRIPT_A_REST_PATH": "C:\\Path\\To\\ScriptARest.exe",
        "SAR_SERVER_URL": "https://your-ifs-server.com",
        "SAR_USERNAME": "ifsapp",
        "SAR_PASSWORD": "your-password"
      }
    }
  }
}
\`\`\`

### Available Tools

| Tool | Description |
|------|-------------|
| `configureRunner` | Set ScriptARest path and credentials |
| `runTest` | Execute a TAR test file |
| `analyzeResults` | Analyze raw test output |
| `validateFile` | Validate TAR file syntax |
| `validateContent` | Validate TAR content (string) |
| `validateSuite` | Validate all files in a directory |
| `checkAaaStructure` | Check Arrange-Act-Assert structure |
| `checkCommands` | Validate TAR commands |
| `getRunnerStatus` | Check runner configuration status |
| `getValidationRules` | Get current validation rules |

## License

MIT
\`\`\`

Create `packages/mcps/http-capture-mcp/README.md`:

\`\`\`markdown
# @dilina0914/http-capture-mcp

MCP (Model Context Protocol) server for capturing HTTP traffic using Playwright.

## Installation

\`\`\`bash
npm install @dilina0914/http-capture-mcp
\`\`\`

## Usage

### As MCP Server

Add to your MCP client configuration:

\`\`\`json
{
  "mcpServers": {
    "http-capture": {
      "command": "npx",
      "args": ["@dilina0914/http-capture-mcp"],
      "env": {
        "BROWSER_HEADLESS": "true",
        "LOG_LEVEL": "info"
      }
    }
  }
}
\`\`\`

### Available Tools

| Tool | Description |
|------|-------------|
| `openUrl` | Opens URL and starts capturing HTTP traffic |
| `click` | Clicks an element on the page |
| `fill` | Fills an input field |
| `selectOption` | Selects option in dropdown |
| `check`/`uncheck` | Toggle checkboxes |
| `screenshot` | Takes a screenshot |
| `getCapturedRequests` | Returns captured HTTP requests |
| `closeBrowser` | Closes browser session |

## License

MIT
```

### 3. Create LICENSE File

Create `LICENSE` in the root and each package with appropriate license content.

---

## Publishing to npm

### Method 1: Manual Publishing

```bash
# 1. Ensure you're logged in
npm login

# 2. Build the packages
pnpm build

# 3. Navigate to each package and publish

# Publish SAR Test MCP
cd packages/mcps/tar-validator-mcp
npm publish --access restricted

# Publish HTTP Capture MCP
cd ../http-capture-mcp
npm publish --access restricted
```

### Method 2: Using pnpm (Recommended)

```bash
# From the root directory
# Publish all packages at once
pnpm -r publish --access restricted

# Or publish specific packages
pnpm --filter @dilina0914/sar-test-mcp publish --access public
pnpm --filter @dilina0914/http-capture-mcp publish --access public
```

### Method 3: Dry Run (Test First)

```bash
# Always do a dry run first to see what will be published
cd packages/mcps/tar-validator-mcp
npm publish --dry-run

cd ../http-capture-mcp
npm publish --dry-run
```

---

## Publishing to Private Registry

### Option A: npm Enterprise / Private Packages

```bash
# Use @scope for private packages (already configured)
# Requires npm paid plan or organization

npm publish --access restricted
```

### Option B: GitHub Packages

1. Create `.npmrc` in project root:

```ini
@dilina0914:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

2. Update `publishConfig` in package.json:

```json
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

3. Authenticate and publish:

```bash
# Set GitHub token
export GITHUB_TOKEN=your_github_token

# Publish
npm publish
```

### Option C: Azure Artifacts

1. Create `.npmrc`:

```ini
@dilina0914:registry=https://pkgs.dev.azure.com/YOUR_ORG/_packaging/YOUR_FEED/npm/registry/
always-auth=true
```

2. Authenticate:

```bash
# Using Azure CLI
az artifacts universal publish
# Or use PAT token
```

### Option D: Self-hosted (Verdaccio)

1. Install Verdaccio:

```bash
npm install -g verdaccio
verdaccio
```

2. Configure `.npmrc`:

```ini
@dilina0914:registry=http://localhost:4873/
```

3. Publish:

```bash
npm publish --registry http://localhost:4873/
```

---

## Versioning

### Semantic Versioning

Follow [semver](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

### Version Bump Commands

```bash
# Patch version (1.0.0 → 1.0.1)
cd packages/mcps/tar-validator-mcp
npm version patch

# Minor version (1.0.0 → 1.1.0)
npm version minor

# Major version (1.0.0 → 2.0.0)
npm version major

# Prerelease
npm version prerelease --preid=beta  # 1.0.0 → 1.0.1-beta.0
```

### Synchronized Versioning with pnpm

```bash
# Update all packages to same version
pnpm -r exec npm version 1.1.0
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to publish'
        required: true
        default: 'patch'

jobs:
  publish:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build packages
        run: pnpm build
      
      - name: Run tests
        run: pnpm test
      
      - name: Publish SAR Test MCP
        run: pnpm --filter @dilina0914/sar-test-mcp publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Publish HTTP Capture MCP
        run: pnpm --filter @dilina0914/http-capture-mcp publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Required Secrets

Add these secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `NPM_TOKEN` | npm authentication token (from `npm token create`) |

---

## Pre-publish Checklist

Before publishing, verify:

- [ ] All tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] Version numbers updated
- [ ] README.md files are current
- [ ] CHANGELOG.md updated (if applicable)
- [ ] No sensitive data in code
- [ ] `files` field in package.json is correct
- [ ] Dry run successful: `npm publish --dry-run`

---

## Post-publish Verification

After publishing:

```bash
# Verify packages are available
npm view @dilina0914/sar-test-mcp
npm view @dilina0914/http-capture-mcp

# Test installation
npm install @dilina0914/sar-test-mcp@latest
npm install @dilina0914/http-capture-mcp@latest
```

---

## Troubleshooting

### Common Issues

**1. "You must be logged in to publish"**
```bash
npm login
```

**2. "Package name too similar to existing"**
- Choose a different package name
- Use your organization scope: `@your-org/package-name`

**3. "Cannot publish over existing version"**
- Bump the version number
- Use `npm version patch`

**4. "Missing required fields"**
- Ensure `name`, `version`, `main` are in package.json

**5. "Private package requires paid account"**
- Use `--access public` for public packages
- Or upgrade npm account for private packages

### Support

Open an issue on the GitHub repository for publishing assistance.
