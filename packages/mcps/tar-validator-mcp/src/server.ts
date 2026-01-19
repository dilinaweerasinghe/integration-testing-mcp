/**
 * SAR Test MCP Server implementation.
 * Provides tools for validating and running SAR/TAR test files.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { BaseMcpServer, createSchema } from '@ifs/mcp-core';
import { createLogger, createAuditLogger, type AuditLogger } from '@ifs/logging';
import { TarParser } from './parser/tar-parser.js';
import { MetadataValidator } from './validators/metadata-validator.js';
import { AaaValidator } from './validators/aaa-validator.js';
import { NamingValidator } from './validators/naming-validator.js';
import { PatternValidator } from './validators/pattern-validator.js';
import { CommandValidator } from './validators/command-validator.js';
import { TestRunner, ResultAnalyzer, type SarRunnerConfig } from './runner/index.js';
import type { ValidationResult, ValidationIssue } from './types.js';

/**
 * SAR Test MCP Server.
 * Validates and runs TAR test files (.mkd, .md) against SAR/TAR standards.
 * 
 * Capabilities:
 * - Validate TAR files (syntax, structure, commands)
 * - Run TAR tests using ScriptARest.exe
 * - Analyze test results and suggest fixes
 * 
 * Supported file types:
 * - Test Data
 * - Test Util
 * - Test Case (requires AAA structure)
 * - Test Suite
 * - Test Collection
 */
export class SarTestMcpServer extends BaseMcpServer {
  private readonly logger = createLogger({ name: 'sar-test-mcp' });
  private readonly auditLogger: AuditLogger;
  
  // Validators
  private readonly parser = new TarParser();
  private readonly metadataValidator = new MetadataValidator();
  private readonly aaaValidator = new AaaValidator();
  private readonly namingValidator = new NamingValidator();
  private readonly patternValidator = new PatternValidator();
  private readonly commandValidator = new CommandValidator();
  
  // Test runner
  private testRunner: TestRunner | null = null;
  private readonly resultAnalyzer = new ResultAnalyzer();
  private runnerConfig: SarRunnerConfig;

  constructor() {
    super({
      name: 'sar-test-mcp',
      version: '1.0.0',
      description: 'Validates and runs SAR/TAR test files',
    });

    this.auditLogger = createAuditLogger({
      logDirectory: process.env['AUDIT_LOG_DIR'] ?? './logs/audit',
      serverName: 'sar-test-mcp',
      enabled: process.env['AUDIT_LOG_ENABLED'] !== 'false',
    });

    // Initialize runner config from environment variables
    this.runnerConfig = {
      scriptARestPath: process.env['SAR_SCRIPT_A_REST_PATH'] ?? '',
      serverUrl: process.env['SAR_SERVER_URL'] ?? '',
      username: process.env['SAR_USERNAME'] ?? '',
      password: process.env['SAR_PASSWORD'] ?? '',
      timeoutMs: parseInt(process.env['SAR_TIMEOUT_MS'] ?? '600000', 10),
    };
  }

  protected registerTools(): void {
    // ==================== VALIDATION TOOLS ====================

    // Tool: validateFile
    this.registerTool(
      {
        name: 'validateFile',
        description: 'Performs full validation of a TAR test file (.mkd) against all SAR/TAR standards',
        inputSchema: createSchema()
          .string('filePath', 'Path to the .mkd file to validate', { required: true })
          .boolean('strictMode', 'Enable strict validation mode', { default: true })
          .build(),
      },
      async (args) => this.handleValidateFile(args as { filePath: string; strictMode?: boolean })
    );

    // Tool: validateContent
    this.registerTool(
      {
        name: 'validateContent',
        description: 'Validates TAR content directly (without reading from file)',
        inputSchema: createSchema()
          .string('content', 'The TAR file content to validate', { required: true })
          .string('filename', 'Optional filename for error reporting')
          .boolean('strictMode', 'Enable strict validation mode', { default: true })
          .build(),
      },
      async (args) => this.handleValidateContent(args as { 
        content: string; 
        filename?: string;
        strictMode?: boolean;
      })
    );

    // Tool: validateSuite
    this.registerTool(
      {
        name: 'validateSuite',
        description: 'Validates all .mkd files in a test suite directory',
        inputSchema: createSchema()
          .string('directoryPath', 'Path to the test suite directory', { required: true })
          .boolean('recursive', 'Search subdirectories', { default: true })
          .boolean('stopOnError', 'Stop on first error', { default: false })
          .build(),
      },
      async (args) => this.handleValidateSuite(args as {
        directoryPath: string;
        recursive?: boolean;
        stopOnError?: boolean;
      })
    );

    // Tool: checkAaaStructure
    this.registerTool(
      {
        name: 'checkAaaStructure',
        description: 'Checks the Arrange-Act-Assert structure of a Test Case file',
        inputSchema: createSchema()
          .string('content', 'The TAR file content', { required: true })
          .build(),
      },
      async (args) => this.handleCheckAaaStructure(args as { content: string })
    );

    // Tool: checkCommands
    this.registerTool(
      {
        name: 'checkCommands',
        description: 'Validates TAR commands syntax and usage patterns',
        inputSchema: createSchema()
          .string('content', 'The TAR file content', { required: true })
          .build(),
      },
      async (args) => this.handleCheckCommands(args as { content: string })
    );

    // Tool: getValidationRules
    this.registerTool(
      {
        name: 'getValidationRules',
        description: 'Returns the current validation rules and their settings',
        inputSchema: createSchema().build(),
      },
      async () => this.handleGetValidationRules()
    );

    // ==================== TEST EXECUTION TOOLS ====================

    // Tool: configureRunner
    this.registerTool(
      {
        name: 'configureRunner',
        description: 'Configure the SAR test runner with ScriptARest path and server credentials',
        inputSchema: createSchema()
          .string('scriptARestPath', 'Path to ScriptARest.exe', { required: true })
          .string('serverUrl', 'IFS Cloud server URL', { required: true })
          .string('username', 'Username for authentication', { required: true })
          .string('password', 'Password for authentication', { required: true })
          .integer('timeoutMs', 'Default timeout in milliseconds', { default: 600000 })
          .build(),
      },
      async (args) => this.handleConfigureRunner(args as unknown as SarRunnerConfig)
    );

    // Tool: runTest
    this.registerTool(
      {
        name: 'runTest',
        description: 'Runs a TAR test file using ScriptARest.exe and returns the results',
        inputSchema: createSchema()
          .string('filePath', 'Path to the .mkd file to run', { required: true })
          .string('serverUrl', 'Override server URL (optional)')
          .string('username', 'Override username (optional)')
          .string('password', 'Override password (optional)')
          .integer('timeoutMs', 'Timeout in milliseconds')
          .build(),
      },
      async (args) => this.handleRunTest(args as {
        filePath: string;
        serverUrl?: string;
        username?: string;
        password?: string;
        timeoutMs?: number;
      })
    );

    // Tool: analyzeResults
    this.registerTool(
      {
        name: 'analyzeResults',
        description: 'Analyzes test execution results and provides improvement suggestions',
        inputSchema: createSchema()
          .string('rawOutput', 'Raw output from ScriptARest execution', { required: true })
          .build(),
      },
      async (args) => this.handleAnalyzeResults(args as { rawOutput: string })
    );

    // Tool: getRunnerStatus
    this.registerTool(
      {
        name: 'getRunnerStatus',
        description: 'Returns the current runner configuration status',
        inputSchema: createSchema().build(),
      },
      async () => this.handleGetRunnerStatus()
    );
  }

  protected async onInitialize(): Promise<void> {
    // Initialize test runner if config is available
    if (this.runnerConfig.scriptARestPath && this.runnerConfig.serverUrl) {
      this.testRunner = new TestRunner(this.runnerConfig);
      this.logger.info('Test runner initialized with environment configuration');
    }
    this.logger.info('SAR Test MCP server initialized');
  }

  protected async onShutdown(): Promise<void> {
    await this.auditLogger.close();
    this.logger.info('SAR Test MCP server shutdown complete');
  }

  // ==================== VALIDATION HANDLERS ====================

  private async handleValidateFile(args: { 
    filePath: string; 
    strictMode?: boolean;
  }): Promise<ValidationResult> {
    const correlationId = this.logger.newCorrelationId();
    
    try {
      const content = await readFile(args.filePath, 'utf-8');
      const doc = await this.parser.parse(content);

      // Run all validators
      const issues: ValidationIssue[] = [];

      const metadataIssues = this.metadataValidator.validate(doc);
      issues.push(...metadataIssues);

      const aaaIssues = this.aaaValidator.validate(doc);
      issues.push(...aaaIssues);

      const namingResult = this.namingValidator.validate(doc);
      issues.push(...namingResult.issues);

      const patternResult = this.patternValidator.validate(doc);
      issues.push(...patternResult.issues);

      const commandIssues = this.commandValidator.validate(doc);
      issues.push(...commandIssues);

      // Filter by strictMode
      const filteredIssues = args.strictMode !== false
        ? issues
        : issues.filter(i => i.severity === 'error');

      const errors = filteredIssues.filter(i => i.severity === 'error');
      const warnings = filteredIssues.filter(i => i.severity === 'warning');
      const infos = filteredIssues.filter(i => i.severity === 'info');

      await this.auditLogger.logToolInvocation(
        correlationId,
        'validateFile',
        { filePath: args.filePath },
        errors.length === 0 ? 'success' : 'failure'
      );

      return {
        valid: errors.length === 0,
        fileType: doc.fileType ?? 'Unknown',
        issues: filteredIssues,
        summary: {
          errors: errors.length,
          warnings: warnings.length,
          info: infos.length,
        },
        metadata: {
          commandsFound: doc.commands.length,
          variablesFound: doc.variables.length,
          patternsFound: doc.patterns.length,
          sectionsFound: doc.sections.length,
        },
      };
    } catch (error) {
      this.logger.error('Validation failed', { error, filePath: args.filePath });
      throw new Error(`Failed to validate file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleValidateContent(args: { 
    content: string; 
    filename?: string;
    strictMode?: boolean;
  }): Promise<ValidationResult> {
    try {
      const doc = await this.parser.parse(args.content);

      // Run all validators
      const issues: ValidationIssue[] = [];

      const metadataIssues = this.metadataValidator.validate(doc);
      issues.push(...metadataIssues);

      const aaaIssues = this.aaaValidator.validate(doc);
      issues.push(...aaaIssues);

      const namingResult = this.namingValidator.validate(doc);
      issues.push(...namingResult.issues);

      const patternResult = this.patternValidator.validate(doc);
      issues.push(...patternResult.issues);

      const commandIssues = this.commandValidator.validate(doc);
      issues.push(...commandIssues);

      // Filter by strictMode
      const filteredIssues = args.strictMode !== false
        ? issues
        : issues.filter(i => i.severity === 'error');

      const errors = filteredIssues.filter(i => i.severity === 'error');
      const warnings = filteredIssues.filter(i => i.severity === 'warning');
      const infos = filteredIssues.filter(i => i.severity === 'info');

      return {
        valid: errors.length === 0,
        fileType: doc.fileType ?? 'Unknown',
        issues: filteredIssues,
        summary: {
          errors: errors.length,
          warnings: warnings.length,
          info: infos.length,
        },
        metadata: {
          commandsFound: doc.commands.length,
          variablesFound: doc.variables.length,
          patternsFound: doc.patterns.length,
          sectionsFound: doc.sections.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to validate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleValidateSuite(args: {
    directoryPath: string;
    recursive?: boolean;
    stopOnError?: boolean;
  }): Promise<{
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    results: Array<{ file: string; valid: boolean; errors: number; warnings: number }>;
  }> {
    const mkdFiles = await this.findMkdFiles(args.directoryPath, args.recursive !== false);
    const results: Array<{ file: string; valid: boolean; errors: number; warnings: number }> = [];

    for (const file of mkdFiles) {
      try {
        const result = await this.handleValidateFile({ filePath: file, strictMode: true });
        results.push({
          file,
          valid: result.valid,
          errors: result.summary.errors,
          warnings: result.summary.warnings,
        });

        if (args.stopOnError && !result.valid) {
          break;
        }
      } catch (error) {
        results.push({
          file,
          valid: false,
          errors: 1,
          warnings: 0,
        });

        if (args.stopOnError) {
          break;
        }
      }
    }

    return {
      totalFiles: mkdFiles.length,
      validFiles: results.filter(r => r.valid).length,
      invalidFiles: results.filter(r => !r.valid).length,
      results,
    };
  }

  private async handleCheckAaaStructure(args: { content: string }): Promise<{
    hasArrange: boolean;
    hasAct: boolean;
    hasAssert: boolean;
    isValid: boolean;
    issues: ValidationIssue[];
  }> {
    const doc = await this.parser.parse(args.content);
    const issues = this.aaaValidator.validate(doc);

    const hasArrange = doc.sections.some(s => s.type === 'arrange');
    const hasAct = doc.sections.some(s => s.type === 'act');
    const hasAssert = doc.sections.some(s => s.type === 'assert');

    return {
      hasArrange,
      hasAct,
      hasAssert,
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
    };
  }

  private async handleCheckCommands(args: { content: string }): Promise<{
    commandCount: number;
    commands: Array<{ type: string; line: number; hasIssues: boolean }>;
    issues: ValidationIssue[];
  }> {
    const doc = await this.parser.parse(args.content);
    const issues = this.commandValidator.validate(doc);

    const commandsWithIssues = new Set(issues.map(i => i.line));

    return {
      commandCount: doc.commands.length,
      commands: doc.commands.map(c => ({
        type: c.type,
        line: c.line,
        hasIssues: commandsWithIssues.has(c.line),
      })),
      issues,
    };
  }

  private async handleGetValidationRules(): Promise<{
    metadata: unknown;
    aaa: unknown;
    naming: unknown;
    patterns: unknown;
    commands: unknown;
  }> {
    return {
      metadata: this.metadataValidator.getRules(),
      aaa: this.aaaValidator.getRules(),
      naming: this.namingValidator.getRules(),
      patterns: this.patternValidator.getRules(),
      commands: this.commandValidator.getRules(),
    };
  }

  // ==================== TEST EXECUTION HANDLERS ====================

  private async handleConfigureRunner(args: SarRunnerConfig): Promise<{
    success: boolean;
    message: string;
  }> {
    this.runnerConfig = {
      scriptARestPath: args.scriptARestPath,
      serverUrl: args.serverUrl,
      username: args.username,
      password: args.password,
      timeoutMs: args.timeoutMs ?? 600000,
    };

    this.testRunner = new TestRunner(this.runnerConfig);
    const validation = this.testRunner.validateConfig();

    if (!validation.valid) {
      return {
        success: false,
        message: `Configuration invalid: ${validation.errors.join(', ')}`,
      };
    }

    this.logger.info('Test runner configured', {
      serverUrl: args.serverUrl,
      scriptARestPath: args.scriptARestPath,
    });

    return {
      success: true,
      message: 'Test runner configured successfully',
    };
  }

  private async handleRunTest(args: {
    filePath: string;
    serverUrl?: string;
    username?: string;
    password?: string;
    timeoutMs?: number;
  }): Promise<{
    success: boolean;
    report: {
      testName: string;
      status: string;
      timeSeconds: number;
      serverCalls: number;
      failedServerCalls: number;
      asserts: number;
      failedAsserts: number;
      exceptions: number;
    };
    errors: Array<{
      type: string;
      message: string;
      suggestion?: string;
    }>;
    warnings: string[];
    analysis?: {
      summary: string;
      issues: Array<{ severity: string; description: string; suggestion?: string }>;
    };
  }> {
    if (!this.testRunner) {
      throw new Error('Test runner not configured. Call configureRunner first or set environment variables.');
    }

    const correlationId = this.logger.newCorrelationId();
    this.logger.info('Running test', { correlationId, filePath: args.filePath });

    const result = await this.testRunner.runTest({
      filePath: args.filePath,
      serverUrl: args.serverUrl,
      username: args.username,
      password: args.password,
      timeoutMs: args.timeoutMs,
    });

    // Analyze results
    const analysis = this.resultAnalyzer.analyze(result);

    await this.auditLogger.logToolInvocation(
      correlationId,
      'runTest',
      { filePath: args.filePath, testName: result.report.testName },
      result.success ? 'success' : 'failure'
    );

    return {
      success: result.success,
      report: result.report,
      errors: result.errors.map(e => ({
        type: e.type,
        message: e.message,
        suggestion: e.suggestion,
      })),
      warnings: result.warnings,
      analysis: {
        summary: analysis.summary,
        issues: analysis.issues,
      },
    };
  }

  private async handleAnalyzeResults(args: { rawOutput: string }): Promise<{
    success: boolean;
    analysis: {
      summary: string;
      issues: Array<{ severity: string; description: string; suggestion?: string }>;
      performance: {
        totalTime: number;
        slowestCalls: Array<{ url: string; avgMs: number }>;
        recommendations: string[];
      };
      coverage: {
        serverCallsMade: number;
        uniqueEndpoints: number;
        assertsExecuted: number;
      };
    };
    fixReport: string;
  }> {
    const { OutputParser } = await import('./runner/output-parser.js');
    const parser = new OutputParser();
    const result = parser.parse(args.rawOutput);
    const analysis = this.resultAnalyzer.analyze(result);
    const fixReport = this.resultAnalyzer.generateFixReport(result);

    return {
      success: result.success,
      analysis: {
        summary: analysis.summary,
        issues: analysis.issues,
        performance: {
          totalTime: analysis.performance.totalTime,
          slowestCalls: analysis.performance.slowestCalls.map(c => ({
            url: c.url,
            avgMs: c.avgMs,
          })),
          recommendations: analysis.performance.recommendations,
        },
        coverage: analysis.coverage,
      },
      fixReport,
    };
  }

  private async handleGetRunnerStatus(): Promise<{
    configured: boolean;
    config: {
      scriptARestPath: string;
      serverUrl: string;
      username: string;
      hasPassword: boolean;
      timeoutMs: number;
    };
    validation: {
      valid: boolean;
      errors: string[];
    };
  }> {
    const hasConfig = !!(this.runnerConfig.scriptARestPath && this.runnerConfig.serverUrl);
    let validation = { valid: false, errors: ['Runner not configured'] };

    if (this.testRunner) {
      validation = this.testRunner.validateConfig();
    }

    return {
      configured: hasConfig,
      config: {
        scriptARestPath: this.runnerConfig.scriptARestPath,
        serverUrl: this.runnerConfig.serverUrl,
        username: this.runnerConfig.username,
        hasPassword: !!this.runnerConfig.password,
        timeoutMs: this.runnerConfig.timeoutMs ?? 600000,
      },
      validation,
    };
  }

  // ==================== HELPER METHODS ====================

  private async findMkdFiles(directoryPath: string, recursive: boolean): Promise<string[]> {
    const files: string[] = [];

    const entries = await readdir(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(directoryPath, entry.name);

      if (entry.isFile() && (extname(entry.name) === '.mkd' || extname(entry.name) === '.md')) {
        files.push(fullPath);
      } else if (entry.isDirectory() && recursive) {
        const subFiles = await this.findMkdFiles(fullPath, recursive);
        files.push(...subFiles);
      }
    }

    return files;
  }
}

// Re-export for backward compatibility
export { SarTestMcpServer as TarValidatorMcpServer };
