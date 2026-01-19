/**
 * Helper functions for building tool input schemas.
 */

import type { ToolInputSchema, JsonSchemaProperty } from './mcp-types.js';

/**
 * Builder for creating tool input schemas.
 */
export class ToolSchemaBuilder {
  private properties: Record<string, JsonSchemaProperty> = {};
  private requiredFields: string[] = [];

  /**
   * Add a string property.
   */
  string(
    name: string,
    description: string,
    options?: {
      required?: boolean;
      enum?: string[];
      default?: string;
      pattern?: string;
      minLength?: number;
      maxLength?: number;
    }
  ): this {
    this.properties[name] = {
      type: 'string',
      description,
      ...(options?.enum && { enum: options.enum }),
      ...(options?.default !== undefined && { default: options.default }),
      ...(options?.pattern && { pattern: options.pattern }),
      ...(options?.minLength !== undefined && { minLength: options.minLength }),
      ...(options?.maxLength !== undefined && { maxLength: options.maxLength }),
    };
    if (options?.required) {
      this.requiredFields.push(name);
    }
    return this;
  }

  /**
   * Add a number property.
   */
  number(
    name: string,
    description: string,
    options?: {
      required?: boolean;
      minimum?: number;
      maximum?: number;
      default?: number;
    }
  ): this {
    this.properties[name] = {
      type: 'number',
      description,
      ...(options?.minimum !== undefined && { minimum: options.minimum }),
      ...(options?.maximum !== undefined && { maximum: options.maximum }),
      ...(options?.default !== undefined && { default: options.default }),
    };
    if (options?.required) {
      this.requiredFields.push(name);
    }
    return this;
  }

  /**
   * Add an integer property.
   */
  integer(
    name: string,
    description: string,
    options?: {
      required?: boolean;
      minimum?: number;
      maximum?: number;
      default?: number;
    }
  ): this {
    this.properties[name] = {
      type: 'integer',
      description,
      ...(options?.minimum !== undefined && { minimum: options.minimum }),
      ...(options?.maximum !== undefined && { maximum: options.maximum }),
      ...(options?.default !== undefined && { default: options.default }),
    };
    if (options?.required) {
      this.requiredFields.push(name);
    }
    return this;
  }

  /**
   * Add a boolean property.
   */
  boolean(
    name: string,
    description: string,
    options?: {
      required?: boolean;
      default?: boolean;
    }
  ): this {
    this.properties[name] = {
      type: 'boolean',
      description,
      ...(options?.default !== undefined && { default: options.default }),
    };
    if (options?.required) {
      this.requiredFields.push(name);
    }
    return this;
  }

  /**
   * Add an array property.
   */
  array(
    name: string,
    description: string,
    itemType: JsonSchemaProperty,
    options?: {
      required?: boolean;
    }
  ): this {
    this.properties[name] = {
      type: 'array',
      description,
      items: itemType,
    };
    if (options?.required) {
      this.requiredFields.push(name);
    }
    return this;
  }

  /**
   * Add an object property.
   */
  object(
    name: string,
    description: string,
    schema: ToolInputSchema,
    options?: {
      required?: boolean;
    }
  ): this {
    this.properties[name] = {
      type: 'object',
      description,
      properties: schema.properties,
      required: schema.required,
    };
    if (options?.required) {
      this.requiredFields.push(name);
    }
    return this;
  }

  /**
   * Build the final input schema.
   */
  build(): ToolInputSchema {
    return {
      type: 'object',
      properties: this.properties,
      required: this.requiredFields.length > 0 ? this.requiredFields : undefined,
    };
  }
}

/**
 * Create a new schema builder.
 */
export function createSchema(): ToolSchemaBuilder {
  return new ToolSchemaBuilder();
}
