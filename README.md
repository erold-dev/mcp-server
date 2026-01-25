<div align="center">

# @erold/mcp-server

**MCP server for AI-powered project management**

[![npm version](https://img.shields.io/npm/v/@erold/mcp-server.svg)](https://www.npmjs.com/package/@erold/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)

Let Claude, Cursor, and other AI assistants manage your Erold projects directly.

[Website](https://erold.dev) · [Documentation](https://erold.dev/docs/mcp) · [Report Bug](https://github.com/erold-dev/mcp-server/issues)

</div>

---

## What is This?

This MCP (Model Context Protocol) server connects AI assistants to Erold, enabling them to:

- Create and manage tasks
- Track project progress
- Access your knowledge base
- Update status as they work

No more copy-pasting between your AI assistant and project management tools.

## How It Works

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│   AI Assistant  │  MCP   │  @erold/mcp-server │  API  │   Erold Cloud   │
│  (Claude, etc.) │───────►│    (This package) │───────►│                 │
└─────────────────┘        └──────────────────┘        └─────────────────┘
```

Your AI can now say things like:

> "Create a task for implementing OAuth in the Backend project"

And it actually happens.

## Quick Start

### 1. Get Your API Key

1. Log in to [app.erold.dev](https://app.erold.dev)
2. Go to **Settings → API Keys**
3. Create a new key (starts with `erold_`)

### 2. Configure Your AI Assistant

#### Claude Code (Recommended)

Run this command in your terminal:

```bash
claude mcp add-json erold '{"command":"npx","args":["-y","@erold/mcp-server@latest"],"env":{"EROLD_API_KEY":"YOUR_API_KEY","EROLD_TENANT":"YOUR_TENANT_ID"}}' --scope user
```

Verify the connection:

```bash
claude mcp list
```

You should see: `erold: npx -y @erold/mcp-server@latest - ✓ Connected`

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "erold": {
      "command": "npx",
      "args": ["-y", "@erold/mcp-server@latest"],
      "env": {
        "EROLD_API_KEY": "erold_your_api_key",
        "EROLD_TENANT": "your-tenant-id"
      }
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "erold": {
      "command": "npx",
      "args": ["-y", "@erold/mcp-server@latest"],
      "env": {
        "EROLD_API_KEY": "erold_your_api_key",
        "EROLD_TENANT": "your-tenant-id"
      }
    }
  }
}
```

> **Important**: Use actual values for environment variables. Do NOT use `${EROLD_API_KEY}` syntax - Claude apps don't expand shell variables.

### 3. Start Using It

Ask your AI assistant:

- "What tasks are assigned to me?"
- "Create a high-priority task for fixing the login bug"
- "Mark task TASK-123 as complete"
- "What's the status of the Backend API project?"

## Claude Code Plugin

For the full Erold experience with skills, agents, and hooks, install the dedicated Claude Code plugin:

```bash
claude plugin install erold-dev/claude-plugin --scope user
```

> **Important:** Configure your credentials in `~/.claude/mcp.json` (not the plugin directory) so they survive plugin updates. See the [plugin setup guide](https://github.com/erold-dev/claude-plugin/blob/main/docs/SETUP.md).

### Skills (Slash Commands)

| Skill | Description |
|-------|-------------|
| `/erold:context` | Load workspace context (UNDERSTAND phase) |
| `/erold:plan` | Create tasks from requirements (PLAN phase) |
| `/erold:execute` | Work on a task with full context (EXECUTE phase) |
| `/erold:learn` | Save learnings to knowledge base (LEARN phase) |
| `/erold:guidelines` | Fetch coding guidelines for technologies |
| `/erold:task` | Quick task operations (list, start, complete) |
| `/erold:search` | Search tasks and knowledge |
| `/erold:status` | Dashboard and progress overview |

### Agents

| Agent | Description |
|-------|-------------|
| `erold-workflow` | Enforces the 4-phase methodology |
| `erold-reviewer` | Reviews code against guidelines |
| `erold-learner` | Extracts patterns from completed work |

### Commands

| Command | Description |
|---------|-------------|
| `/erold:init` | Initialize Erold in current project |
| `/erold:sync` | Sync local work with Erold PM |
| `/erold:report` | Generate progress report |

### Hooks

The plugin includes hooks for workflow enforcement:
- **Session start**: Auto-load context
- **Pre-edit**: Check for active task
- **Post-edit**: Log activity
- **Pre-commit**: Code review
- **Task complete**: Suggest learnings

### The Erold Methodology

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ UNDERSTAND  │ → │    PLAN     │ → │   EXECUTE   │ → │    LEARN    │
│             │    │             │    │             │    │             │
│ Load context│    │ Create tasks│    │ Implement   │    │ Capture     │
│ Fetch info  │    │ Break down  │    │ Track work  │    │ patterns    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## Available Tools

### Task Management

| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks with filters (project, status, priority, assignee) |
| `get_task` | Get detailed task information |
| `create_task` | Create a new task |
| `update_task` | Update task fields |
| `start_task` | Start working on a task |
| `complete_task` | Mark task as complete |
| `block_task` | Mark task as blocked with reason |
| `search_tasks` | Search tasks by keyword |
| `add_task_comment` | Add a comment to a task |
| `get_task_comments` | Get all comments on a task |
| `get_blocked_tasks` | Get all blocked tasks |

### Project Management

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects |
| `get_project` | Get project details |
| `create_project` | Create a new project |
| `update_project` | Update project fields |
| `get_project_stats` | Get project statistics |
| `get_project_tasks` | Get tasks in a project |

### Knowledge Base

| Tool | Description |
|------|-------------|
| `search_knowledge` | Search knowledge base |
| `get_knowledge` | Get article content |
| `list_knowledge` | List articles by category |
| `create_knowledge` | Create new article |
| `update_knowledge` | Update existing article |

### Context & Insights

| Tool | Description |
|------|-------------|
| `get_context` | Get AI-ready workspace context |
| `get_dashboard` | Get dashboard overview |
| `get_stats` | Get workspace statistics |
| `get_workload` | Get team workload distribution |
| `list_members` | List team members |

### Guidelines

| Tool | Description |
|------|-------------|
| `get_guidelines` | Fetch coding guidelines by category |
| `list_guidelines` | List all available guidelines |
| `search_guidelines` | Search across all guidelines |

## Example Conversations

### Starting a Coding Session

**You:** "What should I work on today?"

**Claude:** *Uses `get_context` and `list_tasks`*

> "You have 3 high-priority tasks:
> 1. TASK-45: Fix authentication timeout (Backend API)
> 2. TASK-52: Add input validation (Backend API)  
> 3. TASK-58: Update API documentation (Documentation)
>
> I'd suggest starting with TASK-45 since it's blocking other work."

**You:** "Start working on task 45"

**Claude:** *Uses `start_task`*

> "Started TASK-45. I've updated the status to 'In Progress' and assigned it to you."

### Creating Tasks

**You:** "Break down the OAuth implementation into tasks"

**Claude:** *Uses `create_task` multiple times*

> "I've created the following tasks in the Backend API project:
> 1. TASK-78: Set up OAuth provider configuration
> 2. TASK-79: Implement authorization endpoint
> 3. TASK-80: Add token refresh logic
> 4. TASK-81: Write OAuth integration tests
>
> All set to high priority."

### End of Day

**You:** "Update my progress - I finished the auth timeout fix and made 50% progress on validation"

**Claude:** *Uses `complete_task` and `update_task`*

> "Done! TASK-45 is now complete, and I've updated TASK-52 to 50% progress."

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EROLD_API_KEY` | Yes | Your Erold API key (starts with `erold_`) |
| `EROLD_TENANT` | Yes | Your tenant ID or slug |
| `EROLD_API_URL` | No | Custom API URL (default: production) |

### Finding Your Tenant ID

1. Log in to [app.erold.dev](https://app.erold.dev)
2. Go to **Settings → Workspace**
3. Copy your tenant ID or slug

## Supported AI Assistants

Works with any MCP-compatible client:

- **Claude Desktop** — Anthropic's desktop app
- **Claude Code** — VS Code extension
- **Cursor** — AI-first code editor
- **Windsurf** — Codeium's AI IDE
- **Cline** — VS Code AI assistant
- **Continue.dev** — Open source AI assistant
- **Custom agents** — Any MCP-compatible implementation

## Development

```bash
# Clone the repo
git clone https://github.com/erold-dev/mcp-server.git
cd mcp-server

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run locally
npm start
```

### Testing with MCP Inspector

```bash
# Set environment variables
export EROLD_API_KEY="erold_your_key"
export EROLD_TENANT="your-tenant"

# Run inspector
npm run inspect
```

## Troubleshooting

### "API key invalid"

- Verify your key starts with `erold_`
- Check the key hasn't expired in Settings → API Keys
- Ensure you're using the correct tenant ID

### "Connection refused"

- Check your internet connection
- Verify the API URL if using a custom one
- Try restarting your AI assistant

### Tools not appearing

- Restart your AI assistant after config changes
- Verify the config file path is correct
- Check for JSON syntax errors in config

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Related

- [@erold/cli](https://github.com/erold-dev/cli) — Command-line interface
- [Erold Web App](https://app.erold.dev) — Full web interface
- [Documentation](https://erold.dev/docs) — Complete documentation
- [MCP Specification](https://modelcontextprotocol.io) — Model Context Protocol

## License

MIT © [Erold](https://erold.dev)
