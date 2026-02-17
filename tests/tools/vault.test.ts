import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastMCP } from 'fastmcp';
import { registerVaultTools } from '../../src/tools/vault.js';

vi.mock('../../src/lib/api-client.js', () => ({
  vault: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { vault as mockVault } from '../../src/lib/api-client.js';

type ToolDef = { name: string; execute: (params: Record<string, unknown>) => Promise<string> };
const tools: Record<string, ToolDef> = {};
const mockMcp = {
  addTool: (def: ToolDef) => { tools[def.name] = def; },
} as unknown as FastMCP;

describe('Vault Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(tools).forEach((k) => delete tools[k]);
    registerVaultTools(mockMcp);
  });

  it('should register all 5 vault tools', () => {
    expect(Object.keys(tools)).toHaveLength(5);
    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        'list_vault', 'get_vault_secret', 'create_vault_secret',
        'update_vault_secret', 'delete_vault_secret',
      ])
    );
  });

  describe('list_vault', () => {
    it('should return entries without values', async () => {
      vi.mocked(mockVault.list).mockResolvedValue([
        {
          id: 'v1', key: 'DATABASE_URL', scope: 'shared', category: 'database',
          environment: 'production', description: 'Main DB', isOwner: true,
          canRead: true, canEdit: true,
        },
      ]);

      const result = await tools.list_vault.execute({ projectId: 'p1' });
      const parsed = JSON.parse(result);

      expect(parsed.count).toBe(1);
      expect(parsed.entries[0].key).toBe('DATABASE_URL');
      // Should NOT contain value
      expect(parsed.entries[0].value).toBeUndefined();
    });

    it('should return message when no entries', async () => {
      vi.mocked(mockVault.list).mockResolvedValue([]);
      const result = await tools.list_vault.execute({ projectId: 'p1' });
      expect(result).toBe('No vault entries found for this project.');
    });
  });

  describe('get_vault_secret', () => {
    it('should return entry with value and security warning', async () => {
      vi.mocked(mockVault.get).mockResolvedValue({
        id: 'v1', key: 'API_KEY', value: 'sk-secret-123',
        category: 'api', environment: 'all', description: 'OpenAI key',
      });

      const result = await tools.get_vault_secret.execute({
        projectId: 'p1', entryId: 'v1',
      });
      const parsed = JSON.parse(result);

      expect(parsed.value).toBe('sk-secret-123');
      expect(parsed.warning).toContain('security audit');
    });
  });

  describe('create_vault_secret', () => {
    it('should create entry with uppercase key', async () => {
      vi.mocked(mockVault.create).mockResolvedValue({
        id: 'v-new', key: 'MY_SECRET', scope: 'personal',
        category: 'other', environment: 'all',
      });

      const result = await tools.create_vault_secret.execute({
        projectId: 'p1', key: 'my_secret', value: 'value123',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      // Key should be uppercased
      expect(mockVault.create).toHaveBeenCalledWith('p1', expect.objectContaining({
        key: 'MY_SECRET',
      }));
    });

    it('should default to personal scope and other category', async () => {
      vi.mocked(mockVault.create).mockResolvedValue({
        id: 'v-new', key: 'KEY', scope: 'personal',
        category: 'other', environment: 'all',
      });

      await tools.create_vault_secret.execute({
        projectId: 'p1', key: 'KEY', value: 'val',
      });

      expect(mockVault.create).toHaveBeenCalledWith('p1', expect.objectContaining({
        scope: 'personal',
        category: 'other',
        environment: 'all',
      }));
    });

    it('should reject invalid key format after transformation', async () => {
      // Key starting with number after transformation should fail
      const result = await tools.create_vault_secret.execute({
        projectId: 'p1', key: '123_BAD', value: 'val',
      });

      expect(result).toContain('Error: Key must start with a letter');
      expect(mockVault.create).not.toHaveBeenCalled();
    });
  });

  describe('update_vault_secret', () => {
    it('should update with provided fields', async () => {
      vi.mocked(mockVault.update).mockResolvedValue({
        id: 'v1', key: 'KEY', category: 'api', environment: 'production',
      });

      const result = await tools.update_vault_secret.execute({
        projectId: 'p1', entryId: 'v1', category: 'api',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
    });

    it('should return message when no updates', async () => {
      const result = await tools.update_vault_secret.execute({
        projectId: 'p1', entryId: 'v1',
      });
      expect(result).toBe('No updates provided. Specify at least one field to update.');
    });
  });

  describe('delete_vault_secret', () => {
    it('should delete and return success', async () => {
      vi.mocked(mockVault.delete).mockResolvedValue(undefined);

      const result = await tools.delete_vault_secret.execute({
        projectId: 'p1', entryId: 'v1',
      });
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.entryId).toBe('v1');
    });
  });
});
