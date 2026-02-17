import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastMCP } from 'fastmcp';
import { registerTaskTools } from '../../src/tools/tasks.js';

// Mock the api-client
vi.mock('../../src/lib/api-client.js', () => ({
  tasks: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    block: vi.fn(),
    search: vi.fn(),
    comments: vi.fn(),
    addComment: vi.fn(),
    blocked: vi.fn(),
  },
}));

import { tasks as mockTasks } from '../../src/lib/api-client.js';

// Capture tool registrations
type ToolDef = { name: string; execute: (params: Record<string, unknown>) => Promise<string> };
const tools: Record<string, ToolDef> = {};
const mockMcp = {
  addTool: (def: ToolDef) => {
    tools[def.name] = def;
  },
} as unknown as FastMCP;

describe('Task Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(tools).forEach((k) => delete tools[k]);
    registerTaskTools(mockMcp);
  });

  it('should register all 11 task tools', () => {
    const toolNames = Object.keys(tools);
    expect(toolNames).toContain('list_tasks');
    expect(toolNames).toContain('get_task');
    expect(toolNames).toContain('create_task');
    expect(toolNames).toContain('update_task');
    expect(toolNames).toContain('start_task');
    expect(toolNames).toContain('complete_task');
    expect(toolNames).toContain('block_task');
    expect(toolNames).toContain('search_tasks');
    expect(toolNames).toContain('add_task_comment');
    expect(toolNames).toContain('get_task_comments');
    expect(toolNames).toContain('get_blocked_tasks');
    expect(toolNames).toHaveLength(11);
  });

  // ===========================================================================
  // list_tasks
  // ===========================================================================

  describe('list_tasks', () => {
    it('should return formatted task list', async () => {
      vi.mocked(mockTasks.list).mockResolvedValue([
        {
          id: 't1', title: 'Fix bug', status: 'todo', priority: 'high',
          projectName: 'MyProject', assigneeName: 'Alice', dueDate: '2026-03-01',
          projectId: 'p1', createdAt: '', updatedAt: '',
        },
      ]);

      const result = await tools.list_tasks.execute({ limit: 20 });
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual({
        id: 't1', title: 'Fix bug', status: 'todo', priority: 'high',
        project: 'MyProject', assignee: 'Alice', dueDate: '2026-03-01',
      });
    });

    it('should return message when no tasks found', async () => {
      vi.mocked(mockTasks.list).mockResolvedValue([]);

      const result = await tools.list_tasks.execute({});

      expect(result).toBe('No tasks found matching the criteria.');
    });

    it('should show "Unassigned" when no assignee', async () => {
      vi.mocked(mockTasks.list).mockResolvedValue([
        {
          id: 't1', title: 'Task', status: 'todo', priority: 'low',
          projectId: 'p1', createdAt: '', updatedAt: '',
        },
      ]);

      const result = await tools.list_tasks.execute({});
      const parsed = JSON.parse(result);

      expect(parsed[0].assignee).toBe('Unassigned');
    });

    it('should return error message on failure', async () => {
      vi.mocked(mockTasks.list).mockRejectedValue(new Error('Network error'));

      const result = await tools.list_tasks.execute({});

      expect(result).toContain('Error listing tasks:');
    });
  });

  // ===========================================================================
  // get_task
  // ===========================================================================

  describe('get_task', () => {
    it('should return detailed task info', async () => {
      vi.mocked(mockTasks.get).mockResolvedValue({
        id: 't1', title: 'Fix auth', description: 'JWT broken', status: 'in-progress',
        priority: 'urgent', projectId: 'p1', projectName: 'Backend',
        assigneeName: 'Bob', dueDate: '2026-03-15', tags: ['security'],
        progress: 50, timeEstimate: 8, timeLogged: 4,
        createdAt: '2026-01-01', updatedAt: '2026-02-15',
      });

      const result = await tools.get_task.execute({ taskId: 't1' });
      const parsed = JSON.parse(result);

      expect(parsed.id).toBe('t1');
      expect(parsed.title).toBe('Fix auth');
      expect(parsed.status).toBe('in-progress');
      expect(parsed.timeEstimate).toBe('8h');
      expect(parsed.timeLogged).toBe('4h');
      expect(parsed.progress).toBe(50);
    });

    it('should handle missing optional fields', async () => {
      vi.mocked(mockTasks.get).mockResolvedValue({
        id: 't1', title: 'Task', status: 'todo', priority: 'low',
        projectId: 'p1', createdAt: '', updatedAt: '',
      });

      const result = await tools.get_task.execute({ taskId: 't1' });
      const parsed = JSON.parse(result);

      expect(parsed.description).toBe('No description');
      expect(parsed.assignee).toBe('Unassigned');
      expect(parsed.dueDate).toBe('No due date');
      expect(parsed.timeEstimate).toBe('Not estimated');
      expect(parsed.timeLogged).toBe('No time logged');
    });
  });

  // ===========================================================================
  // create_task
  // ===========================================================================

  describe('create_task', () => {
    it('should create task and return success', async () => {
      vi.mocked(mockTasks.create).mockResolvedValue({
        id: 'new-1', title: 'New task', status: 'todo', priority: 'medium',
        projectId: 'p1', createdAt: '', updatedAt: '',
      });

      const result = await tools.create_task.execute({
        projectId: 'p1', title: 'New task', priority: 'medium',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.task.id).toBe('new-1');
      expect(mockTasks.create).toHaveBeenCalledWith('p1', {
        title: 'New task', priority: 'medium',
        description: undefined, assignedTo: undefined,
      });
    });
  });

  // ===========================================================================
  // update_task
  // ===========================================================================

  describe('update_task', () => {
    it('should update task with provided fields', async () => {
      vi.mocked(mockTasks.update).mockResolvedValue({
        id: 't1', title: 'Updated', status: 'in-progress', priority: 'high',
        projectId: 'p1', createdAt: '', updatedAt: '',
      });

      const result = await tools.update_task.execute({
        taskId: 't1', title: 'Updated', status: 'in-progress',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
    });

    it('should return message when no updates provided', async () => {
      const result = await tools.update_task.execute({ taskId: 't1' });

      expect(result).toBe('No updates provided. Specify at least one field to update.');
      expect(mockTasks.update).not.toHaveBeenCalled();
    });

    it('should map assignee to assignedTo', async () => {
      vi.mocked(mockTasks.update).mockResolvedValue({
        id: 't1', title: 'T', status: 'todo', priority: 'low',
        projectId: 'p1', createdAt: '', updatedAt: '',
      });

      await tools.update_task.execute({ taskId: 't1', assignee: 'user-123' });

      expect(mockTasks.update).toHaveBeenCalledWith('t1', { assignedTo: 'user-123' });
    });
  });

  // ===========================================================================
  // start_task / complete_task / block_task
  // ===========================================================================

  describe('start_task', () => {
    it('should start task and return success', async () => {
      vi.mocked(mockTasks.start).mockResolvedValue({
        id: 't1', title: 'My Task', status: 'in-progress', priority: 'medium',
        projectId: 'p1', createdAt: '', updatedAt: '',
      });

      const result = await tools.start_task.execute({ taskId: 't1' });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.message).toContain('My Task');
    });
  });

  describe('complete_task', () => {
    it('should complete task with summary', async () => {
      vi.mocked(mockTasks.complete).mockResolvedValue({
        id: 't1', title: 'Done Task', status: 'done', priority: 'low',
        projectId: 'p1', createdAt: '', updatedAt: '',
      });

      const result = await tools.complete_task.execute({ taskId: 't1', summary: 'All done' });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(mockTasks.complete).toHaveBeenCalledWith('t1', 'All done');
    });
  });

  describe('block_task', () => {
    it('should block task with reason', async () => {
      vi.mocked(mockTasks.block).mockResolvedValue({
        id: 't1', title: 'Blocked Task', status: 'blocked', priority: 'high',
        projectId: 'p1', createdAt: '', updatedAt: '',
      });

      const result = await tools.block_task.execute({
        taskId: 't1', reason: 'Waiting for API access',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.reason).toBe('Waiting for API access');
    });
  });

  // ===========================================================================
  // search_tasks
  // ===========================================================================

  describe('search_tasks', () => {
    it('should return search results', async () => {
      vi.mocked(mockTasks.search).mockResolvedValue([
        {
          id: 't1', title: 'Auth fix', status: 'todo', priority: 'high',
          projectId: 'p1', projectName: 'Backend', createdAt: '', updatedAt: '',
        },
      ]);

      const result = await tools.search_tasks.execute({ query: 'auth', limit: 20 });
      const parsed = JSON.parse(result);

      expect(parsed.query).toBe('auth');
      expect(parsed.count).toBe(1);
      expect(parsed.results[0].title).toBe('Auth fix');
    });

    it('should return message when no results', async () => {
      vi.mocked(mockTasks.search).mockResolvedValue([]);

      const result = await tools.search_tasks.execute({ query: 'nonexistent', limit: 20 });

      expect(result).toContain('No tasks found matching "nonexistent"');
    });
  });

  // ===========================================================================
  // Comments
  // ===========================================================================

  describe('add_task_comment', () => {
    it('should add comment and return success', async () => {
      vi.mocked(mockTasks.addComment).mockResolvedValue({
        id: 'c1', taskId: 't1', content: 'Progress update',
        authorId: 'u1', createdAt: '2026-02-17',
      });

      const result = await tools.add_task_comment.execute({
        taskId: 't1', content: 'Progress update',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.comment.content).toBe('Progress update');
    });
  });

  describe('get_task_comments', () => {
    it('should return formatted comments', async () => {
      vi.mocked(mockTasks.comments).mockResolvedValue([
        { id: 'c1', taskId: 't1', content: 'First', authorId: 'u1', authorName: 'Alice', createdAt: '2026-02-15' },
        { id: 'c2', taskId: 't1', content: 'Second', authorId: 'u2', createdAt: '2026-02-16' },
      ]);

      const result = await tools.get_task_comments.execute({ taskId: 't1' });
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].author).toBe('Alice');
      expect(parsed[1].author).toBe('u2'); // Falls back to authorId
    });

    it('should return message when no comments', async () => {
      vi.mocked(mockTasks.comments).mockResolvedValue([]);

      const result = await tools.get_task_comments.execute({ taskId: 't1' });

      expect(result).toBe('No comments on this task.');
    });
  });

  // ===========================================================================
  // get_blocked_tasks
  // ===========================================================================

  describe('get_blocked_tasks', () => {
    it('should return blocked tasks with reasons', async () => {
      vi.mocked(mockTasks.blocked).mockResolvedValue([
        {
          id: 't1', title: 'Blocked', status: 'blocked', priority: 'high',
          projectId: 'p1', projectName: 'Backend', blockedReason: 'API down',
          createdAt: '', updatedAt: '',
        },
      ]);

      const result = await tools.get_blocked_tasks.execute({});
      const parsed = JSON.parse(result);

      expect(parsed.count).toBe(1);
      expect(parsed.blockedTasks[0].blockedReason).toBe('API down');
    });

    it('should return all-clear message when no blocked tasks', async () => {
      vi.mocked(mockTasks.blocked).mockResolvedValue([]);

      const result = await tools.get_blocked_tasks.execute({});

      expect(result).toBe('No blocked tasks. All clear!');
    });
  });
});
