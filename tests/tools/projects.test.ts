import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastMCP } from 'fastmcp';
import { registerProjectTools } from '../../src/tools/projects.js';

vi.mock('../../src/lib/api-client.js', () => ({
  projects: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    stats: vi.fn(),
    tasks: vi.fn(),
  },
}));

import { projects as mockProjects } from '../../src/lib/api-client.js';

type ToolDef = { name: string; execute: (params: Record<string, unknown>) => Promise<string> };
const tools: Record<string, ToolDef> = {};
const mockMcp = {
  addTool: (def: ToolDef) => { tools[def.name] = def; },
} as unknown as FastMCP;

describe('Project Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(tools).forEach((k) => delete tools[k]);
    registerProjectTools(mockMcp);
  });

  it('should register all 6 project tools', () => {
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        'list_projects', 'get_project', 'create_project',
        'update_project', 'get_project_stats', 'get_project_tasks',
      ])
    );
    expect(Object.keys(tools)).toHaveLength(6);
  });

  describe('list_projects', () => {
    it('should return formatted project list', async () => {
      vi.mocked(mockProjects.list).mockResolvedValue([
        { id: 'p1', name: 'Project A', slug: 'project-a', status: 'active', taskCount: 10, completedTasks: 3, createdAt: '', updatedAt: '' },
      ]);

      const result = await tools.list_projects.execute({});
      const parsed = JSON.parse(result);

      expect(parsed[0].id).toBe('p1');
      expect(parsed[0].name).toBe('Project A');
      expect(parsed[0].taskCount).toBe(10);
    });

    it('should return message when no projects', async () => {
      vi.mocked(mockProjects.list).mockResolvedValue([]);
      const result = await tools.list_projects.execute({});
      expect(result).toBe('No projects found.');
    });
  });

  describe('get_project', () => {
    it('should calculate progress percentage', async () => {
      vi.mocked(mockProjects.get).mockResolvedValue({
        id: 'p1', name: 'Test', status: 'active', taskCount: 10, completedTasks: 7,
        createdAt: '2026-01-01', updatedAt: '2026-02-01',
      });

      const result = await tools.get_project.execute({ projectId: 'p1' });
      const parsed = JSON.parse(result);

      expect(parsed.progress).toBe('70%');
    });

    it('should show 0% when no tasks', async () => {
      vi.mocked(mockProjects.get).mockResolvedValue({
        id: 'p1', name: 'Empty', status: 'planning', taskCount: 0,
        createdAt: '', updatedAt: '',
      });

      const result = await tools.get_project.execute({ projectId: 'p1' });
      const parsed = JSON.parse(result);

      expect(parsed.progress).toBe('0%');
    });
  });

  describe('create_project', () => {
    it('should auto-generate slug from name', async () => {
      vi.mocked(mockProjects.create).mockResolvedValue({
        id: 'p-new', name: 'My New Project', slug: 'my-new-project', status: 'planning',
        createdAt: '', updatedAt: '',
      });

      const result = await tools.create_project.execute({ name: 'My New Project' });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(mockProjects.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'my-new-project' })
      );
    });

    it('should use provided slug', async () => {
      vi.mocked(mockProjects.create).mockResolvedValue({
        id: 'p-new', name: 'Project', slug: 'custom-slug', status: 'planning',
        createdAt: '', updatedAt: '',
      });

      await tools.create_project.execute({ name: 'Project', slug: 'custom-slug' });

      expect(mockProjects.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'custom-slug' })
      );
    });
  });

  describe('update_project', () => {
    it('should update with provided fields', async () => {
      vi.mocked(mockProjects.update).mockResolvedValue({
        id: 'p1', name: 'Renamed', status: 'active', createdAt: '', updatedAt: '',
      });

      const result = await tools.update_project.execute({
        projectId: 'p1', name: 'Renamed', status: 'active',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
    });

    it('should return message when no updates', async () => {
      const result = await tools.update_project.execute({ projectId: 'p1' });
      expect(result).toBe('No updates provided. Specify at least one field to update.');
    });
  });

  describe('get_project_stats', () => {
    it('should return stats with progress', async () => {
      vi.mocked(mockProjects.get).mockResolvedValue({
        id: 'p1', name: 'Test', status: 'active', createdAt: '', updatedAt: '',
      });
      vi.mocked(mockProjects.stats).mockResolvedValue({
        totalTasks: 20, completedTasks: 15, openTasks: 3, blockedTasks: 2,
        byStatus: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        totalTimeLogged: 40,
      });

      const result = await tools.get_project_stats.execute({ projectId: 'p1' });
      const parsed = JSON.parse(result);

      expect(parsed.stats.progress).toBe('75%');
      expect(parsed.stats.totalTimeLogged).toBe('40h');
    });
  });

  describe('get_project_tasks', () => {
    it('should return tasks with count', async () => {
      vi.mocked(mockProjects.tasks).mockResolvedValue([
        { id: 't1', title: 'Task 1', status: 'todo', priority: 'high', projectId: 'p1', createdAt: '', updatedAt: '' },
      ]);

      const result = await tools.get_project_tasks.execute({ projectId: 'p1', limit: 50 });
      const parsed = JSON.parse(result);

      expect(parsed.count).toBe(1);
      expect(parsed.tasks[0].title).toBe('Task 1');
    });

    it('should return message when no tasks', async () => {
      vi.mocked(mockProjects.tasks).mockResolvedValue([]);
      const result = await tools.get_project_tasks.execute({ projectId: 'p1', limit: 50 });
      expect(result).toBe('No tasks found in this project.');
    });
  });
});
