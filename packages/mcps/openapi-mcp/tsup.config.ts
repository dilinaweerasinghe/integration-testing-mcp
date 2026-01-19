import { defineConfig } from 'tsup';

/**
 * Enterprise-grade tsup configuration for OpenAPI MCP Server.
 *
 * This configuration bundles all internal workspace dependencies
 * while keeping external runtime dependencies separate.
 */
export default defineConfig({
  // Entry point
  entry: ['src/index.ts'],

  // Output format - ESM for modern Node.js
  format: ['esm'],

  // Generate TypeScript declaration files
  // Note: DTS generation is handled separately due to composite project setup
  dts: false,

  // Generate source maps for debugging
  sourcemap: true,

  // Clean output directory before build
  clean: true,

  // Target Node.js 20+
  target: 'node20',

  // Platform
  platform: 'node',

  // Minify for production (optional - can be disabled for debugging)
  minify: false,

  // Tree-shaking for smaller bundle
  treeshake: true,

  // Split code for better caching (disabled for single-file MCP)
  splitting: false,

  // External dependencies - these will NOT be bundled
  // Users must install these separately
  external: [
    // MCP SDK - required runtime dependency
    '@modelcontextprotocol/sdk',
    // OpenAPI parser - large dependency
    '@readme/openapi-parser',
    'openapi-types',
    // Node.js built-ins
    'node:fs',
    'node:fs/promises',
    'node:path',
    'node:child_process',
    'node:url',
    'node:events',
    'node:stream',
    'node:util',
    'node:crypto',
    'node:os',
    'node:process',
  ],

  // No external for workspace deps - they will be bundled
  noExternal: [
    '@ifs/mcp-core',
    '@ifs/logging',
    '@ifs/security',
  ],

  // Bundle banner with copyright
  banner: {
    js: `/**
 * @ifs/openapi-mcp - OpenAPI MCP Server
 * Copyright (c) ${new Date().getFullYear()} IFS. All rights reserved.
 * 
 * MCP server for parsing OpenAPI specifications and extracting service metadata.
 */`,
  },

  // Environment variables
  env: {
    NODE_ENV: 'production',
  },

  // Output directory
  outDir: 'dist',

  // Shims for ESM compatibility
  shims: true,

  // Handle __dirname and __filename in ESM
  cjsInterop: true,

  // Additional esbuild options
  esbuildOptions(options) {
    options.charset = 'utf8';
    options.legalComments = 'inline';
  },

  // Hooks for build lifecycle
  onSuccess: async () => {
    console.log('✅ OpenAPI MCP build completed successfully');
  },
});
