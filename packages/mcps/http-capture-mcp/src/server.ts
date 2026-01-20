/**
 * HTTP Capture MCP Server implementation.
 */

import { BaseMcpServer, createSchema } from '@ifs/mcp-core';
import { createDomainAllowlist, createHeaderRedactor, createBodyRedactor } from '@ifs/security';
import { createLogger, createAuditLogger, type AuditLogger } from '@ifs/logging';
import { BrowserManager } from './browser/browser-manager.js';
import { RequestCapture } from './capture/request-capture.js';
import { SchemaInferrer } from './schema/schema-inferrer.js';
import type { CapturedRequest, CaptureSession } from './types.js';

/**
 * HTTP Capture MCP Server.
 * Provides tools for capturing HTTP traffic using headless Playwright.
 */
export class HttpCaptureMcpServer extends BaseMcpServer {
  private readonly logger = createLogger({ name: 'http-capture-mcp' });
  private readonly auditLogger: AuditLogger;
  private readonly domainAllowlist = createDomainAllowlist();
  private readonly headerRedactor = createHeaderRedactor();
  private readonly bodyRedactor = createBodyRedactor();
  
  private browserManager: BrowserManager | null = null;
  private sessions = new Map<string, CaptureSession>();

  constructor() {
    super({
      name: 'http-capture-mcp',
      version: '1.0.0',
      description: 'Captures HTTP traffic from Cloud ERP using headless browser',
    });

    this.auditLogger = createAuditLogger({
      logDirectory: process.env['AUDIT_LOG_DIR'] ?? './logs/audit',
      serverName: 'http-capture-mcp',
      enabled: process.env['AUDIT_LOG_ENABLED'] !== 'false',
    });
  }

  protected registerTools(): void {
    // Tool: openUrl
    this.registerTool(
      {
        name: 'openUrl',
        description: 'Opens a URL in a browser and starts capturing HTTP traffic. Returns a session ID for subsequent operations. Supports HTTP Basic/NTLM auth via username/password params or HTTP_USERNAME/HTTP_PASSWORD env vars.',
        inputSchema: createSchema()
          .string('url', 'The URL to open', { required: true })
          .integer('timeoutMs', 'Navigation timeout in milliseconds', { default: 30000 })
          .boolean('waitForNetworkIdle', 'Wait for network to be idle before returning', { default: true })
          .string('httpUsername', 'Username for HTTP Basic/NTLM authentication (optional, can also use HTTP_USERNAME env var)')
          .string('httpPassword', 'Password for HTTP Basic/NTLM authentication (optional, can also use HTTP_PASSWORD env var)')
          .build(),
      },
      async (args) => this.handleOpenUrl(args as { 
        url: string; 
        timeoutMs?: number; 
        waitForNetworkIdle?: boolean;
        httpUsername?: string;
        httpPassword?: string;
      })
    );

    // Tool: captureRequests
    this.registerTool(
      {
        name: 'captureRequests',
        description: 'Returns all captured HTTP requests from a session with redacted sensitive headers',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID returned by openUrl', { required: true })
          .string('filterMethod', 'Filter by HTTP method (GET, POST, etc.)')
          .string('filterPathPattern', 'Filter by URL path regex pattern')
          .boolean('includeResponses', 'Include response data', { default: true })
          .build(),
      },
      async (args) => this.handleCaptureRequests(args as { 
        sessionId: string; 
        filterMethod?: string; 
        filterPathPattern?: string;
        includeResponses?: boolean;
      })
    );

    // Tool: getResponseSchema
    this.registerTool(
      {
        name: 'getResponseSchema',
        description: 'Infers JSON Schema from captured response payloads',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('requestUrl', 'URL of the request to get schema for', { required: true })
          .boolean('mergeMultiple', 'Merge schemas from multiple matching requests', { default: true })
          .build(),
      },
      async (args) => this.handleGetResponseSchema(args as {
        sessionId: string;
        requestUrl: string;
        mergeMultiple?: boolean;
      })
    );

    // Tool: closeBrowser
    this.registerTool(
      {
        name: 'closeBrowser',
        description: 'Closes a browser session and clears captured data',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID to close', { required: true })
          .build(),
      },
      async (args) => this.handleCloseBrowser(args as { sessionId: string })
    );

    // Tool: listSessions
    this.registerTool(
      {
        name: 'listSessions',
        description: 'Lists all active capture sessions',
        inputSchema: createSchema().build(),
      },
      async () => this.handleListSessions()
    );

    // Tool: click
    this.registerTool(
      {
        name: 'click',
        description: 'Clicks an element on the page. Captures any API calls triggered by the click.',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('selector', 'CSS selector or text selector for the element to click', { required: true })
          .integer('timeoutMs', 'Timeout for finding the element', { default: 5000 })
          .boolean('waitForNavigation', 'Wait for navigation after click', { default: false })
          .boolean('waitForNetworkIdle', 'Wait for network to be idle after click', { default: true })
          .build(),
      },
      async (args) => this.handleClick(args as {
        sessionId: string;
        selector: string;
        timeoutMs?: number;
        waitForNavigation?: boolean;
        waitForNetworkIdle?: boolean;
      })
    );

    // Tool: fill
    this.registerTool(
      {
        name: 'fill',
        description: 'Fills an input field with text',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('selector', 'CSS selector for the input field', { required: true })
          .string('value', 'The value to fill', { required: true })
          .build(),
      },
      async (args) => this.handleFill(args as { sessionId: string; selector: string; value: string })
    );

    // Tool: waitForSelector
    this.registerTool(
      {
        name: 'waitForSelector',
        description: 'Waits for an element to appear on the page',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('selector', 'CSS selector to wait for', { required: true })
          .integer('timeoutMs', 'Maximum time to wait', { default: 30000 })
          .string('state', 'Wait for element to be: visible, hidden, attached, detached', { default: 'visible' })
          .build(),
      },
      async (args) => this.handleWaitForSelector(args as {
        sessionId: string;
        selector: string;
        timeoutMs?: number;
        state?: 'visible' | 'hidden' | 'attached' | 'detached';
      })
    );

    // Tool: screenshot
    this.registerTool(
      {
        name: 'screenshot',
        description: 'Takes a screenshot of the current page',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .boolean('fullPage', 'Capture full page or just viewport', { default: false })
          .build(),
      },
      async (args) => this.handleScreenshot(args as { sessionId: string; fullPage?: boolean })
    );

    // Tool: evaluate
    this.registerTool(
      {
        name: 'evaluate',
        description: 'Evaluates JavaScript in the page context. Useful for getting page state or triggering actions.',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('script', 'JavaScript code to evaluate', { required: true })
          .build(),
      },
      async (args) => this.handleEvaluate(args as { sessionId: string; script: string })
    );

    // Tool: getPageInfo
    this.registerTool(
      {
        name: 'getPageInfo',
        description: 'Gets current page information including URL, title, and visible elements',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .build(),
      },
      async (args) => this.handleGetPageInfo(args as { sessionId: string })
    );

    // Tool: clearCapturedRequests
    this.registerTool(
      {
        name: 'clearCapturedRequests',
        description: 'Clears all captured requests from a session. Useful before performing an action to isolate new API calls.',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .build(),
      },
      async (args) => this.handleClearCapturedRequests(args as { sessionId: string })
    );

    // Tool: selectOption (for dropdowns)
    this.registerTool(
      {
        name: 'selectOption',
        description: 'Selects an option from a dropdown/select element. Can select by value, label, or index.',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('selector', 'CSS selector for the select element', { required: true })
          .string('value', 'Option value to select')
          .string('label', 'Option label/text to select')
          .integer('index', 'Option index to select (0-based)')
          .build(),
      },
      async (args) => this.handleSelectOption(args as {
        sessionId: string;
        selector: string;
        value?: string;
        label?: string;
        index?: number;
      })
    );

    // Tool: check (for checkboxes/radio buttons)
    this.registerTool(
      {
        name: 'check',
        description: 'Checks a checkbox or radio button',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('selector', 'CSS selector for the checkbox/radio', { required: true })
          .build(),
      },
      async (args) => this.handleCheck(args as { sessionId: string; selector: string })
    );

    // Tool: uncheck (for checkboxes)
    this.registerTool(
      {
        name: 'uncheck',
        description: 'Unchecks a checkbox',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('selector', 'CSS selector for the checkbox', { required: true })
          .build(),
      },
      async (args) => this.handleUncheck(args as { sessionId: string; selector: string })
    );

    // Tool: waitForModal
    this.registerTool(
      {
        name: 'waitForModal',
        description: 'Waits for a modal/dialog to appear on the page',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('modalSelector', 'CSS selector for the modal container', { default: '[role="dialog"], .modal, .dialog, [class*="modal"]' })
          .integer('timeoutMs', 'Maximum time to wait', { default: 10000 })
          .build(),
      },
      async (args) => this.handleWaitForModal(args as {
        sessionId: string;
        modalSelector?: string;
        timeoutMs?: number;
      })
    );

    // Tool: fillForm
    this.registerTool(
      {
        name: 'fillForm',
        description: 'Fills multiple form fields at once. Supports text inputs, dropdowns, and checkboxes. Pass fields as JSON array.',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('fieldsJson', 'JSON array of field definitions: [{ "selector": "...", "value": "...", "type": "text"|"select"|"checkbox" }]', { required: true })
          .build(),
      },
      async (args) => {
        const parsed = args as { sessionId: string; fieldsJson: string };
        const fields = JSON.parse(parsed.fieldsJson) as Array<{ selector: string; value: string; type?: 'text' | 'select' | 'checkbox' }>;
        return this.handleFillForm({ sessionId: parsed.sessionId, fields });
      }
    );

    // Tool: type (types with keyboard events)
    this.registerTool(
      {
        name: 'type',
        description: 'Types text into an element with keyboard events. Useful for autocomplete and search fields.',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('selector', 'CSS selector for the input element', { required: true })
          .string('text', 'Text to type', { required: true })
          .integer('delay', 'Delay between keystrokes in ms', { default: 50 })
          .build(),
      },
      async (args) => this.handleType(args as {
        sessionId: string;
        selector: string;
        text: string;
        delay?: number;
      })
    );

    // Tool: pressKey
    this.registerTool(
      {
        name: 'pressKey',
        description: 'Presses a keyboard key (Enter, Tab, Escape, etc.)',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('key', 'Key to press (Enter, Tab, Escape, ArrowDown, etc.)', { required: true })
          .build(),
      },
      async (args) => this.handlePressKey(args as { sessionId: string; key: string })
    );

    // Tool: getFormFields
    this.registerTool(
      {
        name: 'getFormFields',
        description: 'Gets all form fields in a modal or container, including their current values and options',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('containerSelector', 'CSS selector for the form/modal container', { default: 'form, [role="dialog"], .modal' })
          .build(),
      },
      async (args) => this.handleGetFormFields(args as { sessionId: string; containerSelector?: string })
    );

    // Tool: submitForm
    this.registerTool(
      {
        name: 'submitForm',
        description: 'Submits a form by clicking the submit button or pressing Enter. Waits for API response.',
        inputSchema: createSchema()
          .string('sessionId', 'The session ID', { required: true })
          .string('submitButtonSelector', 'CSS selector for submit button', { default: 'button[type="submit"], input[type="submit"], button:has-text("OK"), button:has-text("Submit"), button:has-text("Save")' })
          .boolean('waitForNetworkIdle', 'Wait for network to be idle after submit', { default: true })
          .integer('timeoutMs', 'Timeout for submit action', { default: 30000 })
          .build(),
      },
      async (args) => this.handleSubmitForm(args as {
        sessionId: string;
        submitButtonSelector?: string;
        waitForNetworkIdle?: boolean;
        timeoutMs?: number;
      })
    );
  }

  protected async onInitialize(): Promise<void> {
    this.browserManager = new BrowserManager({
      headless: process.env['BROWSER_HEADLESS'] !== 'false',
      maxConcurrentContexts: parseInt(process.env['MAX_SESSIONS'] ?? '5', 10),
    });
    await this.browserManager.initialize();
    this.logger.info('HTTP Capture MCP server initialized');
  }

  protected async onShutdown(): Promise<void> {
    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      await this.closeSession(sessionId);
    }
    
    if (this.browserManager) {
      await this.browserManager.close();
    }
    
    await this.auditLogger.close();
    this.logger.info('HTTP Capture MCP server shutdown complete');
  }

  private async handleOpenUrl(args: { 
    url: string; 
    timeoutMs?: number; 
    waitForNetworkIdle?: boolean;
    httpUsername?: string;
    httpPassword?: string;
  }): Promise<{ sessionId: string; status: string; capturedCount: number; pageUrl: string }> {
    const correlationId = this.logger.newCorrelationId();
    
    // Validate URL against allowlist
    const validation = this.domainAllowlist.validate(args.url);
    if (!validation.allowed) {
      await this.auditLogger.logUrlAccess(correlationId, args.url, false, validation.reason);
      throw new Error(`URL not allowed: ${validation.reason}`);
    }

    await this.auditLogger.logUrlAccess(correlationId, args.url, true);

    if (!this.browserManager) {
      throw new Error('Browser manager not initialized');
    }

    // Get HTTP credentials from args or environment variables
    const httpUsername = args.httpUsername ?? process.env['HTTP_USERNAME'];
    const httpPassword = args.httpPassword ?? process.env['HTTP_PASSWORD'];
    
    // Create session with optional HTTP credentials
    const contextOptions = httpUsername && httpPassword ? {
      httpCredentials: {
        username: httpUsername,
        password: httpPassword,
      }
    } : undefined;

    const context = await this.browserManager.createContext(contextOptions);
    const requestCapture = new RequestCapture(context, {
      headerRedactor: this.headerRedactor,
      bodyRedactor: this.bodyRedactor,
      maxBodySize: parseInt(process.env['MAX_CAPTURE_SIZE_MB'] ?? '10', 10) * 1024 * 1024,
    });

    // Start capture and navigate
    await requestCapture.startCapture();
    const page = await context.newPage();

    const sessionId = correlationId;
    this.sessions.set(sessionId, {
      id: sessionId,
      context,
      page,
      requestCapture,
      createdAt: new Date(),
      url: args.url,
    });
    
    try {
      await page.goto(args.url, {
        timeout: args.timeoutMs ?? 30000,
        waitUntil: args.waitForNetworkIdle ? 'networkidle' : 'load',
      });
    } catch (error) {
      // Still return session even if navigation has issues
      this.logger.warn('Navigation warning', { error, url: args.url });
    }

    const capturedCount = requestCapture.getCapturedCount();
    const pageUrl = page.url();
    
    this.logger.info('URL opened and capture started', {
      sessionId,
      url: args.url,
      pageUrl,
      capturedCount,
    });

    return {
      sessionId,
      status: 'capturing',
      capturedCount,
      pageUrl,
    };
  }

  private async handleCaptureRequests(args: {
    sessionId: string;
    filterMethod?: string;
    filterPathPattern?: string;
    includeResponses?: boolean;
  }): Promise<{ requests: CapturedRequest[]; totalCount: number }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    let requests = session.requestCapture.getCapturedRequests();

    // Apply filters
    if (args.filterMethod) {
      requests = requests.filter((r) => r.method === args.filterMethod?.toUpperCase());
    }

    if (args.filterPathPattern) {
      const regex = new RegExp(args.filterPathPattern);
      requests = requests.filter((r) => regex.test(new URL(r.url).pathname));
    }

    // Optionally remove response data
    if (args.includeResponses === false) {
      requests = requests.map((r) => ({ ...r, response: undefined }));
    }

    return {
      requests,
      totalCount: requests.length,
    };
  }

  private async handleGetResponseSchema(args: {
    sessionId: string;
    requestUrl: string;
    mergeMultiple?: boolean;
  }): Promise<{ schema: Record<string, unknown> | null; matchedRequests: number }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const requests = session.requestCapture.getCapturedRequests()
      .filter((r) => r.url.includes(args.requestUrl) && r.response?.body);

    if (requests.length === 0) {
      return { schema: null, matchedRequests: 0 };
    }

    const inferrer = new SchemaInferrer();
    
    if (args.mergeMultiple !== false && requests.length > 1) {
      // Merge schemas from multiple responses
      for (const req of requests) {
        if (req.response?.body) {
          try {
            const data = JSON.parse(req.response.body);
            inferrer.addSample(data);
          } catch {
            // Skip non-JSON responses
          }
        }
      }
    } else {
      // Use first matching request
      const firstReq = requests[0];
      if (firstReq?.response?.body) {
        try {
          const data = JSON.parse(firstReq.response.body);
          inferrer.addSample(data);
        } catch {
          return { schema: null, matchedRequests: requests.length };
        }
      }
    }

    return {
      schema: inferrer.getSchema(),
      matchedRequests: requests.length,
    };
  }

  private async handleCloseBrowser(args: { sessionId: string }): Promise<{ success: boolean }> {
    const success = await this.closeSession(args.sessionId);
    return { success };
  }

  private async handleListSessions(): Promise<{ 
    sessions: Array<{ id: string; url: string; createdAt: string; capturedCount: number }>;
  }> {
    const sessions = Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      url: s.url,
      createdAt: s.createdAt.toISOString(),
      capturedCount: s.requestCapture.getCapturedCount(),
    }));

    return { sessions };
  }

  private async closeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    await session.requestCapture.stopCapture();
    await session.context.close();
    this.sessions.delete(sessionId);
    
    this.logger.info('Session closed', { sessionId });
    return true;
  }

  private async handleClick(args: {
    sessionId: string;
    selector: string;
    timeoutMs?: number;
    waitForNavigation?: boolean;
    waitForNetworkIdle?: boolean;
  }): Promise<{ success: boolean; capturedCount: number; newRequests: number }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const beforeCount = session.requestCapture.getCapturedCount();
    const timeout = args.timeoutMs ?? 5000;

    try {
      // Try to find element by selector
      let element = session.page.locator(args.selector);
      
      // If selector looks like text, try text selector
      if (!args.selector.startsWith('.') && !args.selector.startsWith('#') && !args.selector.includes('[')) {
        const textLocator = session.page.getByText(args.selector, { exact: false });
        const count = await textLocator.count();
        if (count > 0) {
          element = textLocator.first();
        }
      }

      await element.waitFor({ state: 'visible', timeout });

      if (args.waitForNavigation) {
        await Promise.all([
          session.page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => {}),
          element.click(),
        ]);
      } else {
        await element.click();
      }

      // Wait for network idle if requested
      if (args.waitForNetworkIdle) {
        await session.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      }

      const afterCount = session.requestCapture.getCapturedCount();

      this.logger.info('Click performed', {
        sessionId: args.sessionId,
        selector: args.selector,
        newRequests: afterCount - beforeCount,
      });

      return {
        success: true,
        capturedCount: afterCount,
        newRequests: afterCount - beforeCount,
      };
    } catch (error) {
      this.logger.error('Click failed', { error, selector: args.selector });
      throw new Error(`Failed to click element: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleFill(args: {
    sessionId: string;
    selector: string;
    value: string;
  }): Promise<{ success: boolean }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    try {
      await session.page.fill(args.selector, args.value);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to fill input: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleWaitForSelector(args: {
    sessionId: string;
    selector: string;
    timeoutMs?: number;
    state?: 'visible' | 'hidden' | 'attached' | 'detached';
  }): Promise<{ found: boolean; timeElapsedMs: number }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const startTime = Date.now();
    
    try {
      await session.page.locator(args.selector).waitFor({
        state: args.state ?? 'visible',
        timeout: args.timeoutMs ?? 30000,
      });
      return {
        found: true,
        timeElapsedMs: Date.now() - startTime,
      };
    } catch {
      return {
        found: false,
        timeElapsedMs: Date.now() - startTime,
      };
    }
  }

  private async handleScreenshot(args: {
    sessionId: string;
    fullPage?: boolean;
  }): Promise<{ screenshot: string; format: string }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const buffer = await session.page.screenshot({
      fullPage: args.fullPage ?? false,
      type: 'png',
    });

    return {
      screenshot: buffer.toString('base64'),
      format: 'base64-png',
    };
  }

  private async handleEvaluate(args: {
    sessionId: string;
    script: string;
  }): Promise<{ result: unknown }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    try {
      const result = await session.page.evaluate(args.script);
      return { result };
    } catch (error) {
      throw new Error(`Script evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGetPageInfo(args: { sessionId: string }): Promise<{
    url: string;
    title: string;
    buttons: Array<{ text: string; selector: string }>;
    inputs: Array<{ name: string; type: string; selector: string }>;
    links: Array<{ text: string; href: string }>;
  }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const url = session.page.url();
    const title = await session.page.title();

    // Get buttons using evaluate with string script
    const buttons = await session.page.evaluate(`
      (() => {
        const btns = [];
        document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]').forEach((el, index) => {
          const text = el.innerText || el.value || '';
          if (text.trim()) {
            btns.push({
              text: text.trim().substring(0, 50),
              selector: el.id ? '#' + el.id : 'button:nth-of-type(' + (index + 1) + ')',
            });
          }
        });
        return btns.slice(0, 20);
      })()
    `) as Array<{ text: string; selector: string }>;

    // Get inputs
    const inputs = await session.page.evaluate(`
      (() => {
        const inp = [];
        document.querySelectorAll('input, textarea, select').forEach((el) => {
          if (el.type !== 'hidden') {
            inp.push({
              name: el.name || el.id || el.placeholder || '',
              type: el.type || 'text',
              selector: el.id ? '#' + el.id : el.name ? '[name="' + el.name + '"]' : '',
            });
          }
        });
        return inp.slice(0, 20);
      })()
    `) as Array<{ name: string; type: string; selector: string }>;

    // Get links
    const links = await session.page.evaluate(`
      (() => {
        const lnk = [];
        document.querySelectorAll('a[href]').forEach((el) => {
          const text = el.innerText.trim();
          if (text && el.href) {
            lnk.push({
              text: text.substring(0, 50),
              href: el.href,
            });
          }
        });
        return lnk.slice(0, 20);
      })()
    `) as Array<{ text: string; href: string }>;

    return { url, title, buttons, inputs, links };
  }

  private async handleClearCapturedRequests(args: { sessionId: string }): Promise<{ success: boolean }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    session.requestCapture.clearCaptures();
    this.logger.info('Captured requests cleared', { sessionId: args.sessionId });
    return { success: true };
  }

  private async handleSelectOption(args: {
    sessionId: string;
    selector: string;
    value?: string;
    label?: string;
    index?: number;
  }): Promise<{ success: boolean; selectedValue: string }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    try {
      let selectedValues: string[];
      
      if (args.value !== undefined) {
        selectedValues = await session.page.selectOption(args.selector, { value: args.value });
      } else if (args.label !== undefined) {
        selectedValues = await session.page.selectOption(args.selector, { label: args.label });
      } else if (args.index !== undefined) {
        selectedValues = await session.page.selectOption(args.selector, { index: args.index });
      } else {
        throw new Error('Must provide value, label, or index to select');
      }

      return {
        success: true,
        selectedValue: selectedValues[0] ?? '',
      };
    } catch (error) {
      throw new Error(`Failed to select option: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleCheck(args: { sessionId: string; selector: string }): Promise<{ success: boolean }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    try {
      await session.page.check(args.selector);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to check element: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleUncheck(args: { sessionId: string; selector: string }): Promise<{ success: boolean }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    try {
      await session.page.uncheck(args.selector);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to uncheck element: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleWaitForModal(args: {
    sessionId: string;
    modalSelector?: string;
    timeoutMs?: number;
  }): Promise<{ found: boolean; modalInfo: { selector: string; title?: string } | null }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const selector = args.modalSelector ?? '[role="dialog"], .modal, .dialog, [class*="modal"]';
    const timeout = args.timeoutMs ?? 10000;

    try {
      await session.page.locator(selector).first().waitFor({ state: 'visible', timeout });
      
      // Try to get modal title
      const title = await session.page.evaluate(`
        (() => {
          const modal = document.querySelector('${selector.replace(/'/g, "\\'")}');
          if (!modal) return null;
          const titleEl = modal.querySelector('h1, h2, h3, .modal-title, [class*="title"]');
          return titleEl ? titleEl.innerText.trim() : null;
        })()
      `) as string | null;

      return {
        found: true,
        modalInfo: {
          selector,
          title: title ?? undefined,
        },
      };
    } catch {
      return {
        found: false,
        modalInfo: null,
      };
    }
  }

  private async handleFillForm(args: {
    sessionId: string;
    fields: Array<{ selector: string; value: string; type?: 'text' | 'select' | 'checkbox' }>;
  }): Promise<{ success: boolean; filledCount: number; errors: string[] }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const errors: string[] = [];
    let filledCount = 0;

    for (const field of args.fields) {
      try {
        const fieldType = field.type ?? 'text';

        switch (fieldType) {
          case 'select':
            await session.page.selectOption(field.selector, field.value);
            break;
          case 'checkbox':
            if (field.value === 'true' || field.value === '1') {
              await session.page.check(field.selector);
            } else {
              await session.page.uncheck(field.selector);
            }
            break;
          default:
            await session.page.fill(field.selector, field.value);
        }
        filledCount++;
      } catch (error) {
        errors.push(`${field.selector}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      filledCount,
      errors,
    };
  }

  private async handleType(args: {
    sessionId: string;
    selector: string;
    text: string;
    delay?: number;
  }): Promise<{ success: boolean }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    try {
      await session.page.locator(args.selector).type(args.text, { delay: args.delay ?? 50 });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to type text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handlePressKey(args: { sessionId: string; key: string }): Promise<{ success: boolean }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    try {
      await session.page.keyboard.press(args.key);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to press key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGetFormFields(args: {
    sessionId: string;
    containerSelector?: string;
  }): Promise<{
    fields: Array<{
      type: string;
      name: string;
      selector: string;
      value: string;
      options?: Array<{ value: string; label: string }>;
      checked?: boolean;
    }>;
  }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const container = args.containerSelector ?? 'form, [role="dialog"], .modal';

    const fields = await session.page.evaluate(`
      (() => {
        const container = document.querySelector('${container.replace(/'/g, "\\'")}');
        if (!container) return [];
        
        const fields = [];
        
        // Text inputs, textareas
        container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea').forEach(el => {
          fields.push({
            type: el.type || 'text',
            name: el.name || el.id || el.placeholder || '',
            selector: el.id ? '#' + el.id : el.name ? '[name="' + el.name + '"]' : '',
            value: el.value || '',
            checked: el.type === 'checkbox' || el.type === 'radio' ? el.checked : undefined,
          });
        });
        
        // Select dropdowns
        container.querySelectorAll('select').forEach(el => {
          const options = Array.from(el.options).map(opt => ({
            value: opt.value,
            label: opt.text,
          }));
          fields.push({
            type: 'select',
            name: el.name || el.id || '',
            selector: el.id ? '#' + el.id : el.name ? '[name="' + el.name + '"]' : '',
            value: el.value || '',
            options: options,
          });
        });
        
        return fields.slice(0, 50);
      })()
    `) as Array<{
      type: string;
      name: string;
      selector: string;
      value: string;
      options?: Array<{ value: string; label: string }>;
      checked?: boolean;
    }>;

    return { fields };
  }

  private async handleSubmitForm(args: {
    sessionId: string;
    submitButtonSelector?: string;
    waitForNetworkIdle?: boolean;
    timeoutMs?: number;
  }): Promise<{ success: boolean; capturedCount: number; newRequests: number }> {
    const session = this.sessions.get(args.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const beforeCount = session.requestCapture.getCapturedCount();
    const buttonSelector = args.submitButtonSelector ?? 
      'button[type="submit"], input[type="submit"], button:has-text("OK"), button:has-text("Submit"), button:has-text("Save")';
    const timeout = args.timeoutMs ?? 30000;

    try {
      // Find and click the submit button
      const submitButton = session.page.locator(buttonSelector).first();
      await submitButton.waitFor({ state: 'visible', timeout: 5000 });
      await submitButton.click();

      // Wait for network activity
      if (args.waitForNetworkIdle !== false) {
        await session.page.waitForLoadState('networkidle', { timeout }).catch(() => {});
      }

      // Small delay to ensure all requests are captured
      await session.page.waitForTimeout(500);

      const afterCount = session.requestCapture.getCapturedCount();

      this.logger.info('Form submitted', {
        sessionId: args.sessionId,
        newRequests: afterCount - beforeCount,
      });

      return {
        success: true,
        capturedCount: afterCount,
        newRequests: afterCount - beforeCount,
      };
    } catch (error) {
      throw new Error(`Failed to submit form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
