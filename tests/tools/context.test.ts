import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastMCP } from 'fastmcp';
import { registerContextTools } from '../../src/tools/context.js';

vi.mock('../../src/lib/api-client.js', () => ({
  context: {
    get: vi.fn(),
    dashboard: vi.fn(),
    stats: vi.fn(),
    workload: vi.fn(),
  },
  members: {
    list: vi.fn(),
  },
}));

import { context as mockContext, members as mockMembers } from '../../src/lib/api-client.js';

type ToolDef = { name: string; execute: (params: Record<string, unknown>) => Promise<string> };
const tools: Record<string, ToolDef> = {};
const mockMcp = {
  addTool: (def: ToolDef) => { tools[def.name] = def; },
} as unknown as FastMCP;

describe('Context Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(tools).forEach((k) => delete tools[k]);
    registerContextTools(mockMcp);
  });

  it('should register all 5 context tools', () => {
    expect(Object.keys(tools)).toHaveLength(5);
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        'get_context', 'get_dashboard', 'get_stats', 'get_workload', 'list_members',
      ])
    );
  });

  describe('get_context', () => {
    it('should return full context with all sections', async () => {
      vi.mocked(mockContext.get).mockResolvedValue({
        activeProject: { id: 'p1', name: 'Main', status: 'active', description: 'Main project', createdAt: '', updatedAt: '' },
        currentTasks: [
          { id: 't1', title: 'Task 1', status: 'in-progress', priority: 'high', assigneeName: 'Alice', projectId: 'p1', createdAt: '', updatedAt: '' },
        ],
        blockers: [
          { id: 't2', title: 'Blocked', status: 'blocked', priority: 'high', blockedReason: 'API down', projectId: 'p1', createdAt: '', updatedAt: '' },
        ],
        recentActivity: [
          { id: 'a1', type: 'task_created', description: 'Created task', entityType: 'task' as const, entityId: 't1', userId: 'u1', createdAt: '2026-02-17' },
        ],
        relevantKnowledge: [
          { id: 'k1', title: 'Auth Guide', category: 'security' as const, content: 'Use JWT', createdAt: '', updatedAt: '' },
        ],
      });

      const result = await tools.get_context.execute({});
      const parsed = JSON.parse(result);

      expect(parsed.activeProject.name).toBe('Main');
      expect(parsed.currentTasks).toHaveLength(1);
      expect(parsed.blockers).toHaveLength(1);
      expect(parsed.blockers[0].reason).toBe('API down');
      expect(parsed.recentActivity).toHaveLength(1);
      expect(parsed.relevantKnowledge).toHaveLength(1);
    });

    it('should return empty message when no context', async () => {
      vi.mocked(mockContext.get).mockResolvedValue({});

      const result = await tools.get_context.execute({});

      expect(result).toContain('No context available');
    });

    it('should omit empty sections', async () => {
      vi.mocked(mockContext.get).mockResolvedValue({
        activeProject: { id: 'p1', name: 'Only Project', status: 'active', createdAt: '', updatedAt: '' },
        currentTasks: [],
        blockers: [],
      });

      const result = await tools.get_context.execute({});
      const parsed = JSON.parse(result);

      expect(parsed.activeProject).toBeDefined();
      expect(parsed.currentTasks).toBeUndefined();
      expect(parsed.blockers).toBeUndefined();
    });
  });

  describe('get_dashboard', () => {
    it('should return dashboard with overview', async () => {
      vi.mocked(mockContext.dashboard).mockResolvedValue({
        projectCount: 5, taskCount: 25, openTasks: 10, blockedTasks: 2,
        myTasks: [{ id: 't1', title: 'My task', status: 'todo', priority: 'high', projectId: 'p1', createdAt: '', updatedAt: '' }],
        upcomingDue: [{ id: 't2', title: 'Due soon', status: 'todo', priority: 'medium', dueDate: '2026-02-20', projectId: 'p1', createdAt: '', updatedAt: '' }],
        recentCompleted: [{ id: 't3', title: 'Done', status: 'done', priority: 'low', projectId: 'p1', createdAt: '', updatedAt: '' }],
      });

      const result = await tools.get_dashboard.execute({});
      const parsed = JSON.parse(result);

      expect(parsed.overview.totalProjects).toBe(5);
      expect(parsed.overview.totalTasks).toBe(25);
      expect(parsed.myTasks).toHaveLength(1);
      expect(parsed.upcomingDue).toHaveLength(1);
      expect(parsed.recentCompleted).toHaveLength(1);
    });
  });

  describe('get_stats', () => {
    it('should return formatted stats', async () => {
      vi.mocked(mockContext.stats).mockResolvedValue({
        totalTasks: 50, completedTasks: 30, openTasks: 15, blockedTasks: 5,
        totalProjects: 3, activeProjects: 2,
        totalTimeLogged: 120, timeThisWeek: 20,
      });

      const result = await tools.get_stats.execute({});
      const parsed = JSON.parse(result);

      expect(parsed.tasks.total).toBe(50);
      expect(parsed.projects.active).toBe(2);
      expect(parsed.timeTracking.totalLogged).toBe('120h');
      expect(parsed.timeTracking.thisWeek).toBe('20h');
    });
  });

  describe('get_workload', () => {
    it('should return workload data', async () => {
      vi.mocked(mockContext.workload).mockResolvedValue({
        members: [
          { id: 'u1', name: 'Alice', assignedTasks: 5, inProgress: 2, completed: 10, utilization: 75 },
        ],
        summary: { totalTasks: 20, unassigned: 5, averageLoad: 60 },
      });

      const result = await tools.get_workload.execute({});
      const parsed = JSON.parse(result);

      expect(parsed.members[0].utilization).toBe('75%');
      expect(parsed.summary.averageLoad).toBe('60%');
    });

    it('should return message when no workload data', async () => {
      vi.mocked(mockContext.workload).mockResolvedValue({ members: [] });
      const result = await tools.get_workload.execute({});
      expect(result).toBe('No workload data available.');
    });
  });

  describe('list_members', () => {
    it('should return formatted member list', async () => {
      vi.mocked(mockMembers.list).mockResolvedValue([
        { id: 'm1', userId: 'u1', name: 'Alice', email: 'alice@test.com', role: 'admin', joinedAt: '2026-01-01' },
        { id: 'm2', userId: 'u2', email: 'bob@test.com', role: 'member', joinedAt: '2026-02-01' },
      ]);

      const result = await tools.list_members.execute({});
      const parsed = JSON.parse(result);

      expect(parsed[0].name).toBe('Alice');
      expect(parsed[1].name).toBe('bob@test.com'); // Falls back to email
    });

    it('should return message when no members', async () => {
      vi.mocked(mockMembers.list).mockResolvedValue([]);
      const result = await tools.list_members.execute({});
      expect(result).toBe('No team members found.');
    });
  });
});
