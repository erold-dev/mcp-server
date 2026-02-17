import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiError } from '../../src/lib/errors.js';

// Mock config before importing api-client
vi.mock('../../src/lib/config.js', () => ({
  getConfig: () => ({
    apiUrl: 'https://api.test.dev/api/v1',
    apiKey: 'erold_test_key_123',
    tenant: 'test-tenant',
  }),
}));

// We need to test the api-client module's exported API methods
// Since the module uses `fetch` internally, we mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
const apiClient = await import('../../src/lib/api-client.js');
const { tasks, projects, knowledge, vault, techInfo, context, members, activity, tenants, user } = apiClient;

function mockJsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({
      'content-type': 'application/json',
      ...headers,
    }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function mockTextResponse(text: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: () => Promise.reject(new Error('Not JSON')),
    text: () => Promise.resolve(text),
  };
}

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // ===========================================================================
  // Request building
  // ===========================================================================

  describe('request building', () => {
    it('should include X-API-Key header', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await tasks.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'erold_test_key_123',
          }),
        })
      );
    });

    it('should include User-Agent header', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await tasks.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': '@erold/mcp-server/0.1.0',
          }),
        })
      );
    });

    it('should include Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await tasks.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should build correct tenant-scoped URL', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await tasks.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.test.dev/api/v1/tenants/test-tenant/tasks'),
        expect.any(Object)
      );
    });

    it('should append query params for GET requests', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await tasks.list({ status: 'todo', priority: 'high', limit: 10 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('status=todo');
      expect(url).toContain('priority=high');
      expect(url).toContain('limit=10');
    });

    it('should omit undefined/null/empty query params', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await tasks.list({ status: undefined, assignee: '', limit: 20 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).not.toContain('status=');
      expect(url).not.toContain('assignee=');
      expect(url).toContain('limit=20');
    });
  });

  // ===========================================================================
  // Response parsing
  // ===========================================================================

  describe('response parsing', () => {
    it('should unwrap { data: ... } responses', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: [{ id: '1', title: 'Test' }] })
      );

      const result = await tasks.list();

      expect(result).toEqual([{ id: '1', title: 'Test' }]);
    });

    it('should return raw response when no data wrapper', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ id: '1', title: 'Direct' })
      );

      const result = await tasks.get('1');

      expect(result).toEqual({ id: '1', title: 'Direct' });
    });

    it('should handle text responses', async () => {
      mockFetch.mockResolvedValueOnce(mockTextResponse('OK'));

      const result = await tasks.get('1');

      expect(result).toBe('OK');
    });
  });

  // ===========================================================================
  // Error handling
  // ===========================================================================

  describe('error handling', () => {
    it('should throw ApiError on 4xx responses', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ error: { message: 'Task not found' } }, 404)
      );

      await expect(tasks.get('nonexistent')).rejects.toThrow(ApiError);
      await expect(tasks.get('nonexistent')).rejects.toThrow(); // second call gets a new mock
    });

    it('should extract error message from response body', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ error: { message: 'Validation failed', details: { field: 'title' } } }, 400)
      );

      try {
        await tasks.get('bad');
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).message).toBe('Validation failed');
        expect((e as ApiError).statusCode).toBe(400);
      }
    });

    it('should handle 429 rate limiting', async () => {
      // First call: rate limited, Second call: rate limited (retry), Third call: rate limited (final retry)
      mockFetch.mockResolvedValue(
        mockJsonResponse({}, 429)
      );

      try {
        await tasks.list();
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).statusCode).toBe(429);
      }
    });

    it('should not retry on 4xx client errors (except 429)', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ error: { message: 'Bad request' } }, 400)
      );

      await expect(tasks.get('bad')).rejects.toThrow(ApiError);

      // Should only call fetch once (no retries for 4xx)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Retry logic
  // ===========================================================================

  describe('retry logic', () => {
    it('should retry on 500 server errors', async () => {
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ error: { message: 'Server error' } }, 500))
        .mockResolvedValueOnce(mockJsonResponse({ data: [{ id: '1' }] }));

      const result = await tasks.list();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual([{ id: '1' }]);
    });

    it('should retry up to MAX_RETRIES (3) times', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({ error: { message: 'Server error' } }, 500)
      );

      await expect(tasks.list()).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  // ===========================================================================
  // Tasks API
  // ===========================================================================

  describe('tasks', () => {
    it('tasks.list() calls GET /tenants/{tenant}/tasks', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await tasks.list();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tenants/test-tenant/tasks'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('tasks.get() calls GET /tenants/{tenant}/tasks/{id}', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: { id: 'abc' } }));

      await tasks.get('abc');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tenants/test-tenant/tasks/abc'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('tasks.create() calls POST /tenants/{tenant}/projects/{pid}/tasks', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { id: 'new-1', title: 'New task' } })
      );

      await tasks.create('proj-1', { title: 'New task', priority: 'high' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tenants/test-tenant/projects/proj-1/tasks'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New task', priority: 'high' }),
        })
      );
    });

    it('tasks.update() calls PATCH /tenants/{tenant}/tasks/{id}', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: { id: 'abc' } }));

      await tasks.update('abc', { title: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tenants/test-tenant/tasks/abc'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ title: 'Updated' }),
        })
      );
    });

    it('tasks.delete() calls DELETE /tenants/{tenant}/tasks/{id}', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: null }));

      await tasks.delete('abc');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tenants/test-tenant/tasks/abc'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('tasks.start() calls POST /tenants/{tenant}/tasks/{id}/start', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: { id: 'abc', status: 'in-progress' } }));

      await tasks.start('abc');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tenants/test-tenant/tasks/abc/start'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('tasks.complete() sends summary in body', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: { id: 'abc', status: 'done' } }));

      await tasks.complete('abc', 'All done');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/abc/complete'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ summary: 'All done' }),
        })
      );
    });

    it('tasks.block() sends reason in body', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: { id: 'abc', status: 'blocked' } }));

      await tasks.block('abc', 'Waiting for API');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/abc/block'),
        expect.objectContaining({
          body: JSON.stringify({ reason: 'Waiting for API' }),
        })
      );
    });

    it('tasks.search() calls GET with query param', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await tasks.search('auth bug', { limit: 5 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/tasks/search');
      expect(url).toContain('q=auth+bug');
      expect(url).toContain('limit=5');
    });

    it('tasks.comments() calls GET /tasks/{id}/comments', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await tasks.comments('abc');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/abc/comments'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('tasks.addComment() calls POST /tasks/{id}/comments', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: { id: 'c1' } }));

      await tasks.addComment('abc', 'Great progress!');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/abc/comments'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Great progress!' }),
        })
      );
    });

    it('tasks.blocked() calls GET /tasks/blocked', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await tasks.blocked();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/blocked'),
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  // ===========================================================================
  // Projects API
  // ===========================================================================

  describe('projects', () => {
    it('projects.list() maps title to name', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: [{ id: 'p1', title: 'My Project', status: 'active' }] })
      );

      const result = await projects.list();

      expect(result[0].name).toBe('My Project');
    });

    it('projects.get() maps title to name', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { id: 'p1', title: 'My Project', status: 'active' } })
      );

      const result = await projects.get('p1');

      expect(result.name).toBe('My Project');
    });

    it('projects.create() maps name to title', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { id: 'p-new', title: 'New Project', status: 'planning' } })
      );

      await projects.create({ name: 'New Project', description: 'Desc' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"title":"New Project"'),
        })
      );
    });

    it('projects.update() maps name to title in payload', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { id: 'p1', title: 'Renamed', status: 'active' } })
      );

      await projects.update('p1', { name: 'Renamed' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"title":"Renamed"'),
        })
      );
    });

    it('projects.stats() calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { totalTasks: 10 } })
      );

      await projects.stats('p1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/p1/stats'),
        expect.any(Object)
      );
    });

    it('projects.tasks() calls correct endpoint with filters', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await projects.tasks('p1', { status: 'todo', limit: 10 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/projects/p1/tasks');
      expect(url).toContain('status=todo');
    });
  });

  // ===========================================================================
  // Knowledge API
  // ===========================================================================

  describe('knowledge', () => {
    it('knowledge.list() supports scope and category params', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await knowledge.list({ category: 'security', scope: 'global', limit: 5 });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('category=security');
      expect(url).toContain('scope=global');
      expect(url).toContain('limit=5');
    });

    it('knowledge.create() sends correct payload', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: { id: 'k1' } }));

      await knowledge.create({
        title: 'Auth Guide',
        category: 'security',
        content: '# Auth\nUse JWT',
        projectId: 'p1',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/knowledge'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Auth Guide',
            category: 'security',
            content: '# Auth\nUse JWT',
            projectId: 'p1',
          }),
        })
      );
    });

    it('knowledge.search() passes search param', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await knowledge.search('authentication');

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('search=authentication');
    });
  });

  // ===========================================================================
  // Vault API
  // ===========================================================================

  describe('vault', () => {
    it('vault.list() calls correct project-scoped URL', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await vault.list('p1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/p1/vault'),
        expect.any(Object)
      );
    });

    it('vault.get() includes entry ID', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { id: 'v1', key: 'API_KEY', value: 'secret' } })
      );

      await vault.get('p1', 'v1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/p1/vault/v1'),
        expect.any(Object)
      );
    });

    it('vault.create() sends correct payload', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: { id: 'v-new' } }));

      await vault.create('p1', {
        key: 'DATABASE_URL',
        value: 'postgres://...',
        scope: 'shared',
        category: 'database',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/p1/vault'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"key":"DATABASE_URL"'),
        })
      );
    });

    it('vault.delete() calls DELETE', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: null }));

      await vault.delete('p1', 'v1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/p1/vault/v1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ===========================================================================
  // Tech Info API
  // ===========================================================================

  describe('techInfo', () => {
    it('techInfo.get() calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { stack: { frontend: ['React'] } } })
      );

      await techInfo.get('p1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/p1/tech-info'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('techInfo.update() calls PATCH with payload', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: {} }));

      await techInfo.update('p1', { notes: 'Updated notes' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/p1/tech-info'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ notes: 'Updated notes' }),
        })
      );
    });
  });

  // ===========================================================================
  // Context API
  // ===========================================================================

  describe('context', () => {
    it('context.get() calls /tenants/{tenant}/context', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: {} }));

      await context.get();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tenants/test-tenant/context'),
        expect.any(Object)
      );
    });

    it('context.dashboard() calls /tenants/{tenant}/dashboard', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: {} }));

      await context.dashboard();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tenants/test-tenant/dashboard'),
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // Members API
  // ===========================================================================

  describe('members', () => {
    it('members.list() returns team members', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: [{ userId: 'u1', name: 'Alice', role: 'admin' }] })
      );

      const result = await members.list();

      expect(result).toEqual([{ userId: 'u1', name: 'Alice', role: 'admin' }]);
    });
  });

  // ===========================================================================
  // Tenants API
  // ===========================================================================

  describe('tenants', () => {
    it('tenants.list() calls /tenants (not tenant-scoped)', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));

      await tenants.list();

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toBe('https://api.test.dev/api/v1/tenants');
    });
  });

  // ===========================================================================
  // User API
  // ===========================================================================

  describe('user', () => {
    it('user.me() calls /me', async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: { id: 'u1', email: 'test@example.com' } })
      );

      const result = await user.me();

      expect(result).toEqual({ id: 'u1', email: 'test@example.com' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/me'),
        expect.any(Object)
      );
    });
  });
});
