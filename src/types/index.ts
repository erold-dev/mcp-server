/**
 * Erold MCP Server v2 - Type Definitions
 *
 * Context Engine for AI Agents powered by Smart Strip compression.
 */

// =============================================================================
// Fragment Types (Smart Strip compressed knowledge)
// =============================================================================

export type FragmentType =
  | 'observation'
  | 'decision'
  | 'error'
  | 'file_change'
  | 'session_start'
  | 'session_end';

export interface Fragment {
  id: string;
  type: FragmentType;
  content: string;
  projectId?: string;
  intentId?: string;
  relevance?: number;
  createdAt: string;
}

// =============================================================================
// Intent Types (lightweight task tracking)
// =============================================================================

export type IntentStatus = 'active' | 'completed' | 'abandoned';

export interface Intent {
  id: string;
  title: string;
  description?: string;
  status: IntentStatus;
  projectId?: string;
  summary?: string;
  createdAt: string;
  completedAt?: string;
}

// =============================================================================
// Event Types (raw input for Smart Strip compression)
// =============================================================================

export type EventType =
  | 'observation'
  | 'decision'
  | 'error'
  | 'file_change'
  | 'session_start'
  | 'session_end';

export interface Event {
  id: string;
  type: EventType;
  content: string;
  projectId: string;
  intentId?: string;
  createdAt: string;
}

// =============================================================================
// Context Types (unified context blob)
// =============================================================================

export interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  status: string;
}

export interface TechInfo {
  stack?: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    languages?: string[];
    tools?: string[];
    other?: string[];
  };
  commands?: Array<{
    name: string;
    command: string;
    description?: string;
  }>;
  notes?: string;
}

export interface ContextResponse {
  project?: ProjectInfo;
  techInfo?: TechInfo;
  activeIntents?: Intent[];
  recentFragments?: Fragment[];
  recentEvents?: Array<{
    type: string;
    content: string;
    createdAt: string;
  }>;
}

// =============================================================================
// Search Types
// =============================================================================

export interface SearchResult {
  fragments: Fragment[];
  total: number;
  query: string;
}

// =============================================================================
// API Types
// =============================================================================

export interface ApiConfig {
  apiUrl: string;
  apiKey: string;
  tenant: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: unknown;
  };
}
