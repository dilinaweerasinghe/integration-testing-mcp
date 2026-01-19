/**
 * Entity schema extractor for Cloud ERP entities.
 * Extracts structured schema information including keys and data types.
 */

import type { ParsedSpec, EntitySchema, PropertyInfo } from '../types.js';

interface ExtractionOptions {
  resolveRefs: boolean;
  includeExamples: boolean;
}

/**
 * Extracts entity schemas from OpenAPI specifications.
 */
export class EntityExtractor {
  /**
   * Extract an entity schema by name.
   */
  extract(
    spec: ParsedSpec,
    schemaName: string,
    options: ExtractionOptions
  ): EntitySchema | null {
    const schema = spec.schemas[schemaName];
    if (!schema) {
      return null;
    }

    const schemaObj = schema as Record<string, unknown>;
    const properties = this.extractProperties(schemaObj, options);
    const required = (schemaObj['required'] as string[]) ?? [];
    const keys = this.inferKeys(schemaName, properties, schemaObj);

    return {
      name: schemaName,
      type: (schemaObj['type'] as string) ?? 'object',
      description: schemaObj['description'] as string | undefined,
      properties,
      required,
      keys,
      examples: options.includeExamples ? this.extractExamples(schemaObj) : undefined,
    };
  }

  /**
   * Extract properties from a schema object.
   */
  private extractProperties(
    schema: Record<string, unknown>,
    options: ExtractionOptions
  ): PropertyInfo[] {
    const properties: PropertyInfo[] = [];
    const props = schema['properties'] as Record<string, unknown> | undefined;
    const required = new Set((schema['required'] as string[]) ?? []);

    if (!props) {
      return properties;
    }

    for (const [name, propSchema] of Object.entries(props)) {
      const prop = propSchema as Record<string, unknown>;
      properties.push(this.convertProperty(name, prop, required.has(name), options));
    }

    return properties;
  }

  /**
   * Convert a property schema to PropertyInfo.
   */
  private convertProperty(
    name: string,
    schema: Record<string, unknown>,
    isRequired: boolean,
    options: ExtractionOptions
  ): PropertyInfo {
    const type = this.resolveType(schema);
    
    const property: PropertyInfo = {
      name,
      type,
      required: isRequired,
    };

    // Add optional fields
    if (schema['format']) property.format = schema['format'] as string;
    if (schema['description']) property.description = schema['description'] as string;
    if (schema['nullable']) property.nullable = schema['nullable'] as boolean;
    if (schema['enum']) property.enum = schema['enum'] as (string | number)[];
    if (schema['default'] !== undefined) property.default = schema['default'];
    if (schema['minimum'] !== undefined) property.minimum = schema['minimum'] as number;
    if (schema['maximum'] !== undefined) property.maximum = schema['maximum'] as number;
    if (schema['minLength'] !== undefined) property.minLength = schema['minLength'] as number;
    if (schema['maxLength'] !== undefined) property.maxLength = schema['maxLength'] as number;
    if (schema['pattern']) property.pattern = schema['pattern'] as string;

    // Add example if requested
    if (options.includeExamples && schema['example'] !== undefined) {
      property.example = schema['example'];
    }

    // Handle array items
    if (type === 'array' && schema['items']) {
      property.items = this.convertProperty(
        'items',
        schema['items'] as Record<string, unknown>,
        false,
        options
      );
    }

    return property;
  }

  /**
   * Resolve the type from a schema.
   */
  private resolveType(schema: Record<string, unknown>): string {
    if (schema['type']) {
      return schema['type'] as string;
    }

    // Handle anyOf/oneOf
    if (schema['anyOf'] || schema['oneOf']) {
      const options = (schema['anyOf'] ?? schema['oneOf']) as Record<string, unknown>[];
      const types = options.map((o) => this.resolveType(o)).filter((t) => t !== 'null');
      return types.join(' | ');
    }

    // Handle allOf (merge)
    if (schema['allOf']) {
      return 'object';
    }

    return 'unknown';
  }

  /**
   * Infer key fields for ERP entities.
   */
  private inferKeys(
    _schemaName: string,
    properties: PropertyInfo[],
    schema: Record<string, unknown>
  ): string[] {
    const keys: string[] = [];

    // Check for ERP-specific key annotations
    const ifsKeys = schema['x-ifs-keys'] as string[] | undefined;
    if (ifsKeys) {
      return ifsKeys;
    }

    // Common key patterns for Cloud ERP
    const keyPatterns = [
      /^.*Id$/,           // Ends with Id
      /^.*Key$/,          // Ends with Key
      /^.*Code$/,         // Ends with Code
      /^.*Number$/,       // Ends with Number
    ];

    // Look for properties that match key patterns and are required
    for (const prop of properties) {
      if (prop.required) {
        for (const pattern of keyPatterns) {
          if (pattern.test(prop.name)) {
            keys.push(prop.name);
            break;
          }
        }
      }
    }

    // If no keys found, use first required property
    if (keys.length === 0) {
      const firstRequired = properties.find((p) => p.required);
      if (firstRequired) {
        keys.push(firstRequired.name);
      }
    }

    return keys;
  }

  /**
   * Extract example values from schema.
   */
  private extractExamples(schema: Record<string, unknown>): Record<string, unknown> | undefined {
    const examples: Record<string, unknown> = {};
    const props = schema['properties'] as Record<string, unknown> | undefined;

    if (!props) {
      return undefined;
    }

    for (const [name, propSchema] of Object.entries(props)) {
      const prop = propSchema as Record<string, unknown>;
      if (prop['example'] !== undefined) {
        examples[name] = prop['example'];
      }
    }

    // Also check top-level example
    if (schema['example']) {
      return schema['example'] as Record<string, unknown>;
    }

    return Object.keys(examples).length > 0 ? examples : undefined;
  }
}
