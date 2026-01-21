/**
 * Browser manager for Playwright automation.
 * Handles browser lifecycle and context creation.
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { BrowserManagerConfig } from '../types.js';

/**
 * HTTP credentials for authentication.
 */
export interface HttpCredentials {
  username: string;
  password: string;
  origin?: string;
}

/**
 * Options for creating a browser context.
 */
export interface CreateContextOptions {
  /** HTTP credentials for Basic/NTLM authentication */
  httpCredentials?: HttpCredentials;
}

/**
 * Manages Playwright browser instances.
 */
export class BrowserManager {
  private readonly config: BrowserManagerConfig;
  private browser: Browser | null = null;
  private contextCount = 0;

  constructor(config: BrowserManagerConfig) {
    this.config = config;
  }

  /**
   * Initialize the browser.
   */
  async initialize(): Promise<void> {
    if (this.browser) {
      return;
    }

    this.browser = await chromium.launch({
      headless: this.config.headless,
      executablePath: this.config.executablePath,
      args: [
        // Make browser look less like automation
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        // Additional flags to avoid detection
        '--disable-infobars',
        '--disable-extensions',
        '--disable-gpu',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--allow-running-insecure-content',
      ],
    });
  }

  /**
   * Create a new browser context with isolation.
   * @param options - Optional context options including HTTP credentials
   */
  async createContext(options?: CreateContextOptions): Promise<BrowserContext> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    if (this.contextCount >= this.config.maxConcurrentContexts) {
      throw new Error(`Maximum concurrent contexts (${this.config.maxConcurrentContexts}) reached`);
    }

    const context = await this.browser.newContext({
      // Accept all HTTPS certificates
      ignoreHTTPSErrors: true,
      // Allow service workers for Keycloak/OAuth flows
      serviceWorkers: 'allow',
      // Standard viewport
      viewport: { width: 1920, height: 1080 },
      // Use a real Chrome user agent (no MCP-Capture suffix)
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // Enable JavaScript
      javaScriptEnabled: true,
      // Accept cookies
      bypassCSP: true,
      // HTTP credentials for Basic/NTLM auth (if provided)
      httpCredentials: options?.httpCredentials ? {
        username: options.httpCredentials.username,
        password: options.httpCredentials.password,
        origin: options.httpCredentials.origin,
      } : undefined,
      // Locale settings
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    // Remove webdriver flag to avoid detection
    // Note: Script is passed as string to avoid TypeScript errors with browser globals
    await context.addInitScript(`
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    `);

    this.contextCount++;

    // Track context close
    context.on('close', () => {
      this.contextCount--;
    });

    return context;
  }

  /**
   * Get current context count.
   */
  getContextCount(): number {
    return this.contextCount;
  }

  /**
   * Check if browser is initialized.
   */
  isInitialized(): boolean {
    return this.browser !== null;
  }

  /**
   * Close the browser.
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.contextCount = 0;
    }
  }
}
