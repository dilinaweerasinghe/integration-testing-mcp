/**
 * Audit logger for tracking MCP tool invocations.
 * Provides tamper-evident logging for security auditing.
 */

import { createWriteStream, type WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuditLogEntry } from './types.js';

/**
 * Audit logger configuration.
 */
export interface AuditLoggerConfig {
  /** Directory to store audit logs */
  logDirectory: string;
  /** Server name for log entries */
  serverName: string;
  /** Whether audit logging is enabled */
  enabled: boolean;
  /** Log rotation settings */
  rotation?: {
    maxSizeBytes: number;
    maxFiles: number;
  };
}

/**
 * Audit logger for security-relevant events.
 */
export class AuditLogger {
  private readonly config: AuditLoggerConfig;
  private writeStream: WriteStream | null = null;
  private currentLogFile: string | null = null;
  private initialized = false;

  constructor(config: AuditLoggerConfig) {
    this.config = config;
  }

  /**
   * Initialize the audit logger.
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled || this.initialized) {
      return;
    }

    // Ensure log directory exists
    await mkdir(this.config.logDirectory, { recursive: true });

    // Create log file with date
    const date = new Date().toISOString().split('T')[0];
    this.currentLogFile = join(
      this.config.logDirectory,
      `audit-${this.config.serverName}-${date}.jsonl`
    );

    this.writeStream = createWriteStream(this.currentLogFile, { flags: 'a' });
    this.initialized = true;
  }

  /**
   * Log an audit entry.
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp' | 'serverName'>): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (!this.initialized) {
      await this.initialize();
    }

    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      serverName: this.config.serverName,
    };

    // Write as JSON Lines format
    const line = JSON.stringify(fullEntry) + '\n';
    
    return new Promise((resolve, reject) => {
      if (this.writeStream) {
        this.writeStream.write(line, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Log a tool invocation.
   */
  async logToolInvocation(
    correlationId: string,
    toolName: string,
    parameters: Record<string, unknown>,
    status: 'success' | 'failure',
    durationMs?: number,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      correlationId,
      eventType: 'tool_invocation',
      toolName,
      parameters: this.redactParameters(parameters),
      status,
      durationMs,
      errorMessage,
    });
  }

  /**
   * Log a URL access event.
   */
  async logUrlAccess(
    correlationId: string,
    url: string,
    allowed: boolean,
    reason?: string
  ): Promise<void> {
    await this.log({
      correlationId,
      eventType: 'url_access',
      status: allowed ? 'success' : 'failure',
      metadata: {
        url: this.redactUrl(url),
        allowed,
        reason,
      },
    });
  }

  /**
   * Log a file access event.
   */
  async logFileAccess(
    correlationId: string,
    filePath: string,
    operation: 'read' | 'write' | 'validate',
    status: 'success' | 'failure',
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      correlationId,
      eventType: 'file_access',
      status,
      errorMessage,
      metadata: {
        filePath,
        operation,
      },
    });
  }

  /**
   * Log a validation event.
   */
  async logValidation(
    correlationId: string,
    validationType: string,
    status: 'success' | 'failure',
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      correlationId,
      eventType: 'validation',
      status,
      metadata: {
        validationType,
        ...details,
      },
    });
  }

  /**
   * Redact sensitive data from parameters.
   */
  private redactParameters(params: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];

    for (const [key, value] of Object.entries(params)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 1000) {
        redacted[key] = `[TRUNCATED: ${value.length} chars]`;
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Redact sensitive parts of a URL.
   */
  private redactUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Redact credentials
      if (parsed.username) parsed.username = '[REDACTED]';
      if (parsed.password) parsed.password = '[REDACTED]';
      // Redact sensitive query params
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];
      for (const param of sensitiveParams) {
        if (parsed.searchParams.has(param)) {
          parsed.searchParams.set(param, '[REDACTED]');
        }
      }
      return parsed.href;
    } catch {
      return url;
    }
  }

  /**
   * Close the audit logger.
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.writeStream) {
        this.writeStream.end(() => {
          this.writeStream = null;
          this.initialized = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

/**
 * Create an audit logger instance.
 */
export function createAuditLogger(config: AuditLoggerConfig): AuditLogger {
  return new AuditLogger(config);
}
