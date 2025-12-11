/**
 * Yet.Project MCP Server
 *
 * FastMCP server configuration and setup.
 */

import { FastMCP } from 'fastmcp';
import {
  registerTaskTools,
  registerProjectTools,
  registerContextTools,
  registerKnowledgeTools,
  registerVaultTools,
  registerTechInfoTools,
} from './tools/index.js';

/**
 * Create and configure the MCP server
 */
export function createServer(): FastMCP {
  const server = new FastMCP({
    name: 'yet-project',
    version: '0.1.0',
  });

  // Register all tools
  registerTaskTools(server);
  registerProjectTools(server);
  registerContextTools(server);
  registerKnowledgeTools(server);
  registerVaultTools(server);
  registerTechInfoTools(server);

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
