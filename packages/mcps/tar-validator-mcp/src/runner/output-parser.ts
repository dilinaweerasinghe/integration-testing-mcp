/**
 * Parser for ScriptARest command line output.
 * Extracts test results, commands, errors, and performance metrics.
 */

import type {
  TestCommand,
  ServerCall,
  TestReport,
  TestExecutionResult,
  TestError,
} from './types.js';

/**
 * Parses ScriptARest output into structured results.
 */
export class OutputParser {
  /**
   * Parse the full output from ScriptARest.
   */
  parse(output: string): TestExecutionResult {
    const commands = this.parseCommands(output);
    const report = this.parseTestReport(output);
    const serverCallStats = this.parseServerCallStats(output);
    const errors = this.findErrors(output, commands);
    const warnings = this.findWarnings(output);

    const success = report.status === 'Passed' && 
                    report.failedServerCalls === 0 && 
                    report.failedAsserts === 0 &&
                    report.exceptions === 0;

    return {
      success,
      report,
      commands,
      serverCallStats,
      rawOutput: output,
      errors,
      warnings,
      errorMessage: success ? undefined : this.summarizeErrors(errors),
    };
  }

  /**
   * Parse commands from output.
   */
  private parseCommands(output: string): TestCommand[] {
    const commands: TestCommand[] = [];
    const lines = output.split('\n');

    // Pattern: timestamp Command: command_text
    // Or: timestamp Result (status) status_text
    const commandPattern = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+Command:\s+(.+)$/;
    const resultPattern = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+Result\s+\((\d+)\)\s+(.+)$/;

    let currentCommand: TestCommand | null = null;

    for (const line of lines) {
      const trimmedLine = line.trimEnd();
      
      // Calculate indentation level (each 3 spaces = 1 level for nested calls)
      const leadingSpaces = line.length - line.trimStart().length;
      const level = Math.floor(leadingSpaces / 3);

      // Check for command
      const commandMatch = trimmedLine.match(commandPattern);
      if (commandMatch) {
        const fullCommand = commandMatch[2]?.trim() ?? '';
        const commandType = this.extractCommandType(fullCommand);
        
        currentCommand = {
          timestamp: commandMatch[1] ?? '',
          command: commandType,
          fullCommand,
          level,
        };
        commands.push(currentCommand);
        continue;
      }

      // Check for result
      const resultMatch = trimmedLine.match(resultPattern);
      if (resultMatch && currentCommand) {
        currentCommand.result = {
          statusCode: parseInt(resultMatch[2] ?? '0', 10),
          statusText: resultMatch[3] ?? '',
        };
      }
    }

    return commands;
  }

  /**
   * Extract the command type from full command text.
   */
  private extractCommandType(fullCommand: string): string {
    const parts = fullCommand.split(/\s+/);
    return parts[0] ?? fullCommand;
  }

  /**
   * Parse the test report section.
   */
  private parseTestReport(output: string): TestReport {
    const report: TestReport = {
      testName: 'Unknown',
      status: 'Error',
      timeSeconds: 0,
      filePath: '',
      serverCalls: 0,
      failedServerCalls: 0,
      asserts: 0,
      failedAsserts: 0,
      exceptions: 0,
    };

    // Extract test name and status - look in Test Report section
    // Pattern: TestData CreateSiteData or TestCase CustomerLookupTest
    const testNameMatch = output.match(/^\s*(TestData|TestCase|TestSuite|TestUtil|TestCollection)\s+(\S+)/m);
    if (testNameMatch && testNameMatch[2]) {
      report.testName = testNameMatch[2];
    } else {
      // Try to extract from file path
      const fileMatch = output.match(/file:\s+.*[\\\/]([^\\\/]+)\.mkd/);
      if (fileMatch && fileMatch[1]) {
        report.testName = fileMatch[1];
      }
    }

    // Status - look for the exact pattern in the report section
    const statusMatch = output.match(/^\s*(Passed|Failed)\s*$/m);
    if (statusMatch) {
      report.status = statusMatch[1] as 'Passed' | 'Failed';
    } else if (output.includes('Passed')) {
      report.status = 'Passed';
    } else if (output.includes('Failed')) {
      report.status = 'Failed';
    }

    // Time
    const timeMatch = output.match(/time:\s+([\d.]+)/);
    if (timeMatch) {
      report.timeSeconds = parseFloat(timeMatch[1] ?? '0');
    }

    // File path
    const fileMatch = output.match(/file:\s+(.+\.mkd)/);
    if (fileMatch) {
      report.filePath = fileMatch[1] ?? '';
    }

    // Server calls
    const serverCallsMatch = output.match(/Server calls:\s+(\d+)/);
    if (serverCallsMatch) {
      report.serverCalls = parseInt(serverCallsMatch[1] ?? '0', 10);
    }

    // Failed server calls
    const failedCallsMatch = output.match(/Failed server calls:\s+(\d+)/);
    if (failedCallsMatch) {
      report.failedServerCalls = parseInt(failedCallsMatch[1] ?? '0', 10);
    }

    // Asserts
    const assertsMatch = output.match(/Asserts:\s+(\d+)/);
    if (assertsMatch) {
      report.asserts = parseInt(assertsMatch[1] ?? '0', 10);
    }

    // Failed asserts
    const failedAssertsMatch = output.match(/Failed asserts:\s+(\d+)/);
    if (failedAssertsMatch) {
      report.failedAsserts = parseInt(failedAssertsMatch[1] ?? '0', 10);
    }

    // Exceptions
    const exceptionsMatch = output.match(/Exceptions:?\s+(\d+)/);
    if (exceptionsMatch) {
      report.exceptions = parseInt(exceptionsMatch[1] ?? '0', 10);
    }

    return report;
  }

  /**
   * Parse server call statistics from JSON at end of output.
   */
  private parseServerCallStats(output: string): ServerCall[] {
    // Find the JSON array at the end
    const jsonMatch = output.match(/\[\s*\{[\s\S]*\}\s*\]\s*$/);
    if (!jsonMatch) {
      return [];
    }

    try {
      const jsonArray = JSON.parse(jsonMatch[0]) as Array<{
        Url: string;
        Count: string;
        Avg: string;
        Max: string;
        Min: string;
      }>;

      return jsonArray.map(item => ({
        url: item.Url,
        count: parseInt(item.Count, 10),
        avgMs: parseFloat(item.Avg),
        maxMs: parseFloat(item.Max),
        minMs: parseFloat(item.Min),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Find errors in the output.
   */
  private findErrors(output: string, commands: TestCommand[]): TestError[] {
    const errors: TestError[] = [];

    // Check for failed server calls (4xx or 5xx status codes)
    for (const cmd of commands) {
      if (cmd.result && cmd.result.statusCode >= 400) {
        errors.push({
          type: 'server_call_failed',
          message: `Server call failed: ${cmd.fullCommand}`,
          location: `${cmd.timestamp} - ${cmd.command}`,
          statusCode: cmd.result.statusCode,
          suggestion: this.suggestFixForStatusCode(cmd.result.statusCode, cmd.fullCommand),
        });
      }
    }

    // Check for exception messages (but not the "Exceptions: 0" summary line)
    const exceptionPattern = /Exception:?\s+(?!0)(.+)/gi;
    let exceptionMatch;
    while ((exceptionMatch = exceptionPattern.exec(output)) !== null) {
      const message = exceptionMatch[1]?.trim() ?? '';
      // Skip if it's just a count like "Exceptions: 0" or "Exceptions 0"
      if (message && !/^\d+$/.test(message)) {
        errors.push({
          type: 'exception',
          message: message,
          suggestion: 'Check the TAR file for syntax errors or missing dependencies.',
        });
      }
    }

    // Check for assert failures
    const assertFailPattern = /Assert\s+.*(?:failed|false)/gi;
    let assertMatch;
    while ((assertMatch = assertFailPattern.exec(output)) !== null) {
      errors.push({
        type: 'assert_failed',
        message: assertMatch[0],
        suggestion: 'Verify the expected values in the assert statement.',
      });
    }

    // Check for timeout errors
    if (output.includes('timeout') || output.includes('Timeout')) {
      errors.push({
        type: 'timeout',
        message: 'Test execution timed out',
        suggestion: 'Increase the timeout or check if the server is responding slowly.',
      });
    }

    return errors;
  }

  /**
   * Suggest fix based on HTTP status code.
   */
  private suggestFixForStatusCode(statusCode: number, _command: string): string {
    switch (statusCode) {
      case 400:
        return 'Bad request - check the request payload format and required fields.';
      case 401:
        return 'Unauthorized - verify username and password credentials.';
      case 403:
        return 'Forbidden - check user permissions for this operation.';
      case 404:
        return 'Not found - verify the endpoint URL and entity exists.';
      case 409:
        return 'Conflict - the record may already exist or have a constraint violation.';
      case 422:
        return 'Validation error - check the data values against business rules.';
      case 500:
        return 'Server error - check server logs for details.';
      case 503:
        return 'Service unavailable - server may be overloaded, try again later.';
      default:
        return `HTTP ${statusCode} error - check the API documentation.`;
    }
  }

  /**
   * Find warnings in the output.
   */
  private findWarnings(output: string): string[] {
    const warnings: string[] = [];

    // Check for deprecation warnings
    if (output.includes('deprecated') || output.includes('Deprecated')) {
      warnings.push('Deprecated API usage detected');
    }

    // Check for slow operations (>10 seconds)
    const slowCallPattern = /\"Avg\":\s*\"(\d+)\"/g;
    let slowMatch;
    while ((slowMatch = slowCallPattern.exec(output)) !== null) {
      const avgMs = parseInt(slowMatch[1] ?? '0', 10);
      if (avgMs > 10000) {
        warnings.push(`Slow API call detected (${avgMs}ms average)`);
      }
    }

    return warnings;
  }

  /**
   * Summarize errors into a single message.
   */
  private summarizeErrors(errors: TestError[]): string {
    if (errors.length === 0) {
      return 'Unknown error';
    }

    if (errors.length === 1) {
      return errors[0]?.message ?? 'Unknown error';
    }

    return `${errors.length} errors found: ${errors.slice(0, 3).map(e => e.message).join('; ')}`;
  }
}
