/**
 * Browser manager for Playwright automation.
 * Handles browser lifecycle and context creation.
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { BrowserManagerConfig } from '../types.js';

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
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });
  }

  /**
   * Create a new browser context with isolation.
   */
  async createContext(): Promise<BrowserContext> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    if (this.contextCount >= this.config.maxConcurrentContexts) {
      throw new Error(`Maximum concurrent contexts (${this.config.maxConcurrentContexts}) reached`);
    }

    const context = await this.browser.newContext({
      // Incognito-like context with no persistence
      ignoreHTTPSErrors: true,
      // Block service workers to simplify capture
      serviceWorkers: 'block',
      // Standard viewport
      viewport: { width: 1920, height: 1080 },
      // Reasonable user agent
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36 MCP-Capture/1.0',
    });

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
