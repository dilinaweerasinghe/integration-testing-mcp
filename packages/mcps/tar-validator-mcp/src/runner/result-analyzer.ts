/**
 * Analyzes test execution results and provides suggestions.
 */

import type { TestExecutionResult, TestAnalysis } from './types.js';

/**
 * Analyzes test results and provides improvement suggestions.
 */
export class ResultAnalyzer {
  /**
   * Analyze test execution results.
   */
  analyze(result: TestExecutionResult): TestAnalysis {
    return {
      summary: this.generateSummary(result),
      issues: this.identifyIssues(result),
      performance: this.analyzePerformance(result),
      coverage: this.analyzeCoverage(result),
    };
  }

  /**
   * Generate an overall summary.
   */
  private generateSummary(result: TestExecutionResult): string {
    if (result.success) {
      return `Test ${result.report.testName} passed successfully in ${result.report.timeSeconds.toFixed(2)}s with ${result.report.serverCalls} server calls.`;
    }

    const issues: string[] = [];
    if (result.report.failedServerCalls > 0) {
      issues.push(`${result.report.failedServerCalls} failed server calls`);
    }
    if (result.report.failedAsserts > 0) {
      issues.push(`${result.report.failedAsserts} failed assertions`);
    }
    if (result.report.exceptions > 0) {
      issues.push(`${result.report.exceptions} exceptions`);
    }

    return `Test ${result.report.testName} FAILED: ${issues.join(', ')}.`;
  }

  /**
   * Identify issues and suggest fixes.
   */
  private identifyIssues(result: TestExecutionResult): TestAnalysis['issues'] {
    const issues: TestAnalysis['issues'] = [];

    // Add errors as issues
    for (const error of result.errors) {
      issues.push({
        severity: 'error',
        description: error.message,
        suggestion: error.suggestion,
      });
    }

    // Add warnings
    for (const warning of result.warnings) {
      issues.push({
        severity: 'warning',
        description: warning,
      });
    }

    // Check for missing asserts (Test Cases should have asserts)
    if (result.report.testName.toLowerCase().includes('test') && 
        !result.report.testName.toLowerCase().includes('data') &&
        !result.report.testName.toLowerCase().includes('util') &&
        result.report.asserts === 0) {
      issues.push({
        severity: 'warning',
        description: 'Test case has no assertions',
        suggestion: 'Add Assert or AssertJson commands to verify expected outcomes.',
      });
    }

    // Check for high failure rate
    if (result.report.serverCalls > 0) {
      const failureRate = result.report.failedServerCalls / result.report.serverCalls;
      if (failureRate > 0.1) {
        issues.push({
          severity: 'error',
          description: `High server call failure rate: ${(failureRate * 100).toFixed(1)}%`,
          suggestion: 'Review the failed calls and check data dependencies.',
        });
      }
    }

    // Check for common patterns in errors
    const errorMessages = result.errors.map(e => e.message.toLowerCase());
    
    if (errorMessages.some(m => m.includes('not found') || m.includes('404'))) {
      issues.push({
        severity: 'info',
        description: 'Some resources were not found (404 errors)',
        suggestion: 'Verify that test data dependencies are created before this test runs.',
      });
    }

    if (errorMessages.some(m => m.includes('unauthorized') || m.includes('401'))) {
      issues.push({
        severity: 'error',
        description: 'Authentication errors detected',
        suggestion: 'Check username/password credentials and user permissions.',
      });
    }

    if (errorMessages.some(m => m.includes('validation') || m.includes('422'))) {
      issues.push({
        severity: 'error',
        description: 'Data validation errors detected',
        suggestion: 'Review the input data against business rules.',
      });
    }

    return issues;
  }

  /**
   * Analyze performance metrics.
   */
  private analyzePerformance(result: TestExecutionResult): TestAnalysis['performance'] {
    const slowThresholdMs = 5000; // 5 seconds
    
    // Find slowest calls
    const slowestCalls = [...result.serverCallStats]
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, 5);

    const recommendations: string[] = [];

    // Check total time
    if (result.report.timeSeconds > 60) {
      recommendations.push('Consider splitting this test into smaller tests for faster feedback.');
    }

    // Check for slow individual calls
    const verySlow = result.serverCallStats.filter(c => c.avgMs > slowThresholdMs);
    if (verySlow.length > 0) {
      recommendations.push(`${verySlow.length} API calls take more than ${slowThresholdMs}ms. Consider optimizing or caching.`);
    }

    // Check for many calls to same endpoint
    const highCount = result.serverCallStats.filter(c => c.count > 5);
    if (highCount.length > 0) {
      recommendations.push('Some endpoints are called multiple times. Consider batching requests.');
    }

    // Check for action calls (usually slow)
    const actionCalls = result.serverCallStats.filter(c => 
      c.url.includes('/Action') || c.url.includes('Action_')
    );
    if (actionCalls.length > 0 && actionCalls.some(c => c.avgMs > 10000)) {
      recommendations.push('Action operations are slow. This is often expected for complex business operations.');
    }

    return {
      totalTime: result.report.timeSeconds,
      slowestCalls,
      recommendations,
    };
  }

  /**
   * Analyze test coverage.
   */
  private analyzeCoverage(result: TestExecutionResult): TestAnalysis['coverage'] {
    return {
      serverCallsMade: result.report.serverCalls,
      uniqueEndpoints: result.serverCallStats.length,
      assertsExecuted: result.report.asserts,
    };
  }

  /**
   * Generate a fix suggestion report.
   */
  generateFixReport(result: TestExecutionResult): string {
    if (result.success) {
      return 'No fixes needed - test passed successfully.';
    }

    const lines: string[] = [
      '# Test Fix Report',
      '',
      `## Test: ${result.report.testName}`,
      `Status: ${result.report.status}`,
      '',
      '## Issues Found',
      '',
    ];

    for (const error of result.errors) {
      lines.push(`### ${error.type.toUpperCase()}`);
      lines.push(`**Problem:** ${error.message}`);
      if (error.location) {
        lines.push(`**Location:** ${error.location}`);
      }
      if (error.statusCode) {
        lines.push(`**HTTP Status:** ${error.statusCode}`);
      }
      if (error.suggestion) {
        lines.push(`**Suggested Fix:** ${error.suggestion}`);
      }
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('## Warnings');
      lines.push('');
      for (const warning of result.warnings) {
        lines.push(`- ${warning}`);
      }
      lines.push('');
    }

    // Add specific fix instructions based on error types
    const errorTypes = new Set(result.errors.map(e => e.type));

    if (errorTypes.has('server_call_failed')) {
      lines.push('## Fixing Server Call Failures');
      lines.push('');
      lines.push('1. Check that required test data exists');
      lines.push('2. Verify the API endpoint URL is correct');
      lines.push('3. Ensure request payload matches expected format');
      lines.push('4. Check user permissions for the operation');
      lines.push('');
    }

    if (errorTypes.has('assert_failed')) {
      lines.push('## Fixing Assert Failures');
      lines.push('');
      lines.push('1. Verify expected values are correct');
      lines.push('2. Check if the API response format changed');
      lines.push('3. Ensure variable names match (case-sensitive)');
      lines.push('');
    }

    return lines.join('\n');
  }
}
