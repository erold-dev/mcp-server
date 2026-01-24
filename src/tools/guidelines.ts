/**
 * Guidelines Tools
 *
 * Tools for fetching and searching Erold coding guidelines.
 * Guidelines are served from erold.dev API.
 */

import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { formatError } from '../lib/errors.js';

const GUIDELINES_API_URL = 'https://erold.dev/api/v1';

// Available guideline topics (from API)
const GUIDELINE_TOPICS = [
  'ai',
  'api',
  'backend',
  'cloud',
  'data',
  'database',
  'desktop',
  'devops',
  'erold',
  'fastapi',
  'mobile',
  'nextjs',
  'observability',
  'patterns',
  'performance',
  'quality',
  'react',
  'security',
  'servers',
  'systems',
  'tailwind',
  'testing',
  'typescript',
  'uiux',
] as const;

type GuidelineTopic = (typeof GUIDELINE_TOPICS)[number];

interface GuidelineItem {
  id: string;
  slug: string;
  title: string;
  topic: string;
  category: string;
  description?: string;
  tags?: string[];
  difficulty?: string;
  version?: string;
  ai?: {
    prompt_snippet: string;
    applies_when?: string[];
    does_not_apply_when?: string[];
    priority?: string;
    confidence?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface GuidelinesResponse {
  guidelines: GuidelineItem[];
}

// Cache for guidelines (they don't change often)
let guidelinesCache: GuidelineItem[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all guidelines (with caching)
 */
async function fetchAllGuidelines(): Promise<GuidelineItem[]> {
  const now = Date.now();
  if (guidelinesCache && now - cacheTimestamp < CACHE_TTL) {
    return guidelinesCache;
  }

  try {
    const response = await fetch(`${GUIDELINES_API_URL}/guidelines`, {
      headers: {
        'User-Agent': '@erold/mcp-server/0.1.0',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as GuidelinesResponse;
    guidelinesCache = data.guidelines || [];
    cacheTimestamp = now;
    return guidelinesCache;
  } catch (error) {
    throw new Error(`Failed to fetch guidelines: ${formatError(error)}`);
  }
}

/**
 * Get guidelines by topic
 */
async function getGuidelinesByTopic(topic: string): Promise<GuidelineItem[]> {
  const all = await fetchAllGuidelines();
  return all.filter((g) => g.topic.toLowerCase() === topic.toLowerCase());
}

/**
 * Search guidelines by query
 */
async function searchGuidelines(
  query: string,
  topics?: string[]
): Promise<GuidelineItem[]> {
  const all = await fetchAllGuidelines();
  const queryLower = query.toLowerCase();

  let filtered = all;

  // Filter by topics if provided
  if (topics && topics.length > 0) {
    const topicsLower = topics.map((t) => t.toLowerCase());
    filtered = filtered.filter((g) => topicsLower.includes(g.topic.toLowerCase()));
  }

  // Search in title, description, tags, and AI snippet
  return filtered.filter((g) => {
    const searchText = [
      g.title,
      g.description,
      g.tags?.join(' '),
      g.ai?.prompt_snippet,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchText.includes(queryLower);
  });
}

/**
 * Register guideline tools with FastMCP
 */
export function registerGuidelineTools(mcp: FastMCP): void {
  // Get Guidelines by Topic
  mcp.addTool({
    name: 'get_guidelines',
    description: `Fetch coding guidelines for a specific technology topic from erold.dev.

Available topics: ${GUIDELINE_TOPICS.join(', ')}

Common topics:
- nextjs: Next.js 15 App Router patterns, Server Components, data fetching
- fastapi: Python FastAPI async patterns, Pydantic, dependency injection
- security: OWASP 2025 application security, input validation, auth
- cloud: Azure/AWS cloud security, IAM, secrets management
- testing: Integration testing standards
- typescript: TypeScript strict patterns, type safety
- react: React patterns and best practices
- patterns: Architecture patterns (CQRS, DDD, etc.)

Returns guidelines with AI-optimized snippets for quick reference.`,
    parameters: z.object({
      topic: z
        .string()
        .describe(
          `The topic to fetch guidelines for. Available: ${GUIDELINE_TOPICS.join(', ')}`
        ),
    }),
    execute: async ({ topic }) => {
      try {
        const guidelines = await getGuidelinesByTopic(topic);

        if (guidelines.length === 0) {
          const all = await fetchAllGuidelines();
          const topics = [...new Set(all.map((g) => g.topic))].sort();
          return JSON.stringify(
            {
              error: `No guidelines found for topic: ${topic}`,
              availableTopics: topics,
              suggestion: 'Use list_guidelines to see all available guidelines',
            },
            null,
            2
          );
        }

        return JSON.stringify(
          {
            topic,
            count: guidelines.length,
            guidelines: guidelines.map((g) => ({
              id: g.id,
              title: g.title,
              description: g.description,
              difficulty: g.difficulty,
              tags: g.tags,
              ai: g.ai
                ? {
                    snippet: g.ai.prompt_snippet,
                    applies_when: g.ai.applies_when,
                    does_not_apply_when: g.ai.does_not_apply_when,
                  }
                : undefined,
            })),
            url: `https://erold.dev/guidelines?topic=${topic}`,
          },
          null,
          2
        );
      } catch (error) {
        return `Error fetching guidelines: ${formatError(error)}`;
      }
    },
  });

  // List All Guidelines
  mcp.addTool({
    name: 'list_guidelines',
    description: `List all available coding guidelines from erold.dev grouped by topic.

Returns a summary of all 150+ guidelines organized by technology/topic.
Use get_guidelines with a topic to fetch detailed guidelines for that area.`,
    parameters: z.object({}),
    execute: async () => {
      try {
        const guidelines = await fetchAllGuidelines();

        // Group by topic
        const byTopic: Record<string, { count: number; titles: string[] }> = {};
        for (const g of guidelines) {
          if (!byTopic[g.topic]) {
            byTopic[g.topic] = { count: 0, titles: [] };
          }
          byTopic[g.topic].count++;
          if (byTopic[g.topic].titles.length < 3) {
            byTopic[g.topic].titles.push(g.title);
          }
        }

        return JSON.stringify(
          {
            totalCount: guidelines.length,
            topics: Object.entries(byTopic)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([topic, data]) => ({
                topic,
                count: data.count,
                examples: data.titles,
              })),
            url: 'https://erold.dev/guidelines',
          },
          null,
          2
        );
      } catch (error) {
        return `Error listing guidelines: ${formatError(error)}`;
      }
    },
  });

  // Search Guidelines
  mcp.addTool({
    name: 'search_guidelines',
    description: `Search across all Erold coding guidelines.

Search for specific topics, patterns, or best practices across all guideline categories.
Useful for finding guidance on cross-cutting concerns like "error handling", "authentication", or "caching".`,
    parameters: z.object({
      query: z.string().min(2).describe('Search query (minimum 2 characters)'),
      topics: z
        .array(z.string())
        .optional()
        .describe('Filter by specific topics (optional)'),
    }),
    execute: async ({ query, topics }) => {
      try {
        const results = await searchGuidelines(query, topics);

        if (results.length === 0) {
          return JSON.stringify(
            {
              query,
              topics: topics || 'all',
              count: 0,
              results: [],
              suggestion:
                'Try broader search terms or use list_guidelines to see available topics',
            },
            null,
            2
          );
        }

        return JSON.stringify(
          {
            query,
            topics: topics || 'all',
            count: results.length,
            results: results.slice(0, 20).map((g) => ({
              id: g.id,
              topic: g.topic,
              title: g.title,
              description: g.description,
              snippet: g.ai?.prompt_snippet?.slice(0, 200),
            })),
            truncated: results.length > 20,
          },
          null,
          2
        );
      } catch (error) {
        return `Error searching guidelines: ${formatError(error)}`;
      }
    },
  });
}
