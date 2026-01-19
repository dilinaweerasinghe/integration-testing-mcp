/**
 * AAA (Arrange-Act-Assert) structure validator.
 * Validates that Test Case files follow the AAA pattern.
 * 
 * Note: AAA structure only applies to "Test Case" type files.
 * Other file types (Test Data, Test Util, Test Suite, Test Collection) do not require AAA.
 */

import type { TarDocument, TarFileType, ValidationIssue, ValidationRules } from '../types.js';

/**
 * AAA structure validator for TAR Test Case documents.
 */
export class AaaValidator {
  private readonly rules: ValidationRules = {
    name: 'aaa-structure',
    enabled: true,
    severity: 'error',
    options: {
      appliesToTypes: ['Test Case'] as TarFileType[],
      requiredSections: ['act', 'assert'],
      optionalSections: ['arrange'],
      enforceOrder: true,
    },
  };

  /**
   * Validate AAA structure.
   * Only validates if the document is a Test Case.
   */
  validate(doc: TarDocument): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Only validate Test Case files
    if (!this.shouldValidate(doc)) {
      return issues;
    }

    // Get AAA sections
    const arrangeSections = doc.sections.filter((s) => s.type === 'arrange');
    const actSections = doc.sections.filter((s) => s.type === 'act');
    const assertSections = doc.sections.filter((s) => s.type === 'assert');

    // Check for required Act section
    if (actSections.length === 0) {
      issues.push({
        code: 'AAA001',
        message: 'Test Case is missing an Act section.',
        severity: 'error',
        suggestion: 'Add a markdown section with heading containing "Act", "When", or "Execute".\nExample:\n## Act\n1. Call the API endpoint.',
      });
    }

    // Check for required Assert section
    if (assertSections.length === 0) {
      issues.push({
        code: 'AAA002',
        message: 'Test Case is missing an Assert section.',
        severity: 'error',
        suggestion: 'Add a markdown section with heading containing "Assert", "Then", "Verify", or "Expect".\nExample:\n## Assert\n1. Verify the response status is 200.',
      });
    }

    // Check for Arrange section (recommended but not required)
    if (arrangeSections.length === 0) {
      issues.push({
        code: 'AAA003',
        message: 'Test Case does not have an Arrange section. Consider adding one for clarity.',
        severity: 'info',
        suggestion: 'Add a markdown section with heading containing "Arrange", "Given", or "Setup".\nExample:\n## Arrange\n1. Set up test data.',
      });
    }

    // Check section order (Arrange → Act → Assert)
    const aaaSections = doc.sections.filter((s) => s.type !== 'other');
    if (aaaSections.length > 1) {
      const expectedOrder = ['arrange', 'act', 'assert'];
      let lastOrderIndex = -1;

      for (const section of aaaSections) {
        const currentIndex = expectedOrder.indexOf(section.type);
        if (currentIndex !== -1 && currentIndex < lastOrderIndex) {
          issues.push({
            code: 'AAA004',
            message: `Section order issue: "${section.heading}" (${section.type}) appears after a later section in the AAA pattern.`,
            severity: 'warning',
            line: section.lineStart,
            suggestion: 'Reorder sections to follow: Arrange → Act → Assert',
          });
        }
        if (currentIndex > lastOrderIndex) {
          lastOrderIndex = currentIndex;
        }
      }
    }

    // Check that Act section has commands in the code block
    for (const actSection of actSections) {
      const hasCommands = this.hasServerCommands(actSection.content);
      if (!hasCommands) {
        issues.push({
          code: 'AAA005',
          message: 'Act section does not appear to contain any server call commands (Get, Post, Create, Call, etc.).',
          severity: 'warning',
          line: actSection.lineStart,
          suggestion: 'Add server commands in the code block within the Act section.',
        });
      }
    }

    // Check that Assert section has Assert commands
    for (const assertSection of assertSections) {
      const hasAsserts = this.hasAssertCommands(assertSection.content);
      if (!hasAsserts) {
        issues.push({
          code: 'AAA006',
          message: 'Assert section does not contain any Assert commands.',
          severity: 'warning',
          line: assertSection.lineStart,
          suggestion: 'Add Assert commands to verify expected outcomes.\nExample: Assert {$response.status} == 200',
        });
      }
    }

    // Check that Assert commands are not in non-Test Case files
    // (This is already handled by checking shouldValidate, but we double-check for asserts)

    return issues;
  }

  /**
   * Check if document should be validated for AAA structure.
   */
  private shouldValidate(doc: TarDocument): boolean {
    if (!doc.metadata || !doc.metadata.type) {
      return false;
    }
    return doc.metadata.type === 'Test Case';
  }

  /**
   * Check if content has server call commands.
   */
  private hasServerCommands(content: string): boolean {
    const serverCommandPattern = /\b(Get|Post|Create|Modify|Patch|Delete|Query|Batch|Action|Call)\b/i;
    return serverCommandPattern.test(content);
  }

  /**
   * Check if content has Assert commands.
   */
  private hasAssertCommands(content: string): boolean {
    const assertPattern = /\b(Assert|AssertJson)\b/i;
    return assertPattern.test(content);
  }

  /**
   * Get validation rules.
   */
  getRules(): ValidationRules {
    return this.rules;
  }
}
