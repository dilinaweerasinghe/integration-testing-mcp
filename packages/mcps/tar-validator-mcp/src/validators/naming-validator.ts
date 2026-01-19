/**
 * Variable naming conventions validator.
 * Validates that variables follow camelCase naming.
 */

import type { TarDocument, ValidationIssue, ValidationRules, VariableReference } from '../types.js';

/**
 * Naming convention validator for TAR documents.
 */
export class NamingValidator {
  private readonly rules: ValidationRules = {
    name: 'naming-conventions',
    enabled: true,
    severity: 'error',
    options: {
      enforceCase: 'camelCase',
      minLength: 2,
      maxLength: 50,
      reservedWords: ['test', 'result', 'response', 'request', 'error', 'data'],
    },
  };

  private readonly camelCasePattern = /^[a-z][a-zA-Z0-9]*$/;
  private readonly reservedWords = new Set(['test', 'result', 'response', 'request', 'error', 'data']);

  /**
   * Validate variable naming conventions.
   */
  validate(doc: TarDocument): {
    issues: ValidationIssue[];
    variables: Array<{ name: string; valid: boolean; suggestion?: string }>;
  } {
    const issues: ValidationIssue[] = [];
    const variables: Array<{ name: string; valid: boolean; suggestion?: string }> = [];
    const seenVariables = new Set<string>();

    for (const variable of doc.variables) {
      // Skip if already processed
      if (seenVariables.has(variable.name)) {
        continue;
      }
      seenVariables.add(variable.name);

      const validationResult = this.validateVariableName(variable);
      variables.push(validationResult);

      if (!validationResult.valid) {
        issues.push({
          code: 'NAME001',
          message: `Variable "${variable.name}" does not follow camelCase naming convention`,
          severity: 'error',
          line: variable.line,
          context: variable.context,
          suggestion: validationResult.suggestion,
        });
      }
    }

    // Check for undefined variable usage
    const definitions = new Set(
      doc.variables.filter((v) => v.isDefinition).map((v) => v.name)
    );
    
    for (const variable of doc.variables) {
      if (!variable.isDefinition && !definitions.has(variable.name)) {
        issues.push({
          code: 'NAME002',
          message: `Variable "${variable.name}" is used but not defined`,
          severity: 'warning',
          line: variable.line,
          context: variable.context,
          suggestion: `Define "${variable.name}" before using it, or check for typos`,
        });
      }
    }

    // Check for unused definitions
    const usages = new Set(
      doc.variables.filter((v) => !v.isDefinition).map((v) => v.name)
    );
    
    for (const variable of doc.variables.filter((v) => v.isDefinition)) {
      if (!usages.has(variable.name)) {
        issues.push({
          code: 'NAME003',
          message: `Variable "${variable.name}" is defined but never used`,
          severity: 'info',
          line: variable.line,
          context: variable.context,
        });
      }
    }

    return { issues, variables };
  }

  /**
   * Validate a single variable name.
   */
  private validateVariableName(variable: VariableReference): {
    name: string;
    valid: boolean;
    suggestion?: string;
  } {
    const { name } = variable;

    // Check length
    if (name.length < 2) {
      return {
        name,
        valid: false,
        suggestion: 'Variable name should be at least 2 characters',
      };
    }

    if (name.length > 50) {
      return {
        name,
        valid: false,
        suggestion: 'Variable name should be at most 50 characters',
      };
    }

    // Check reserved words
    if (this.reservedWords.has(name.toLowerCase())) {
      return {
        name,
        valid: false,
        suggestion: `"${name}" is a reserved word - use a more descriptive name like "${name}Data" or "${name}Value"`,
      };
    }

    // Check camelCase
    if (!this.camelCasePattern.test(name)) {
      const suggestion = this.suggestCamelCase(name);
      return {
        name,
        valid: false,
        suggestion: `Use camelCase: "${suggestion}"`,
      };
    }

    return { name, valid: true };
  }

  /**
   * Suggest a camelCase version of a name.
   */
  private suggestCamelCase(name: string): string {
    // Handle common patterns
    
    // snake_case to camelCase
    if (name.includes('_')) {
      return name
        .split('_')
        .map((part, index) => 
          index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join('');
    }

    // kebab-case to camelCase
    if (name.includes('-')) {
      return name
        .split('-')
        .map((part, index) => 
          index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join('');
    }

    // PascalCase to camelCase
    if (/^[A-Z]/.test(name)) {
      return name.charAt(0).toLowerCase() + name.slice(1);
    }

    // Default: lowercase first char
    return name.charAt(0).toLowerCase() + name.slice(1);
  }

  /**
   * Get validation rules.
   */
  getRules(): ValidationRules {
    return this.rules;
  }
}
