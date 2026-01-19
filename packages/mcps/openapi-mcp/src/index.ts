#!/usr/bin/env node
/**
 * OpenAPI Metadata MCP Server
 * 
 * Parses OpenAPI specifications and extracts IFS Cloud service metadata.
 * Provides tools for endpoint discovery, entity schema extraction, and operation details.
 */

import { OpenApiMcpServer } from './server.js';

const server = new OpenApiMcpServer();
server.start().catch((error) => {
  console.error('Failed to start OpenAPI MCP server:', error);
  process.exit(1);
});
