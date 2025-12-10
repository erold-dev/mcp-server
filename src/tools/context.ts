/**
 * Context Tools
 *
 * MCP tools for AI context, dashboard, and workspace overview.
 * These are the most important tools for AI agents to understand the current state.
 */

import { z } from 'zod';
import type { FastMCP } from 'fastmcp';
import { context, members } from '../lib/api-client.js';
import { formatError } from '../lib/errors.js';

// =============================================================================
// Tool Registration
// =============================================================================

export function registerContextTools(mcp: FastMCP): void {
  // ---------------------------------------------------------------------------
  // get_context - Get AI-ready project context (MOST IMPORTANT TOOL)
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_context',
    description:
      'Get AI-ready context for the current workspace. This is the most important tool for understanding ' +
      'the current state. Returns active project info, current tasks, blockers, recent activity, and ' +
      'relevant knowledge articles. Use this first when starting work on a project.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const ctx = await context.get();

        const result: Record<string, unknown> = {};

        // Active project
        if (ctx.activeProject) {
          result.activeProject = {
            id: ctx.activeProject.id,
            name: ctx.activeProject.name,
            status: ctx.activeProject.status,
            description: ctx.activeProject.description || 'No description',
          };
        }

        // Current tasks
        if (ctx.currentTasks && ctx.currentTasks.length > 0) {
          result.currentTasks = ctx.currentTasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            assignee: task.assigneeName || task.assignedTo || 'Unassigned',
          }));
        }

        // Blockers (important!)
        if (ctx.blockers && ctx.blockers.length > 0) {
          result.blockers = ctx.blockers.map((task) => ({
            id: task.id,
            title: task.title,
            reason: task.blockedReason || 'No reason provided',
          }));
        }

        // Recent activity
        if (ctx.recentActivity && ctx.recentActivity.length > 0) {
          result.recentActivity = ctx.recentActivity.slice(0, 10).map((activity) => ({
            description: activity.description,
            timestamp: activity.createdAt,
          }));
        }

        // Relevant knowledge
        if (ctx.relevantKnowledge && ctx.relevantKnowledge.length > 0) {
          result.relevantKnowledge = ctx.relevantKnowledge.map((kb) => ({
            id: kb.id,
            title: kb.title,
            category: kb.category,
          }));
        }

        if (Object.keys(result).length === 0) {
          return 'No context available. The workspace may be empty or you may need to create a project first.';
        }

        return JSON.stringify(result, null, 2);
      } catch (error) {
        return `Error getting context: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_dashboard - Get dashboard overview
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_dashboard',
    description:
      'Get dashboard overview with quick stats, your tasks, upcoming due dates, and recent completions.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const dashboard = await context.dashboard();

        const result: Record<string, unknown> = {
          overview: {
            totalProjects: dashboard.projectCount || 0,
            totalTasks: dashboard.taskCount || 0,
            openTasks: dashboard.openTasks || 0,
            blockedTasks: dashboard.blockedTasks || 0,
          },
        };

        // My tasks
        if (dashboard.myTasks && dashboard.myTasks.length > 0) {
          result.myTasks = dashboard.myTasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
          }));
        }

        // Upcoming due
        if (dashboard.upcomingDue && dashboard.upcomingDue.length > 0) {
          result.upcomingDue = dashboard.upcomingDue.map((task) => ({
            id: task.id,
            title: task.title,
            dueDate: task.dueDate || 'No date',
          }));
        }

        // Recent completed
        if (dashboard.recentCompleted && dashboard.recentCompleted.length > 0) {
          result.recentCompleted = dashboard.recentCompleted.map((task) => ({
            id: task.id,
            title: task.title,
          }));
        }

        return JSON.stringify(result, null, 2);
      } catch (error) {
        return `Error getting dashboard: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_stats - Get workspace statistics
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_stats',
    description:
      'Get detailed statistics for the workspace including task counts by status and priority.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const stats = await context.stats();

        return JSON.stringify({
          tasks: {
            total: stats.totalTasks || 0,
            completed: stats.completedTasks || 0,
            open: stats.openTasks || 0,
            blocked: stats.blockedTasks || 0,
          },
          projects: {
            total: stats.totalProjects || 0,
            active: stats.activeProjects || 0,
          },
          byStatus: stats.byStatus || {},
          byPriority: stats.byPriority || {},
          timeTracking: {
            totalLogged: stats.totalTimeLogged ? `${stats.totalTimeLogged}h` : null,
            thisWeek: stats.timeThisWeek ? `${stats.timeThisWeek}h` : null,
          },
        }, null, 2);
      } catch (error) {
        return `Error getting stats: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // get_workload - Get team workload distribution
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'get_workload',
    description:
      'Get team workload distribution showing task assignments per team member.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const workload = await context.workload();

        if (!workload.members || workload.members.length === 0) {
          return 'No workload data available.';
        }

        const result: Record<string, unknown> = {
          members: workload.members.map((member) => ({
            name: member.name || 'Unknown',
            assignedTasks: member.assignedTasks || 0,
            inProgress: member.inProgress || 0,
            completed: member.completed || 0,
            utilization: `${member.utilization || 0}%`,
          })),
        };

        if (workload.summary) {
          result.summary = {
            totalTasks: workload.summary.totalTasks || 0,
            unassigned: workload.summary.unassigned || 0,
            averageLoad: `${workload.summary.averageLoad || 0}%`,
          };
        }

        return JSON.stringify(result, null, 2);
      } catch (error) {
        return `Error getting workload: ${formatError(error)}`;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // list_members - List team members
  // ---------------------------------------------------------------------------
  mcp.addTool({
    name: 'list_members',
    description: 'List all team members in the workspace with their roles.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const memberList = await members.list();

        if (memberList.length === 0) {
          return 'No team members found.';
        }

        const formatted = memberList.map((member) => ({
          id: member.userId,
          name: member.name || member.email,
          email: member.email,
          role: member.role,
        }));

        return JSON.stringify(formatted, null, 2);
      } catch (error) {
        return `Error listing members: ${formatError(error)}`;
      }
    },
  });
}
