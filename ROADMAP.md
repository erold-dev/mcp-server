# Yet.Project MCP Server - Implementation Roadmap

## Overview

This MCP (Model Context Protocol) server enables AI agents to autonomously interact with Yet.Project - creating projects, managing tasks, updating knowledge, and maintaining context.

**Goal:** Give AI agents full programmatic access to Yet.Project through a standardized, secure protocol.

---

## Architecture

```
yet.project/
├── app/           # Next.js web application
├── backend/       # Firebase backend
├── cli/           # Command-line tool
├── www/           # Documentation site
└── mcp-server/    # MCP Server (this project)
```

### MCP Server Structure

```
mcp-server/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── server.ts                # FastMCP server setup
│   │
│   ├── tools/                   # MCP Tools (actions)
│   │   ├── index.ts             # Tool exports
│   │   ├── tasks.ts             # Task management tools
│   │   ├── projects.ts          # Project management tools
│   │   ├── knowledge.ts         # Knowledge base tools
│   │   ├── context.ts           # Context & dashboard tools
│   │   └── members.ts           # Team member tools
│   │
│   ├── resources/               # MCP Resources (read-only data)
│   │   ├── index.ts             # Resource exports
│   │   ├── projects.ts          # Project resources
│   │   ├── tasks.ts             # Task resources
│   │   └── knowledge.ts         # Knowledge resources
│   │
│   ├── prompts/                 # MCP Prompts (workflow templates)
│   │   ├── index.ts             # Prompt exports
│   │   ├── sprint.ts            # Sprint management prompts
│   │   ├── reporting.ts         # Reporting prompts
│   │   └── handoff.ts           # AI context handoff prompts
│   │
│   ├── lib/                     # Shared utilities
│   │   ├── api-client.ts        # Yet.Project API client
│   │   ├── auth.ts              # Authentication (API key)
│   │   ├── config.ts            # Configuration management
│   │   ├── errors.ts            # Error handling
│   │   └── schemas.ts           # Zod validation schemas
│   │
│   └── types/                   # TypeScript types
│       └── index.ts
│
├── tests/                       # Test files
│   ├── tools/
│   ├── resources/
│   └── integration/
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── ROADMAP.md                   # This file
└── README.md                    # Usage documentation
```

---

## Technology Stack

| Component | Technology | Reason |
|-----------|------------|--------|
| **Framework** | FastMCP (TypeScript) | Zero boilerplate, Zod validation |
| **Language** | TypeScript | Matches existing stack |
| **Validation** | Zod | Runtime + compile-time safety |
| **HTTP Client** | Native fetch | Built into Node.js 18+ |
| **Testing** | Vitest | Same as app/cli |
| **Transport** | stdio (local) | For Claude Desktop/Code |

---

## Authentication

Using **existing API Key** infrastructure:

```
Flow:
1. User generates API key in Yet.Project web UI (Settings > API Keys)
2. User configures key in MCP client (Claude Desktop config)
3. MCP Server uses key to authenticate with Yet.Project API
4. Server exchanges key for Firebase token via POST /api/v1/auth/token
5. Token used for all subsequent API calls

Config (claude_desktop_config.json):
{
  "mcpServers": {
    "yet-project": {
      "command": "npx",
      "args": ["@yet/mcp-server"],
      "env": {
        "YET_API_KEY": "yet_xxxxxxxxxxxxx",
        "YET_TENANT": "tenant-id-or-slug"
      }
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation & Core Tools (MVP)

**Goal:** Basic task and project management for AI agents

#### 1.1 Project Setup
- [ ] Initialize package.json with dependencies
- [ ] Configure TypeScript (tsconfig.json)
- [ ] Setup Vitest for testing
- [ ] Create FastMCP server skeleton
- [ ] Implement API client (reuse patterns from CLI)
- [ ] Implement authentication with API key

#### 1.2 Core Tools - Tasks
| Tool | Description | Priority |
|------|-------------|----------|
| `list_tasks` | List tasks with filters (project, status, assignee, priority) | P0 |
| `get_task` | Get detailed task information | P0 |
| `create_task` | Create a new task in a project | P0 |
| `update_task` | Update task fields (title, description, status, priority) | P0 |
| `search_tasks` | Search tasks by query | P1 |

#### 1.3 Core Tools - Projects
| Tool | Description | Priority |
|------|-------------|----------|
| `list_projects` | List all accessible projects | P0 |
| `get_project` | Get project details and stats | P0 |
| `create_project` | Create a new project | P1 |
| `get_project_stats` | Get project statistics | P1 |

#### 1.4 Core Tools - Context
| Tool | Description | Priority |
|------|-------------|----------|
| `get_context` | Get AI-ready project context (critical!) | P0 |
| `get_dashboard` | Get dashboard overview | P1 |

#### Phase 1 Deliverables
- Working MCP server with 10-12 core tools
- API key authentication
- Basic error handling
- README with setup instructions
- Can be used with Claude Desktop

---

### Phase 2: Full Task Management

**Goal:** Complete task lifecycle management

#### 2.1 Task Action Tools
| Tool | Description |
|------|-------------|
| `start_task` | Start working on a task (status → in_progress) |
| `complete_task` | Mark task as complete with optional summary |
| `block_task` | Mark task as blocked with reason |
| `add_task_comment` | Add a comment to a task |
| `get_task_comments` | Get all comments on a task |
| `log_task_time` | Log time spent on a task |

#### 2.2 Task Resources (Read-only)
| Resource URI | Description |
|--------------|-------------|
| `yet://tasks/blocked` | All blocked tasks |
| `yet://tasks/mine` | Current user's assigned tasks |
| `yet://projects/{id}/tasks` | All tasks in a project |

#### 2.3 Task Filtering Enhancements
- Filter by due date range
- Filter by tags
- Sort options (priority, due date, created)

#### Phase 2 Deliverables
- 6 additional task tools
- 3 task resources
- Full task lifecycle support
- Comments and time logging

---

### Phase 3: Knowledge Base & Team

**Goal:** Knowledge management and team visibility

#### 3.1 Knowledge Tools
| Tool | Description |
|------|-------------|
| `search_knowledge` | Search knowledge base articles |
| `get_knowledge` | Get specific knowledge article |
| `create_knowledge` | Create new knowledge article |
| `update_knowledge` | Update existing article |
| `list_knowledge_categories` | List available categories |

#### 3.2 Knowledge Resources
| Resource URI | Description |
|--------------|-------------|
| `yet://knowledge` | All knowledge articles |
| `yet://knowledge/{category}` | Articles by category |
| `yet://knowledge/{id}` | Specific article content |

#### 3.3 Team Tools
| Tool | Description |
|------|-------------|
| `list_members` | List team members |
| `get_workload` | Get team workload distribution |

#### Phase 3 Deliverables
- 5 knowledge tools
- 3 knowledge resources
- 2 team tools
- Full knowledge base management

---

### Phase 4: Prompts & Advanced Features

**Goal:** Workflow templates and AI-optimized features

#### 4.1 Sprint Management Prompts
| Prompt | Description |
|--------|-------------|
| `sprint_summary` | Generate sprint status summary |
| `blocked_report` | Generate blocked tasks report |
| `daily_standup` | Prepare daily standup notes |

#### 4.2 AI Workflow Prompts
| Prompt | Description |
|--------|-------------|
| `task_breakdown` | Break feature into tasks |
| `context_handoff` | Prepare context for another AI session |
| `project_review` | Generate project health review |

#### 4.3 Advanced Tools
| Tool | Description |
|------|-------------|
| `bulk_update_tasks` | Update multiple tasks at once |
| `create_milestone` | Create project milestone |
| `get_activity` | Get recent activity log |

#### Phase 4 Deliverables
- 6 workflow prompts
- 3 advanced tools
- Documentation for prompt usage

---

### Phase 5: Production Hardening

**Goal:** Production-ready, reliable, secure

#### 5.1 Error Handling
- [ ] Comprehensive error types
- [ ] Retry logic with exponential backoff
- [ ] Rate limit handling
- [ ] Network timeout handling

#### 5.2 Caching
- [ ] Token caching (avoid re-auth)
- [ ] Project list caching (short TTL)
- [ ] Resource caching strategy

#### 5.3 Logging & Debugging
- [ ] Structured logging
- [ ] Debug mode (verbose output)
- [ ] Request/response tracing

#### 5.4 Security
- [ ] Input sanitization
- [ ] Permission validation
- [ ] Audit logging

#### 5.5 Testing
- [ ] Unit tests for all tools
- [ ] Integration tests with mock API
- [ ] E2E tests with real API (optional)

#### Phase 5 Deliverables
- Production-grade error handling
- Caching layer
- Comprehensive test coverage
- Security audit passed

---

### Phase 6: Distribution & Documentation

**Goal:** Easy installation and great developer experience

#### 6.1 NPM Package
- [ ] Package as `@yet/mcp-server`
- [ ] Executable via `npx @yet/mcp-server`
- [ ] Version management
- [ ] Changelog

#### 6.2 Documentation
- [ ] README with quick start
- [ ] Tool reference documentation
- [ ] Resource reference documentation
- [ ] Prompt reference documentation
- [ ] Troubleshooting guide

#### 6.3 Examples
- [ ] Claude Desktop configuration example
- [ ] Example AI workflows
- [ ] Integration examples

#### Phase 6 Deliverables
- Published npm package
- Complete documentation
- Example configurations

---

## Tool Reference (Complete List)

### Task Tools
| Tool | Input | Output |
|------|-------|--------|
| `list_tasks` | `{ projectId?, status?, assignee?, priority?, limit? }` | `Task[]` |
| `get_task` | `{ taskId }` | `Task` |
| `create_task` | `{ projectId, title, description?, priority?, assignee? }` | `Task` |
| `update_task` | `{ taskId, title?, description?, status?, priority?, assignee? }` | `Task` |
| `start_task` | `{ taskId }` | `Task` |
| `complete_task` | `{ taskId, summary? }` | `Task` |
| `block_task` | `{ taskId, reason }` | `Task` |
| `search_tasks` | `{ query, limit? }` | `Task[]` |
| `add_task_comment` | `{ taskId, content }` | `Comment` |
| `get_task_comments` | `{ taskId }` | `Comment[]` |
| `log_task_time` | `{ taskId, hours, notes? }` | `TimeLog` |

### Project Tools
| Tool | Input | Output |
|------|-------|--------|
| `list_projects` | `{ status? }` | `Project[]` |
| `get_project` | `{ projectId }` | `Project` |
| `create_project` | `{ name, description?, slug? }` | `Project` |
| `update_project` | `{ projectId, name?, description?, status? }` | `Project` |
| `get_project_stats` | `{ projectId }` | `ProjectStats` |
| `get_project_tasks` | `{ projectId, status?, limit? }` | `Task[]` |

### Knowledge Tools
| Tool | Input | Output |
|------|-------|--------|
| `search_knowledge` | `{ query }` | `KnowledgeArticle[]` |
| `get_knowledge` | `{ articleId }` | `KnowledgeArticle` |
| `create_knowledge` | `{ title, category, content }` | `KnowledgeArticle` |
| `update_knowledge` | `{ articleId, title?, category?, content? }` | `KnowledgeArticle` |
| `list_knowledge_by_category` | `{ category }` | `KnowledgeArticle[]` |

### Context Tools
| Tool | Input | Output |
|------|-------|--------|
| `get_context` | `{ projectId? }` | `AIContext` |
| `get_dashboard` | `{}` | `Dashboard` |
| `get_stats` | `{}` | `TenantStats` |
| `get_workload` | `{}` | `WorkloadData` |

### Team Tools
| Tool | Input | Output |
|------|-------|--------|
| `list_members` | `{}` | `Member[]` |
| `get_member` | `{ userId }` | `Member` |

### Advanced Tools
| Tool | Input | Output |
|------|-------|--------|
| `bulk_update_tasks` | `{ taskIds, updates }` | `Task[]` |
| `get_activity` | `{ limit?, entityType?, entityId? }` | `Activity[]` |

**Total: ~30 tools**

---

## Resource Reference

| URI Pattern | Description |
|-------------|-------------|
| `yet://tenant` | Current tenant info |
| `yet://projects` | All projects |
| `yet://projects/{id}` | Specific project |
| `yet://projects/{id}/tasks` | Project tasks |
| `yet://tasks/blocked` | All blocked tasks |
| `yet://tasks/mine` | User's assigned tasks |
| `yet://knowledge` | All knowledge articles |
| `yet://knowledge/{category}` | Articles by category |
| `yet://knowledge/{id}` | Specific article |

**Total: ~10 resources**

---

## Prompt Reference

| Prompt | Arguments | Description |
|--------|-----------|-------------|
| `sprint_summary` | `{ projectId? }` | Generate sprint status |
| `blocked_report` | `{}` | Report on blocked tasks |
| `daily_standup` | `{ projectId? }` | Standup preparation |
| `task_breakdown` | `{ feature }` | Break feature into tasks |
| `context_handoff` | `{ projectId? }` | Prepare AI handoff context |
| `project_review` | `{ projectId }` | Project health review |

**Total: 6 prompts**

---

## API Client Mapping

### From CLI to MCP

| CLI Command | MCP Tool | API Endpoint |
|-------------|----------|--------------|
| `yet tasks list` | `list_tasks` | `GET /tenants/{tid}/tasks` |
| `yet tasks show` | `get_task` | `GET /tenants/{tid}/tasks/{id}` |
| `yet tasks create` | `create_task` | `POST /tenants/{tid}/projects/{pid}/tasks` |
| `yet tasks update` | `update_task` | `PATCH /tenants/{tid}/tasks/{id}` |
| `yet tasks start` | `start_task` | `POST /tenants/{tid}/tasks/{id}/start` |
| `yet tasks complete` | `complete_task` | `POST /tenants/{tid}/tasks/{id}/complete` |
| `yet tasks block` | `block_task` | `POST /tenants/{tid}/tasks/{id}/block` |
| `yet tasks search` | `search_tasks` | `GET /tenants/{tid}/tasks/search` |
| `yet projects list` | `list_projects` | `GET /tenants/{tid}/projects` |
| `yet projects show` | `get_project` | `GET /tenants/{tid}/projects/{id}` |
| `yet context` | `get_context` | `GET /tenants/{tid}/context` |
| `yet dashboard` | `get_dashboard` | `GET /tenants/{tid}/dashboard` |
| `yet kb search` | `search_knowledge` | `GET /tenants/{tid}/knowledge?search=` |

---

## Success Criteria

### MVP (Phase 1)
- [ ] AI agent can list and view tasks
- [ ] AI agent can create and update tasks
- [ ] AI agent can get project context
- [ ] Works with Claude Desktop

### Full Release
- [ ] Complete task lifecycle management
- [ ] Knowledge base integration
- [ ] Workflow prompts working
- [ ] Published to npm
- [ ] Documentation complete

---

## Timeline Estimate

| Phase | Scope | Dependencies |
|-------|-------|--------------|
| Phase 1 | Foundation + Core | None |
| Phase 2 | Full Task Management | Phase 1 |
| Phase 3 | Knowledge & Team | Phase 1 |
| Phase 4 | Prompts & Advanced | Phase 2, 3 |
| Phase 5 | Production Hardening | Phase 4 |
| Phase 6 | Distribution | Phase 5 |

---

## References

- [MCP Specification (June 2025)](https://modelcontextprotocol.io/specification/2025-06-18)
- [FastMCP TypeScript](https://github.com/punkpeye/fastmcp)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Yet.Project CLI](../cli/) - Reference implementation
- [Yet.Project API](../app/src/pages/api/v1/) - API endpoints
