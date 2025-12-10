#!/usr/bin/env node
/**
 * Yet.Project MCP Server - CLI Entry Point
 *
 * This is the executable that gets run when users invoke:
 *   npx @yet/mcp-server
 *   yet-mcp
 */

import { startServer } from '../server.js';
import { validateConfig } from '../lib/config.js';

// Validate configuration before starting
validateConfig();

// Start the MCP server
startServer().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
