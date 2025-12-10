/**
 * Error Handling
 *
 * Custom error classes and error handling utilities.
 */

/**
 * API Error - thrown when API requests fail
 */
export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(message, 401);
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(message, 404);
  }

  static badRequest(message = 'Bad request', details?: unknown): ApiError {
    return new ApiError(message, 400, details);
  }

  static serverError(message = 'Server error'): ApiError {
    return new ApiError(message, 500);
  }

  static rateLimited(retryAfter?: number): ApiError {
    return new ApiError(
      `Rate limited. Try again in ${retryAfter || 60} seconds.`,
      429
    );
  }
}

/**
 * Configuration Error - thrown when configuration is invalid
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Format error for MCP response
 */
export function formatError(error: unknown): string {
  if (error instanceof ApiError) {
    return `API Error (${error.statusCode}): ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Retry on server errors and rate limits
    return error.statusCode >= 500 || error.statusCode === 429;
  }

  // Retry on network errors
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  return false;
}
