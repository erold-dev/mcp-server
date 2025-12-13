# @yet/mcp-server - API Reference

## Installation & Setup

```bash
npm install -g @yet/mcp-server
```

## Required Environment Variables

| Variable | Value |
|----------|-------|
| `YET_API_KEY` | `yet_MNSA6nzfJlbB4BcmEPSI6mrjx29hN3th3I5uZhlSFr6xwg2e` |
| `YET_TENANT` | `RcMRG8RZ7L7Ei0jL3UU9` |
| `YET_API_URL` | `https://api.yet.watch/api/v1` |

---

## MCP Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "yet-project": {
      "command": "npx",
      "args": ["@yet/mcp-server"],
      "env": {
        "YET_API_KEY": "yet_MNSA6nzfJlbB4BcmEPSI6mrjx29hN3th3I5uZhlSFr6xwg2e",
        "YET_TENANT": "RcMRG8RZ7L7Ei0jL3UU9",
        "YET_API_URL": "https://api.yet.watch/api/v1"
      }
    }
  }
}
```

### Cursor / Windsurf / Claude Code

```json
{
  "yet-project": {
    "command": "npx",
    "args": ["@yet/mcp-server"],
    "env": {
      "YET_API_KEY": "yet_MNSA6nzfJlbB4BcmEPSI6mrjx29hN3th3I5uZhlSFr6xwg2e",
      "YET_TENANT": "RcMRG8RZ7L7Ei0jL3UU9",
      "YET_API_URL": "https://api.yet.watch/api/v1"
    }
  }
}
```

---

## API Base URL

```
https://api.yet.watch/api/v1/tenants/RcMRG8RZ7L7Ei0jL3UU9
```

## Authentication Header

```
X-API-Key: yet_MNSA6nzfJlbB4BcmEPSI6mrjx29hN3th3I5uZhlSFr6xwg2e
```

---

## MCP Tools (27 total)

### Task Tools (11)

| Tool | Description |
|------|-------------|
| `list_tasks` | List tasks with filters (project, status, priority, assignee) |
| `get_task` | Get detailed task info by ID |
| `create_task` | Create new task in a project |
| `update_task` | Update task fields |
| `start_task` | Mark task as in-progress |
| `complete_task` | Mark task as done |
| `block_task` | Block task with reason |
| `search_tasks` | Search tasks by keyword |
| `add_task_comment` | Add comment to task |
| `get_task_comments` | Get task comments |
| `get_blocked_tasks` | List all blocked tasks |

### Project Tools (6)

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects |
| `get_project` | Get project details |
| `create_project` | Create new project |
| `update_project` | Update project fields |
| `get_project_stats` | Get project statistics |
| `get_project_tasks` | Get tasks in project |

### Context Tools (5)

| Tool | Description |
|------|-------------|
| `get_context` | **AI-ready workspace context** (start here!) |
| `get_dashboard` | Dashboard overview |
| `get_stats` | Workspace statistics |
| `get_workload` | Team workload distribution |
| `list_members` | List team members |

### Knowledge Tools (5)

| Tool | Description |
|------|-------------|
| `search_knowledge` | Search knowledge base |
| `get_knowledge` | Get article content |
| `list_knowledge` | List articles by category/project (supports scope: all, global, project, combined) |
| `create_knowledge` | Create new article (global or project-specific) |
| `update_knowledge` | Update article |

**Knowledge Scoping:**
- `projectId: null` = Global knowledge (available to all projects)
- `projectId: "<id>"` = Project-specific knowledge
- Use `scope` parameter in list_knowledge: `all`, `global`, `project`, `combined`

---

## REST API Endpoints

**Base**: `https://api.yet.watch/api/v1/tenants/RcMRG8RZ7L7Ei0jL3UU9`

### Projects

```
GET    /projects                    # List all
GET    /projects/:id                # Get one
POST   /projects                    # Create
PATCH  /projects/:id                # Update
GET    /projects/:id/tasks          # Get project tasks
GET    /projects/:id/stats          # Get project stats
```

### Tasks

```
GET    /tasks                       # List all (with filters)
GET    /tasks/:id                   # Get one
POST   /projects/:projectId/tasks   # Create in project
PATCH  /tasks/:id                   # Update
POST   /tasks/:id/comments          # Add comment
GET    /tasks/:id/comments          # Get comments
```

### Knowledge

```
GET    /knowledge                   # List all
GET    /knowledge/:id               # Get one
POST   /knowledge                   # Create
PATCH  /knowledge/:id               # Update
GET    /knowledge/search?q=query    # Search
```

### Context

```
GET    /context                     # AI workspace context
GET    /dashboard                   # Dashboard data
GET    /stats                       # Statistics
GET    /workload                    # Team workload
GET    /members                     # Team members
```

---

## Example curl Commands

```bash
# List projects
curl -H "X-API-Key: yet_MNSA6nzfJlbB4BcmEPSI6mrjx29hN3th3I5uZhlSFr6xwg2e" \
  "https://api.yet.watch/api/v1/tenants/RcMRG8RZ7L7Ei0jL3UU9/projects"

# Get project tasks
curl -H "X-API-Key: yet_MNSA6nzfJlbB4BcmEPSI6mrjx29hN3th3I5uZhlSFr6xwg2e" \
  "https://api.yet.watch/api/v1/tenants/RcMRG8RZ7L7Ei0jL3UU9/projects/FWOi8ULJE2XSSKE6Vq6S/tasks"

# Create task
curl -X POST -H "X-API-Key: yet_MNSA6nzfJlbB4BcmEPSI6mrjx29hN3th3I5uZhlSFr6xwg2e" \
  -H "Content-Type: application/json" \
  "https://api.yet.watch/api/v1/tenants/RcMRG8RZ7L7Ei0jL3UU9/projects/FWOi8ULJE2XSSKE6Vq6S/tasks" \
  -d '{"title": "My task", "priority": "high"}'

# Update task status
curl -X PATCH -H "X-API-Key: yet_MNSA6nzfJlbB4BcmEPSI6mrjx29hN3th3I5uZhlSFr6xwg2e" \
  -H "Content-Type: application/json" \
  "https://api.yet.watch/api/v1/tenants/RcMRG8RZ7L7Ei0jL3UU9/tasks/TASK_ID" \
  -d '{"status": "inProgress"}'

# Add comment to task
curl -X POST -H "X-API-Key: yet_MNSA6nzfJlbB4BcmEPSI6mrjx29hN3th3I5uZhlSFr6xwg2e" \
  -H "Content-Type: application/json" \
  "https://api.yet.watch/api/v1/tenants/RcMRG8RZ7L7Ei0jL3UU9/tasks/TASK_ID/comments" \
  -d '{"content": "Started working on this"}'
```

---

## Current Projects

| ID | Name | Status |
|----|------|--------|
| `FWOi8ULJE2XSSKE6Vq6S` | Immortality AI | onHold |
| `huBOECqE3EFivTA2RRSw` | Yet.Project | active |
| `9X2ELi9SPuLVyridanGe` | Lux Memorial | inProgress |

---

## Quick Start for AI Agents

```
1. get_context()              → Understand workspace
2. list_projects()            → See projects
3. get_project_tasks(id)      → See tasks
4. start_task(id)             → Begin work
5. add_task_comment(id, msg)  → Log progress
6. complete_task(id)          → Mark done
```

---

## Task Statuses

| Status | Description | Default Visible |
|--------|-------------|-----------------|
| `backlog` | Not yet prioritized | No |
| `analysis` | Needs research/design | No |
| `todo` | Ready to start | Yes |
| `in-progress` | Being worked on | Yes |
| `in-review` | Ready for review | No |
| `bug` | Bug to fix | No |
| `blocked` | Blocked (use `block_task`) | Yes |
| `done` | Completed | Yes |

## Task Priorities

- `low`
- `medium`
- `high`
- `urgent`
- `critical`

## Project Statuses

- `planning`
- `active`
- `in-progress` / `inProgress`
- `on_hold` / `onHold`
- `completed`
- `cancelled`
- `archived`
