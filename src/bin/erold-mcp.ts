#!/usr/bin/env node
/**
 * Erold MCP Server - CLI Entry Point
 *
 * This is the executable that gets run when users invoke:
 *   npx @erold/mcp-server
 *   erold-mcp
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
