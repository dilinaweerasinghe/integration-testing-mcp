/**
 * Security type definitions.
 */

/**
 * Configuration for header redaction.
 */
export interface HeaderRedactionConfig {
  /** List of header names to redact (case-insensitive) */
  sensitiveHeaders: string[];
  /** Placeholder text for redacted values */
  redactionPlaceholder: string;
  /** Whether to preserve header names in output */
  preserveHeaderNames: boolean;
}

/**
 * Configuration for body redaction.
 */
export interface BodyRedactionConfig {
  /** Patterns to redact from request/response bodies */
  patterns: RedactionPattern[];
  /** Whether to attempt JSON-aware redaction */
  jsonAware: boolean;
}

/**
 * Redaction pattern definition.
 */
export interface RedactionPattern {
  /** Pattern name for logging */
  name: string;
  /** Regex pattern to match */
  pattern: string | RegExp;
  /** Replacement string (can use capture groups) */
  replacement: string;
}

/**
 * Configuration for domain allowlist.
 */
export interface DomainAllowlistConfig {
  /** Allowed domain patterns (supports wildcards) */
  domains: string[];
  /** Whether to enforce strictly (reject vs warn) */
  strictMode: boolean;
  /** Whether to block requests to non-allowed domains */
  blockOnMismatch: boolean;
}

/**
 * HTTP headers in record format.
 */
export type HttpHeaders = Record<string, string | string[]>;

/**
 * Result of URL validation against allowlist.
 */
export interface UrlValidationResult {
  allowed: boolean;
  matchedPattern?: string;
  reason?: string;
}

/**
 * Redaction result with metadata.
 */
export interface RedactionResult<T> {
  /** Redacted content */
  value: T;
  /** Number of redactions performed */
  redactionCount: number;
  /** Fields/patterns that were redacted */
  redactedFields: string[];
}
