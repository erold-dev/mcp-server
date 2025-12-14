/**
 * Erold API Client
 *
 * HTTP client for communicating with the Erold REST API.
 * Handles authentication, retries, and error handling.
 */

import { getConfig } from './config.js';
import { ApiError, isRetryableError } from './errors.js';
import type {
  Task,
  TaskComment,
  Project,
  ProjectStats,
  KnowledgeArticle,
  AIContext,
  Dashboard,
  TenantStats,
  WorkloadData,
  Member,
  Activity,
  Tenant,
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
    'User-Agent': '@erold/mcp-server/0.1.0',
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
 * DELETE request helper
 */
async function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' });
}

/**
 * Get tenant path prefix
 */
function getTenantPath(): string {
  const config = getConfig();
  return `/tenants/${config.tenant}`;
}

// =============================================================================
// API Methods
// =============================================================================

// --- Tasks ---
export const tasks = {
  list: (params: {
    projectId?: string;
    status?: string;
    assignee?: string;
    priority?: string;
    limit?: number;
  } = {}): Promise<Task[]> => get(`${getTenantPath()}/tasks`, params),

  search: (query: string, params: { limit?: number } = {}): Promise<Task[]> =>
    get(`${getTenantPath()}/tasks/search`, { q: query, ...params }),

  mine: (params: { status?: string; limit?: number } = {}): Promise<Task[]> =>
    get(`${getTenantPath()}/tasks/mine`, params),

  blocked: (): Promise<Task[]> =>
    get(`${getTenantPath()}/tasks/blocked`),

  get: (id: string): Promise<Task> =>
    get(`${getTenantPath()}/tasks/${id}`),

  create: (projectId: string, data: {
    title: string;
    description?: string;
    priority?: string;
    assignedTo?: string;
  }): Promise<Task> =>
    post(`${getTenantPath()}/projects/${projectId}/tasks`, data),

  update: (id: string, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
  }): Promise<Task> =>
    patch(`${getTenantPath()}/tasks/${id}`, data),

  delete: (id: string): Promise<void> =>
    del(`${getTenantPath()}/tasks/${id}`),

  // Actions
  start: (id: string): Promise<Task> =>
    post(`${getTenantPath()}/tasks/${id}/start`),

  complete: (id: string, summary?: string): Promise<Task> =>
    post(`${getTenantPath()}/tasks/${id}/complete`, { summary }),

  block: (id: string, reason: string): Promise<Task> =>
    post(`${getTenantPath()}/tasks/${id}/block`, { reason }),

  logTime: (id: string, hours: number, notes?: string): Promise<void> =>
    post(`${getTenantPath()}/tasks/${id}/log`, { hours, notes }),

  // Comments
  comments: (id: string): Promise<TaskComment[]> =>
    get(`${getTenantPath()}/tasks/${id}/comments`),

  addComment: (id: string, content: string): Promise<TaskComment> =>
    post(`${getTenantPath()}/tasks/${id}/comments`, { content }),
};

// --- Projects ---
export const projects = {
  list: (params: { status?: string } = {}): Promise<Project[]> =>
    get(`${getTenantPath()}/projects`, params),

  get: (id: string): Promise<Project> =>
    get(`${getTenantPath()}/projects/${id}`),

  create: (data: {
    name: string;
    description?: string;
    slug?: string;
  }): Promise<Project> =>
    post(`${getTenantPath()}/projects`, { ...data, status: 'planning' }),

  update: (id: string, data: {
    name?: string;
    description?: string;
    status?: string;
  }): Promise<Project> =>
    patch(`${getTenantPath()}/projects/${id}`, data),

  delete: (id: string): Promise<void> =>
    del(`${getTenantPath()}/projects/${id}`),

  stats: (id: string): Promise<ProjectStats> =>
    get(`${getTenantPath()}/projects/${id}/stats`),

  tasks: (id: string, params: { status?: string; limit?: number } = {}): Promise<Task[]> =>
    get(`${getTenantPath()}/projects/${id}/tasks`, params),
};

// --- Knowledge ---
export const knowledge = {
  list: (params: { category?: string; projectId?: string; scope?: string; limit?: number } = {}): Promise<KnowledgeArticle[]> =>
    get(`${getTenantPath()}/knowledge`, params),

  get: (id: string): Promise<KnowledgeArticle> =>
    get(`${getTenantPath()}/knowledge/${id}`),

  getByCategory: (category: string): Promise<KnowledgeArticle[]> =>
    get(`${getTenantPath()}/knowledge/category/${category}`),

  create: (data: {
    title: string;
    category: string;
    content: string;
    projectId?: string | null;
  }): Promise<KnowledgeArticle> =>
    post(`${getTenantPath()}/knowledge`, data),

  update: (id: string, data: {
    title?: string;
    category?: string;
    content?: string;
  }): Promise<KnowledgeArticle> =>
    patch(`${getTenantPath()}/knowledge/${id}`, data),

  delete: (id: string): Promise<void> =>
    del(`${getTenantPath()}/knowledge/${id}`),

  search: (query: string): Promise<KnowledgeArticle[]> =>
    get(`${getTenantPath()}/knowledge`, { search: query }),
};

// --- Vault (Secrets) ---
export interface VaultEntry {
  id: string;
  key: string;
  value?: string;
  category: string;
  description?: string;
  environment: string;
  scope?: string;
  isOwner?: boolean;
  canRead?: boolean;
  canEdit?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export const vault = {
  list: (projectId: string): Promise<VaultEntry[]> =>
    get(`${getTenantPath()}/projects/${projectId}/vault`),

  get: (projectId: string, entryId: string): Promise<VaultEntry> =>
    get(`${getTenantPath()}/projects/${projectId}/vault/${entryId}`),

  create: (projectId: string, data: {
    key: string;
    value: string;
    scope?: string;
    category?: string;
    description?: string;
    environment?: string;
  }): Promise<VaultEntry> =>
    post(`${getTenantPath()}/projects/${projectId}/vault`, data),

  update: (projectId: string, entryId: string, data: {
    value?: string;
    category?: string;
    description?: string;
    environment?: string;
  }): Promise<VaultEntry> =>
    patch(`${getTenantPath()}/projects/${projectId}/vault/${entryId}`, data),

  delete: (projectId: string, entryId: string): Promise<void> =>
    del(`${getTenantPath()}/projects/${projectId}/vault/${entryId}`),
};

// --- Tech Info ---
export interface TechInfo {
  stack?: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    languages?: string[];
    tools?: string[];
    other?: string[];
  };
  deployment?: {
    provider?: string;
    region?: string;
    urls?: {
      production?: string;
      staging?: string;
      development?: string;
    };
    cicd?: string;
    branch?: {
      production?: string;
      staging?: string;
    };
  };
  commands?: Array<{
    name: string;
    command: string;
    description?: string;
  }>;
  infrastructure?: {
    domains?: string[];
    cdn?: string;
    dns?: string;
    ssl?: string;
    monitoring?: string;
    logging?: string;
    errorTracking?: string;
  };
  repositories?: Array<{
    name: string;
    url: string;
    branch?: string;
    type?: string;
  }>;
  environments?: Record<string, { description?: string; url?: string }>;
  notes?: string;
  custom?: Record<string, unknown>;
  updatedAt?: string;
  updatedBy?: string;
}

export const techInfo = {
  get: (projectId: string): Promise<TechInfo> =>
    get(`${getTenantPath()}/projects/${projectId}/tech-info`),

  update: (projectId: string, data: Partial<TechInfo>): Promise<TechInfo> =>
    patch(`${getTenantPath()}/projects/${projectId}/tech-info`, data),
};

// --- Context ---
export const context = {
  get: (): Promise<AIContext> =>
    get(`${getTenantPath()}/context`),

  dashboard: (): Promise<Dashboard> =>
    get(`${getTenantPath()}/dashboard`),

  stats: (): Promise<TenantStats> =>
    get(`${getTenantPath()}/stats`),

  workload: (): Promise<WorkloadData> =>
    get(`${getTenantPath()}/workload`),
};

// --- Members ---
export const members = {
  list: (): Promise<Member[]> =>
    get(`${getTenantPath()}/members`),

  get: (uid: string): Promise<Member> =>
    get(`${getTenantPath()}/members/${uid}`),
};

// --- Activity ---
export const activity = {
  list: (params: { limit?: number; entityType?: string; entityId?: string } = {}): Promise<Activity[]> =>
    get(`${getTenantPath()}/activity`, params),

  forTask: (taskId: string): Promise<Activity[]> =>
    get(`${getTenantPath()}/tasks/${taskId}/activity`),
};

// --- Tenants ---
export const tenants = {
  list: (): Promise<Tenant[]> =>
    get('/tenants'),

  get: (id: string): Promise<Tenant> =>
    get(`/tenants/${id}`),
};

// --- User ---
export const user = {
  me: (): Promise<{ id: string; name?: string; email: string }> =>
    get('/me'),
};

export default {
  tasks,
  projects,
  knowledge,
  vault,
  techInfo,
  context,
  members,
  activity,
  tenants,
  user,
};
