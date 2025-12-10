/**
 * Project Tools
 *
 * MCP tools for project management - list, create, update, stats.
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { projects } from '../lib/api-client.js';
import { formatError } from '../lib/errors.js';

// =============================================================================
// Schemas
// =============================================================================

const ProjectStatusSchema = z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']);

// =============================================================================
// Tool Registration
// =============================================================================

export function registerProjectTools(mcp: FastMCP): void {
  // ---------------------------------------------------------------------------
  // list_projects - List all projects
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'list_projects',
    description:
      'List all projects in the workspace. Can filter by status. ' +
      'Returns project names, status, and task counts.',
    parameters: z.object({
      status: ProjectStatusSchema.optional().describe(
        'Filter by status: planning, active, on_hold, completed, cancelled'
      ),
    }),
    execute: async (params) => {
      try {
        const projectList = await projects.list({ status: params.status });

        if (projectList.length === 0) {
          return 'No projects found.';
        }

        const formatted = projectList.map((project) => ({
          id: project.id,
          name: project.name,
          slug: project.slug || null,
          status: project.status,
          taskCount: project.taskCount ?? 0,
          completedTasks: project.completedTasks ?? 0,
        }));

        return JSON.stringify(formatted, null, 2);
      } catch (error) {
        return `Error listing projects: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_project - Get project details
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_project',
    description:
      'Get detailed information about a specific project. ' +
      'Returns project details including description and progress.',
    parameters: z.object({
      projectId: z.string().describe('The project ID to retrieve'),
    }),
    execute: async (params) => {
      try {
        const project = await projects.get(params.projectId);

        const progress = project.taskCount && project.taskCount > 0
          ? Math.round(((project.completedTasks || 0) / project.taskCount) * 100)
          : 0;

        return JSON.stringify({
          id: project.id,
          name: project.name,
          slug: project.slug || null,
          description: project.description || 'No description',
          status: project.status,
          taskCount: project.taskCount ?? 0,
          completedTasks: project.completedTasks ?? 0,
          progress: `${progress}%`,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        }, null, 2);
      } catch (error) {
        return `Error getting project: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // create_project - Create a new project
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'create_project',
    description:
      'Create a new project. Requires a name. ' +
      'Optionally provide description and URL-friendly slug.',
    parameters: z.object({
      name: z.string().min(1).max(100).describe('Project name (required)'),
      description: z.string().optional().describe('Project description'),
      slug: z.string().regex(/^[a-z0-9-]+$/).optional().describe(
        'URL-friendly slug (lowercase letters, numbers, hyphens only)'
      ),
    }),
    execute: async (params) => {
      try {
        // Generate slug from name if not provided
        const slug = params.slug || params.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        const project = await projects.create({
          name: params.name,
          description: params.description,
          slug,
        });

        return JSON.stringify({
          success: true,
          message: `Project created successfully`,
          project: {
            id: project.id,
            name: project.name,
            slug: project.slug,
            status: project.status,
          },
        }, null, 2);
      } catch (error) {
        return `Error creating project: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // update_project - Update an existing project
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'update_project',
    description:
      'Update an existing project. Can modify name, description, or status. ' +
      'Only provided fields will be updated.',
    parameters: z.object({
      projectId: z.string().describe('The project ID to update'),
      name: z.string().min(1).max(100).optional().describe('New project name'),
      description: z.string().optional().describe('New project description'),
      status: ProjectStatusSchema.optional().describe(
        'New status: planning, active, on_hold, completed, cancelled'
      ),
    }),
    execute: async (params) => {
      try {
        const updates: Record<string, unknown> = {};
        if (params.name) updates.name = params.name;
        if (params.description !== undefined) updates.description = params.description;
        if (params.status) updates.status = params.status;

        if (Object.keys(updates).length === 0) {
          return 'No updates provided. Specify at least one field to update.';
        }

        const project = await projects.update(params.projectId, updates);

        return JSON.stringify({
          success: true,
          message: `Project updated successfully`,
          project: {
            id: project.id,
            name: project.name,
            status: project.status,
          },
        }, null, 2);
      } catch (error) {
        return `Error updating project: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_project_stats - Get project statistics
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_project_stats',
    description:
      'Get statistics for a project including task breakdown by status and priority.',
    parameters: z.object({
      projectId: z.string().describe('The project ID to get stats for'),
    }),
    execute: async (params) => {
      try {
        const [project, stats] = await Promise.all([
          projects.get(params.projectId),
          projects.stats(params.projectId),
        ]);

        const progress = stats.totalTasks > 0
          ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
          : 0;

        return JSON.stringify({
          project: {
            id: project.id,
            name: project.name,
            status: project.status,
          },
          stats: {
            totalTasks: stats.totalTasks,
            completedTasks: stats.completedTasks,
            openTasks: stats.openTasks,
            blockedTasks: stats.blockedTasks,
            progress: `${progress}%`,
            byStatus: stats.byStatus,
            byPriority: stats.byPriority,
            totalTimeLogged: stats.totalTimeLogged ? `${stats.totalTimeLogged}h` : null,
          },
        }, null, 2);
      } catch (error) {
        return `Error getting project stats: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_project_tasks - Get tasks in a project
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_project_tasks',
    description:
      'Get all tasks in a specific project. Can filter by status.',
    parameters: z.object({
      projectId: z.string().describe('The project ID'),
      status: z.enum(['todo', 'in_progress', 'in_review', 'blocked', 'done']).optional().describe(
        'Filter by status'
      ),
      limit: z.number().min(1).max(100).default(50).describe('Maximum tasks to return'),
    }),
    execute: async (params) => {
      try {
        const taskList = await projects.tasks(params.projectId, {
          status: params.status,
          limit: params.limit,
        });

        if (taskList.length === 0) {
          return 'No tasks found in this project.';
        }

        const formatted = taskList.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignee: task.assigneeName || task.assignedTo || 'Unassigned',
        }));

        return JSON.stringify({
          projectId: params.projectId,
          count: taskList.length,
          tasks: formatted,
        }, null, 2);
      } catch (error) {
        return `Error getting project tasks: ${formatError(error)}`;
      }
    },
  });
}
