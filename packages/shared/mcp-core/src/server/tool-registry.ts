/**
 * Tool Registry for managing MCP tools.
 * Handles registration, lookup, and invocation of tools.
 */

import type { McpTool, ToolHandler, ToolDefinition } from '../types/mcp-types.js';

/**
 * Registry for MCP tools.
 * Manages tool definitions and their handlers.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, { tool: McpTool; handler: ToolHandler }>();

  /**
   * Register a tool with its handler.
   */
  register(tool: McpTool, handler: ToolHandler): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, { tool, handler });
  }

  /**
   * Unregister a tool.
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Check if a tool is registered.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get a tool definition.
   */
  get(name: string): McpTool | undefined {
    return this.tools.get(name)?.tool;
  }

  /**
   * List all registered tools in MCP format.
   */
  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(({ tool }) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Invoke a tool by name with arguments.
   */
  async invoke(name: string, args: Record<string, unknown>): Promise<unknown> {
    const entry = this.tools.get(name);
    if (!entry) {
      throw new Error(`Tool "${name}" not found`);
    }
    return entry.handler(args);
  }

  /**
   * Get count of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Clear all registered tools.
   */
  clear(): void {
    this.tools.clear();
  }
}
