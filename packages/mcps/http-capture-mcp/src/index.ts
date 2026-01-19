#!/usr/bin/env node
/**
 * HTTP Capture MCP Server
 * 
 * Captures HTTP traffic from IFS Cloud using headless browser automation.
 * Provides tools for opening URLs, capturing requests, and extracting response schemas.
 */

import { HttpCaptureMcpServer } from './server.js';

const server = new HttpCaptureMcpServer();
server.start().catch((error) => {
  console.error('Failed to start HTTP Capture MCP server:', error);
  process.exit(1);
});
