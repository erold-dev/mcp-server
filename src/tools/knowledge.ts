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
  'vision',
  'spec',
  'research',
  'decision',
  'design',
  'other',
]);

const KnowledgeScopeSchema = z.enum(['all', 'global', 'project', 'combined']);

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
          projectId: article.projectId || null,
          scope: article.projectId ? 'project' : 'global',
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
    description:
      'List knowledge articles, optionally filtered by category and/or project. ' +
      'Use scope to control visibility: "all" (default), "global" (only global), ' +
      '"project" (only project-specific), "combined" (global + specific project).',
    parameters: z.object({
      category: KnowledgeCategorySchema.optional().describe(
        'Filter by category: architecture, api, deployment, testing, security, ' +
        'performance, workflow, conventions, troubleshooting, vision, spec, research, decision, design, other'
      ),
      projectId: z.string().optional().describe('Filter by project ID'),
      scope: KnowledgeScopeSchema.optional().describe(
        'Scope: "all" (everything), "global" (only global), "project" (only project-specific), ' +
        '"combined" (global + specific project - requires projectId)'
      ),
      limit: z.number().min(1).max(50).default(20).describe('Maximum articles to return'),
    }),
    execute: async (params) => {
      try {
        const articles = await knowledge.list({
          category: params.category,
          projectId: params.projectId,
          scope: params.scope,
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
          projectId: article.projectId || null,
          scope: article.projectId ? 'project' : 'global',
          updatedAt: article.updatedAt,
        }));

        return JSON.stringify(formatted, null, 2);
      } catch (error) {
        return `Error listing knowledge: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_project_knowledge - Get ALL knowledge for a project in one call
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_project_knowledge',
    description:
      'Get ALL knowledge articles for a specific project in one call. ' +
      'Returns both project-specific and global articles. ' +
      'Use this when starting work on a project to load full context.',
    parameters: z.object({
      projectId: z.string().describe('The project ID to get knowledge for'),
      includeContent: z.boolean().default(false).describe(
        'If true, includes full article content. If false (default), includes only a preview.'
      ),
    }),
    execute: async (params) => {
      try {
        const articles = await knowledge.list({
          projectId: params.projectId,
          scope: 'combined',
          limit: 50,
        });

        if (articles.length === 0) {
          return 'No knowledge articles found for this project.';
        }

        // Group by category
        const byCategory: Record<string, Array<{
          id: string;
          title: string;
          scope: string;
          tags?: string[];
          content?: string;
          preview?: string;
          updatedAt: string;
        }>> = {};

        articles.forEach((article) => {
          const cat = article.category || 'other';
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push({
            id: article.id,
            title: article.title,
            scope: article.projectId ? 'project' : 'global',
            tags: article.tags || [],
            ...(params.includeContent
              ? { content: article.content }
              : { preview: article.content.substring(0, 200) + (article.content.length > 200 ? '...' : '') }),
            updatedAt: article.updatedAt,
          });
        });

        return JSON.stringify({
          projectId: params.projectId,
          totalArticles: articles.length,
          byCategory,
        }, null, 2);
      } catch (error) {
        return `Error getting project knowledge: ${formatError(error)}`;
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
      'architecture, workflows, troubleshooting guides, and other team knowledge. ' +
      'Omit projectId for global knowledge, or provide it for project-specific knowledge.',
    parameters: z.object({
      title: z.string().min(1).max(200).describe('Article title'),
      category: KnowledgeCategorySchema.describe(
        'Category: architecture, api, deployment, testing, security, ' +
        'performance, workflow, conventions, troubleshooting, vision, spec, research, decision, design, other'
      ),
      content: z.string().min(1).describe('Article content (markdown supported)'),
      projectId: z.string().optional().describe('Project ID to associate with (omit for global knowledge)'),
    }),
    execute: async (params) => {
      try {
        const article = await knowledge.create({
          title: params.title,
          category: params.category,
          content: params.content,
          projectId: params.projectId || null,
        });

        return JSON.stringify({
          success: true,
          message: 'Knowledge article created successfully',
          article: {
            id: article.id,
            title: article.title,
            category: article.category,
            projectId: article.projectId || null,
            scope: article.projectId ? 'project' : 'global',
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
