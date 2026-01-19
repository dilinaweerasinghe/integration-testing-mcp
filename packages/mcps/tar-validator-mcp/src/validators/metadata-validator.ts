/**
 * Metadata/frontmatter validator.
 * Validates TAR document metadata against SAR/TAR standards.
 */

import type { TarDocument, TarFileType, TarMetadata, ValidationIssue, ValidationRules } from '../types.js';

/**
 * Valid TAR file types.
 */
const VALID_FILE_TYPES: TarFileType[] = [
  'Test Data',
  'Test Util',
  'Test Case',
  'Test Suite',
  'Test Collection',
];

/**
 * Valid modes for certain file types.
 */
const VALID_MODES = ['Standalone', 'Dependent'];

/**
 * File types that require the 'mode' field.
 */
const TYPES_REQUIRING_MODE: TarFileType[] = ['Test Case', 'Test Suite', 'Test Collection'];

/**
 * Metadata validator for TAR documents.
 */
export class MetadataValidator {
  private readonly rules: ValidationRules = {
    name: 'metadata',
    enabled: true,
    severity: 'error',
    options: {
      validFileTypes: VALID_FILE_TYPES,
      validModes: VALID_MODES,
      typesRequiringMode: TYPES_REQUIRING_MODE,
    },
  };

  /**
   * Validate document metadata.
   */
  validate(doc: TarDocument): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if metadata exists
    if (!doc.metadata) {
      issues.push({
        code: 'META001',
        message: 'Missing metadata block (frontmatter). TAR files require YAML frontmatter.',
        severity: 'error',
        line: 1,
        suggestion: this.getSuggestionForMissingMetadata(),
      });
      return issues;
    }

    const metadata = doc.metadata as TarMetadata;

    // Check required 'type' field
    if (!metadata.type) {
      issues.push({
        code: 'META002',
        message: "Missing required metadata field: 'type'",
        severity: 'error',
        line: 1,
        suggestion: `Add 'type' field. Valid values: ${VALID_FILE_TYPES.join(', ')}`,
      });
    } else if (!VALID_FILE_TYPES.includes(metadata.type)) {
      issues.push({
        code: 'META003',
        message: `Invalid file type: '${metadata.type}'. Must be one of: ${VALID_FILE_TYPES.join(', ')}`,
        severity: 'error',
        line: 1,
        suggestion: `Use one of: ${VALID_FILE_TYPES.join(', ')}`,
      });
    }

    // Check required 'owner' field
    if (!metadata.owner) {
      issues.push({
        code: 'META004',
        message: "Missing required metadata field: 'owner'",
        severity: 'error',
        line: 1,
        suggestion: "Add 'owner' field with the team or component name (e.g., 'Manufacturing', 'Finance')",
      });
    } else if (typeof metadata.owner !== 'string' || metadata.owner.trim().length < 2) {
      issues.push({
        code: 'META005',
        message: "'owner' field must be a non-empty string (minimum 2 characters)",
        severity: 'error',
        line: 1,
        suggestion: 'Provide a valid owner/team name',
      });
    }

    // Check 'mode' field for types that require it
    if (metadata.type && TYPES_REQUIRING_MODE.includes(metadata.type)) {
      if (!metadata.mode) {
        issues.push({
          code: 'META006',
          message: `Missing required 'mode' field for type '${metadata.type}'`,
          severity: 'error',
          line: 1,
          suggestion: `Add 'mode' field. Valid values: ${VALID_MODES.join(', ')}`,
        });
      } else if (!VALID_MODES.includes(metadata.mode)) {
        issues.push({
          code: 'META007',
          message: `Invalid mode: '${metadata.mode}'. Must be one of: ${VALID_MODES.join(', ')}`,
          severity: 'error',
          line: 1,
          suggestion: `Use one of: ${VALID_MODES.join(', ')}`,
        });
      }
    }

    // Warn if 'mode' is set for types that don't need it
    if (metadata.mode && metadata.type && !TYPES_REQUIRING_MODE.includes(metadata.type)) {
      issues.push({
        code: 'META008',
        message: `'mode' field is not required for type '${metadata.type}'`,
        severity: 'info',
        line: 1,
        suggestion: `The 'mode' field is only needed for: ${TYPES_REQUIRING_MODE.join(', ')}`,
      });
    }

    return issues;
  }

  /**
   * Get file type from metadata.
   */
  getFileType(doc: TarDocument): TarFileType | null {
    if (!doc.metadata || !doc.metadata.type) {
      return null;
    }
    const type = doc.metadata.type;
    if (VALID_FILE_TYPES.includes(type as TarFileType)) {
      return type as TarFileType;
    }
    return null;
  }

  /**
   * Check if file type requires AAA structure.
   */
  requiresAaaStructure(doc: TarDocument): boolean {
    const fileType = this.getFileType(doc);
    return fileType === 'Test Case';
  }

  /**
   * Check if file type can have Assert commands.
   */
  canHaveAsserts(doc: TarDocument): boolean {
    const fileType = this.getFileType(doc);
    return fileType === 'Test Case';
  }

  /**
   * Get suggestion for missing metadata.
   */
  private getSuggestionForMissingMetadata(): string {
    return `Add YAML frontmatter at the beginning of the file:
---
type: Test Case
owner: YourTeamName
mode: Standalone
---

Valid types: ${VALID_FILE_TYPES.join(', ')}
Valid modes: ${VALID_MODES.join(', ')} (required for Test Case, Test Suite, Test Collection)`;
  }

  /**
   * Get validation rules.
   */
  getRules(): ValidationRules {
    return this.rules;
  }
}
