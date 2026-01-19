/**
 * TAR document parser.
 * Parses .mkd/.md files into structured TAR documents.
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { parse as parseYaml } from 'yaml';
import type { Root, Heading } from 'mdast';
import type { 
  TarDocument, 
  TarSection, 
  TarMetadata,
  TarFileType,
  TarCommand,
  TarCommandType,
  VariableReference, 
  PatternReference, 
  HttpOperation 
} from '../types.js';

/**
 * TAR command keywords.
 */
const COMMAND_KEYWORDS = [
  // Server calls
  'Get', 'Post', 'Create', 'Modify', 'Patch', 'Delete', 'Query', 'Batch',
  'Action', 'ModifyBlob', 'PatchBlob', 'ModifyClob',
  // Variable handling
  'Eval', 'ApplyJson', 'CopyJson', 'RemoveJson', 'AssertJson', 'Assert', 'Print',
  // Script calls
  'Call', 'Output', 'ExecuteCSV', 'IterateArray',
  // Other
  'Delay', 'RequireMinVersion', 'Connect',
];

/**
 * Parser for TAR test files.
 */
export class TarParser {
  private readonly processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml']);

  /**
   * Parse TAR document content.
   */
  async parse(content: string): Promise<TarDocument> {
    const tree = this.processor.parse(content) as Root;

    const metadata = this.extractMetadata(tree);
    const fileType = this.extractFileType(metadata);
    const sections = this.extractSections(tree, content);
    const codeBlocks = this.extractCodeBlocks(tree);
    const commands = this.extractCommands(codeBlocks);
    const variables = this.extractVariables(codeBlocks);
    const patterns = this.extractPatterns(content);

    return {
      metadata,
      fileType,
      sections,
      variables,
      patterns,
      commands,
      raw: content,
    };
  }

  /**
   * Extract metadata from YAML frontmatter.
   */
  private extractMetadata(tree: Root): TarMetadata | null {
    const yamlNode = tree.children.find(
      (node) => node.type === 'yaml'
    ) as { type: 'yaml'; value: string } | undefined;

    if (!yamlNode) {
      return null;
    }

    try {
      const parsed = parseYaml(yamlNode.value) as Record<string, unknown>;
      return parsed as TarMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Extract file type from metadata.
   */
  private extractFileType(metadata: TarMetadata | null): TarFileType | null {
    if (!metadata || !metadata.type) {
      return null;
    }
    const validTypes: TarFileType[] = [
      'Test Data', 'Test Util', 'Test Case', 'Test Suite', 'Test Collection'
    ];
    if (validTypes.includes(metadata.type)) {
      return metadata.type;
    }
    return null;
  }

  /**
   * Extract sections from document.
   */
  private extractSections(tree: Root, content: string): TarSection[] {
    const sections: TarSection[] = [];
    const lines = content.split('\n');
    let currentSection: TarSection | null = null;

    for (const node of tree.children) {
      if (node.type === 'heading') {
        // Save previous section
        if (currentSection) {
          currentSection.lineEnd = (node.position?.start.line ?? 1) - 1;
          currentSection.content = this.getSectionContent(lines, currentSection.lineStart, currentSection.lineEnd);
          currentSection.operations = this.extractOperations(currentSection.content, currentSection.lineStart);
          sections.push(currentSection);
        }

        const heading = this.getHeadingText(node as Heading);
        const sectionType = this.classifySection(heading);
        const lineStart = node.position?.start.line ?? 1;

        currentSection = {
          type: sectionType,
          heading,
          content: '',
          lineStart,
          lineEnd: lineStart,
          operations: [],
        };
      }
    }

    // Add the last section
    if (currentSection) {
      currentSection.lineEnd = lines.length;
      currentSection.content = this.getSectionContent(lines, currentSection.lineStart, currentSection.lineEnd);
      currentSection.operations = this.extractOperations(currentSection.content, currentSection.lineStart);
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Get text content from heading node.
   */
  private getHeadingText(heading: Heading): string {
    return heading.children
      .filter((child) => 'value' in child)
      .map((child) => (child as unknown as { value: string }).value)
      .join('');
  }

  /**
   * Classify a section based on its heading.
   */
  private classifySection(heading: string): TarSection['type'] {
    const lower = heading.toLowerCase().trim();
    
    if (lower.includes('arrange') || lower.includes('setup') || lower.includes('given')) {
      return 'arrange';
    }
    if (lower.includes('act') || lower.includes('when') || lower.includes('execute')) {
      return 'act';
    }
    if (lower.includes('assert') || lower.includes('then') || lower.includes('verify') || lower.includes('expect')) {
      return 'assert';
    }
    
    return 'other';
  }

  /**
   * Get content between line numbers.
   */
  private getSectionContent(lines: string[], start: number, end: number): string {
    return lines.slice(start - 1, end).join('\n');
  }

  /**
   * Extract code blocks from the document.
   */
  private extractCodeBlocks(tree: Root): Array<{ code: string; startLine: number }> {
    const codeBlocks: Array<{ code: string; startLine: number }> = [];

    for (const node of tree.children) {
      if (node.type === 'code') {
        const codeNode = node as { type: 'code'; value: string; lang?: string; position?: { start: { line: number } } };
        // Only process cs (C#) code blocks which contain TAR commands
        if (codeNode.lang === 'cs' || !codeNode.lang) {
          codeBlocks.push({
            code: codeNode.value,
            startLine: codeNode.position?.start.line ?? 1,
          });
        }
      }
    }

    return codeBlocks;
  }

  /**
   * Extract TAR commands from code blocks.
   */
  private extractCommands(codeBlocks: Array<{ code: string; startLine: number }>): TarCommand[] {
    const commands: TarCommand[] = [];

    for (const block of codeBlocks) {
      const lines = block.code.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];
        if (!currentLine) continue;
        
        const line = currentLine.trim();
        const lineNumber = block.startLine + i + 1; // +1 for code fence line

        // Skip empty lines and comments
        if (!line || line.startsWith('//') || line.startsWith('--')) {
          continue;
        }

        // Check if line starts with a command keyword
        const command = this.parseCommandLine(line, lineNumber, lines, i);
        if (command) {
          commands.push(command);
        }
      }
    }

    return commands;
  }

  /**
   * Parse a single command line.
   */
  private parseCommandLine(
    line: string, 
    lineNumber: number, 
    allLines: string[], 
    lineIndex: number
  ): TarCommand | null {
    // Find the command keyword at the start
    for (const keyword of COMMAND_KEYWORDS) {
      if (line.match(new RegExp(`^${keyword}\\b`, 'i'))) {
        const command: TarCommand = {
          type: keyword as TarCommandType,
          text: line,
          line: lineNumber,
        };

        // Extract Into variable
        const intoMatch = line.match(/\bInto\s+(\w+)/i);
        if (intoMatch) {
          command.intoVar = intoMatch[1];
        }

        // Extract Using variable
        const usingMatch = line.match(/\bUsing\s+(\w+(?:\.\w+)*)/i);
        if (usingMatch) {
          command.usingVar = usingMatch[1];
        }

        // Extract When condition
        const whenMatch = line.match(/\bWhen\s+(.+?)(?:\s+Into|\s+Using|$)/i);
        if (whenMatch && whenMatch[1]) {
          command.whenCondition = whenMatch[1].trim();
        }

        // Check for CatchError
        command.hasCatchError = /\bCatchError\b/i.test(line);

        // Check for ExpectFail
        command.hasExpectFail = /\bExpectFail\b/i.test(line);

        // Extract target for server/script calls
        if (['Get', 'Post', 'Create', 'Modify', 'Patch', 'Delete', 'Query', 'Batch', 'Call', 'Action'].includes(keyword)) {
          const targetMatch = line.match(new RegExp(`^${keyword}(?:\\s+(?:CatchError|ExpectFail))?\\s+([^\\s]+)`, 'i'));
          if (targetMatch) {
            command.target = targetMatch[1];
          }
        }

        // Check for JSON body (look for { in following lines)
        const jsonBody = this.extractJsonBody(allLines, lineIndex);
        if (jsonBody) {
          command.jsonBody = jsonBody;
        }

        return command;
      }
    }

    return null;
  }

  /**
   * Extract JSON body following a command.
   */
  private extractJsonBody(lines: string[], startIndex: number): string | null {
    let braceCount = 0;
    const jsonLines: string[] = [];
    let inJson = false;

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmedLine = line.trim();
      
      // Check for start of JSON object or array
      if (!inJson && (trimmedLine.startsWith('{') || trimmedLine.startsWith('['))) {
        inJson = true;
      }

      if (inJson) {
        jsonLines.push(line);
        braceCount += (line.match(/{/g) ?? []).length;
        braceCount += (line.match(/\[/g) ?? []).length;
        braceCount -= (line.match(/}/g) ?? []).length;
        braceCount -= (line.match(/]/g) ?? []).length;

        if (braceCount <= 0) {
          return jsonLines.join('\n');
        }
      } else if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('--')) {
        // Non-empty, non-comment line that's not JSON - stop looking
        break;
      }
    }

    return null;
  }

  /**
   * Extract HTTP operations from section content.
   */
  private extractOperations(content: string, sectionLineStart: number): HttpOperation[] {
    const operations: HttpOperation[] = [];
    const lines = content.split('\n');

    const httpMethodPattern = /^(Get|Post|Create|Modify|Patch|Delete|Query|Batch|Action|ModifyBlob|PatchBlob|ModifyClob)\s+(\S+)/i;

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;
      
      const line = currentLine.trim();
      const match = line.match(httpMethodPattern);

      if (match && match[1] && match[2]) {
        operations.push({
          method: match[1].toUpperCase(),
          url: match[2],
          line: sectionLineStart + i,
        });
      }
    }

    return operations;
  }

  /**
   * Extract variables from code blocks.
   */
  private extractVariables(codeBlocks: Array<{ code: string; startLine: number }>): VariableReference[] {
    const variables: VariableReference[] = [];

    for (const block of codeBlocks) {
      const lines = block.code.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        const lineNumber = block.startLine + i + 1;

        // Variable definitions: Eval ... Into varName, Get ... Into varName, etc.
        const intoPattern = /\bInto\s+(\w+)/gi;
        let intoMatch;
        while ((intoMatch = intoPattern.exec(line)) !== null) {
          const varName = intoMatch[1];
          if (varName) {
            variables.push({
              name: varName,
              line: lineNumber,
              isDefinition: true,
              context: line.trim().substring(0, 50),
            });
          }
        }

        // Variable usages: {$varName}, {#varName}, {%varName}
        const usagePattern = /\{[$#%](\w+(?:\.\w+)*)\}/g;
        let usageMatch;
        while ((usageMatch = usagePattern.exec(line)) !== null) {
          const fullName = usageMatch[1];
          if (fullName) {
            const baseName = fullName.split('.')[0] ?? fullName;
            variables.push({
              name: baseName,
              line: lineNumber,
              isDefinition: false,
              context: line.trim().substring(0, 50),
            });
          }
        }
      }
    }

    return variables;
  }

  /**
   * Extract substitution patterns from content.
   */
  private extractPatterns(content: string): PatternReference[] {
    const patterns: PatternReference[] = [];
    const lines = content.split('\n');

    // Pattern regex: {#...}, {%...}, {$...}
    const patternRegex = /\{([#%$])([^}]+)\}/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      let match;

      while ((match = patternRegex.exec(line)) !== null) {
        const prefix = match[1];
        const identifier = match[2];
        
        if (!prefix || !identifier) continue;
        
        let type: PatternReference['type'] = 'unknown';
        if (prefix === '#') {
          type = 'utilReference'; // Single quotes
        } else if (prefix === '%') {
          type = 'dataSubstitution'; // Double quotes
        } else if (prefix === '$') {
          type = 'envVariable'; // No quotes
        }

        // Validate pattern syntax
        const valid = this.isValidPattern(identifier);

        patterns.push({
          pattern: match[0],
          type,
          identifier,
          line: i + 1,
          valid,
        });
      }
    }

    return patterns;
  }

  /**
   * Check if a pattern identifier is valid.
   */
  private isValidPattern(identifier: string): boolean {
    // Basic validation: alphanumeric with dots and underscores
    // Can include function calls like Items(0), Today(), etc.
    const validPattern = /^[\w.]+(?:\([\w,\s"']*\))?(?:\.[\w.]+(?:\([\w,\s"']*\))?)*$/;
    return validPattern.test(identifier.trim());
  }
}
