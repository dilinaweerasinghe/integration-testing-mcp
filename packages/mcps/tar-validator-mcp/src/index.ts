#!/usr/bin/env node
/**
 * SAR Test MCP Server
 * 
 * Validates and runs SAR/TAR test files (.mkd).
 * 
 * Environment variables:
 * - SAR_SCRIPT_A_REST_PATH: Path to ScriptARest.exe
 * - SAR_SERVER_URL: Cloud ERP server URL
 * - SAR_USERNAME: Username for authentication
 * - SAR_PASSWORD: Password for authentication
 * - SAR_TIMEOUT_MS: Default timeout in milliseconds (default: 600000)
 */

import { SarTestMcpServer } from './server.js';

const server = new SarTestMcpServer();
server.start().catch((error) => {
  console.error('Failed to start SAR Test MCP server:', error);
  process.exit(1);
});

// Export types and classes for library use
export { SarTestMcpServer } from './server.js';
export { TarParser } from './parser/tar-parser.js';
export * from './types.js';
export * from './runner/index.js';
