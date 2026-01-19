/**
 * Logging type definitions.
 */

/**
 * Log levels supported by the logger.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Logger configuration options.
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Logger name (usually service/component name) */
  name: string;
  /** Enable pretty printing (development only) */
  pretty?: boolean;
  /** Output destination (file path or 'stdout') */
  destination?: string;
  /** Additional base context for all logs */
  baseContext?: Record<string, unknown>;
}

/**
 * Audit log entry for tracking tool invocations.
 */
export interface AuditLogEntry {
  /** Unique correlation ID */
  correlationId: string;
  /** Timestamp of the event */
  timestamp: string;
  /** Event type */
  eventType: 'tool_invocation' | 'url_access' | 'file_access' | 'validation';
  /** MCP server name */
  serverName: string;
  /** Tool name (if applicable) */
  toolName?: string;
  /** Input parameters (redacted) */
  parameters?: Record<string, unknown>;
  /** Result status */
  status: 'success' | 'failure';
  /** Error message if failed */
  errorMessage?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Context for a logging session.
 */
export interface LogContext {
  correlationId: string;
  serverName: string;
  toolName?: string;
  [key: string]: unknown;
}
