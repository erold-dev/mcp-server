# @yet/mcp-server

MCP (Model Context Protocol) server for Yet.Project - enabling AI agents to manage projects, tasks, and knowledge autonomously.

## Features

- **Task Management**: Create, update, complete, block tasks
- **Project Management**: Create projects, track progress, view stats
- **Knowledge Base**: Search, create, update documentation
- **AI Context**: Get workspace context, dashboard, workload data
- **Team Visibility**: View team members and workload distribution

## Installation

```bash
# Run directly with npx
npx @yet/mcp-server

# Or install globally
npm install -g @yet/mcp-server
yet-mcp
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `YET_API_KEY` | Yes | Your Yet.Project API key |
| `YET_TENANT` | Yes | Your tenant ID or slug |
| `YET_API_URL` | No | API URL (default: production) |

### Get Your API Key

1. Log in to Yet.Project
2. Go to **Settings > API Keys**
3. Create a new API key
4. Copy the key (starts with `yet_`)

## Usage with MCP Clients

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "yet-project": {
      "command": "npx",
      "args": ["@yet/mcp-server"],
      "env": {
        "YET_API_KEY": "yet_your_api_key_here",
        "YET_TENANT": "your-tenant-id"
      }
    }
  }
}
```

### Claude Code (VS Code)

Add to your MCP settings:

```json
{
  "yet-project": {
    "command": "npx",
    "args": ["@yet/mcp-server"],
    "env": {
      "YET_API_KEY": "yet_your_api_key_here",
      "YET_TENANT": "your-tenant-id"
    }
  }
}
```

### Other MCP Clients

The server uses stdio transport and works with any MCP-compatible client including:
- Cursor
- Windsurf
- Cline
- Continue.dev
- Custom AI agents

## Available Tools

### Task Tools

| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks with filters (project, status, priority, assignee) |
| `get_task` | Get detailed task information |
| `create_task` | Create a new task in a project |
| `update_task` | Update task fields |
| `start_task` | Start working on a task |
| `complete_task` | Mark task as complete |
| `block_task` | Mark task as blocked with reason |
| `search_tasks` | Search tasks by keyword |
| `add_task_comment` | Add a comment to a task |
| `get_task_comments` | Get all comments on a task |
| `get_blocked_tasks` | Get all blocked tasks |

### Project Tools

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects |
| `get_project` | Get project details |
| `create_project` | Create a new project |
| `update_project` | Update project fields |
| `get_project_stats` | Get project statistics |
| `get_project_tasks` | Get tasks in a project |

### Context Tools

| Tool | Description |
|------|-------------|
| `get_context` | Get AI-ready workspace context (most important!) |
| `get_dashboard` | Get dashboard overview |
| `get_stats` | Get workspace statistics |
| `get_workload` | Get team workload distribution |
| `list_members` | List team members |

### Knowledge Tools

| Tool | Description |
|------|-------------|
| `search_knowledge` | Search knowledge base |
| `get_knowledge` | Get article content |
| `list_knowledge` | List articles by category |
| `create_knowledge` | Create new article |
| `update_knowledge` | Update existing article |

## Example Workflows

### AI Agent Starting Work

```
1. get_context()        → Understand current state
2. list_projects()      → See available projects
3. list_tasks()         → Find tasks to work on
4. start_task()         → Begin working
5. add_task_comment()   → Document progress
6. complete_task()      → Mark done
```

### Creating a Feature

```
1. create_project()     → New project for the feature
2. create_task() x N    → Break into tasks
3. create_knowledge()   → Document the approach
4. start_task()         → Begin implementation
```

### Reviewing Blockers

```
1. get_blocked_tasks()  → See what's stuck
2. get_task()           → Get blocker details
3. add_task_comment()   → Propose solution
4. update_task()        → Unblock if resolved
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Test with MCP Inspector
npm run inspect

# Run tests
npm test
```

## Testing with MCP Inspector

```bash
# Set environment variables
export YET_API_KEY="yet_your_key"
export YET_TENANT="your-tenant"

# Run inspector
npm run inspect
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP Client    │────►│  @yet/mcp-server │────►│  Yet.Project    │
│ (Any MCP client)│stdio│   (This package) │https│     API         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

The server acts as a translator between the MCP protocol and the Yet.Project REST API.

## License

MIT
