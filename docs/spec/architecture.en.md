# Application Architecture Design

**Language:** [English](architecture.en.md) | [日本語](architecture.md) | [中文](architecture.zh.md)

## 1. Architecture Overview

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Agent Teams Dashboard                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Frontend (React)                          │   │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────────────┐   │   │
│  │  │ Components│  │  Hooks    │  │  Types                 │   │   │
│  │  │ - chat/   │  │ useTeams  │  │ - message.ts           │   │   │
│  │  │ - tasks/  │  │ useTasks  │  │ - team.ts              │   │   │
│  │  │ - timeline│  │ useInbox  │  │ - task.ts              │   │   │
│  │  │ - dashboard│ │ useUnified │ │ - timeline.ts         │   │   │
│  │  │ - common/ │  │  Timeline │  │                        │   │   │
│  │  └───────────┘  └───────────┘  └────────────────────────┘   │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │              Zustand Store (dashboardStore)            │   │   │
│  │  │  - Periodic data updates via HTTP polling              │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │ HTTP Polling (Real-time Updates)                         │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Backend (FastAPI)                         │   │
│  │  ┌───────────┐  ┌────────────────────────────────────────┐   │   │
│  │  │API Routes │  │ Services                               │   │   │
│  │  │ - teams   │  │ - FileWatcherService (cache invalidation)│   │
│  │  │ - tasks   │  │ - CacheService (TTL-based memory cache) │   │
│  │  │ - messages│  │ - TimelineService (unified timeline)    │   │
│  │  │ - agents  │  │ - AgentStatusService (status inference) │   │
│  │  │ - timeline│  │ - MessageParser (message parsing)       │   │   │
│  │  └───────────┘  └────────────────────────────────────────┘   │   │
│  │  ┌───────────┐  ┌───────────┐                                │   │
│  │  │  Models   │  │  Config   │                                │   │
│  │  │ - team    │  │ Settings  │                                │   │
│  │  │ - task    │  │           │                                │   │
│  │  │ - message │  │           │                                │   │
│  │  │ - timeline│  │           │                                │   │
│  │  │ - agent   │  │           │                                │   │
│  │  └───────────┘  └───────────┘                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ▼ File Monitoring (Cache Invalidation & Logging)             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ~/.claude/ Directory Structure                               │   │
│  │  ├── teams/{team_name}/config.json       # Team settings     │   │
│  │  │   └── inboxes/{agent_name}.json       # Agent inboxes     │   │
│  │  ├── tasks/{team_name}/{task_id}.json    # Task definitions  │   │
│  │  └── projects/{project-hash}/            # Session logs      │   │
│  │      └── {sessionId}.jsonl               # Session history   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Feature and Data Source Mapping

| Feature | Target Files | Description |
|---------|--------------|-------------|
| **Team List** | `~/.claude/teams/{team_name}/config.json` | Team settings, member info |
| **Team Status Determination** | `~/.claude/projects/{project-hash}/{sessionId}.jsonl` | Determined by session log mtime |
| **Inboxes** | `~/.claude/teams/{team_name}/inboxes/{agent_name}.json` | Agent-specific message inboxes |
| **Tasks** | `~/.claude/tasks/{team_name}/{task_id}.json` | Task definitions and status |
| **Unified Timeline** | All above + session logs | inbox + session log integration |
| **Agent Status** | Tasks + Inboxes + Session logs | Determined by inference logic |

### 1.3 Layer Structure

| Layer | Components | Responsibilities |
|----------|---------------|------|
| Presentation | React Components | UI rendering, user interaction |
| State Management | Zustand Store (v5.0.2+) | Global state management, polling control |
| Data Fetching | Custom Hooks + TanStack Query (v5.90.21+) | API communication, server state cache |
| Communication | HTTP Polling | Periodic data updates (5s-60s) |
| API | FastAPI Routes | Endpoint handling |
| Cache | CacheService | Memory cache management (with TTL) |
| File Monitoring | FileWatcherService | File change detection, cache invalidation |
| Data | Pydantic Models | Data definition and validation |
| Storage | File System | Data persistence |

---

## 2. Design Philosophy

### 2.1 Why HTTP Polling + Cache Invalidation

**Background & Challenges:**
Claude Code directly updates files under `~/.claude/`, making external Webhooks or Push notifications unavailable. Also, frequent file reads impact performance as file count increases.

**Selected Approach:**
1. Monitor `~/.claude/` with **FileWatcherService** to detect file changes
2. **Invalidate corresponding cache** on change detection (also log events)
3. Frontend periodically fetches latest data via **HTTP polling**
4. Cache prevents redundant reads of the same data

**Trade-offs:**
- Real-time capability is inferior to WebSocket Push, but polling interval (minimum 5s) ensures sufficient update frequency
- Server load increases, but cache effectively reduces actual file access

### 2.2 Why Session Log mtime for Status Determination

**Background & Challenges:**
The `config.json` mtime was used to determine team "active status," but it could be updated at times unrelated to team activity.

**Selected Approach:**
Use session log (`{sessionId}.jsonl`) mtime:
- **Session logs** record actual agent activity (thinking, tool execution, file changes)
- Therefore, session log update time = team's last activity time
- Updated within 1 hour → `active`, over 1 hour → `stopped`

**Determination Flow:**
```
1. members empty? → 'inactive'
2. No session log? → 'unknown'
3. Session log mtime > 1 hour? → 'stopped'
4. Otherwise → 'active'
```

### 2.3 Why Unified Timeline Service

**Background & Challenges:**
Messages between agents (inbox) and session logs (activity history) are stored separately, with no unified view.

**Selected Approach:**
Integrate both with `TimelineService`:
- **inbox**: Task assignments between agents, completion notifications, idle notifications
- **Session logs**: Thinking processes, tool execution, file changes
- Returns sorted unified timeline in chronological order

**Extensibility:**
Future data sources (e.g., external API call logs) can be added by simply extending the integration logic in `TimelineService`.

---

## 3. Frontend Architecture

### 3.1 Component Hierarchy

```
App (Main)
├── Layout
│   ├── Header
│   │   ├── ThemeToggle
│   │   └── PollingIntervalSelector
│   └── children
├── Overview (Team List) - View Tab
│   ├── TeamCard[]
│   │   ├── ModelBadge
│   │   └── StatusBadge (active/stopped/unknown/inactive)
│   └── TeamDetailPanel
│       └── DeleteTeamButton (shown only when stopped)
├── Timeline (Unified Timeline) - View Tab
│   ├── TimelineTaskSplitLayout
│   │   ├── ChatTimelinePanel (left)
│   │   │   ├── ChatHeader
│   │   │   │   ├── ChatSearch
│   │   │   │   └── SenderFilter
│   │   │   ├── ChatMessageList
│   │   │   │   ├── DateSeparator
│   │   │   │   └── ChatMessageBubble
│   │   │   │       ├── BookmarkButton
│   │   │   │       ├── AgentStatusIndicator
│   │   │   │       └── MarkdownRenderer
│   │   │   └── TypingIndicator
│   │   └── TaskMonitorPanel (right, collapsible)
│   │       └── TaskCard[]
│   └── MessageDetailModal
└── Tasks (Task List) - View Tab (Kanban style)
    ├── TaskFilter (Team filter + search)
    └── TaskCard[] (Pending / In Progress / Completed columns)
```

### 3.2 State Management Pattern

- **Global State**: Zustand Store (dashboardStore)
  - Team selection, message selection, task selection, filters, UI state, polling settings
  - Persisted to local storage (dark mode, polling interval, etc.)
- **Server State**: Custom hooks + HTTP polling
  - `useTeams`, `useTasks`, `useInbox`, `useUnifiedTimeline`, `useAgentMessages`
- **Local State**: useState (within components)

### 3.3 Data Flow

```
User Action → Component → Store/Hook → HTTP API → Backend
                                            ↓
Component ← Store/Hook ← State Update ← Response ←────┘
                ↑
                └── Periodic updates via polling timer
```

### 3.4 Zustand Store Structure

```typescript
interface DashboardState {
  // Selection state
  selectedTeam: string | null;
  selectedMessage: ParsedMessage | null;
  selectedTask: Task | null;
  currentView: ViewType;  // 'overview' | 'timeline' | 'tasks' | 'files'

  // Filters
  timeRange: TimeRange;
  messageFilter: MessageFilter;
  searchQuery: string;

  // Polling intervals (individually configurable per data source)
  teamsInterval: number;      // Team list (default 30s)
  tasksInterval: number;      // Task list (default 30s)
  inboxInterval: number;      // Inboxes (default 30s)
  messagesInterval: number;   // Agent messages (default 30s)

  // UI state
  isDetailModalOpen: boolean;
  isTaskModalOpen: boolean;
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  autoScrollTimeline: boolean;
  isTaskPanelCollapsed: boolean;
}
```

---

## 4. Backend Architecture

### 4.1 Layer Structure

```
┌─────────────────────────────────────────┐
│              API Layer                   │
│  (FastAPI Routes: teams, tasks,         │
│   messages, agents, timeline)           │
├─────────────────────────────────────────┤
│             Service Layer                │
│  - FileWatcherService (monitoring & invalidation) │
│  - CacheService (TTL cache)              │
│  - TimelineService (unified timeline)    │
│  - AgentStatusService (status inference) │
│  - MessageParser (message parsing)       │
├─────────────────────────────────────────┤
│              Model Layer                 │
│  (Pydantic: Team, Task, Message,        │
│   Timeline, Agent, Chat)                │
├─────────────────────────────────────────┤
│            Storage Layer                 │
│  (File System: ~/.claude/)              │
│  - teams/*/config.json                  │
│  - teams/*/inboxes/*.json               │
│  - tasks/*/*.json                       │
│  - projects/{hash}/*.jsonl              │
└─────────────────────────────────────────┘
```

### 4.2 Routing Design

| Path | Method | Handler | Purpose |
|------|---------|----------|---------|
| /api/health | GET | health_check | Health check |
| /api/teams | GET | list_teams | Team list (with status) |
| /api/teams/{name} | GET | get_team | Team details |
| /api/teams/{name} | DELETE | delete_team | Delete team (stopped only) |
| /api/teams/{name}/inboxes | GET | get_team_inboxes | Inbox list |
| /api/teams/{name}/inboxes/{agent} | GET | get_agent_inbox | Agent-specific inbox |
| /api/teams/{name}/messages/timeline | GET | get_team_messages_timeline | Unified timeline |
| /api/tasks | GET | list_tasks | Task list |
| /api/tasks/{team}/{task_id} | GET | get_task | Task details |
| /api/agents | GET | list_agents | Agent list |
| /api/timeline/{team_name}/history | GET | get_history | Unified history |
| /api/timeline/{team_name}/updates | GET | get_updates | Differential updates |
| /api/file-changes/{team} | GET | get_file_changes | File change list |

### 4.3 Service Structure

#### CacheService
- **Role**: Reduce file access via in-memory cache
- **TTL**: Team config 30s, inbox 60s
- **Features**: Auto expiration, manual invalidation, statistics
- **Invalidation Trigger**: File change notifications from FileWatcherService

#### FileWatcherService
- **Role**: Monitor changes to `~/.claude/` directory
- **Primary Purpose**: **Cache invalidation + logging** (UI updates via HTTP polling)
- **Debounce**: 500ms
- **Detection Patterns**:
  - `teams/*/config.json` → Cache invalidation + logging
  - `teams/*/inboxes/*.json` → Cache invalidation + logging
  - `tasks/*/*.json` → Logging only

#### TimelineService
- **Role**: Integrate inbox + session logs
- **Inputs**:
  - `teams/{name}/inboxes/{agent}.json`
  - `projects/{hash}/{sessionId}.jsonl`
- **Output**: Chronologically sorted unified timeline

#### AgentStatusService
- **Role**: Infer agent status
- **Inputs**: Task definitions, inboxes, session logs
- **Inference Logic**:
  - `idle`: No activity for 5+ minutes
  - `working`: Has in_progress tasks
  - `waiting`: Has blocked tasks
  - `error`: No activity for 30+ minutes
  - `completed`: All tasks completed

#### MessageParser
- **Role**: Parse and classify messages
- **Supported Types**: message, task_assignment, task_completed, idle_notification, etc.

### 4.4 Team Deletion API

**Endpoint**: `DELETE /api/teams/{team_name}`

**Deletable Statuses**: `stopped`, `inactive`, `unknown`

**Deletion Targets**:
1. Entire `teams/{team_name}/` directory
2. Entire `tasks/{team_name}/` directory
3. Session file only (`projects/{hash}/{session}.jsonl`)
   - Project directory itself remains (may belong to other teams)

**Error Responses**:
- `404 Not Found`: Team doesn't exist
- `400 Bad Request`: Status is `active` (cannot delete)

### 4.5 Middleware Structure

| Middleware | Purpose |
|-------------|---------|
| CORSMiddleware | Cross-origin allowance |
| Lifespan | Startup/shutdown handling (FileWatcher, CacheService) |

---

## 5. Communication Protocol

### 5.1 REST API

- **Format**: JSON
- **Methods**: GET, DELETE (read-only + team deletion)
- **Errors**: HTTP status code + detail message

### 5.2 HTTP Polling (Real-time Updates)

Frontend updates data periodically with the following hooks:

| Hook | API | Default Interval |
|--------|-----|------------------|
| useTeams | GET /api/teams | 30s |
| useTasks | GET /api/tasks | 30s |
| useInbox | GET /api/teams/{name}/inboxes | 30s |
| useUnifiedTimeline | GET /api/timeline/{team_name}/history | 30s |

**Differential Updates**: `/api/timeline/{team_name}/updates?since={timestamp}` fetches only changes since last request

---

## 6. Module Dependencies

### 6.1 Backend Dependency Diagram

```
main.py
├── config.py (Settings)
├── api/routes/
│   ├── teams.py
│   │   ├── models/team.py
│   │   ├── services/cache_service.py
│   │   ├── services/timeline_service.py
│   │   └── config.py
│   ├── tasks.py
│   │   ├── models/task.py
│   │   └── config.py
│   ├── messages.py
│   │   ├── models/message.py
│   │   ├── models/timeline.py
│   │   └── config.py
│   ├── timeline.py
│   │   ├── services/timeline_service.py
│   │   ├── services/agent_status_service.py
│   │   └── models/timeline.py
│   └── agents.py
│       └── models/agent.py
├── models/
│   ├── team.py
│   ├── task.py
│   ├── message.py
│   ├── timeline.py
│   ├── agent.py
│   ├── chat.py
│   └── model.py
└── services/
    ├── cache_service.py
    │   └── config.py
    ├── file_watcher.py
    │   ├── config.py
    │   └── services/cache_service.py
    ├── timeline_service.py
    │   ├── config.py
    │   └── models/timeline.py
    ├── agent_status_service.py
    │   ├── models/agent.py
    │   └── models/task.py
    └── message_parser.py
        └── models/message.py
```

### 6.2 Frontend Dependency Diagram

```
App.tsx
├── stores/dashboardStore.ts (Zustand)
├── hooks/
│   ├── useTeams.ts
│   ├── useTasks.ts
│   ├── useInbox.ts
│   ├── useAgentMessages.ts
│   └── useUnifiedTimeline.ts
├── components/
│   ├── layout/
│   │   ├── Layout.tsx
│   │   └── Header.tsx
│   ├── dashboard/
│   │   ├── TeamCard.tsx (includes StatusBadge)
│   │   ├── TeamDetailPanel.tsx
│   │   └── ActivityFeed.tsx
│   ├── overview/
│   │   ├── TeamCard.tsx
│   │   └── ModelBadge.tsx
│   ├── tasks/
│   │   ├── TaskCard.tsx
│   │   ├── ExpandedTaskCard.tsx
│   │   └── TaskMonitorPanel.tsx
│   ├── timeline/
│   │   ├── TimelinePanel.tsx
│   │   ├── TimelineTaskSplitLayout.tsx
│   │   ├── TimelineFilters.tsx
│   │   ├── MessageTimeline.tsx
│   │   └── MessageDetailModal.tsx
│   ├── chat/
│   │   ├── ChatMessageBubble.tsx
│   │   ├── ChatTimelinePanel.tsx
│   │   ├── ChatHeader.tsx
│   │   ├── ChatMessageList.tsx
│   │   ├── DateSeparator.tsx
│   │   ├── SenderFilter.tsx
│   │   ├── MessageTypeFilter.tsx
│   │   ├── ChatSearch.tsx
│   │   ├── MessageDetailPanel.tsx
│   │   ├── BookmarkButton.tsx
│   │   ├── AgentStatusIndicator.tsx
│   │   └── TypingIndicator.tsx
│   ├── agent/
│   │   └── ExpandedAgentCard.tsx
│   └── common/
│       ├── StatusBadge.tsx
│       ├── PollingIntervalSelector.tsx
│       ├── LoadingSpinner.tsx
│       ├── ErrorDisplay.tsx
│       └── ThemeToggle.tsx
├── types/
│   ├── team.ts
│   ├── task.ts
│   ├── message.ts
│   ├── timeline.ts
│   ├── agent.ts
│   ├── model.ts
│   ├── theme.ts
│   └── css.d.ts
├── config/
│   └── models.ts
├── utils/
│   └── teamModels.ts
└── lib/
    ├── queryClient.ts
    └── utils.ts
```

---

## 7. Deployment Configuration

### 7.1 Development Environment

```
┌──────────────────┐     ┌──────────────────┐
│  Frontend (Vite) │     │ Backend (Uvicorn)│
│  Port: 5173      │────▶│ Port: 8000       │
│  Hot Reload      │     │ Auto Reload      │
└──────────────────┘     └──────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌──────────────────┐
         │   ~/.claude/     │
         │   (File System)  │
         │   - teams/       │
         │   - tasks/       │
         │   - projects/    │
         └──────────────────┘
```

### 7.2 Production Environment (Planned)

```
┌──────────────────────────────────────────────┐
│                Reverse Proxy                 │
│                (nginx / Caddy)               │
└──────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  Frontend        │  │ Backend          │
│  (Static Files)  │  │ (Uvicorn/Gunicorn)│
│  Build Output    │  │ Multiple Workers │
└──────────────────┘  └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   ~/.claude/     │
                    │   - teams/       │
                    │   - tasks/       │
                    │   - projects/    │
                    └──────────────────┘
```

### 7.3 Infrastructure Requirements

| Item | Requirement |
|------|-------------|
| Python | 3.11+ |
| Node.js | 18+ |
| Memory | Minimum 512MB |
| Disk | Access to ~/.claude/ |

---

## 8. Security Design

### 8.1 Current Implementation

| Item | Status |
|------|--------|
| CORS | Origin restriction |
| Input Validation | Pydantic validation |
| Error Handling | HTTP exception handling |
| Deletion Protection | Active team deletion blocked |

### 8.2 Future Extensions

| Item | Plan |
|------|------|
| Authentication | API Key / OAuth |
| Authorization | Role-based access control |
| Encryption | HTTPS / WSS |
| Logging | Audit logs |

---

## 9. Extensibility

### 9.1 Extension Points

| Layer | Extension Points |
|----------|-------------|
| Frontend | Add new components, add new views |
| Store | Add new state slices |
| API | Add new endpoints |
| Service | Integrate new data sources (extend TimelineService) |
| Cache | Add new cache types |

### 9.2 Design Principles

- **Single Responsibility**: Each module has a single responsibility
- **Dependency Injection**: Configuration injected from environment variables
- **Interface Segregation**: Clear module boundaries
- **Separation of Concerns**: Separate UI, state management, and data fetching
- **YAGNI**: Implement only necessary features, avoid over-abstraction

---

*Created: 2026-02-16*
*Last Updated: 2026-02-24*
*Version: 2.1.0*
