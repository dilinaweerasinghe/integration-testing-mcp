/**
 * Input validation utilities using Zod.
 */

import { z } from 'zod';
import { failure, success, type Result } from './result.js';

/**
 * Validate input against a Zod schema.
 */
export function validateInput<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown
): Result<z.infer<T>> {
  const result = schema.safeParse(input);
  
  if (result.success) {
    return success(result.data);
  }
  
  const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  return failure('VALIDATION_ERROR', 'Input validation failed', { errors });
}

/**
 * Create a validated tool handler wrapper.
 */
export function withValidation<TSchema extends z.ZodTypeAny, TResult>(
  schema: TSchema,
  handler: (input: z.infer<TSchema>) => Promise<TResult>
): (input: Record<string, unknown>) => Promise<Result<TResult>> {
  return async (input: Record<string, unknown>) => {
    const validationResult = validateInput(schema, input);
    
    if (!validationResult.success) {
      return validationResult;
    }
    
    try {
      const result = await handler(validationResult.data);
      return success(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Handler error';
      return failure('HANDLER_ERROR', message);
    }
  };
}

/**
 * Common validation schemas.
 */
export const CommonSchemas = {
  /** Non-empty string */
  nonEmptyString: z.string().min(1, 'String cannot be empty'),
  
  /** Valid URL */
  url: z.string().url('Invalid URL format'),
  
  /** File path */
  filePath: z.string().min(1, 'File path cannot be empty'),
  
  /** Positive integer */
  positiveInt: z.number().int().positive(),
  
  /** HTTP method */
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  
  /** Content type */
  contentType: z.string().regex(/^[a-z]+\/[a-z0-9.+-]+$/i, 'Invalid content type'),
  
  /** camelCase identifier */
  camelCaseId: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, 'Must be camelCase'),
  
  /** UUID */
  uuid: z.string().uuid('Invalid UUID format'),
  
  /** ISO date string */
  isoDate: z.string().datetime({ message: 'Invalid ISO date format' }),
  
  /** Email */
  email: z.string().email('Invalid email format'),
};

/**
 * Utility to create optional version of a schema.
 */
export function optional<T extends z.ZodTypeAny>(schema: T): z.ZodOptional<T> {
  return schema.optional();
}

/**
 * Utility to create nullable version of a schema.
 */
export function nullable<T extends z.ZodTypeAny>(schema: T): z.ZodNullable<T> {
  return schema.nullable();
}
