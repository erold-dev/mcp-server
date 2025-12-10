/**
 * Knowledge Tools
 *
 * MCP tools for knowledge base management - search, create, update articles.
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { knowledge } from '../lib/api-client.js';
import { formatError } from '../lib/errors.js';

// =============================================================================
// Schemas
// =============================================================================

const KnowledgeCategorySchema = z.enum([
  'architecture',
  'api',
  'deployment',
  'testing',
  'security',
  'performance',
  'workflow',
  'conventions',
  'troubleshooting',
  'other',
]);

// =============================================================================
// Tool Registration
// =============================================================================

export function registerKnowledgeTools(mcp: FastMCP): void {
  // ---------------------------------------------------------------------------
  // search_knowledge - Search knowledge base
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'search_knowledge',
    description:
      'Search the knowledge base for articles. Use this to find documentation, ' +
      'architecture decisions, troubleshooting guides, and other team knowledge.',
    parameters: z.object({
      query: z.string().min(1).describe('Search query'),
    }),
    execute: async (params) => {
      try {
        const articles = await knowledge.search(params.query);

        if (articles.length === 0) {
          return `No knowledge articles found matching "${params.query}"`;
        }

        const formatted = articles.map((article) => ({
          id: article.id,
          title: article.title,
          category: article.category,
          preview: article.content.substring(0, 150) + (article.content.length > 150 ? '...' : ''),
          updatedAt: article.updatedAt,
        }));

        return JSON.stringify({
          query: params.query,
          count: articles.length,
          articles: formatted,
        }, null, 2);
      } catch (error) {
        return `Error searching knowledge: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_knowledge - Get full article content
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_knowledge',
    description: 'Get the full content of a knowledge article by ID.',
    parameters: z.object({
      articleId: z.string().describe('The article ID to retrieve'),
    }),
    execute: async (params) => {
      try {
        const article = await knowledge.get(params.articleId);

        return JSON.stringify({
          id: article.id,
          title: article.title,
          category: article.category,
          content: article.content,
          tags: article.tags || [],
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
        }, null, 2);
      } catch (error) {
        return `Error getting article: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // list_knowledge - List knowledge articles
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'list_knowledge',
    description: 'List knowledge articles, optionally filtered by category.',
    parameters: z.object({
      category: KnowledgeCategorySchema.optional().describe(
        'Filter by category: architecture, api, deployment, testing, security, ' +
        'performance, workflow, conventions, troubleshooting, other'
      ),
      limit: z.number().min(1).max(50).default(20).describe('Maximum articles to return'),
    }),
    execute: async (params) => {
      try {
        const articles = await knowledge.list({
          category: params.category,
          limit: params.limit,
        });

        if (articles.length === 0) {
          return params.category
            ? `No articles found in category "${params.category}"`
            : 'No knowledge articles found.';
        }

        const formatted = articles.map((article) => ({
          id: article.id,
          title: article.title,
          category: article.category,
          updatedAt: article.updatedAt,
        }));

        return JSON.stringify(formatted, null, 2);
      } catch (error) {
        return `Error listing knowledge: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // create_knowledge - Create a new article
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'create_knowledge',
    description:
      'Create a new knowledge article. Use this to document decisions, ' +
      'architecture, workflows, troubleshooting guides, and other team knowledge.',
    parameters: z.object({
      title: z.string().min(1).max(200).describe('Article title'),
      category: KnowledgeCategorySchema.describe(
        'Category: architecture, api, deployment, testing, security, ' +
        'performance, workflow, conventions, troubleshooting, other'
      ),
      content: z.string().min(1).describe('Article content (markdown supported)'),
    }),
    execute: async (params) => {
      try {
        const article = await knowledge.create({
          title: params.title,
          category: params.category,
          content: params.content,
        });

        return JSON.stringify({
          success: true,
          message: 'Knowledge article created successfully',
          article: {
            id: article.id,
            title: article.title,
            category: article.category,
          },
        }, null, 2);
      } catch (error) {
        return `Error creating article: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // update_knowledge - Update an existing article
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'update_knowledge',
    description: 'Update an existing knowledge article.',
    parameters: z.object({
      articleId: z.string().describe('The article ID to update'),
      title: z.string().min(1).max(200).optional().describe('New title'),
      category: KnowledgeCategorySchema.optional().describe('New category'),
      content: z.string().optional().describe('New content'),
    }),
    execute: async (params) => {
      try {
        const updates: Record<string, unknown> = {};
        if (params.title) updates.title = params.title;
        if (params.category) updates.category = params.category;
        if (params.content) updates.content = params.content;

        if (Object.keys(updates).length === 0) {
          return 'No updates provided. Specify at least one field to update.';
        }

        const article = await knowledge.update(params.articleId, updates);

        return JSON.stringify({
          success: true,
          message: 'Knowledge article updated successfully',
          article: {
            id: article.id,
            title: article.title,
            category: article.category,
          },
        }, null, 2);
      } catch (error) {
        return `Error updating article: ${formatError(error)}`;
      }
    },
  });
}
