/**
 * Intent Tool
 *
 * Lightweight intent tracking. Replaces the full task lifecycle
 * with simple create/list/complete actions.
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { intents } from '../lib/api-client.js';
import { formatError } from '../lib/errors.js';

const INTENT_ACTIONS = ['create', 'list', 'complete'] as const;

export function registerIntentTool(mcp: FastMCP): void {
  mcp.addTool({
    name: 'intent',
    description:
      'Manage lightweight intents (what you plan to do). Actions:\n' +
      '- "create": Start tracking a new intent. Provide title and optionally project_id.\n' +
      '- "list": Show active intents.\n' +
      '- "complete": Mark an intent as done. Provide intent_id and summary of what was accomplished.',
    parameters: z.object({
      action: z
        .enum(INTENT_ACTIONS)
        .describe('Action to perform: "create", "list", or "complete".'),
      title: z
        .string()
        .optional()
        .describe('Title for new intent (required for "create").'),
      description: z
        .string()
        .optional()
        .describe('Description for new intent (optional, for "create").'),
      project_id: z
        .string()
        .optional()
        .describe('Project ID to scope the intent to (optional).'),
      intent_id: z
        .string()
        .optional()
        .describe('Intent ID to complete (required for "complete").'),
      summary: z
        .string()
        .optional()
        .describe('Summary of what was accomplished (for "complete").'),
    }),
    execute: async ({ action, title, description, project_id, intent_id, summary }) => {
      try {
        switch (action) {
          case 'create': {
            if (!title) {
              return 'Error: "title" is required when action is "create".';
            }

            const intent = await intents.create({
              title,
              description,
              projectId: project_id,
            });

            return JSON.stringify(
              {
                created: true,
                intent: {
                  id: intent.id,
                  title: intent.title,
                  status: intent.status,
                },
                message: 'Intent created. Use this intent_id when logging related events.',
              },
              null,
              2
            );
          }

          case 'list': {
            const intentList = await intents.list({
              projectId: project_id,
              status: 'active',
            });

            if (intentList.length === 0) {
              return 'No active intents.';
            }

            return JSON.stringify(
              {
                count: intentList.length,
                intents: intentList.map((i) => ({
                  id: i.id,
                  title: i.title,
                  description: i.description,
                  status: i.status,
                  createdAt: i.createdAt,
                })),
              },
              null,
              2
            );
          }

          case 'complete': {
            if (!intent_id) {
              return 'Error: "intent_id" is required when action is "complete".';
            }

            const completed = await intents.complete(intent_id, summary);

            return JSON.stringify(
              {
                completed: true,
                intent: {
                  id: completed.id,
                  title: completed.title,
                  status: completed.status,
                  summary: completed.summary,
                },
              },
              null,
              2
            );
          }

          default:
            return `Unknown action: ${action}. Use "create", "list", or "complete".`;
        }
      } catch (error) {
        return `Error managing intent: ${formatError(error)}`;
      }
    },
  });
}
