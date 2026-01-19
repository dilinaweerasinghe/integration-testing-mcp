/**
 * Type definitions for TAR Validator MCP.
 */

/**
 * TAR file types.
 */
export type TarFileType = 
  | 'Test Data'
  | 'Test Util'
  | 'Test Case'
  | 'Test Suite'
  | 'Test Collection';

/**
 * TAR file mode (for Test Case, Test Suite, Test Collection).
 */
export type TarFileMode = 'Standalone' | 'Dependent';

/**
 * TAR document metadata from frontmatter.
 */
export interface TarMetadata {
  /** File type - required for all files */
  type: TarFileType;
  /** Owner team/component - required for all files */
  owner: string;
  /** Mode - required for Test Case, Test Suite, Test Collection */
  mode?: TarFileMode;
  /** Any additional metadata fields */
  [key: string]: unknown;
}

/**
 * Parsed TAR document.
 */
export interface TarDocument {
  /** Document metadata from frontmatter */
  metadata: TarMetadata | null;
  /** Detected file type from metadata */
  fileType: TarFileType | null;
  /** Document sections */
  sections: TarSection[];
  /** All variables defined in the document */
  variables: VariableReference[];
  /** All substitution patterns */
  patterns: PatternReference[];
  /** All TAR commands in the document */
  commands: TarCommand[];
  /** Raw content */
  raw: string;
}

/**
 * TAR command types.
 */
export type TarCommandType = 
  // Server calls
  | 'Get' | 'Post' | 'Create' | 'Modify' | 'Patch' | 'Delete' | 'Query' | 'Batch'
  | 'Action' | 'ModifyBlob' | 'PatchBlob' | 'ModifyClob'
  // Variable handling
  | 'Eval' | 'ApplyJson' | 'CopyJson' | 'RemoveJson' | 'AssertJson' | 'Assert' | 'Print'
  // Script calls
  | 'Call' | 'Output' | 'ExecuteCSV' | 'IterateArray'
  // Other
  | 'Delay' | 'RequireMinVersion' | 'Connect'
  // Unknown
  | 'Unknown';

/**
 * A TAR command parsed from the script.
 */
export interface TarCommand {
  /** Command type */
  type: TarCommandType;
  /** Full command text */
  text: string;
  /** Line number */
  line: number;
  /** Target URL or path (for server/script calls) */
  target?: string;
  /** Into variable */
  intoVar?: string;
  /** Using variable */
  usingVar?: string;
  /** When condition */
  whenCondition?: string;
  /** Has CatchError flag */
  hasCatchError?: boolean;
  /** Has ExpectFail flag */
  hasExpectFail?: boolean;
  /** JSON body if present */
  jsonBody?: string;
}

/**
 * A section in a TAR document.
 */
export interface TarSection {
  /** Section type */
  type: 'arrange' | 'act' | 'assert' | 'other';
  /** Section heading */
  heading: string;
  /** Section content */
  content: string;
  /** Line number where section starts */
  lineStart: number;
  /** Line number where section ends */
  lineEnd: number;
  /** HTTP operations in this section */
  operations: HttpOperation[];
}

/**
 * HTTP operation in a TAR document.
 */
export interface HttpOperation {
  /** HTTP method */
  method: string;
  /** URL/endpoint */
  url: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: string;
  /** Line number */
  line: number;
}

/**
 * Variable reference.
 */
export interface VariableReference {
  /** Variable name */
  name: string;
  /** Line where defined/used */
  line: number;
  /** Whether it's a definition or usage */
  isDefinition: boolean;
  /** Context (for error messages) */
  context: string;
}

/**
 * Substitution pattern reference.
 */
export interface PatternReference {
  /** Full pattern text */
  pattern: string;
  /** Pattern type */
  type: 'utilReference' | 'dataSubstitution' | 'envVariable' | 'unknown';
  /** Extracted name/identifier */
  identifier: string;
  /** Line number */
  line: number;
  /** Is pattern valid */
  valid: boolean;
}

/**
 * Validation result.
 */
export interface ValidationResult {
  /** Overall validity */
  valid: boolean;
  /** Detected file type */
  fileType: string;
  /** All issues found */
  issues: ValidationIssue[];
  /** Summary counts */
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  /** Document metadata */
  metadata: {
    commandsFound: number;
    variablesFound: number;
    patternsFound: number;
    sectionsFound: number;
  };
}

/**
 * Validation issue.
 */
export interface ValidationIssue {
  /** Issue code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Line number (if applicable) */
  line?: number;
  /** Column number (if applicable) */
  column?: number;
  /** File path */
  file?: string;
  /** Suggested fix */
  suggestion?: string;
  /** Related context */
  context?: string;
}

/**
 * Validation rules configuration.
 */
export interface ValidationRules {
  /** Rule name */
  name: string;
  /** Whether enabled */
  enabled: boolean;
  /** Severity */
  severity: 'error' | 'warning' | 'info';
  /** Rule-specific options */
  options?: Record<string, unknown>;
}
