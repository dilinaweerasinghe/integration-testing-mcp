/**
 * Substitution pattern validator.
 * Validates {#}, {%}, {$} patterns in TAR documents.
 * 
 * Pattern Types:
 * - {#...} - Single quotes substitution (e.g., {#variableName} becomes 'value')
 * - {%...} - Double quotes substitution (e.g., {%variableName} becomes "value")
 * - {$...} - No quotes substitution (e.g., {$variableName} becomes value)
 * 
 * All patterns support:
 * - Simple variables: {$varName}
 * - Dot notation: {$object.property}
 * - Function calls: {$Today()}, {$Items(0)}
 * - Chained access: {$result.value.Items(0).Name}
 */

import type { TarDocument, ValidationIssue, ValidationRules, PatternReference } from '../types.js';

/**
 * Substitution pattern validator for TAR documents.
 */
export class PatternValidator {
  private readonly rules: ValidationRules = {
    name: 'substitution-patterns',
    enabled: true,
    severity: 'warning',
    options: {
      allowAllCases: true, // TAR allows flexible naming
      validateSyntax: true,
    },
  };

  /**
   * Validate substitution patterns.
   */
  validate(doc: TarDocument): {
    issues: ValidationIssue[];
    patterns: Array<{ pattern: string; type: string; valid: boolean }>;
  } {
    const issues: ValidationIssue[] = [];
    const patterns: Array<{ pattern: string; type: string; valid: boolean }> = [];

    for (const patternRef of doc.patterns) {
      patterns.push({
        pattern: patternRef.pattern,
        type: patternRef.type,
        valid: patternRef.valid,
      });

      // Check for syntactically invalid patterns
      if (!patternRef.valid) {
        issues.push({
          code: 'PAT001',
          message: `Invalid pattern syntax: "${patternRef.pattern}"`,
          severity: 'error',
          line: patternRef.line,
          suggestion: 'Ensure the pattern uses valid identifier characters: letters, numbers, dots, underscores, and parentheses for function calls.',
        });
      }
    }

    // Check for unclosed patterns
    const unclosed = this.findUnclosedPatterns(doc.raw);
    for (const issue of unclosed) {
      issues.push(issue);
      patterns.push({
        pattern: issue.context ?? '',
        type: 'unknown',
        valid: false,
      });
    }

    // Check for empty patterns
    const empty = this.findEmptyPatterns(doc.raw);
    for (const issue of empty) {
      issues.push(issue);
    }

    // Warn about unusual but valid patterns
    for (const patternRef of doc.patterns) {
      if (patternRef.valid) {
        const warning = this.checkNamingConventions(patternRef);
        if (warning) {
          issues.push(warning);
        }
      }
    }

    return { issues, patterns };
  }

  /**
   * Find unclosed pattern braces.
   */
  private findUnclosedPatterns(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = content.split('\n');

    // Look for { followed by #, %, or $ without a closing }
    const unclosedPattern = /\{([#%$])([^}]*)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const match = line.match(unclosedPattern);
      
      if (match) {
        issues.push({
          code: 'PAT002',
          message: `Unclosed substitution pattern starting with "{${match[1]}"`,
          severity: 'error',
          line: i + 1,
          suggestion: 'Ensure all patterns have closing braces: {$variable}',
          context: `{${match[1]}${match[2]}`,
        });
      }
    }

    return issues;
  }

  /**
   * Find empty patterns like {$} or {%}.
   */
  private findEmptyPatterns(content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = content.split('\n');

    const emptyPattern = /\{([#%$])\s*\}/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      let match;

      while ((match = emptyPattern.exec(line)) !== null) {
        issues.push({
          code: 'PAT003',
          message: `Empty substitution pattern: "${match[0]}"`,
          severity: 'error',
          line: i + 1,
          suggestion: 'Provide an identifier: {$variableName}',
        });
      }
    }

    return issues;
  }

  /**
   * Check naming conventions and provide suggestions.
   */
  private checkNamingConventions(pattern: PatternReference): ValidationIssue | null {
    const identifier = pattern.identifier;

    // Check for potentially problematic patterns
    if (identifier.includes('..')) {
      return {
        code: 'PAT004',
        message: `Pattern "${pattern.pattern}" contains consecutive dots`,
        severity: 'warning',
        line: pattern.line,
        suggestion: 'Check for typos in the property path.',
      };
    }

    // Check for patterns starting with numbers
    if (/^[0-9]/.test(identifier)) {
      return {
        code: 'PAT005',
        message: `Pattern "${pattern.pattern}" starts with a number`,
        severity: 'warning',
        line: pattern.line,
        suggestion: 'Variable names should start with a letter.',
      };
    }

    // Check for very long identifiers (might indicate an error)
    if (identifier.length > 100) {
      return {
        code: 'PAT006',
        message: `Pattern "${pattern.pattern.substring(0, 50)}..." is unusually long`,
        severity: 'info',
        line: pattern.line,
        suggestion: 'Consider breaking down complex expressions.',
      };
    }

    return null;
  }

  /**
   * Get validation rules.
   */
  getRules(): ValidationRules {
    return this.rules;
  }
}
