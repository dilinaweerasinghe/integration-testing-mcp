/**
 * Input sanitization utilities.
 * Prevents injection attacks and validates input boundaries.
 */

/**
 * Configuration for input sanitization.
 */
export interface SanitizationConfig {
  maxStringLength: number;
  maxUrlLength: number;
  maxPathDepth: number;
  allowedPathPrefixes: string[];
}

/**
 * Default sanitization configuration.
 */
export const DEFAULT_SANITIZATION_CONFIG: SanitizationConfig = {
  maxStringLength: 10000,
  maxUrlLength: 8192,
  maxPathDepth: 20,
  allowedPathPrefixes: [],
};

/**
 * Input sanitizer for preventing injection attacks.
 */
export class InputSanitizer {
  private readonly config: SanitizationConfig;

  constructor(config?: Partial<SanitizationConfig>) {
    this.config = { ...DEFAULT_SANITIZATION_CONFIG, ...config };
  }

  /**
   * Sanitize a string input.
   */
  sanitizeString(input: string): string {
    if (input.length > this.config.maxStringLength) {
      throw new Error(`String exceeds maximum length of ${this.config.maxStringLength}`);
    }

    // Remove null bytes
    return input.replace(/\0/g, '');
  }

  /**
   * Sanitize a URL input.
   */
  sanitizeUrl(url: string): string {
    if (url.length > this.config.maxUrlLength) {
      throw new Error(`URL exceeds maximum length of ${this.config.maxUrlLength}`);
    }

    // Validate URL format
    try {
      const parsed = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Invalid protocol: ${parsed.protocol}`);
      }

      return parsed.href;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid protocol')) {
        throw error;
      }
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Sanitize a file path to prevent directory traversal.
   */
  sanitizePath(path: string): string {
    // Normalize path separators
    const normalized = path.replace(/\\/g, '/');

    // Check for directory traversal attempts
    if (normalized.includes('..')) {
      throw new Error('Path traversal detected');
    }

    // Check path depth
    const depth = normalized.split('/').filter(Boolean).length;
    if (depth > this.config.maxPathDepth) {
      throw new Error(`Path exceeds maximum depth of ${this.config.maxPathDepth}`);
    }

    // Check allowed prefixes if configured
    if (this.config.allowedPathPrefixes.length > 0) {
      const isAllowed = this.config.allowedPathPrefixes.some(
        (prefix) => normalized.startsWith(prefix)
      );
      if (!isAllowed) {
        throw new Error('Path not in allowed prefixes');
      }
    }

    return normalized;
  }

  /**
   * Sanitize a filename to prevent injection.
   */
  sanitizeFilename(filename: string): string {
    // Remove path components
    const name = filename.replace(/^.*[\\/]/, '');

    // Remove dangerous characters
    const sanitized = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

    // Prevent hidden files
    if (sanitized.startsWith('.')) {
      throw new Error('Hidden files not allowed');
    }

    // Check length
    if (sanitized.length > 255) {
      throw new Error('Filename too long');
    }

    return sanitized;
  }

  /**
   * Sanitize JSON input.
   */
  sanitizeJson(input: string): unknown {
    if (input.length > this.config.maxStringLength) {
      throw new Error('JSON input too large');
    }

    try {
      return JSON.parse(input);
    } catch {
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * Validate content type is allowed.
   */
  validateContentType(
    contentType: string,
    allowedTypes: string[] = ['application/json', 'text/plain']
  ): boolean {
    const normalized = contentType.toLowerCase().split(';')[0]?.trim() ?? '';
    return allowedTypes.some(
      (allowed) => normalized === allowed.toLowerCase()
    );
  }

  /**
   * Validate request size is within limits.
   */
  validateSize(size: number, maxSize: number): boolean {
    return size >= 0 && size <= maxSize;
  }
}

/**
 * Create an input sanitizer with default configuration.
 */
export function createInputSanitizer(
  config?: Partial<SanitizationConfig>
): InputSanitizer {
  return new InputSanitizer(config);
}
