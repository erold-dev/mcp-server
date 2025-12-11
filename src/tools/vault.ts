/**
 * Vault Tools
 *
 * MCP tools for managing project secrets/credentials.
 * Requires admin or owner role.
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { vault } from '../lib/api-client.js';
import { formatError } from '../lib/errors.js';

// =============================================================================
// Schemas
// =============================================================================

const VaultCategorySchema = z.enum([
  'database',
  'api',
  'cloud',
  'service',
  'credential',
  'other',
]);

const VaultEnvironmentSchema = z.enum([
  'all',
  'production',
  'staging',
  'development',
]);

// =============================================================================
// Tool Registration
// =============================================================================

export function registerVaultTools(mcp: FastMCP): void {
  // ---------------------------------------------------------------------------
  // list_vault - List vault entries (metadata only)
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'list_vault',
    description:
      'List vault entries for a project. Returns metadata only (not secret values). ' +
      'Use get_vault_secret to retrieve actual values. Requires admin/owner role.',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
    }),
    execute: async (params) => {
      try {
        const entries = await vault.list(params.projectId);

        if (entries.length === 0) {
          return 'No vault entries found for this project.';
        }

        const formatted = entries.map((entry) => ({
          id: entry.id,
          key: entry.key,
          category: entry.category,
          environment: entry.environment,
          description: entry.description || '',
          updatedAt: entry.updatedAt,
        }));

        return JSON.stringify({
          projectId: params.projectId,
          count: entries.length,
          entries: formatted,
        }, null, 2);
      } catch (error) {
        return `Error listing vault entries: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_vault_secret - Get vault entry with value
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_vault_secret',
    description:
      'Get a vault entry including its secret value. WARNING: This reveals sensitive data ' +
      'and is logged for security audit. Use only when the secret value is needed.',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
      entryId: z.string().describe('The vault entry ID'),
    }),
    execute: async (params) => {
      try {
        const entry = await vault.get(params.projectId, params.entryId);

        return JSON.stringify({
          id: entry.id,
          key: entry.key,
          value: entry.value,
          category: entry.category,
          environment: entry.environment,
          description: entry.description || '',
          warning: 'This access has been logged for security audit.',
        }, null, 2);
      } catch (error) {
        return `Error getting vault entry: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // create_vault_secret - Create a new vault entry
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'create_vault_secret',
    description:
      'Create a new vault entry to store a secret. Keys must be uppercase with underscores ' +
      '(e.g., DATABASE_URL, API_KEY). The secret is encrypted and stored securely.',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
      key: z.string()
        .min(1)
        .max(100)
        .describe('Secret key in UPPERCASE_WITH_UNDERSCORES format (e.g., DATABASE_URL)'),
      value: z.string().min(1).describe('The secret value to store'),
      category: VaultCategorySchema.optional().describe(
        'Category: database, api, cloud, service, credential, other'
      ),
      environment: VaultEnvironmentSchema.optional().describe(
        'Environment: all, production, staging, development'
      ),
      description: z.string().max(500).optional().describe('Description of this secret'),
    }),
    execute: async (params) => {
      try {
        // Validate key format
        const keyFormat = /^[A-Z][A-Z0-9_]*$/;
        const formattedKey = params.key.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

        if (!keyFormat.test(formattedKey)) {
          return 'Error: Key must start with a letter and contain only uppercase letters, numbers, and underscores.';
        }

        const entry = await vault.create(params.projectId, {
          key: formattedKey,
          value: params.value,
          category: params.category || 'other',
          description: params.description,
          environment: params.environment || 'all',
        });

        return JSON.stringify({
          success: true,
          message: 'Vault entry created successfully',
          entry: {
            id: entry.id,
            key: entry.key,
            category: entry.category,
            environment: entry.environment,
          },
        }, null, 2);
      } catch (error) {
        return `Error creating vault entry: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // update_vault_secret - Update an existing vault entry
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'update_vault_secret',
    description: 'Update an existing vault entry (value, category, description, or environment).',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
      entryId: z.string().describe('The vault entry ID'),
      value: z.string().optional().describe('New secret value'),
      category: VaultCategorySchema.optional().describe('New category'),
      description: z.string().max(500).optional().describe('New description'),
      environment: VaultEnvironmentSchema.optional().describe('New environment'),
    }),
    execute: async (params) => {
      try {
        const updates: Record<string, unknown> = {};
        if (params.value !== undefined) updates.value = params.value;
        if (params.category !== undefined) updates.category = params.category;
        if (params.description !== undefined) updates.description = params.description;
        if (params.environment !== undefined) updates.environment = params.environment;

        if (Object.keys(updates).length === 0) {
          return 'No updates provided. Specify at least one field to update.';
        }

        const entry = await vault.update(params.projectId, params.entryId, updates);

        return JSON.stringify({
          success: true,
          message: 'Vault entry updated successfully',
          entry: {
            id: entry.id,
            key: entry.key,
            category: entry.category,
            environment: entry.environment,
          },
        }, null, 2);
      } catch (error) {
        return `Error updating vault entry: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // delete_vault_secret - Delete a vault entry
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'delete_vault_secret',
    description:
      'Delete a vault entry. WARNING: This permanently removes the secret and cannot be undone.',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
      entryId: z.string().describe('The vault entry ID to delete'),
    }),
    execute: async (params) => {
      try {
        await vault.delete(params.projectId, params.entryId);

        return JSON.stringify({
          success: true,
          message: 'Vault entry deleted successfully',
          entryId: params.entryId,
        }, null, 2);
      } catch (error) {
        return `Error deleting vault entry: ${formatError(error)}`;
      }
    },
  });
}
