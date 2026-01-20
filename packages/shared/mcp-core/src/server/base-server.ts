/**
 * Base MCP Server implementation providing common functionality
 * for all SAR/TAR MCP servers.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { McpServerConfig, McpTool, ToolHandler } from '../types/mcp-types.js';
import { ToolRegistry } from './tool-registry.js';

/**
 * Abstract base class for MCP servers.
 * Extend this class to create specialized MCP servers.
 */
export abstract class BaseMcpServer {
  protected readonly server: Server;
  protected readonly toolRegistry: ToolRegistry;
  protected readonly config: McpServerConfig;
  private isRunning = false;

  constructor(config: McpServerConfig) {
    this.config = config;
    this.toolRegistry = new ToolRegistry();
    
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Register tools specific to this server implementation.
   * Override in subclasses.
   */
  protected abstract registerTools(): void;

  /**
   * Lifecycle hook called before server starts.
   * Override for custom initialization.
   */
  protected async onInitialize(): Promise<void> {
    // Default: no-op
  }

  /**
   * Lifecycle hook called when server is shutting down.
   * Override for cleanup.
   */
  protected async onShutdown(): Promise<void> {
    // Default: no-op
  }

  /**
   * Register a tool with the server.
   */
  protected registerTool(tool: McpTool, handler: ToolHandler): void {
    this.toolRegistry.register(tool, handler);
  }

  /**
   * Setup MCP protocol handlers.
   */
  private setupHandlers(): void {
    // Handle list_tools request using the SDK's schema
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.toolRegistry.listTools(),
      };
    });
    
    // Handle call_tool request using the SDK's schema
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.toolRegistry.invoke(name, args ?? {});
        return {
          content: [
            {
              type: 'text' as const,
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: errorMessage }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the MCP server with stdio transport.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    // Initialize tools
    this.registerTools();
    
    // Run initialization hook
    await this.onInitialize();

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    this.isRunning = true;

    // Handle shutdown signals
    process.on('SIGINT', () => void this.shutdown());
    process.on('SIGTERM', () => void this.shutdown());
  }

  /**
   * Gracefully shutdown the server.
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.onShutdown();
    await this.server.close();
    this.isRunning = false;
    process.exit(0);
  }
}
