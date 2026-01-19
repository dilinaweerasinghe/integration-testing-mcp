/**
 * Type definitions for HTTP Capture MCP.
 */

import type { BrowserContext, Page } from 'playwright';
import type { RequestCapture } from './capture/request-capture.js';

/**
 * A captured HTTP request with optional response.
 */
export interface CapturedRequest {
  /** Request ID */
  id: string;
  /** HTTP method */
  method: string;
  /** Full URL */
  url: string;
  /** Request headers (redacted) */
  headers: Record<string, string>;
  /** Request body (if applicable) */
  body?: string;
  /** Content type */
  contentType?: string;
  /** Timestamp */
  timestamp: string;
  /** Response data (if captured) */
  response?: CapturedResponse;
}

/**
 * A captured HTTP response.
 */
export interface CapturedResponse {
  /** HTTP status code */
  status: number;
  /** Status text */
  statusText: string;
  /** Response headers (redacted) */
  headers: Record<string, string>;
  /** Response body */
  body?: string;
  /** Content type */
  contentType?: string;
  /** Response time in ms */
  responseTimeMs: number;
}

/**
 * Capture session state.
 */
export interface CaptureSession {
  /** Session ID */
  id: string;
  /** Browser context */
  context: BrowserContext;
  /** Active page */
  page: Page;
  /** Request capture instance */
  requestCapture: RequestCapture;
  /** Session creation time */
  createdAt: Date;
  /** Initial URL */
  url: string;
}

/**
 * Browser manager configuration.
 */
export interface BrowserManagerConfig {
  /** Run browser in headless mode */
  headless: boolean;
  /** Maximum concurrent browser contexts */
  maxConcurrentContexts: number;
  /** Browser executable path (optional) */
  executablePath?: string;
}

/**
 * Request capture configuration.
 */
export interface RequestCaptureConfig {
  /** Header redactor instance */
  headerRedactor: {
    redact: (headers: Record<string, string | string[]>) => { value: Record<string, string | string[]> };
  };
  /** Body redactor instance */
  bodyRedactor: {
    redact: (body: string) => { value: string };
  };
  /** Maximum body size to capture */
  maxBodySize: number;
  /** Content types to capture */
  allowedContentTypes?: string[];
}
