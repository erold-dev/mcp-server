/**
 * Erold MCP Server v2
 *
 * Context Engine for AI Agents powered by Smart Strip compression.
 * 5 tools: get_context, log, search, intent, get_guidelines
 */

import { FastMCP } from 'fastmcp';
import {
  registerContextTool,
  registerLogTool,
  registerSearchTool,
  registerIntentTool,
  registerGuidelineTool,
} from './tools/index.js';

/**
 * Create and configure the MCP server
 */
export function createServer(): FastMCP {
  const server = new FastMCP({
    name: 'erold',
    version: '0.2.0',
  });

  // Register all 5 tools
  registerContextTool(server);
  registerLogTool(server);
  registerSearchTool(server);
  registerIntentTool(server);
  registerGuidelineTool(server);

  return server;
}

/**
 * Start the server
 */
export async function startServer(): Promise<void> {
  const server = createServer();

  // Start with stdio transport (for MCP clients)
  await server.start({
    transportType: 'stdio',
  });
}

export default { createServer, startServer };
