/**
 * TAR Command Validator.
 * Validates TAR command syntax and usage patterns.
 */

import type { TarDocument, TarCommand, TarFileType, ValidationIssue, ValidationRules } from '../types.js';

/**
 * Commands that require an 'Into' clause.
 */
const COMMANDS_REQUIRING_INTO = ['Get', 'Query'];

/**
 * Commands that should not appear in Test Utils.
 */
const COMMANDS_NOT_IN_UTILS = ['Assert', 'AssertJson'];

/**
 * Commands that are server calls.
 */
const SERVER_CALL_COMMANDS = [
  'Get', 'Post', 'Create', 'Modify', 'Patch', 'Delete', 'Query', 'Batch',
  'Action', 'ModifyBlob', 'PatchBlob', 'ModifyClob'
];

/**
 * Command validator for TAR documents.
 */
export class CommandValidator {
  private readonly rules: ValidationRules = {
    name: 'command-syntax',
    enabled: true,
    severity: 'error',
    options: {
      validateServerCalls: true,
      validateVariableUsage: true,
      validateAssertPlacement: true,
    },
  };

  /**
   * Validate TAR commands.
   */
  validate(doc: TarDocument): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const fileType = doc.fileType;

    for (const command of doc.commands) {
      // Validate command-specific rules
      issues.push(...this.validateCommand(command, fileType));
    }

    // Validate file-type specific rules
    issues.push(...this.validateFileTypeRules(doc));

    // Validate variable definitions before usage
    issues.push(...this.validateVariableFlow(doc));

    return issues;
  }

  /**
   * Validate a single command.
   */
  private validateCommand(
    command: TarCommand, 
    fileType: TarFileType | null
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check 'Into' requirement for Get/Query
    if (COMMANDS_REQUIRING_INTO.includes(command.type) && !command.intoVar) {
      issues.push({
        code: 'CMD001',
        message: `${command.type} command should have an 'Into' clause to store the result.`,
        severity: 'warning',
        line: command.line,
        suggestion: `Add 'Into variableName' at the end of the command.`,
      });
    }

    // Check for server calls without target
    if (SERVER_CALL_COMMANDS.includes(command.type) && !command.target) {
      issues.push({
        code: 'CMD002',
        message: `${command.type} command is missing a target URL/path.`,
        severity: 'error',
        line: command.line,
        suggestion: `Add the service URL after ${command.type}. Example: ${command.type} ServiceName.svc/EntitySet`,
      });
    }

    // Check Assert commands in Test Utils (not allowed)
    if (COMMANDS_NOT_IN_UTILS.includes(command.type) && fileType === 'Test Util') {
      issues.push({
        code: 'CMD003',
        message: `${command.type} commands should not be used in Test Util files.`,
        severity: 'error',
        line: command.line,
        suggestion: 'Move Assert commands to Test Case files. Test Utils should only prepare data and return results via Output.',
      });
    }

    // Check for Output command in non-Util files
    if (command.type === 'Output' && fileType && fileType !== 'Test Util') {
      issues.push({
        code: 'CMD004',
        message: `Output command is typically used in Test Util files, not in ${fileType}.`,
        severity: 'info',
        line: command.line,
      });
    }

    // Check Call command path
    if (command.type === 'Call' && command.target) {
      if (!command.target.endsWith('.mkd') && !command.target.endsWith('.md')) {
        issues.push({
          code: 'CMD005',
          message: 'Call command target should be a .mkd or .md file.',
          severity: 'warning',
          line: command.line,
          suggestion: 'Ensure the called file has .mkd or .md extension.',
        });
      }
    }

    // Check Eval command format
    if (command.type === 'Eval' && !command.intoVar) {
      issues.push({
        code: 'CMD006',
        message: "Eval command must have an 'Into' clause to store the result.",
        severity: 'error',
        line: command.line,
        suggestion: "Add 'Into variableName' to store the evaluated result.",
      });
    }

    // Check for hardcoded credentials in URLs
    if (command.target && this.hasCredentialsInUrl(command.target)) {
      issues.push({
        code: 'CMD007',
        message: 'Potential credentials detected in URL. Use environment variables instead.',
        severity: 'warning',
        line: command.line,
        suggestion: 'Use {$globalconfig.password} or similar for sensitive values.',
      });
    }

    // Check Connect command format
    if (command.type === 'Connect') {
      const connectText = command.text.trim();
      // Connect should be just 'Connect' or 'Connect user' or 'Connect user:password'
      if (connectText !== 'Connect' && !connectText.match(/^Connect\s+\w+(?::\{?\$?[\w.]+\}?)?(\s+When\s+.+)?$/i)) {
        issues.push({
          code: 'CMD008',
          message: 'Invalid Connect command format.',
          severity: 'warning',
          line: command.line,
          suggestion: 'Use: Connect, Connect username, or Connect username:{$globalconfig.password}',
        });
      }
    }

    return issues;
  }

  /**
   * Validate file-type specific rules.
   */
  private validateFileTypeRules(doc: TarDocument): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const fileType = doc.fileType;

    if (!fileType) {
      return issues;
    }

    // Test Data should primarily use Call commands
    if (fileType === 'Test Data') {
      const hasAsserts = doc.commands.some(c => c.type === 'Assert' || c.type === 'AssertJson');
      if (hasAsserts) {
        issues.push({
          code: 'FILE001',
          message: 'Test Data files should not contain Assert commands.',
          severity: 'error',
          suggestion: 'Test Data is for setting up data, not for assertions. Move asserts to Test Case.',
        });
      }
    }

    // Test Suite should primarily use Call commands
    if (fileType === 'Test Suite') {
      const nonCallCommands = doc.commands.filter(c => 
        c.type !== 'Call' && c.type !== 'Connect' && c.type !== 'Eval' && c.type !== 'Print'
      );
      if (nonCallCommands.length > 0) {
        issues.push({
          code: 'FILE002',
          message: 'Test Suite files should primarily use Call commands to execute Test Cases.',
          severity: 'warning',
          suggestion: 'A Test Suite orchestrates Test Cases. Server calls should be in individual Test Cases.',
        });
      }
    }

    // Test Collection should only use Call commands
    if (fileType === 'Test Collection') {
      const nonCallCommands = doc.commands.filter(c => c.type !== 'Call');
      if (nonCallCommands.length > 0) {
        issues.push({
          code: 'FILE003',
          message: 'Test Collection files should only use Call commands to execute Test Suites.',
          severity: 'warning',
          suggestion: 'A Test Collection orchestrates Test Suites. All other logic should be in lower-level files.',
        });
      }
    }

    // Test Case should have Assert commands
    if (fileType === 'Test Case') {
      const hasAsserts = doc.commands.some(c => c.type === 'Assert' || c.type === 'AssertJson');
      if (!hasAsserts) {
        issues.push({
          code: 'FILE004',
          message: 'Test Case files should contain at least one Assert command.',
          severity: 'warning',
          suggestion: 'Add Assert commands to verify the expected outcomes of your test.',
        });
      }
    }

    return issues;
  }

  /**
   * Validate variable flow (defined before used).
   */
  private validateVariableFlow(doc: TarDocument): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const definedVariables = new Set<string>();

    // Special variables that are always available
    const builtInVariables = new Set([
      'input', 'header', 'globalconfig', 'response', 'result'
    ]);

    // Sort variables by line number
    const sortedVars = [...doc.variables].sort((a, b) => a.line - b.line);

    for (const varRef of sortedVars) {
      if (varRef.isDefinition) {
        definedVariables.add(varRef.name);
      } else {
        // Check if variable is used before defined
        if (!definedVariables.has(varRef.name) && !builtInVariables.has(varRef.name)) {
          // Check if it might be a function call or special reference
          if (!varRef.name.includes('(') && !varRef.name.match(/^[A-Z]/)) {
            issues.push({
              code: 'VAR001',
              message: `Variable '${varRef.name}' may be used before being defined.`,
              severity: 'warning',
              line: varRef.line,
              suggestion: `Ensure '${varRef.name}' is defined with Eval, Get, Create, or passed as input before this line.`,
              context: varRef.context,
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check for potential credentials in URL.
   */
  private hasCredentialsInUrl(url: string): boolean {
    // Check for user:pass@ pattern
    if (/:[^@/]+@/.test(url)) {
      return true;
    }
    // Check for sensitive query params
    if (/[?&](password|secret|token|key|apikey)=/i.test(url)) {
      return true;
    }
    return false;
  }

  /**
   * Get validation rules.
   */
  getRules(): ValidationRules {
    return this.rules;
  }
}
