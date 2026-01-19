/**
 * HTTP request capture using Playwright.
 * Intercepts and records HTTP traffic with security redaction.
 */

import type { BrowserContext, Request, Response } from 'playwright';
import { randomUUID } from 'node:crypto';
import type { CapturedRequest, CapturedResponse, RequestCaptureConfig } from '../types.js';

/**
 * Captures HTTP requests and responses from a browser context.
 */
export class RequestCapture {
  private readonly context: BrowserContext;
  private readonly config: RequestCaptureConfig;
  private readonly capturedRequests = new Map<string, CapturedRequest>();
  private readonly requestTimings = new Map<string, number>();
  private isCapturing = false;

  private readonly defaultAllowedContentTypes = [
    'application/json',
    'application/xml',
    'text/xml',
    'text/plain',
    'text/html',
    'application/x-www-form-urlencoded',
  ];

  constructor(context: BrowserContext, config: RequestCaptureConfig) {
    this.context = context;
    this.config = config;
  }

  /**
   * Start capturing requests.
   */
  async startCapture(): Promise<void> {
    if (this.isCapturing) {
      return;
    }

    this.context.on('request', this.handleRequest);
    this.context.on('response', this.handleResponse);
    this.isCapturing = true;
  }

  /**
   * Stop capturing requests.
   */
  async stopCapture(): Promise<void> {
    if (!this.isCapturing) {
      return;
    }

    this.context.off('request', this.handleRequest);
    this.context.off('response', this.handleResponse);
    this.isCapturing = false;
  }

  /**
   * Get all captured requests.
   */
  getCapturedRequests(): CapturedRequest[] {
    return Array.from(this.capturedRequests.values());
  }

  /**
   * Get count of captured requests.
   */
  getCapturedCount(): number {
    return this.capturedRequests.size;
  }

  /**
   * Clear captured requests.
   */
  clearCaptures(): void {
    this.capturedRequests.clear();
    this.requestTimings.clear();
  }

  /**
   * Handle incoming request.
   */
  private handleRequest = async (request: Request): Promise<void> => {
    const requestId = randomUUID();
    const url = request.url();
    
    // Skip non-HTTP requests
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return;
    }

    // Record timing
    this.requestTimings.set(request.url() + request.method(), Date.now());

    // Get and redact headers
    const rawHeaders = request.headers();
    const redactedHeaders = this.config.headerRedactor.redact(rawHeaders).value as Record<string, string>;

    // Get request body
    let body: string | undefined;
    const postData = request.postData();
    if (postData && postData.length <= this.config.maxBodySize) {
      body = this.config.bodyRedactor.redact(postData).value;
    }

    const captured: CapturedRequest = {
      id: requestId,
      method: request.method(),
      url,
      headers: redactedHeaders,
      body,
      contentType: rawHeaders['content-type'],
      timestamp: new Date().toISOString(),
    };

    this.capturedRequests.set(url + request.method(), captured);
  };

  /**
   * Handle response.
   */
  private handleResponse = async (response: Response): Promise<void> => {
    const request = response.request();
    const key = request.url() + request.method();
    const captured = this.capturedRequests.get(key);
    
    if (!captured) {
      return;
    }

    // Calculate response time
    const startTime = this.requestTimings.get(key) ?? Date.now();
    const responseTimeMs = Date.now() - startTime;

    // Get and redact headers
    const rawHeaders = await response.allHeaders();
    const redactedHeaders = this.config.headerRedactor.redact(rawHeaders).value as Record<string, string>;

    // Check if we should capture body
    const contentType = rawHeaders['content-type'] ?? '';
    const allowedTypes = this.config.allowedContentTypes ?? this.defaultAllowedContentTypes;
    const shouldCaptureBody = allowedTypes.some((t) => contentType.includes(t));

    let body: string | undefined;
    if (shouldCaptureBody) {
      try {
        const bodyBuffer = await response.body();
        if (bodyBuffer.length <= this.config.maxBodySize) {
          const bodyText = bodyBuffer.toString('utf-8');
          body = this.config.bodyRedactor.redact(bodyText).value;
        }
      } catch {
        // Response body not available
      }
    }

    const capturedResponse: CapturedResponse = {
      status: response.status(),
      statusText: response.statusText(),
      headers: redactedHeaders,
      body,
      contentType,
      responseTimeMs,
    };

    captured.response = capturedResponse;
  };
}
