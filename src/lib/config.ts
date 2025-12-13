/**
 * Configuration Management
 *
 * Handles environment variables and configuration for the MCP server.
 */

import type { ApiConfig } from '../types/index.js';

const DEFAULT_API_URL = 'https://api.erold.dev/api/v1';

/**
 * Get configuration from environment variables
 */
export function getConfig(): ApiConfig {
  const apiKey = process.env.EROLD_API_KEY;
  const tenant = process.env.EROLD_TENANT;
  const apiUrl = process.env.EROLD_API_URL || DEFAULT_API_URL;

  if (!apiKey) {
    throw new Error(
      'EROLD_API_KEY environment variable is required.\n' +
        'Get your API key from: Settings > API Keys in Erold'
    );
  }

  if (!tenant) {
    throw new Error(
      'EROLD_TENANT environment variable is required.\n' +
        'Set this to your tenant ID or slug.'
    );
  }

  return {
    apiUrl,
    apiKey,
    tenant,
  };
}

/**
 * Validate configuration on startup
 */
export function validateConfig(): void {
  try {
    getConfig();
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Configuration Error: ${error.message}`);
    }
    process.exit(1);
  }
}

export default { getConfig, validateConfig };
