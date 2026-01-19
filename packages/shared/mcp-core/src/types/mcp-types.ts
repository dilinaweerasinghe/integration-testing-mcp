/**
 * Core MCP type definitions for SAR/TAR tooling.
 */

import type { z } from 'zod';

/**
 * Configuration for an MCP server.
 */
export interface McpServerConfig {
  /** Server name (must be unique) */
  name: string;
  /** Server version (semver) */
  version: string;
  /** Optional server description */
  description?: string;
  /** Environment configuration */
  env?: Record<string, string>;
}

/**
 * JSON Schema compatible input schema for tools.
 */
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * JSON Schema property definition.
 */
export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number | boolean)[];
  default?: unknown;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

/**
 * MCP Tool definition.
 */
export interface McpTool {
  /** Unique tool name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Input parameter schema */
  inputSchema: ToolInputSchema;
}

/**
 * Tool definition in MCP protocol format.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

/**
 * Handler function for tool invocation.
 */
export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

/**
 * Result of a tool invocation.
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ToolError;
}

/**
 * Error information from a tool invocation.
 */
export interface ToolError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * MCP transport types.
 */
export type TransportType = 'stdio' | 'http';

/**
 * Zod schema type helper.
 */
export type ZodSchemaType<T extends z.ZodTypeAny> = z.infer<T>;
