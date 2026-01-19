/**
 * Request/response body redaction utilities.
 * Removes sensitive data patterns from JSON and text content.
 */

import type {
  BodyRedactionConfig,
  RedactionPattern,
  RedactionResult,
} from '../types/security-types.js';

/**
 * Default redaction patterns for common sensitive data.
 */
export const DEFAULT_REDACTION_PATTERNS: RedactionPattern[] = [
  {
    name: 'password',
    pattern: /("(?:password|passwd|pwd|secret)":\s*)"[^"]*"/gi,
    replacement: '$1"[REDACTED]"',
  },
  {
    name: 'apiKey',
    pattern: /("(?:api[_-]?key|apikey)":\s*)"[^"]*"/gi,
    replacement: '$1"[REDACTED]"',
  },
  {
    name: 'bearer-token',
    pattern: /("(?:token|bearer|access[_-]?token|refresh[_-]?token)":\s*)"[^"]*"/gi,
    replacement: '$1"[REDACTED]"',
  },
  {
    name: 'authorization-header',
    pattern: /(Bearer\s+)[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi,
    replacement: '$1[REDACTED]',
  },
  {
    name: 'basic-auth',
    pattern: /(Basic\s+)[A-Za-z0-9+/=]+/gi,
    replacement: '$1[REDACTED]',
  },
  {
    name: 'connection-string',
    pattern: /("(?:connection[_-]?string|conn[_-]?str)":\s*)"[^"]*"/gi,
    replacement: '$1"[REDACTED]"',
  },
  {
    name: 'private-key',
    pattern: /(-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----)[\s\S]*?(-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----)/gi,
    replacement: '$1[REDACTED]$2',
  },
  {
    name: 'credit-card',
    pattern: /\b([3-6]\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/g,
    replacement: '[REDACTED-CC]',
  },
];

/**
 * Body redactor for removing sensitive patterns from content.
 */
export class BodyRedactor {
  private readonly config: BodyRedactionConfig;
  private readonly compiledPatterns: Array<{
    name: string;
    regex: RegExp;
    replacement: string;
  }>;

  constructor(config?: Partial<BodyRedactionConfig>) {
    this.config = {
      patterns: config?.patterns ?? DEFAULT_REDACTION_PATTERNS,
      jsonAware: config?.jsonAware ?? true,
    };

    // Compile patterns
    this.compiledPatterns = this.config.patterns.map((p) => ({
      name: p.name,
      regex: typeof p.pattern === 'string' ? new RegExp(p.pattern, 'gi') : p.pattern,
      replacement: p.replacement,
    }));
  }

  /**
   * Redact sensitive patterns from a string body.
   */
  redact(body: string): RedactionResult<string> {
    let result = body;
    const redactedFields: string[] = [];
    let redactionCount = 0;

    for (const { name, regex, replacement } of this.compiledPatterns) {
      // Reset regex state
      regex.lastIndex = 0;
      
      const matches = result.match(regex);
      if (matches && matches.length > 0) {
        result = result.replace(regex, replacement);
        redactedFields.push(name);
        redactionCount += matches.length;
      }
    }

    return {
      value: result,
      redactionCount,
      redactedFields,
    };
  }

  /**
   * Redact sensitive data from a parsed JSON object.
   * Provides more precise redaction for JSON content.
   */
  redactJson(obj: unknown): RedactionResult<unknown> {
    const redactedFields: string[] = [];
    let redactionCount = 0;

    const sensitiveKeys = new Set([
      'password',
      'passwd',
      'pwd',
      'secret',
      'apikey',
      'api_key',
      'token',
      'accesstoken',
      'access_token',
      'refreshtoken',
      'refresh_token',
      'authorization',
      'credentials',
      'privatekey',
      'private_key',
    ]);

    const redactValue = (value: unknown, key: string): unknown => {
      if (value === null || value === undefined) {
        return value;
      }

      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          return value.map((item, index) => redactValue(item, `${key}[${index}]`));
        }

        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          result[k] = redactValue(v, k);
        }
        return result;
      }

      // Check if this key should be redacted
      const keyLower = key.toLowerCase().replace(/[_-]/g, '');
      if (sensitiveKeys.has(keyLower) && typeof value === 'string') {
        redactedFields.push(key);
        redactionCount++;
        return '[REDACTED]';
      }

      return value;
    };

    const redactedValue = redactValue(obj, 'root');

    return {
      value: redactedValue,
      redactionCount,
      redactedFields,
    };
  }

  /**
   * Add a custom redaction pattern.
   */
  addPattern(pattern: RedactionPattern): void {
    this.config.patterns.push(pattern);
    this.compiledPatterns.push({
      name: pattern.name,
      regex: typeof pattern.pattern === 'string' 
        ? new RegExp(pattern.pattern, 'gi') 
        : pattern.pattern,
      replacement: pattern.replacement,
    });
  }

  /**
   * Get current redaction patterns.
   */
  getPatterns(): RedactionPattern[] {
    return [...this.config.patterns];
  }
}

/**
 * Create a body redactor with default configuration.
 */
export function createBodyRedactor(
  config?: Partial<BodyRedactionConfig>
): BodyRedactor {
  return new BodyRedactor(config);
}

/**
 * Quick utility to redact body with default settings.
 */
export function redactBody(body: string): string {
  const redactor = new BodyRedactor();
  return redactor.redact(body).value;
}
