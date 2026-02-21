/**
 * Erold MCP Server - Type Definitions
 */

// =============================================================================
// Task Types
// =============================================================================

export type TaskStatus =
  | 'backlog'
  | 'analysis'
  | 'todo'
  | 'in-progress' | 'in_progress'
  | 'in-review' | 'in_review'
  | 'bug'
  | 'blocked'
  | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  projectName?: string;
  assignedTo?: string;
  assigneeName?: string;
  dueDate?: string;
  tags?: string[];
  progress?: number;
  timeEstimate?: number;
  timeLogged?: number;
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  content: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
}

export interface TimeLog {
  id: string;
  taskId: string;
  hours: number;
  notes?: string;
  userId: string;
  createdAt: string;
}

// =============================================================================
// Project Types
// =============================================================================

export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'in-progress' | 'inProgress'
  | 'on_hold' | 'onHold'
  | 'completed'
  | 'cancelled'
  | 'archived';

export interface Project {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  status: ProjectStatus;
  taskCount?: number;
  completedTasks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  blockedTasks: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  totalTimeLogged?: number;
}

// =============================================================================
// Knowledge Types
// =============================================================================

export type KnowledgeCategory =
  | 'architecture'
  | 'api'
  | 'deployment'
  | 'testing'
  | 'security'
  | 'performance'
  | 'workflow'
  | 'conventions'
  | 'troubleshooting'
  | 'vision'
  | 'spec'
  | 'research'
  | 'decision'
  | 'design'
  | 'other';

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  tags?: string[];
  projectId?: string | null; // null = global, string = project-specific
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Context Types
// =============================================================================

export interface AIContext {
  activeProject?: Project;
  currentTasks?: Task[];
  blockers?: Task[];
  recentActivity?: Activity[];
  relevantKnowledge?: KnowledgeArticle[];
}

export interface Dashboard {
  projectCount: number;
  taskCount: number;
  openTasks: number;
  blockedTasks: number;
  myTasks?: Task[];
  upcomingDue?: Task[];
  recentCompleted?: Task[];
}

export interface TenantStats {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  blockedTasks: number;
  totalProjects: number;
  activeProjects: number;
  byStatus?: Record<TaskStatus, number>;
  byPriority?: Record<TaskPriority, number>;
  totalTimeLogged?: number;
  timeThisWeek?: number;
}

export interface WorkloadMember {
  id: string;
  name: string;
  assignedTasks: number;
  inProgress: number;
  completed: number;
  utilization: number;
}

export interface WorkloadData {
  members: WorkloadMember[];
  summary?: {
    totalTasks: number;
    unassigned: number;
    averageLoad: number;
  };
}

// =============================================================================
// Team Types
// =============================================================================

export type MemberRole = 'owner' | 'admin' | 'member' | 'guest';

export interface Member {
  id: string;
  userId: string;
  name?: string;
  email: string;
  role: MemberRole;
  avatarUrl?: string;
  joinedAt: string;
}

// =============================================================================
// Activity Types
// =============================================================================

export interface Activity {
  id: string;
  type: string;
  description: string;
  entityType: 'task' | 'project' | 'knowledge' | 'member';
  entityId: string;
  userId: string;
  userName?: string;
  createdAt: string;
}

// =============================================================================
// Tenant Types
// =============================================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan?: string;
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

// =============================================================================
// Auth Types
// =============================================================================

export interface TokenResponse {
  token: string;
  expiresIn: number;
  tokenType: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  permissions: string[];
}
