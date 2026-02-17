import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getConfig, validateConfig } from '../../src/lib/config.js';

describe('getConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return config when all env vars are set', () => {
    process.env.EROLD_API_KEY = 'erold_test_key_123';
    process.env.EROLD_TENANT = 'my-tenant';
    process.env.EROLD_API_URL = 'https://custom-api.example.com';

    const config = getConfig();

    expect(config).toEqual({
      apiKey: 'erold_test_key_123',
      tenant: 'my-tenant',
      apiUrl: 'https://custom-api.example.com',
    });
  });

  it('should use default API URL when EROLD_API_URL not set', () => {
    process.env.EROLD_API_KEY = 'erold_test_key';
    process.env.EROLD_TENANT = 'my-tenant';
    delete process.env.EROLD_API_URL;

    const config = getConfig();

    expect(config.apiUrl).toBe('https://api.erold.dev/api/v1');
  });

  it('should throw when EROLD_API_KEY is missing', () => {
    delete process.env.EROLD_API_KEY;
    process.env.EROLD_TENANT = 'my-tenant';

    expect(() => getConfig()).toThrow('EROLD_API_KEY environment variable is required');
  });

  it('should throw when EROLD_TENANT is missing', () => {
    process.env.EROLD_API_KEY = 'erold_test_key';
    delete process.env.EROLD_TENANT;

    expect(() => getConfig()).toThrow('EROLD_TENANT environment variable is required');
  });

  it('should throw when both EROLD_API_KEY and EROLD_TENANT are missing', () => {
    delete process.env.EROLD_API_KEY;
    delete process.env.EROLD_TENANT;

    expect(() => getConfig()).toThrow('EROLD_API_KEY environment variable is required');
  });
});

describe('validateConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should not throw when config is valid', () => {
    process.env.EROLD_API_KEY = 'erold_test_key';
    process.env.EROLD_TENANT = 'my-tenant';

    // validateConfig calls process.exit(1) on failure, so mock it
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    validateConfig();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('should call process.exit(1) when config is invalid', () => {
    delete process.env.EROLD_API_KEY;
    delete process.env.EROLD_TENANT;

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateConfig();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Configuration Error:')
    );
  });
});
