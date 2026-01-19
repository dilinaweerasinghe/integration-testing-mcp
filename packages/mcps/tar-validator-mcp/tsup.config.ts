import { defineConfig } from 'tsup';

/**
 * Enterprise-grade tsup configuration for SAR Test MCP Server.
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
  ],

  // Bundle banner with copyright
  banner: {
    js: `/**
 * @dilina0914/sar-test-mcp - SAR Test MCP Server
 * Copyright (c) ${new Date().getFullYear()} Dilina Weerasinghe. All rights reserved.
 * 
 * MCP server for running and validating SAR/TAR test files.
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

  // Emit declaration map for better IDE support
  // Note: tsup handles this via dts option

  // Additional esbuild options
  esbuildOptions(options) {
    options.charset = 'utf8';
    options.legalComments = 'inline';
  },

  // Hooks for build lifecycle
  onSuccess: async () => {
    console.log('✅ SAR Test MCP build completed successfully');
  },
});
