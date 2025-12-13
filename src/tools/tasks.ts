/**
 * Task Tools
 *
 * MCP tools for task management - list, create, update, search, etc.
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { tasks } from '../lib/api-client.js';
import { formatError } from '../lib/errors.js';

// =============================================================================
// Schemas
// =============================================================================

const TaskStatusSchema = z.enum([
  'backlog',
  'analysis',
  'todo',
  'in-progress',
  'in-review',
  'bug',
  'blocked',
  'done',
]);
const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent', 'critical']);

// =============================================================================
// Tool Registration
// =============================================================================

export function registerTaskTools(mcp: FastMCP): void {
  // ---------------------------------------------------------------------------
  // list_tasks - List tasks with optional filters
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'list_tasks',
    description:
      'List tasks from Erold. Can filter by project, status, assignee, or priority. ' +
      'Returns an array of tasks with their details.',
    parameters: z.object({
      projectId: z.string().optional().describe('Filter by project ID'),
      status: TaskStatusSchema.optional().describe('Filter by status: backlog, analysis, todo, in-progress, in-review, bug, blocked, done'),
      assignee: z.string().optional().describe('Filter by assignee user ID'),
      priority: TaskPrioritySchema.optional().describe('Filter by priority: low, medium, high, urgent, critical'),
      limit: z.number().min(1).max(100).default(20).describe('Maximum number of tasks to return (default: 20)'),
    }),
    execute: async (params) => {
      try {
        const taskList = await tasks.list({
          projectId: params.projectId,
          status: params.status,
          assignee: params.assignee,
          priority: params.priority,
          limit: params.limit,
        });

        if (taskList.length === 0) {
          return 'No tasks found matching the criteria.';
        }

        const formatted = taskList.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          project: task.projectName || task.projectId,
          assignee: task.assigneeName || task.assignedTo || 'Unassigned',
          dueDate: task.dueDate || 'No due date',
        }));

        return JSON.stringify(formatted, null, 2);
      } catch (error) {
        return `Error listing tasks: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_task - Get detailed task information
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_task',
    description:
      'Get detailed information about a specific task by ID. ' +
      'Returns full task details including description, comments count, time logged, etc.',
    parameters: z.object({
      taskId: z.string().describe('The task ID to retrieve'),
    }),
    execute: async (params) => {
      try {
        const task = await tasks.get(params.taskId);

        return JSON.stringify({
          id: task.id,
          title: task.title,
          description: task.description || 'No description',
          status: task.status,
          priority: task.priority,
          project: task.projectName || task.projectId,
          assignee: task.assigneeName || task.assignedTo || 'Unassigned',
          dueDate: task.dueDate || 'No due date',
          tags: task.tags || [],
          progress: task.progress || 0,
          timeEstimate: task.timeEstimate ? `${task.timeEstimate}h` : 'Not estimated',
          timeLogged: task.timeLogged ? `${task.timeLogged}h` : 'No time logged',
          blockedReason: task.blockedReason || null,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        }, null, 2);
      } catch (error) {
        return `Error getting task: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // create_task - Create a new task
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'create_task',
    description:
      'Create a new task in a project. Requires project ID and title. ' +
      'Optionally set description, priority, and assignee.',
    parameters: z.object({
      projectId: z.string().describe('The project ID to create the task in'),
      title: z.string().min(1).max(200).describe('Task title (required)'),
      description: z.string().optional().describe('Task description (optional)'),
      priority: TaskPrioritySchema.default('medium').describe('Task priority (default: medium)'),
      assignee: z.string().optional().describe('User ID to assign the task to'),
    }),
    execute: async (params) => {
      try {
        const task = await tasks.create(params.projectId, {
          title: params.title,
          description: params.description,
          priority: params.priority,
          assignedTo: params.assignee,
        });

        return JSON.stringify({
          success: true,
          message: `Task created successfully`,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            projectId: task.projectId,
          },
        }, null, 2);
      } catch (error) {
        return `Error creating task: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // update_task - Update an existing task
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'update_task',
    description:
      'Update an existing task. Can modify title, description, status, priority, or assignee. ' +
      'Only provided fields will be updated.',
    parameters: z.object({
      taskId: z.string().describe('The task ID to update'),
      title: z.string().min(1).max(200).optional().describe('New task title'),
      description: z.string().optional().describe('New task description'),
      status: TaskStatusSchema.optional().describe('New status: backlog, analysis, todo, in-progress, in-review, bug, blocked, done'),
      priority: TaskPrioritySchema.optional().describe('New priority: low, medium, high, urgent, critical'),
      assignee: z.string().optional().describe('New assignee user ID'),
    }),
    execute: async (params) => {
      try {
        const updates: Record<string, unknown> = {};
        if (params.title) updates.title = params.title;
        if (params.description) updates.description = params.description;
        if (params.status) updates.status = params.status;
        if (params.priority) updates.priority = params.priority;
        if (params.assignee) updates.assignedTo = params.assignee;

        if (Object.keys(updates).length === 0) {
          return 'No updates provided. Specify at least one field to update.';
        }

        const task = await tasks.update(params.taskId, updates);

        return JSON.stringify({
          success: true,
          message: `Task updated successfully`,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
          },
        }, null, 2);
      } catch (error) {
        return `Error updating task: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // start_task - Start working on a task
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'start_task',
    description:
      'Start working on a task. Changes status to "in_progress". ' +
      'Use this when beginning work on a task.',
    parameters: z.object({
      taskId: z.string().describe('The task ID to start'),
    }),
    execute: async (params) => {
      try {
        const task = await tasks.start(params.taskId);

        return JSON.stringify({
          success: true,
          message: `Started task: ${task.title}`,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
          },
        }, null, 2);
      } catch (error) {
        return `Error starting task: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // complete_task - Mark a task as complete
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'complete_task',
    description:
      'Mark a task as complete. Changes status to "done". ' +
      'Optionally provide a completion summary.',
    parameters: z.object({
      taskId: z.string().describe('The task ID to complete'),
      summary: z.string().optional().describe('Optional completion summary'),
    }),
    execute: async (params) => {
      try {
        const task = await tasks.complete(params.taskId, params.summary);

        return JSON.stringify({
          success: true,
          message: `Completed task: ${task.title}`,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
          },
        }, null, 2);
      } catch (error) {
        return `Error completing task: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // block_task - Mark a task as blocked
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'block_task',
    description:
      'Mark a task as blocked with a reason. Changes status to "blocked". ' +
      'Use this when a task cannot proceed due to a blocker.',
    parameters: z.object({
      taskId: z.string().describe('The task ID to block'),
      reason: z.string().min(1).describe('The reason why the task is blocked (required)'),
    }),
    execute: async (params) => {
      try {
        const task = await tasks.block(params.taskId, params.reason);

        return JSON.stringify({
          success: true,
          message: `Blocked task: ${task.title}`,
          reason: params.reason,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
          },
        }, null, 2);
      } catch (error) {
        return `Error blocking task: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // search_tasks - Search tasks by query
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'search_tasks',
    description:
      'Search tasks by keyword. Searches in task titles and descriptions. ' +
      'Returns matching tasks.',
    parameters: z.object({
      query: z.string().min(1).describe('Search query'),
      limit: z.number().min(1).max(50).default(20).describe('Maximum results (default: 20)'),
    }),
    execute: async (params) => {
      try {
        const results = await tasks.search(params.query, { limit: params.limit });

        if (results.length === 0) {
          return `No tasks found matching "${params.query}"`;
        }

        const formatted = results.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          project: task.projectName || task.projectId,
        }));

        return JSON.stringify({
          query: params.query,
          count: results.length,
          results: formatted,
        }, null, 2);
      } catch (error) {
        return `Error searching tasks: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // add_task_comment - Add a comment to a task
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'add_task_comment',
    description:
      'Add a comment to a task. Use this to document progress, decisions, or notes.',
    parameters: z.object({
      taskId: z.string().describe('The task ID to comment on'),
      content: z.string().min(1).describe('The comment content'),
    }),
    execute: async (params) => {
      try {
        const comment = await tasks.addComment(params.taskId, params.content);

        return JSON.stringify({
          success: true,
          message: 'Comment added successfully',
          comment: {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
          },
        }, null, 2);
      } catch (error) {
        return `Error adding comment: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_task_comments - Get comments on a task
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_task_comments',
    description: 'Get all comments on a task.',
    parameters: z.object({
      taskId: z.string().describe('The task ID to get comments for'),
    }),
    execute: async (params) => {
      try {
        const commentList = await tasks.comments(params.taskId);

        if (commentList.length === 0) {
          return 'No comments on this task.';
        }

        const formatted = commentList.map((comment) => ({
          id: comment.id,
          author: comment.authorName || comment.authorId,
          content: comment.content,
          createdAt: comment.createdAt,
        }));

        return JSON.stringify(formatted, null, 2);
      } catch (error) {
        return `Error getting comments: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_blocked_tasks - Get all blocked tasks
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_blocked_tasks',
    description:
      'Get all tasks that are currently blocked. ' +
      'Useful for identifying blockers that need resolution.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const blockedList = await tasks.blocked();

        if (blockedList.length === 0) {
          return 'No blocked tasks. All clear!';
        }

        const formatted = blockedList.map((task) => ({
          id: task.id,
          title: task.title,
          project: task.projectName || task.projectId,
          blockedReason: task.blockedReason || 'No reason provided',
        }));

        return JSON.stringify({
          count: blockedList.length,
          blockedTasks: formatted,
        }, null, 2);
      } catch (error) {
        return `Error getting blocked tasks: ${formatError(error)}`;
      }
    },
  });
}
