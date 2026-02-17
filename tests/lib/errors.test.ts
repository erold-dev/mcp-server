import { describe, it, expect } from 'vitest';
import { ApiError, ConfigError, formatError, isRetryableError } from '../../src/lib/errors.js';

// =============================================================================
// ApiError
// =============================================================================

describe('ApiError', () => {
  it('should create an error with message, statusCode, and details', () => {
    const error = new ApiError('Something went wrong', 500, { field: 'value' });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(500);
    expect(error.details).toEqual({ field: 'value' });
  });

  it('should create an error without details', () => {
    const error = new ApiError('Not found', 404);

    expect(error.statusCode).toBe(404);
    expect(error.details).toBeUndefined();
  });

  describe('static factory methods', () => {
    it('unauthorized() creates 401 error with default message', () => {
      const error = ApiError.unauthorized();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    it('unauthorized() accepts custom message', () => {
      const error = ApiError.unauthorized('Invalid token');

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid token');
    });

    it('notFound() creates 404 error with default message', () => {
      const error = ApiError.notFound();

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
    });

    it('notFound() accepts custom message', () => {
      const error = ApiError.notFound('Task not found');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Task not found');
    });

    it('badRequest() creates 400 error with details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = ApiError.badRequest('Validation failed', details);

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual(details);
    });

    it('badRequest() uses default message', () => {
      const error = ApiError.badRequest();

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
    });

    it('serverError() creates 500 error with default message', () => {
      const error = ApiError.serverError();

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Server error');
    });

    it('rateLimited() creates 429 error with retryAfter', () => {
      const error = ApiError.rateLimited(30);

      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Rate limited. Try again in 30 seconds.');
    });

    it('rateLimited() defaults to 60 seconds when no retryAfter', () => {
      const error = ApiError.rateLimited();

      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Rate limited. Try again in 60 seconds.');
    });
  });
});

// =============================================================================
// ConfigError
// =============================================================================

describe('ConfigError', () => {
  it('should create an error with correct name', () => {
    const error = new ConfigError('Missing API key');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.name).toBe('ConfigError');
    expect(error.message).toBe('Missing API key');
  });
});

// =============================================================================
// formatError
// =============================================================================

describe('formatError', () => {
  it('should format ApiError with status code', () => {
    const error = new ApiError('Not found', 404);
    expect(formatError(error)).toBe('API Error (404): Not found');
  });

  it('should format generic Error with just message', () => {
    const error = new Error('Something broke');
    expect(formatError(error)).toBe('Something broke');
  });

  it('should return default message for non-Error values', () => {
    expect(formatError('string error')).toBe('An unexpected error occurred');
    expect(formatError(42)).toBe('An unexpected error occurred');
    expect(formatError(null)).toBe('An unexpected error occurred');
    expect(formatError(undefined)).toBe('An unexpected error occurred');
  });

  it('should format ConfigError as a generic Error', () => {
    const error = new ConfigError('Bad config');
    expect(formatError(error)).toBe('Bad config');
  });
});

// =============================================================================
// isRetryableError
// =============================================================================

describe('isRetryableError', () => {
  it('should return true for 500 server errors', () => {
    expect(isRetryableError(new ApiError('Server error', 500))).toBe(true);
  });

  it('should return true for 502 bad gateway', () => {
    expect(isRetryableError(new ApiError('Bad gateway', 502))).toBe(true);
  });

  it('should return true for 503 service unavailable', () => {
    expect(isRetryableError(new ApiError('Unavailable', 503))).toBe(true);
  });

  it('should return true for 429 rate limited', () => {
    expect(isRetryableError(ApiError.rateLimited())).toBe(true);
  });

  it('should return false for 400 bad request', () => {
    expect(isRetryableError(ApiError.badRequest())).toBe(false);
  });

  it('should return false for 401 unauthorized', () => {
    expect(isRetryableError(ApiError.unauthorized())).toBe(false);
  });

  it('should return false for 404 not found', () => {
    expect(isRetryableError(ApiError.notFound())).toBe(false);
  });

  it('should return true for AbortError (timeout)', () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return false for generic Error', () => {
    expect(isRetryableError(new Error('Something'))).toBe(false);
  });

  it('should return false for non-Error values', () => {
    expect(isRetryableError('error')).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});
