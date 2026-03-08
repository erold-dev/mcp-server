/**
 * Search Tool
 *
 * Semantic search over Smart Strip compressed fragments.
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { fragments } from '../lib/api-client.js';
import { formatError } from '../lib/errors.js';

const SEARCH_TYPES = ['all', 'decision', 'error', 'observation', 'file_change'] as const;

export function registerSearchTool(mcp: FastMCP): void {
  mcp.addTool({
    name: 'search',
    description:
      'Search over compressed knowledge fragments. Use this to find past decisions, errors, ' +
      'observations, and file changes. Supports semantic search - describe what you are looking for ' +
      'in natural language. Filter by type to narrow results (e.g., only errors or only decisions).',
    parameters: z.object({
      query: z
        .string()
        .min(2)
        .describe('Search query. Use natural language to describe what you are looking for.'),
      project_id: z
        .string()
        .optional()
        .describe('Scope search to a specific project (optional).'),
      type: z
        .enum(SEARCH_TYPES)
        .default('all')
        .describe(
          'Filter by fragment type. "all" searches everything, or filter to ' +
          '"decision", "error", "observation", or "file_change".'
        ),
    }),
    execute: async ({ query, project_id, type }) => {
      try {
        const result = await fragments.search({
          q: query,
          projectId: project_id,
          type: type === 'all' ? undefined : type,
        });

        if (!result.fragments || result.fragments.length === 0) {
          return JSON.stringify(
            {
              query,
              type,
              count: 0,
              fragments: [],
              message: 'No matching fragments found. Try broader search terms.',
            },
            null,
            2
          );
        }

        return JSON.stringify(
          {
            query,
            type,
            count: result.total,
            fragments: result.fragments.map((f) => ({
              id: f.id,
              type: f.type,
              content: f.content,
              relevance: f.relevance,
              intentId: f.intentId,
              createdAt: f.createdAt,
            })),
          },
          null,
          2
        );
      } catch (error) {
        return `Error searching fragments: ${formatError(error)}`;
      }
    },
  });
}
