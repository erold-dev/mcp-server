/**
 * Guidelines Tool
 *
 * Fetch coding guidelines from erold.dev by topic.
 */

import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { formatError } from '../lib/errors.js';

const GUIDELINES_API_URL = 'https://erold.dev/api/v1';

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

interface GuidelineItem {
  id: string;
  slug: string;
  title: string;
  topic: string;
  category: string;
  description?: string;
  tags?: string[];
  difficulty?: string;
  ai?: {
    prompt_snippet: string;
    applies_when?: string[];
    does_not_apply_when?: string[];
    priority?: string;
    confidence?: string;
  };
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
        'User-Agent': '@erold/mcp-server/0.2.0',
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
 * Register the get_guidelines tool
 */
export function registerGuidelineTool(mcp: FastMCP): void {
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
        const all = await fetchAllGuidelines();
        const guidelines = all.filter(
          (g) => g.topic.toLowerCase() === topic.toLowerCase()
        );

        if (guidelines.length === 0) {
          const topics = [...new Set(all.map((g) => g.topic))].sort();
          return JSON.stringify(
            {
              error: `No guidelines found for topic: ${topic}`,
              availableTopics: topics,
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
}
