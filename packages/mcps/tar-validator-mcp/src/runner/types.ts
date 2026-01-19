/**
 * Types for SAR Test Runner.
 */

/**
 * Configuration for the SAR test runner.
 */
export interface SarRunnerConfig {
  /** Path to ScriptARest.exe */
  scriptARestPath: string;
  /** Cloud ERP server URL */
  serverUrl: string;
  /** Username for authentication */
  username: string;
  /** Password for authentication */
  password: string;
  /** Default timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Options for running a test.
 */
export interface RunTestOptions {
  /** Path to the .mkd file to run */
  filePath: string;
  /** Override server URL (optional) */
  serverUrl?: string;
  /** Override username (optional) */
  username?: string;
  /** Override password (optional) */
  password?: string;
  /** Additional command line arguments */
  additionalArgs?: string[];
  /** Timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * A command executed during the test.
 */
export interface TestCommand {
  /** Timestamp of the command */
  timestamp: string;
  /** Command type (Get, Post, Create, etc.) */
  command: string;
  /** Full command text */
  fullCommand: string;
  /** Indentation level (for nested calls) */
  level: number;
  /** Result if available */
  result?: {
    /** HTTP status code */
    statusCode: number;
    /** Status text */
    statusText: string;
  };
}

/**
 * A server call with performance metrics.
 */
export interface ServerCall {
  /** URL of the call */
  url: string;
  /** Number of times called */
  count: number;
  /** Average response time in ms */
  avgMs: number;
  /** Maximum response time in ms */
  maxMs: number;
  /** Minimum response time in ms */
  minMs: number;
}

/**
 * Test report summary.
 */
export interface TestReport {
  /** Test name/file */
  testName: string;
  /** Test status: Passed or Failed */
  status: 'Passed' | 'Failed' | 'Error';
  /** Execution time in seconds */
  timeSeconds: number;
  /** File path */
  filePath: string;
  /** Server calls count */
  serverCalls: number;
  /** Failed server calls count */
  failedServerCalls: number;
  /** Asserts count */
  asserts: number;
  /** Failed asserts count */
  failedAsserts: number;
  /** Exceptions count */
  exceptions: number;
}

/**
 * Full test execution result.
 */
export interface TestExecutionResult {
  /** Whether the test passed */
  success: boolean;
  /** Test report */
  report: TestReport;
  /** All commands executed */
  commands: TestCommand[];
  /** Server call statistics */
  serverCallStats: ServerCall[];
  /** Raw output from ScriptARest */
  rawOutput: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Errors found during execution */
  errors: TestError[];
  /** Warnings found */
  warnings: string[];
}

/**
 * An error found during test execution.
 */
export interface TestError {
  /** Error type */
  type: 'server_call_failed' | 'assert_failed' | 'exception' | 'timeout' | 'parse_error';
  /** Error message */
  message: string;
  /** Line/command where error occurred */
  location?: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Analysis of test results with improvement suggestions.
 */
export interface TestAnalysis {
  /** Overall assessment */
  summary: string;
  /** Issues found */
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    description: string;
    suggestion?: string;
  }>;
  /** Performance insights */
  performance: {
    totalTime: number;
    slowestCalls: ServerCall[];
    recommendations: string[];
  };
  /** Coverage info */
  coverage: {
    serverCallsMade: number;
    uniqueEndpoints: number;
    assertsExecuted: number;
  };
}
