/**
 * Tools Index v2
 *
 * 5 tools for the Context Engine:
 * - get_context: Load project context
 * - log: Record events
 * - search: Find fragments
 * - intent: Track intents
 * - get_guidelines: Fetch coding guidelines
 */

export { registerContextTool } from './context.js';
export { registerLogTool } from './log.js';
export { registerSearchTool } from './search.js';
export { registerIntentTool } from './intent.js';
export { registerGuidelineTool } from './guidelines.js';
