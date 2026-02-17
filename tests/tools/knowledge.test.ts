import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastMCP } from 'fastmcp';
import { registerKnowledgeTools } from '../../src/tools/knowledge.js';

vi.mock('../../src/lib/api-client.js', () => ({
  knowledge: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    search: vi.fn(),
  },
}));

import { knowledge as mockKnowledge } from '../../src/lib/api-client.js';

type ToolDef = { name: string; execute: (params: Record<string, unknown>) => Promise<string> };
const tools: Record<string, ToolDef> = {};
const mockMcp = {
  addTool: (def: ToolDef) => { tools[def.name] = def; },
} as unknown as FastMCP;

describe('Knowledge Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(tools).forEach((k) => delete tools[k]);
    registerKnowledgeTools(mockMcp);
  });

  it('should register all 5 knowledge tools', () => {
    expect(Object.keys(tools)).toHaveLength(5);
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        'search_knowledge', 'get_knowledge', 'list_knowledge',
        'create_knowledge', 'update_knowledge',
      ])
    );
  });

  describe('search_knowledge', () => {
    it('should return search results with previews', async () => {
      vi.mocked(mockKnowledge.search).mockResolvedValue([
        {
          id: 'k1', title: 'Auth Guide', category: 'security' as const,
          content: 'A'.repeat(200), updatedAt: '2026-02-17',
          createdAt: '',
        },
      ]);

      const result = await tools.search_knowledge.execute({ query: 'auth' });
      const parsed = JSON.parse(result);

      expect(parsed.query).toBe('auth');
      expect(parsed.count).toBe(1);
      expect(parsed.articles[0].preview).toHaveLength(153); // 150 chars + '...'
    });

    it('should not truncate short content', async () => {
      vi.mocked(mockKnowledge.search).mockResolvedValue([
        {
          id: 'k1', title: 'Short', category: 'other' as const,
          content: 'Short content', createdAt: '', updatedAt: '',
        },
      ]);

      const result = await tools.search_knowledge.execute({ query: 'short' });
      const parsed = JSON.parse(result);

      expect(parsed.articles[0].preview).toBe('Short content');
    });

    it('should return message when no results', async () => {
      vi.mocked(mockKnowledge.search).mockResolvedValue([]);
      const result = await tools.search_knowledge.execute({ query: 'nonexistent' });
      expect(result).toContain('No knowledge articles found matching "nonexistent"');
    });
  });

  describe('get_knowledge', () => {
    it('should return full article with scope', async () => {
      vi.mocked(mockKnowledge.get).mockResolvedValue({
        id: 'k1', title: 'Architecture', category: 'architecture' as const,
        content: '# Architecture\n...', tags: ['design'],
        projectId: 'p1', createdAt: '2026-01-01', updatedAt: '2026-02-01',
      });

      const result = await tools.get_knowledge.execute({ articleId: 'k1' });
      const parsed = JSON.parse(result);

      expect(parsed.scope).toBe('project');
      expect(parsed.tags).toEqual(['design']);
    });

    it('should show global scope when no projectId', async () => {
      vi.mocked(mockKnowledge.get).mockResolvedValue({
        id: 'k1', title: 'Global Guide', category: 'conventions' as const,
        content: 'Content', createdAt: '', updatedAt: '',
      });

      const result = await tools.get_knowledge.execute({ articleId: 'k1' });
      const parsed = JSON.parse(result);

      expect(parsed.scope).toBe('global');
      expect(parsed.projectId).toBeNull();
    });
  });

  describe('list_knowledge', () => {
    it('should return articles with scope indicators', async () => {
      vi.mocked(mockKnowledge.list).mockResolvedValue([
        { id: 'k1', title: 'Global', category: 'api' as const, content: '', createdAt: '', updatedAt: '' },
        { id: 'k2', title: 'Project', category: 'api' as const, content: '', projectId: 'p1', createdAt: '', updatedAt: '' },
      ]);

      const result = await tools.list_knowledge.execute({ limit: 20 });
      const parsed = JSON.parse(result);

      expect(parsed[0].scope).toBe('global');
      expect(parsed[1].scope).toBe('project');
    });

    it('should show category-specific empty message', async () => {
      vi.mocked(mockKnowledge.list).mockResolvedValue([]);
      const result = await tools.list_knowledge.execute({ category: 'security', limit: 20 });
      expect(result).toContain('No articles found in category "security"');
    });

    it('should show generic empty message without category', async () => {
      vi.mocked(mockKnowledge.list).mockResolvedValue([]);
      const result = await tools.list_knowledge.execute({ limit: 20 });
      expect(result).toBe('No knowledge articles found.');
    });
  });

  describe('create_knowledge', () => {
    it('should create article and return success', async () => {
      vi.mocked(mockKnowledge.create).mockResolvedValue({
        id: 'k-new', title: 'New Guide', category: 'testing' as const,
        content: '# Testing', projectId: 'p1', createdAt: '', updatedAt: '',
      });

      const result = await tools.create_knowledge.execute({
        title: 'New Guide', category: 'testing', content: '# Testing', projectId: 'p1',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.article.scope).toBe('project');
    });

    it('should create global article when no projectId', async () => {
      vi.mocked(mockKnowledge.create).mockResolvedValue({
        id: 'k-new', title: 'Global', category: 'conventions' as const,
        content: '...', createdAt: '', updatedAt: '',
      });

      await tools.create_knowledge.execute({
        title: 'Global', category: 'conventions', content: '...',
      });

      expect(mockKnowledge.create).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: null })
      );
    });
  });

  describe('update_knowledge', () => {
    it('should update with provided fields', async () => {
      vi.mocked(mockKnowledge.update).mockResolvedValue({
        id: 'k1', title: 'Updated', category: 'api' as const,
        content: 'New content', createdAt: '', updatedAt: '',
      });

      const result = await tools.update_knowledge.execute({
        articleId: 'k1', title: 'Updated', content: 'New content',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
    });

    it('should return message when no updates', async () => {
      const result = await tools.update_knowledge.execute({ articleId: 'k1' });
      expect(result).toBe('No updates provided. Specify at least one field to update.');
    });
  });
});
