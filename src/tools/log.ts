/**
 * Log Tool
 *
 * Accepts raw text from agents/hooks. Backend will Smart Strip compress
 * it into fragments for future retrieval.
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { events } from '../lib/api-client.js';
import { formatError } from '../lib/errors.js';

const EVENT_TYPES = [
  'observation',
  'decision',
  'error',
  'file_change',
  'session_start',
  'session_end',
] as const;

export function registerLogTool(mcp: FastMCP): void {
  mcp.addTool({
    name: 'log',
    description:
      'Log an event for a project. The backend compresses it into searchable fragments via Smart Strip. ' +
      'Use this to record observations, decisions, errors, file changes, and session boundaries. ' +
      'Types: observation (what you noticed), decision (why you chose something), error (what failed and why), ' +
      'file_change (files modified), session_start/session_end (session boundaries).',
    parameters: z.object({
      project_id: z
        .string()
        .describe('Project ID to log the event for.'),
      content: z
        .string()
        .min(1)
        .describe('Raw text content to log. Be descriptive - include what happened and why.'),
      type: z
        .enum(EVENT_TYPES)
        .default('observation')
        .describe(
          'Event type. Defaults to "observation". Use "decision" for choices made, ' +
          '"error" for failures, "file_change" for modifications.'
        ),
      intent_id: z
        .string()
        .optional()
        .describe('Link this event to an active intent (optional).'),
    }),
    execute: async ({ project_id, content, type, intent_id }) => {
      try {
        const event = await events.create({
          projectId: project_id,
          content,
          type,
          intentId: intent_id,
        });

        return JSON.stringify(
          {
            logged: true,
            id: event.id,
            type: event.type,
            message: `Event logged. Content will be compressed into searchable fragments.`,
          },
          null,
          2
        );
      } catch (error) {
        return `Error logging event: ${formatError(error)}`;
      }
    },
  });
}
