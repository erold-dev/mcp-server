/**
 * Tech Info Tools
 *
 * MCP tools for managing project technical information - stack, deployment, commands.
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { techInfo } from '../lib/api-client.js';
import { formatError } from '../lib/errors.js';

// =============================================================================
// Schemas
// =============================================================================

const StackCategorySchema = z.enum([
  'frontend',
  'backend',
  'database',
  'languages',
  'tools',
  'other',
]);

const DeploymentProviderSchema = z.enum([
  'vercel',
  'aws',
  'gcp',
  'azure',
  'digitalocean',
  'heroku',
  'netlify',
  'railway',
  'render',
  'fly',
  'other',
]);

// =============================================================================
// Tool Registration
// =============================================================================

export function registerTechInfoTools(mcp: FastMCP): void {
  // ---------------------------------------------------------------------------
  // get_tech_info - Get project tech info
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_tech_info',
    description:
      'Get the technical information for a project including tech stack, deployment details, ' +
      'useful commands, infrastructure, and notes. Essential for understanding how to work with a project.',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
    }),
    execute: async (params) => {
      try {
        const info = await techInfo.get(params.projectId);

        return JSON.stringify({
          projectId: params.projectId,
          stack: info.stack || {},
          deployment: info.deployment || {},
          commands: info.commands || [],
          infrastructure: info.infrastructure || {},
          repositories: info.repositories || [],
          notes: info.notes || '',
          updatedAt: info.updatedAt,
        }, null, 2);
      } catch (error) {
        return `Error getting tech info: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // update_tech_stack - Update tech stack
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'update_tech_stack',
    description:
      'Update the tech stack for a project. Can add, remove, or replace technologies in a category.',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
      category: StackCategorySchema.describe(
        'Stack category: frontend, backend, database, languages, tools, other'
      ),
      items: z.array(z.string()).describe('List of technologies to set for this category'),
    }),
    execute: async (params) => {
      try {
        // Get current stack
        const current = await techInfo.get(params.projectId);
        const currentStack = current.stack || {};

        // Update specific category
        const updatedStack = {
          ...currentStack,
          [params.category]: params.items,
        };

        await techInfo.update(params.projectId, { stack: updatedStack });

        return JSON.stringify({
          success: true,
          message: `Updated ${params.category} stack`,
          category: params.category,
          items: params.items,
        }, null, 2);
      } catch (error) {
        return `Error updating tech stack: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // set_deployment_info - Set deployment configuration
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'set_deployment_info',
    description:
      'Set deployment configuration for a project including provider, region, URLs, CI/CD, and branches.',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
      provider: DeploymentProviderSchema.optional().describe(
        'Deployment provider: vercel, aws, gcp, azure, digitalocean, heroku, netlify, railway, render, fly, other'
      ),
      region: z.string().optional().describe('Cloud region (e.g., us-east-1)'),
      productionUrl: z.string().url().optional().describe('Production URL'),
      stagingUrl: z.string().url().optional().describe('Staging URL'),
      cicd: z.string().optional().describe('CI/CD system (e.g., GitHub Actions)'),
      productionBranch: z.string().optional().describe('Production branch name'),
      stagingBranch: z.string().optional().describe('Staging branch name'),
    }),
    execute: async (params) => {
      try {
        const deployment: Record<string, unknown> = {};

        if (params.provider) deployment.provider = params.provider;
        if (params.region) deployment.region = params.region;
        if (params.cicd) deployment.cicd = params.cicd;

        if (params.productionUrl || params.stagingUrl) {
          deployment.urls = {};
          if (params.productionUrl) (deployment.urls as Record<string, string>).production = params.productionUrl;
          if (params.stagingUrl) (deployment.urls as Record<string, string>).staging = params.stagingUrl;
        }

        if (params.productionBranch || params.stagingBranch) {
          deployment.branch = {};
          if (params.productionBranch) (deployment.branch as Record<string, string>).production = params.productionBranch;
          if (params.stagingBranch) (deployment.branch as Record<string, string>).staging = params.stagingBranch;
        }

        if (Object.keys(deployment).length === 0) {
          return 'No deployment info provided. Specify at least one field.';
        }

        await techInfo.update(params.projectId, { deployment });

        return JSON.stringify({
          success: true,
          message: 'Deployment info updated',
          deployment,
        }, null, 2);
      } catch (error) {
        return `Error setting deployment info: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // add_command - Add a useful command
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'add_tech_command',
    description:
      'Add a useful command to the project tech info. Good for documenting build, test, deploy commands.',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
      name: z.string().min(1).max(50).describe('Command name (e.g., Build, Test, Deploy)'),
      command: z.string().min(1).max(500).describe('The actual command to run'),
      description: z.string().max(200).optional().describe('Description of what the command does'),
    }),
    execute: async (params) => {
      try {
        // Get current commands
        const current = await techInfo.get(params.projectId);
        const commands = current.commands || [];

        // Add new command
        const newCommand = {
          name: params.name,
          command: params.command,
          description: params.description || '',
        };

        await techInfo.update(params.projectId, {
          commands: [...commands, newCommand],
        });

        return JSON.stringify({
          success: true,
          message: 'Command added',
          command: newCommand,
          totalCommands: commands.length + 1,
        }, null, 2);
      } catch (error) {
        return `Error adding command: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // remove_command - Remove a command
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'remove_tech_command',
    description: 'Remove a command from the project tech info by its index.',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
      index: z.number().min(0).describe('The command index (0-based)'),
    }),
    execute: async (params) => {
      try {
        // Get current commands
        const current = await techInfo.get(params.projectId);
        const commands = current.commands || [];

        if (params.index >= commands.length) {
          return `Error: Invalid index. There are only ${commands.length} commands (0-${commands.length - 1}).`;
        }

        const removed = commands[params.index];
        const updatedCommands = [...commands];
        updatedCommands.splice(params.index, 1);

        await techInfo.update(params.projectId, { commands: updatedCommands });

        return JSON.stringify({
          success: true,
          message: 'Command removed',
          removedCommand: removed,
          remainingCommands: updatedCommands.length,
        }, null, 2);
      } catch (error) {
        return `Error removing command: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // set_tech_notes - Set tech notes
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'set_tech_notes',
    description:
      'Set free-form technical notes for the project. Good for documenting setup instructions, ' +
      'environment variables, or other important information.',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
      notes: z.string().max(10000).describe('Technical notes (markdown supported)'),
    }),
    execute: async (params) => {
      try {
        await techInfo.update(params.projectId, { notes: params.notes });

        return JSON.stringify({
          success: true,
          message: 'Notes updated',
          preview: params.notes.substring(0, 100) + (params.notes.length > 100 ? '...' : ''),
        }, null, 2);
      } catch (error) {
        return `Error setting notes: ${formatError(error)}`;
      }
    },
  });
}
