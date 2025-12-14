# Erold MCP Server Documentation

Complete guide for the Erold MCP (Model Context Protocol) server - connect AI assistants directly to your project management.

## What is MCP?

MCP (Model Context Protocol) is an open standard that allows AI assistants to interact with external tools and data sources. The Erold MCP server lets Claude, Cursor, and other AI assistants:

- Read and create tasks
- Update project status
- Access your knowledge base
- Log time and progress
- Manage team workload

All without copy-pasting between tools.

---

## Installation

### Quick Start (npx)

No installation required:

```bash
npx @erold/mcp-server
```

### Global Installation

```bash
npm install -g @erold/mcp-server
```

---

## Configuration

### Required Credentials

You need:
1. **API Key** - Get from [app.erold.dev](https://app.erold.dev) → Settings → API Keys
2. **Tenant ID** - Get from Settings → Workspace

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "erold": {
      "command": "npx",
      "args": ["@erold/mcp-server"],
      "env": {
        "EROLD_API_KEY": "erold_sk_live_xxxxxxxxxxxx",
        "EROLD_TENANT": "your-tenant-id"
      }
    }
  }
}
```

### Claude Code (VS Code)

Add to your Claude Code settings:

```json
{
  "erold": {
    "command": "npx",
    "args": ["@erold/mcp-server"],
    "env": {
      "EROLD_API_KEY": "erold_sk_live_xxxxxxxxxxxx",
      "EROLD_TENANT": "your-tenant-id"
    }
  }
}
```

### Cursor

Add to Cursor MCP settings (Settings → MCP):

```json
{
  "erold": {
    "command": "npx",
    "args": ["@erold/mcp-server"],
    "env": {
      "EROLD_API_KEY": "erold_sk_live_xxxxxxxxxxxx",
      "EROLD_TENANT": "your-tenant-id"
    }
  }
}
```

### Windsurf

Add to MCP configuration:

```json
{
  "erold": {
    "command": "npx",
    "args": ["@erold/mcp-server"],
    "env": {
      "EROLD_API_KEY": "erold_sk_live_xxxxxxxxxxxx",
      "EROLD_TENANT": "your-tenant-id"
    }
  }
}
```

### Cline

Add to Cline settings:

```json
{
  "mcpServers": {
    "erold": {
      "command": "npx",
      "args": ["@erold/mcp-server"],
      "env": {
        "EROLD_API_KEY": "erold_sk_live_xxxxxxxxxxxx",
        "EROLD_TENANT": "your-tenant-id"
      }
    }
  }
}
```

---

## Security Best Practices

### API Key Management

| Risk | Mitigation |
|------|------------|
| Key exposure in config | Use environment variables or secrets managers |
| Unauthorized access | Create separate keys per AI tool |
| Key compromise | Rotate keys regularly, monitor usage |
| Over-permissioned access | Use read-only keys when possible |

### Secure Configuration Methods

#### Method 1: Environment Variables (Recommended)

**macOS/Linux:**
```bash
# Add to ~/.zshrc or ~/.bashrc
export EROLD_API_KEY="erold_sk_live_xxxxxxxxxxxx"
export EROLD_TENANT="your-tenant-id"
```

Then in your MCP config:
```json
{
  "mcpServers": {
    "erold": {
      "command": "npx",
      "args": ["@erold/mcp-server"]
    }
  }
}
```

The server will read from environment automatically.

**Windows:**
```powershell
# Set system environment variables
[System.Environment]::SetEnvironmentVariable("EROLD_API_KEY", "erold_sk_live_xxx", "User")
[System.Environment]::SetEnvironmentVariable("EROLD_TENANT", "your-tenant-id", "User")
```

#### Method 2: macOS Keychain

```bash
# Store in keychain
security add-generic-password -a "erold" -s "erold-api-key" -w "erold_sk_live_xxx"

# Create wrapper script ~/bin/erold-mcp
#!/bin/bash
export EROLD_API_KEY=$(security find-generic-password -a "erold" -s "erold-api-key" -w)
export EROLD_TENANT="your-tenant-id"
npx @erold/mcp-server
```

Then use in config:
```json
{
  "mcpServers": {
    "erold": {
      "command": "/Users/you/bin/erold-mcp"
    }
  }
}
```

#### Method 3: 1Password/Bitwarden CLI

```bash
# 1Password wrapper
#!/bin/bash
export EROLD_API_KEY=$(op read "op://Private/Erold/api-key")
export EROLD_TENANT=$(op read "op://Private/Erold/tenant-id")
npx @erold/mcp-server
```

### What NOT To Do

```json
// DON'T commit MCP configs with real keys
{
  "env": {
    "EROLD_API_KEY": "erold_sk_live_real_key_here"  // Bad!
  }
}

// DON'T share config files
// DON'T use the same key across all tools
// DON'T ignore key rotation
```

### Key Rotation

1. Create new key in Erold dashboard
2. Update all MCP configurations
3. Restart AI assistants
4. Delete old key after confirming new key works

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EROLD_API_KEY` | Yes | Your API key (starts with `erold_`) |
| `EROLD_TENANT` | Yes | Your tenant ID or slug |
| `EROLD_API_URL` | No | Custom API URL (default: production) |

---

## Available Tools

### Task Management

| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks with filters (project, status, priority, assignee) |
| `get_task` | Get detailed task information |
| `create_task` | Create a new task |
| `update_task` | Update task fields |
| `start_task` | Start working on a task (sets status to in_progress) |
| `complete_task` | Mark task as complete |
| `block_task` | Mark task as blocked with reason |
| `search_tasks` | Search tasks by keyword |
| `add_task_comment` | Add a comment to a task |
| `get_task_comments` | Get all comments on a task |
| `get_blocked_tasks` | Get all blocked tasks |
| `log_time` | Log time spent on a task |

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

### Vault (Secrets)

| Tool | Description |
|------|-------------|
| `list_vault` | List vault entries (metadata only) |
| `get_vault_secret` | Get secret value (logged for audit) |
| `create_vault_secret` | Create new secret |
| `update_vault_secret` | Update secret |
| `delete_vault_secret` | Delete secret |

---

## Example Conversations

### Starting a Coding Session

**You:** "What should I work on today?"

**Claude:** *Uses `get_context` and `list_tasks`*

> Based on your Erold workspace, you have 3 high-priority tasks:
> 1. **TASK-45**: Fix authentication timeout (Backend API) - blocking others
> 2. **TASK-52**: Add input validation (Backend API)
> 3. **TASK-58**: Update API documentation
>
> I'd recommend starting with TASK-45 since it's blocking other work.

**You:** "Start working on task 45"

**Claude:** *Uses `start_task`*

> Done! I've marked TASK-45 as "In Progress" and assigned it to you. Here are the details:
>
> **Fix authentication timeout**
> Users report being logged out after 5 minutes instead of the expected 30-minute session.
>
> Let me know when you're ready to dive into the code.

### Creating Tasks

**You:** "Break down the OAuth implementation into tasks"

**Claude:** *Uses `create_task` multiple times*

> I've created the following tasks in the Backend API project:
>
> 1. **TASK-78**: Set up OAuth provider configuration (high priority)
> 2. **TASK-79**: Implement authorization endpoint (high priority)
> 3. **TASK-80**: Add token refresh logic (medium priority)
> 4. **TASK-81**: Write OAuth integration tests (medium priority)
>
> All tasks are linked and ready for you to start.

### End of Day Update

**You:** "Update my progress - I finished the auth timeout fix and made 50% progress on validation"

**Claude:** *Uses `complete_task` and `update_task`*

> Updated! Here's the summary:
>
> - **TASK-45**: Marked as **complete**
> - **TASK-52**: Progress updated to **50%**
>
> Great work today! You've completed 1 task and made significant progress on another.

### Accessing Knowledge

**You:** "How do we handle API rate limiting?"

**Claude:** *Uses `search_knowledge`*

> Found the rate limiting guide in your knowledge base:
>
> **API Rate Limiting Policy**
>
> We use a token bucket algorithm with these limits:
> - Free tier: 60 requests/minute
> - Pro tier: 300 requests/minute
>
> Implementation uses Redis for distributed rate limiting...

### Blocking a Task

**You:** "I'm blocked on task 52 - waiting for the security team review"

**Claude:** *Uses `block_task`*

> I've marked TASK-52 as **blocked** with the reason: "Waiting for security team review"
>
> The team will be notified. Would you like me to find another task for you to work on in the meantime?

---

## Testing with MCP Inspector

```bash
# Set environment variables
export EROLD_API_KEY="erold_sk_live_xxx"
export EROLD_TENANT="your-tenant"

# Run inspector
npm run inspect
```

This opens the MCP Inspector where you can test tools interactively.

---

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
- Ensure the MCP server is running (check logs)

### "Tenant not found"

- Verify tenant ID in Settings → Workspace
- Try using the tenant slug instead of ID
- Check you have access to the tenant

### Debug Logging

Enable debug mode to see detailed logs:

```bash
DEBUG=erold:* npx @erold/mcp-server
```

Or in your config:

```json
{
  "mcpServers": {
    "erold": {
      "command": "npx",
      "args": ["@erold/mcp-server"],
      "env": {
        "EROLD_API_KEY": "...",
        "EROLD_TENANT": "...",
        "DEBUG": "erold:*"
      }
    }
  }
}
```

---

## Supported AI Assistants

Works with any MCP-compatible client:

| Assistant | Status | Notes |
|-----------|--------|-------|
| Claude Desktop | Fully supported | Recommended |
| Claude Code (VS Code) | Fully supported | |
| Cursor | Fully supported | |
| Windsurf | Fully supported | |
| Cline | Fully supported | |
| Continue.dev | Fully supported | |
| Custom agents | Supported | Any MCP-compatible implementation |

---

## Development

### Local Development

```bash
# Clone the repo
git clone https://github.com/erold-dev/mcp-server.git
cd mcp-server

# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start
```

### Running Tests

```bash
npm test
```

### Contributing

See [CONTRIBUTING.md](https://github.com/erold-dev/mcp-server/blob/main/CONTRIBUTING.md)

---

## Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│   AI Assistant  │  MCP   │  @erold/mcp-server │  API  │   Erold Cloud   │
│  (Claude, etc.) │───────►│    (This package) │───────►│                 │
└─────────────────┘        └──────────────────┘        └─────────────────┘
        │                           │                          │
        │ Natural language          │ Tool calls               │ REST API
        │ "Create a task..."        │ create_task()            │ POST /tasks
```

The MCP server acts as a bridge:
1. AI assistant sends natural language request
2. MCP server translates to appropriate tool call
3. Tool makes API request to Erold Cloud
4. Response flows back to AI assistant

---

## Changelog

### v1.0.0 (2024-12-14)
- Initial stable release
- 30+ tools for full project management
- Support for Claude, Cursor, Windsurf, Cline
- Vault integration for secrets
- Knowledge base access

---

## Support

- **Documentation:** [erold.dev/docs/mcp](https://erold.dev/docs/mcp)
- **Issues:** [github.com/erold-dev/mcp-server/issues](https://github.com/erold-dev/mcp-server/issues)
- **Email:** support@erold.dev
- **MCP Specification:** [modelcontextprotocol.io](https://modelcontextprotocol.io)
