import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastMCP } from 'fastmcp';
import { registerTechInfoTools } from '../../src/tools/tech-info.js';

vi.mock('../../src/lib/api-client.js', () => ({
  techInfo: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

import { techInfo as mockTechInfo } from '../../src/lib/api-client.js';

type ToolDef = { name: string; execute: (params: Record<string, unknown>) => Promise<string> };
const tools: Record<string, ToolDef> = {};
const mockMcp = {
  addTool: (def: ToolDef) => { tools[def.name] = def; },
} as unknown as FastMCP;

describe('Tech Info Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(tools).forEach((k) => delete tools[k]);
    registerTechInfoTools(mockMcp);
  });

  it('should register all 6 tech info tools', () => {
    expect(Object.keys(tools)).toHaveLength(6);
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        'get_tech_info', 'update_tech_stack', 'set_deployment_info',
        'add_tech_command', 'remove_tech_command', 'set_tech_notes',
      ])
    );
  });

  describe('get_tech_info', () => {
    it('should return all tech info sections', async () => {
      vi.mocked(mockTechInfo.get).mockResolvedValue({
        stack: { frontend: ['React', 'Next.js'], backend: ['Python'] },
        deployment: { provider: 'vercel' },
        commands: [{ name: 'Build', command: 'npm run build' }],
        infrastructure: { cdn: 'Cloudflare' },
        repositories: [{ name: 'main', url: 'https://github.com/org/repo' }],
        notes: 'Some notes',
        updatedAt: '2026-02-17',
      });

      const result = await tools.get_tech_info.execute({ projectId: 'p1' });
      const parsed = JSON.parse(result);

      expect(parsed.stack.frontend).toEqual(['React', 'Next.js']);
      expect(parsed.commands).toHaveLength(1);
      expect(parsed.notes).toBe('Some notes');
    });

    it('should default empty sections', async () => {
      vi.mocked(mockTechInfo.get).mockResolvedValue({});

      const result = await tools.get_tech_info.execute({ projectId: 'p1' });
      const parsed = JSON.parse(result);

      expect(parsed.stack).toEqual({});
      expect(parsed.commands).toEqual([]);
      expect(parsed.notes).toBe('');
    });
  });

  describe('update_tech_stack', () => {
    it('should merge with existing stack', async () => {
      vi.mocked(mockTechInfo.get).mockResolvedValue({
        stack: { frontend: ['React'], backend: ['Python'] },
      });
      vi.mocked(mockTechInfo.update).mockResolvedValue({});

      const result = await tools.update_tech_stack.execute({
        projectId: 'p1', category: 'frontend', items: ['React', 'Next.js', 'Tailwind'],
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(mockTechInfo.update).toHaveBeenCalledWith('p1', {
        stack: {
          frontend: ['React', 'Next.js', 'Tailwind'],
          backend: ['Python'],
        },
      });
    });
  });

  describe('set_deployment_info', () => {
    it('should build deployment config with urls and branches', async () => {
      vi.mocked(mockTechInfo.update).mockResolvedValue({});

      const result = await tools.set_deployment_info.execute({
        projectId: 'p1',
        provider: 'vercel',
        region: 'us-east-1',
        productionUrl: 'https://app.example.com',
        stagingUrl: 'https://staging.example.com',
        productionBranch: 'main',
        stagingBranch: 'develop',
        cicd: 'GitHub Actions',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.deployment.provider).toBe('vercel');
      expect(parsed.deployment.urls.production).toBe('https://app.example.com');
      expect(parsed.deployment.branch.staging).toBe('develop');
    });

    it('should return message when no fields provided', async () => {
      const result = await tools.set_deployment_info.execute({ projectId: 'p1' });
      expect(result).toBe('No deployment info provided. Specify at least one field.');
    });
  });

  describe('add_tech_command', () => {
    it('should append command to existing list', async () => {
      vi.mocked(mockTechInfo.get).mockResolvedValue({
        commands: [{ name: 'Build', command: 'npm run build' }],
      });
      vi.mocked(mockTechInfo.update).mockResolvedValue({});

      const result = await tools.add_tech_command.execute({
        projectId: 'p1', name: 'Test', command: 'npm test', description: 'Run tests',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.totalCommands).toBe(2);
      expect(mockTechInfo.update).toHaveBeenCalledWith('p1', {
        commands: [
          { name: 'Build', command: 'npm run build' },
          { name: 'Test', command: 'npm test', description: 'Run tests' },
        ],
      });
    });
  });

  describe('remove_tech_command', () => {
    it('should remove command by index', async () => {
      vi.mocked(mockTechInfo.get).mockResolvedValue({
        commands: [
          { name: 'Build', command: 'npm run build' },
          { name: 'Test', command: 'npm test' },
        ],
      });
      vi.mocked(mockTechInfo.update).mockResolvedValue({});

      const result = await tools.remove_tech_command.execute({
        projectId: 'p1', index: 0,
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.removedCommand.name).toBe('Build');
      expect(parsed.remainingCommands).toBe(1);
    });

    it('should return error for invalid index', async () => {
      vi.mocked(mockTechInfo.get).mockResolvedValue({
        commands: [{ name: 'Build', command: 'npm run build' }],
      });

      const result = await tools.remove_tech_command.execute({
        projectId: 'p1', index: 5,
      });

      expect(result).toContain('Invalid index');
      expect(mockTechInfo.update).not.toHaveBeenCalled();
    });
  });

  describe('set_tech_notes', () => {
    it('should set notes and return preview', async () => {
      vi.mocked(mockTechInfo.update).mockResolvedValue({});

      const longNotes = 'A'.repeat(200);
      const result = await tools.set_tech_notes.execute({
        projectId: 'p1', notes: longNotes,
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.preview).toHaveLength(103); // 100 + '...'
    });
  });
});
