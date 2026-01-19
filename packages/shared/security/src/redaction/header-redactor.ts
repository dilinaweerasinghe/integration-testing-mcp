/**
 * HTTP header redaction utilities.
 * Removes sensitive information from headers before logging or output.
 */

import type {
  HeaderRedactionConfig,
  HttpHeaders,
  RedactionResult,
} from '../types/security-types.js';

/**
 * Default list of sensitive headers to redact.
 */
export const DEFAULT_SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-ifs-session',
  'x-ifs-token',
  'proxy-authorization',
  'www-authenticate',
  'x-csrf-token',
  'x-request-id',
  'x-amz-security-token',
  'x-azure-auth',
];

/**
 * Default redaction placeholder.
 */
export const DEFAULT_REDACTION_PLACEHOLDER = '[REDACTED]';

/**
 * Header redactor for removing sensitive information from HTTP headers.
 */
export class HeaderRedactor {
  private readonly config: HeaderRedactionConfig;
  private readonly sensitiveHeadersLower: Set<string>;

  constructor(config?: Partial<HeaderRedactionConfig>) {
    this.config = {
      sensitiveHeaders: config?.sensitiveHeaders ?? DEFAULT_SENSITIVE_HEADERS,
      redactionPlaceholder: config?.redactionPlaceholder ?? DEFAULT_REDACTION_PLACEHOLDER,
      preserveHeaderNames: config?.preserveHeaderNames ?? true,
    };

    // Convert to lowercase for case-insensitive comparison
    this.sensitiveHeadersLower = new Set(
      this.config.sensitiveHeaders.map((h) => h.toLowerCase())
    );
  }

  /**
   * Check if a header should be redacted.
   */
  isSensitive(headerName: string): boolean {
    return this.sensitiveHeadersLower.has(headerName.toLowerCase());
  }

  /**
   * Redact sensitive headers from a headers object.
   */
  redact(headers: HttpHeaders): RedactionResult<HttpHeaders> {
    const redactedHeaders: HttpHeaders = {};
    const redactedFields: string[] = [];
    let redactionCount = 0;

    for (const [key, value] of Object.entries(headers)) {
      if (this.isSensitive(key)) {
        if (this.config.preserveHeaderNames) {
          redactedHeaders[key] = this.config.redactionPlaceholder;
        }
        redactedFields.push(key);
        redactionCount++;
      } else {
        redactedHeaders[key] = value;
      }
    }

    return {
      value: redactedHeaders,
      redactionCount,
      redactedFields,
    };
  }

  /**
   * Add additional headers to the sensitive list.
   */
  addSensitiveHeaders(headers: string[]): void {
    for (const header of headers) {
      this.sensitiveHeadersLower.add(header.toLowerCase());
      this.config.sensitiveHeaders.push(header);
    }
  }

  /**
   * Remove a header from the sensitive list.
   */
  removeSensitiveHeader(header: string): boolean {
    const lower = header.toLowerCase();
    if (this.sensitiveHeadersLower.has(lower)) {
      this.sensitiveHeadersLower.delete(lower);
      const index = this.config.sensitiveHeaders.findIndex(
        (h) => h.toLowerCase() === lower
      );
      if (index !== -1) {
        this.config.sensitiveHeaders.splice(index, 1);
      }
      return true;
    }
    return false;
  }

  /**
   * Get the current list of sensitive headers.
   */
  getSensitiveHeaders(): string[] {
    return [...this.config.sensitiveHeaders];
  }
}

/**
 * Create a header redactor with default configuration.
 */
export function createHeaderRedactor(
  config?: Partial<HeaderRedactionConfig>
): HeaderRedactor {
  return new HeaderRedactor(config);
}

/**
 * Quick utility to redact headers with default settings.
 */
export function redactHeaders(headers: HttpHeaders): HttpHeaders {
  const redactor = new HeaderRedactor();
  return redactor.redact(headers).value;
}
