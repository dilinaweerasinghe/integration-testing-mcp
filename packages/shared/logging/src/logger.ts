/**
 * Structured logger implementation using Pino.
 */

import { pino, type Logger, type LoggerOptions } from 'pino';
import type { LoggerConfig, LogLevel, LogContext } from './types.js';
import { randomUUID } from 'node:crypto';

/**
 * Default logger configuration.
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  name: 'mcp-server',
  pretty: false,
  destination: 'stdout',
};

/**
 * MCP Logger wrapper around Pino.
 * Provides structured logging with correlation ID support.
 */
export class McpLogger {
  private readonly logger: Logger;
  private readonly config: LoggerConfig;
  private context: LogContext;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    const pinoOptions: LoggerOptions = {
      name: this.config.name,
      level: this.config.level,
      formatters: {
        level: (label) => ({ level: label }),
      },
    };

    // Use pretty printing in development
    if (this.config.pretty) {
      this.logger = pino({
        ...pinoOptions,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        },
      });
    } else {
      this.logger = pino(pinoOptions);
    }

    // Initialize context
    this.context = {
      correlationId: randomUUID(),
      serverName: this.config.name,
      ...this.config.baseContext,
    };
  }

  /**
   * Create a child logger with additional context.
   */
  child(context: Partial<LogContext>): McpLogger {
    const childLogger = new McpLogger(this.config);
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Set the correlation ID for this logger.
   */
  setCorrelationId(correlationId: string): void {
    this.context.correlationId = correlationId;
  }

  /**
   * Generate a new correlation ID.
   */
  newCorrelationId(): string {
    this.context.correlationId = randomUUID();
    return this.context.correlationId;
  }

  /**
   * Get current correlation ID.
   */
  getCorrelationId(): string {
    return this.context.correlationId;
  }

  /**
   * Log at trace level.
   */
  trace(message: string, data?: Record<string, unknown>): void {
    this.logger.trace({ ...this.context, ...data }, message);
  }

  /**
   * Log at debug level.
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug({ ...this.context, ...data }, message);
  }

  /**
   * Log at info level.
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info({ ...this.context, ...data }, message);
  }

  /**
   * Log at warn level.
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn({ ...this.context, ...data }, message);
  }

  /**
   * Log at error level.
   */
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorData = error instanceof Error
      ? { error: { message: error.message, stack: error.stack, name: error.name } }
      : error
        ? { error }
        : {};
    
    this.logger.error({ ...this.context, ...errorData, ...data }, message);
  }

  /**
   * Log at fatal level.
   */
  fatal(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorData = error instanceof Error
      ? { error: { message: error.message, stack: error.stack, name: error.name } }
      : error
        ? { error }
        : {};
    
    this.logger.fatal({ ...this.context, ...errorData, ...data }, message);
  }

  /**
   * Log tool invocation start.
   */
  toolStart(toolName: string, params?: Record<string, unknown>): void {
    this.info('Tool invocation started', {
      toolName,
      eventType: 'tool_start',
      parameters: params,
    });
  }

  /**
   * Log tool invocation completion.
   */
  toolComplete(toolName: string, durationMs: number, success: boolean): void {
    this.info('Tool invocation completed', {
      toolName,
      eventType: 'tool_complete',
      durationMs,
      success,
    });
  }

  /**
   * Log URL access.
   */
  urlAccess(url: string, method: string, allowed: boolean): void {
    this.info('URL access', {
      url,
      method,
      allowed,
      eventType: 'url_access',
    });
  }
}

/**
 * Create a logger instance.
 */
export function createLogger(config?: Partial<LoggerConfig>): McpLogger {
  return new McpLogger(config);
}

/**
 * Default logger instance.
 */
let defaultLogger: McpLogger | null = null;

/**
 * Get or create the default logger.
 */
export function getLogger(): McpLogger {
  if (!defaultLogger) {
    defaultLogger = createLogger({
      level: (process.env['LOG_LEVEL'] as LogLevel) ?? 'info',
      name: process.env['SERVICE_NAME'] ?? 'mcp-server',
      pretty: process.env['NODE_ENV'] === 'development',
    });
  }
  return defaultLogger;
}
