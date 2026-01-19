/**
 * Domain allowlist for URL validation.
 * Ensures only approved domains are accessed.
 */

import type {
  DomainAllowlistConfig,
  UrlValidationResult,
} from '../types/security-types.js';

/**
 * Default allowed domains for IFS Cloud.
 */
export const DEFAULT_ALLOWED_DOMAINS = [
  '*.ifscloud.com',
  '*.ifs.com',
  '*.ifsapplications.com',
  'localhost',
  '127.0.0.1',
];

/**
 * Domain allowlist validator.
 * Validates URLs against a list of allowed domain patterns.
 */
export class DomainAllowlist {
  private readonly config: DomainAllowlistConfig;
  private readonly patterns: Array<{ pattern: string; regex: RegExp }>;

  constructor(config?: Partial<DomainAllowlistConfig>) {
    this.config = {
      domains: config?.domains ?? DEFAULT_ALLOWED_DOMAINS,
      strictMode: config?.strictMode ?? true,
      blockOnMismatch: config?.blockOnMismatch ?? true,
    };

    // Compile patterns to regex
    this.patterns = this.config.domains.map((domain) => ({
      pattern: domain,
      regex: this.domainToRegex(domain),
    }));
  }

  /**
   * Convert a domain pattern to a regex.
   * Supports wildcards (*) for subdomain matching.
   */
  private domainToRegex(pattern: string): RegExp {
    // Escape special regex characters except *
    let regexStr = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[a-zA-Z0-9-]+');

    // Handle wildcard at start (*.domain.com)
    if (pattern.startsWith('*.')) {
      regexStr = `([a-zA-Z0-9-]+\\.)*${regexStr.slice(16)}`; // Remove the leading pattern
    }

    return new RegExp(`^${regexStr}$`, 'i');
  }

  /**
   * Extract hostname from a URL.
   */
  private extractHostname(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Validate a URL against the allowlist.
   */
  validate(url: string): UrlValidationResult {
    const hostname = this.extractHostname(url);

    if (!hostname) {
      return {
        allowed: false,
        reason: 'Invalid URL format',
      };
    }

    // Check against each pattern
    for (const { pattern, regex } of this.patterns) {
      if (regex.test(hostname)) {
        return {
          allowed: true,
          matchedPattern: pattern,
        };
      }
    }

    return {
      allowed: false,
      reason: `Domain "${hostname}" is not in the allowlist`,
    };
  }

  /**
   * Check if a URL is allowed (simple boolean).
   */
  isAllowed(url: string): boolean {
    return this.validate(url).allowed;
  }

  /**
   * Validate URL and throw if not allowed (for strict mode).
   */
  validateOrThrow(url: string): void {
    const result = this.validate(url);
    if (!result.allowed && this.config.blockOnMismatch) {
      throw new Error(`URL blocked by allowlist: ${result.reason}`);
    }
  }

  /**
   * Add a domain pattern to the allowlist.
   */
  addDomain(domain: string): void {
    if (!this.config.domains.includes(domain)) {
      this.config.domains.push(domain);
      this.patterns.push({
        pattern: domain,
        regex: this.domainToRegex(domain),
      });
    }
  }

  /**
   * Remove a domain pattern from the allowlist.
   */
  removeDomain(domain: string): boolean {
    const index = this.config.domains.indexOf(domain);
    if (index !== -1) {
      this.config.domains.splice(index, 1);
      this.patterns.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get current allowed domains.
   */
  getDomains(): string[] {
    return [...this.config.domains];
  }

  /**
   * Check if strict mode is enabled.
   */
  isStrictMode(): boolean {
    return this.config.strictMode;
  }
}

/**
 * Create a domain allowlist with default configuration.
 */
export function createDomainAllowlist(
  config?: Partial<DomainAllowlistConfig>
): DomainAllowlist {
  return new DomainAllowlist(config);
}

/**
 * Quick utility to validate a URL against default allowlist.
 */
export function isUrlAllowed(url: string): boolean {
  const allowlist = new DomainAllowlist();
  return allowlist.isAllowed(url);
}
