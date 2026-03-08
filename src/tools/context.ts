/**
 * Context Tool
 *
 * Single call to load everything an agent needs at session start.
 * Returns compressed fragments, tech info, active intents, and recent events.
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { context } from '../lib/api-client.js';
import { formatError } from '../lib/errors.js';

export function registerContextTool(mcp: FastMCP): void {
  mcp.addTool({
    name: 'get_context',
    description:
      'Load project context for the current session. Returns compressed knowledge fragments, ' +
      'tech stack info, active intents, and recent events. Call this first when starting work. ' +
      'Pass project_id to scope to a specific project, or omit for the default project.',
    parameters: z.object({
      project_id: z
        .string()
        .optional()
        .describe('Project ID to load context for. Omit for default project.'),
    }),
    execute: async ({ project_id }) => {
      try {
        const ctx = await context.get(project_id) as Record<string, unknown>;

        const result: Record<string, unknown> = {};

        // Project info
        if (ctx.project) {
          result.project = ctx.project;
        }

        // Tech info (stack, commands, notes)
        if (ctx.techInfo) {
          result.techInfo = ctx.techInfo;
        }

        // Active intents
        if (ctx.activeIntents && Array.isArray(ctx.activeIntents) && ctx.activeIntents.length > 0) {
          result.activeIntents = ctx.activeIntents;
        }

        // Recent fragments (compressed knowledge)
        if (ctx.recentFragments && Array.isArray(ctx.recentFragments) && ctx.recentFragments.length > 0) {
          result.recentFragments = ctx.recentFragments;
        }

        // Recent events
        if (ctx.recentEvents && Array.isArray(ctx.recentEvents) && ctx.recentEvents.length > 0) {
          result.recentEvents = ctx.recentEvents;
        }

        if (Object.keys(result).length === 0) {
          return 'No context available. The project may be empty or you may need to create one first.';
        }

        return JSON.stringify(result, null, 2);
      } catch (error) {
        return `Error getting context: ${formatError(error)}`;
      }
    },
  });
}
