import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FastMCP } from 'fastmcp';

// Guidelines module has an internal cache that persists.
// We need to reset the module between test groups that require different fetch behaviors.
// Use vi.resetModules() + dynamic import for cache-sensitive tests.

type ToolDef = { name: string; execute: (params: Record<string, unknown>) => Promise<string> };

const sampleGuidelines = [
  {
    id: 'g1', slug: 'nextjs-app-router', title: 'Next.js App Router Patterns',
    topic: 'nextjs', category: 'frontend', description: 'Best practices for App Router',
    tags: ['react', 'routing'], difficulty: 'intermediate',
    ai: {
      prompt_snippet: 'Use Server Components by default, push client boundaries down',
      applies_when: ['building with Next.js 15+'],
      does_not_apply_when: ['using Pages Router'],
      priority: 'high',
    },
  },
  {
    id: 'g2', slug: 'fastapi-async', title: 'FastAPI Async Patterns',
    topic: 'fastapi', category: 'backend', description: 'Async patterns for FastAPI',
    tags: ['python', 'async'],
    ai: { prompt_snippet: 'Use async for I/O bound operations' },
  },
  {
    id: 'g3', slug: 'security-owasp', title: 'OWASP Security Standards',
    topic: 'security', category: 'security', description: 'Application security best practices',
    tags: ['owasp'],
    ai: { prompt_snippet: 'Always validate input, use parameterized queries' },
  },
];

function mockGuidelinesOk() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ guidelines: sampleGuidelines }),
  }));
}

function registerTools(): Record<string, ToolDef> {
  const tools: Record<string, ToolDef> = {};
  const mockMcp = {
    addTool: (def: ToolDef) => { tools[def.name] = def; },
  } as unknown as FastMCP;
  return tools;
}

describe('Guidelines Tools', () => {
  // For tests that work with the standard 3-guideline set,
  // we load the module once and let the cache work naturally.
  describe('basic functionality', () => {
    let tools: Record<string, ToolDef>;

    beforeEach(async () => {
      vi.resetModules();
      mockGuidelinesOk();
      const mod = await import('../../src/tools/guidelines.js');
      tools = {};
      const mockMcp = {
        addTool: (def: ToolDef) => { tools[def.name] = def; },
      } as unknown as FastMCP;
      mod.registerGuidelineTools(mockMcp);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should register all 3 guideline tools', () => {
      expect(Object.keys(tools)).toHaveLength(3);
      expect(Object.keys(tools)).toEqual(
        expect.arrayContaining(['get_guidelines', 'list_guidelines', 'search_guidelines'])
      );
    });

    it('get_guidelines should return guidelines for a topic', async () => {
      const result = await tools.get_guidelines.execute({ topic: 'nextjs' });
      const parsed = JSON.parse(result);

      expect(parsed.topic).toBe('nextjs');
      expect(parsed.count).toBe(1);
      expect(parsed.guidelines[0].title).toBe('Next.js App Router Patterns');
      expect(parsed.guidelines[0].ai.snippet).toContain('Server Components');
    });

    it('get_guidelines should return error for unknown topic', async () => {
      const result = await tools.get_guidelines.execute({ topic: 'cobol' });
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain('No guidelines found for topic: cobol');
      expect(parsed.availableTopics).toBeDefined();
    });

    it('list_guidelines should group guidelines by topic', async () => {
      const result = await tools.list_guidelines.execute({});
      const parsed = JSON.parse(result);

      expect(parsed.totalCount).toBe(3);
      expect(parsed.topics).toBeDefined();
      expect(parsed.topics.length).toBe(3);
    });

    it('search_guidelines should search across all fields', async () => {
      const result = await tools.search_guidelines.execute({ query: 'async' });
      const parsed = JSON.parse(result);

      expect(parsed.count).toBeGreaterThan(0);
      expect(parsed.results[0].title).toContain('Async');
    });

    it('search_guidelines should filter by topics', async () => {
      const result = await tools.search_guidelines.execute({
        query: 'patterns', topics: ['nextjs'],
      });
      const parsed = JSON.parse(result);

      expect(parsed.results.every((r: { topic: string }) => r.topic === 'nextjs')).toBe(true);
    });

    it('search_guidelines should return empty results with suggestion', async () => {
      const result = await tools.search_guidelines.execute({ query: 'zzzzzzz' });
      const parsed = JSON.parse(result);

      expect(parsed.count).toBe(0);
      expect(parsed.suggestion).toBeDefined();
    });
  });

  describe('truncation', () => {
    let tools: Record<string, ToolDef>;

    beforeEach(async () => {
      vi.resetModules();
      // Create 25 guidelines
      const manyGuidelines = Array.from({ length: 25 }, (_, i) => ({
        id: `g${i}`, slug: `guide-${i}`, title: `Guide ${i} about testing`,
        topic: 'testing', category: 'testing', description: 'Testing guide',
        ai: { prompt_snippet: 'Test everything' },
      }));

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ guidelines: manyGuidelines }),
      }));

      const mod = await import('../../src/tools/guidelines.js');
      tools = {};
      const mockMcp = {
        addTool: (def: ToolDef) => { tools[def.name] = def; },
      } as unknown as FastMCP;
      mod.registerGuidelineTools(mockMcp);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should truncate search results to 20', async () => {
      const result = await tools.search_guidelines.execute({ query: 'testing' });
      const parsed = JSON.parse(result);

      expect(parsed.results).toHaveLength(20);
      expect(parsed.truncated).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache guidelines and not re-fetch within TTL', async () => {
      vi.resetModules();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ guidelines: sampleGuidelines }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const mod = await import('../../src/tools/guidelines.js');
      const tools: Record<string, ToolDef> = {};
      const mockMcp = {
        addTool: (def: ToolDef) => { tools[def.name] = def; },
      } as unknown as FastMCP;
      mod.registerGuidelineTools(mockMcp);

      // First call fetches
      await tools.list_guidelines.execute({});
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call uses cache
      await tools.get_guidelines.execute({ topic: 'nextjs' });
      expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1

      vi.restoreAllMocks();
    });
  });

  describe('error handling', () => {
    let tools: Record<string, ToolDef>;

    beforeEach(async () => {
      vi.resetModules();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }));

      const mod = await import('../../src/tools/guidelines.js');
      tools = {};
      const mockMcp = {
        addTool: (def: ToolDef) => { tools[def.name] = def; },
      } as unknown as FastMCP;
      mod.registerGuidelineTools(mockMcp);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should handle API errors', async () => {
      const result = await tools.get_guidelines.execute({ topic: 'nextjs' });
      expect(result).toContain('Error fetching guidelines');
    });

    it('should handle network errors', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      // Need fresh module to avoid cache
      vi.resetModules();
      const mod = await import('../../src/tools/guidelines.js');
      const freshTools: Record<string, ToolDef> = {};
      const mockMcp = {
        addTool: (def: ToolDef) => { freshTools[def.name] = def; },
      } as unknown as FastMCP;
      mod.registerGuidelineTools(mockMcp);

      const result = await freshTools.list_guidelines.execute({});
      expect(result).toContain('Error listing guidelines');
    });
  });
});
