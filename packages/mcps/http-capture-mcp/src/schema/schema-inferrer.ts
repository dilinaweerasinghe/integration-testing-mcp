/**
 * JSON Schema inference from sample data.
 * Builds schemas from captured response payloads.
 */

/**
 * Infers JSON Schema from sample objects.
 */
export class SchemaInferrer {
  private schema: Record<string, unknown> | null = null;
  private sampleCount = 0;

  /**
   * Add a sample object to infer schema from.
   */
  addSample(data: unknown): void {
    const inferred = this.inferFromValue(data);
    
    if (!this.schema) {
      this.schema = inferred;
    } else {
      this.schema = this.mergeSchemas(this.schema, inferred);
    }
    
    this.sampleCount++;
  }

  /**
   * Get the inferred schema.
   */
  getSchema(): Record<string, unknown> | null {
    return this.schema;
  }

  /**
   * Get number of samples processed.
   */
  getSampleCount(): number {
    return this.sampleCount;
  }

  /**
   * Infer schema from a value.
   */
  private inferFromValue(value: unknown): Record<string, unknown> {
    if (value === null) {
      return { type: 'null' };
    }

    if (value === undefined) {
      return { type: 'null' };
    }

    if (Array.isArray(value)) {
      return this.inferFromArray(value);
    }

    if (typeof value === 'object') {
      return this.inferFromObject(value as Record<string, unknown>);
    }

    if (typeof value === 'string') {
      return this.inferFromString(value);
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
    }

    if (typeof value === 'boolean') {
      return { type: 'boolean' };
    }

    return { type: 'string' };
  }

  /**
   * Infer schema from an array.
   */
  private inferFromArray(arr: unknown[]): Record<string, unknown> {
    if (arr.length === 0) {
      return {
        type: 'array',
        items: {},
      };
    }

    // Merge schemas from all items
    let itemSchema: Record<string, unknown> | null = null;
    for (const item of arr) {
      const inferred = this.inferFromValue(item);
      if (!itemSchema) {
        itemSchema = inferred;
      } else {
        itemSchema = this.mergeSchemas(itemSchema, inferred);
      }
    }

    return {
      type: 'array',
      items: itemSchema,
    };
  }

  /**
   * Infer schema from an object.
   */
  private inferFromObject(obj: Record<string, unknown>): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      properties[key] = this.inferFromValue(value);
      if (value !== null && value !== undefined) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  /**
   * Infer schema from a string, detecting common formats.
   */
  private inferFromString(value: string): Record<string, unknown> {
    // Check for common formats
    if (this.isIsoDate(value)) {
      return { type: 'string', format: 'date-time' };
    }

    if (this.isDate(value)) {
      return { type: 'string', format: 'date' };
    }

    if (this.isEmail(value)) {
      return { type: 'string', format: 'email' };
    }

    if (this.isUri(value)) {
      return { type: 'string', format: 'uri' };
    }

    if (this.isUuid(value)) {
      return { type: 'string', format: 'uuid' };
    }

    return { type: 'string' };
  }

  /**
   * Merge two schemas together.
   */
  private mergeSchemas(
    schema1: Record<string, unknown>,
    schema2: Record<string, unknown>
  ): Record<string, unknown> {
    const type1 = schema1['type'] as string;
    const type2 = schema2['type'] as string;

    // If types differ, create anyOf
    if (type1 !== type2) {
      return {
        anyOf: [schema1, schema2],
      };
    }

    // Merge object schemas
    if (type1 === 'object') {
      const props1 = (schema1['properties'] ?? {}) as Record<string, unknown>;
      const props2 = (schema2['properties'] ?? {}) as Record<string, unknown>;
      const required1 = new Set((schema1['required'] ?? []) as string[]);
      const required2 = new Set((schema2['required'] ?? []) as string[]);

      const mergedProps: Record<string, unknown> = { ...props1 };
      
      for (const [key, value] of Object.entries(props2)) {
        if (mergedProps[key]) {
          mergedProps[key] = this.mergeSchemas(
            mergedProps[key] as Record<string, unknown>,
            value as Record<string, unknown>
          );
        } else {
          mergedProps[key] = value;
        }
      }

      // Required only if required in both
      const mergedRequired = [...required1].filter((r) => required2.has(r));

      return {
        type: 'object',
        properties: mergedProps,
        required: mergedRequired.length > 0 ? mergedRequired : undefined,
      };
    }

    // Merge array schemas
    if (type1 === 'array') {
      const items1 = (schema1['items'] ?? {}) as Record<string, unknown>;
      const items2 = (schema2['items'] ?? {}) as Record<string, unknown>;

      return {
        type: 'array',
        items: this.mergeSchemas(items1, items2),
      };
    }

    // For primitive types, return first (or merge formats)
    return schema1;
  }

  // Format detection helpers
  private isIsoDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
  }

  private isDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isUri(value: string): boolean {
    return /^https?:\/\//.test(value);
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
}
