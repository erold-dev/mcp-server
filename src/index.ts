/**
 * Yet.Project MCP Server
 *
 * Main entry point - starts the MCP server.
 */

import { startServer } from './server.js';

// Start the server
startServer().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
