/**
 * Erold API Client v2
 *
 * HTTP client for the Erold Context Engine API.
 * Handles authentication, retries, and error handling.
 */

import { getConfig } from './config.js';
import { ApiError, isRetryableError } from './errors.js';
import type {
  ContextResponse,
  Event,
  EventType,
  Fragment,
  Intent,
  SearchResult,
} from '../types/index.js';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Sleep helper for retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an authenticated API request with retry logic
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getConfig();

  const url = `${config.apiUrl}${endpoint}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': config.apiKey,
    'User-Agent': '@erold/mcp-server/0.2.0',
    ...(options.headers as Record<string, string>),
  };

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    signal: controller.signal,
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      clearTimeout(timeout);

      // Parse response
      let data: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        throw ApiError.rateLimited(retryAfter ? parseInt(retryAfter) : undefined);
      }

      // Handle errors
      if (!response.ok) {
        const errorData = data as { error?: { message?: string; details?: unknown }; message?: string };
        const message = errorData?.error?.message || errorData?.message || `HTTP ${response.status}`;
        throw new ApiError(message, response.status, errorData?.error?.details);
      }

      // Unwrap response
      const responseData = data as { data?: T };
      return (responseData?.data !== undefined ? responseData.data : data) as T;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      // Don't retry on client errors (4xx) except 429
      if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
        throw error;
      }

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new ApiError('Request timed out', 408);
      }

      // Last attempt, throw error
      if (attempt === MAX_RETRIES) {
        break;
      }

      // Only retry on retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      await sleep(RETRY_DELAY * attempt);
    }
  }

  throw lastError;
}

/**
 * GET request helper
 */
async function get<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  return request<T>(url, { method: 'GET' });
}

/**
 * POST request helper
 */
async function post<T>(endpoint: string, data: unknown = {}): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PATCH request helper
 */
async function patch<T>(endpoint: string, data: unknown = {}): Promise<T> {
  return request<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Get tenant path prefix
 */
function getTenantPath(): string {
  const config = getConfig();
  return `/tenants/${config.tenant}`;
}

// =============================================================================
// API Methods - v2 Context Engine
// =============================================================================

// --- Context ---
export const context = {
  /**
   * Get full context blob for a project (or default project)
   */
  get: (projectId?: string): Promise<ContextResponse> => {
    const path = projectId
      ? `${getTenantPath()}/context/${projectId}`
      : `${getTenantPath()}/context`;
    return get(path);
  },
};

// --- Events (log) ---
export const events = {
  /**
   * Log a new event (will be Smart Strip compressed into fragments)
   */
  create: (data: {
    projectId: string;
    content: string;
    type: EventType;
    intentId?: string;
  }): Promise<Event> =>
    post(`${getTenantPath()}/events`, data),
};

// --- Fragments (search) ---
export const fragments = {
  /**
   * Search compressed fragments
   */
  search: (params: {
    q: string;
    projectId?: string;
    type?: string;
    limit?: number;
  }): Promise<SearchResult> =>
    get(`${getTenantPath()}/fragments/search`, params),
};

// --- Intents ---
export const intents = {
  /**
   * List active intents
   */
  list: (params: {
    projectId?: string;
    status?: string;
  } = {}): Promise<Intent[]> =>
    get(`${getTenantPath()}/intents`, params),

  /**
   * Create a new intent
   */
  create: (data: {
    title: string;
    description?: string;
    projectId?: string;
  }): Promise<Intent> =>
    post(`${getTenantPath()}/intents`, data),

  /**
   * Complete an intent
   */
  complete: (intentId: string, summary?: string): Promise<Intent> =>
    patch(`${getTenantPath()}/intents/${intentId}`, {
      status: 'completed',
      summary,
    }),
};

export default {
  context,
  events,
  fragments,
  intents,
};
