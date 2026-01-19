/**
 * Result type utilities for consistent error handling.
 */

/**
 * Represents a successful result.
 */
interface SuccessResult<T> {
  success: true;
  data: T;
}

/**
 * Represents a failed result.
 */
interface FailureResult {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Union type representing either success or failure.
 */
export type Result<T> = SuccessResult<T> | FailureResult;

/**
 * Create a success result.
 */
export function success<T>(data: T): SuccessResult<T> {
  return { success: true, data };
}

/**
 * Create a failure result.
 */
export function failure(
  code: string,
  message: string,
  details?: Record<string, unknown>
): FailureResult {
  return {
    success: false,
    error: { code, message, details },
  };
}

/**
 * Check if a result is successful.
 */
export function isSuccess<T>(result: Result<T>): result is SuccessResult<T> {
  return result.success;
}

/**
 * Check if a result is a failure.
 */
export function isFailure<T>(result: Result<T>): result is FailureResult {
  return !result.success;
}

/**
 * Unwrap a result, throwing if it's a failure.
 */
export function unwrap<T>(result: Result<T>): T {
  if (isSuccess(result)) {
    return result.data;
  }
  throw new Error(`${result.error.code}: ${result.error.message}`);
}

/**
 * Unwrap a result with a default value for failures.
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  return isSuccess(result) ? result.data : defaultValue;
}

/**
 * Map over a successful result.
 */
export function map<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
  if (isSuccess(result)) {
    return success(fn(result.data));
  }
  return result;
}

/**
 * Flat map over a successful result.
 */
export function flatMap<T, U>(
  result: Result<T>,
  fn: (data: T) => Result<U>
): Result<U> {
  if (isSuccess(result)) {
    return fn(result.data);
  }
  return result;
}

/**
 * Execute a function and wrap the result.
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorCode = 'UNKNOWN_ERROR'
): Promise<Result<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return failure(errorCode, message);
  }
}
