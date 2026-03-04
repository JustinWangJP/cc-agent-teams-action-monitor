# Backend Technical Stack Documentation

[Japanese](backend-tech-stack.md) | [English](backend-tech-stack.en.md) | [Chinese](backend-tech-stack.zh.md)

## 1. Technology Stack Overview

### 1.1 Languages & Frameworks

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Programming Language | Python | 3.11+ | Main development language |
| Web Framework | FastAPI | 0.109.0+ | REST API server |
| ASGI Server | Uvicorn | 0.27.0+ | Async server execution |
| Data Validation | Pydantic | 2.5.0+ | Data models & validation |
| Configuration Management | pydantic-settings | 2.1.0+ | Environment variable management |
| File Monitoring | watchdog | 4.0.0+ | File system event monitoring |
| Build Tool | hatchling | - | Package building |

### 1.2 Development Dependencies

| Technology | Version | Purpose |
|-----------|---------|---------|
| pytest | 8.0.0+ | Test framework |
| pytest-asyncio | 0.23.0+ | Async test support |
| pytest-cov | 4.0.0+ | Coverage measurement |
| httpx | 0.26.0+ | HTTP client (for testing) |

---

## 2. Design Philosophy

### 2.1 Why Cache + HTTP Polling?

**Background:**
Since Claude Code directly updates files under `~/.claude/`, external Webhooks or Push notifications cannot be used.

**Approach:**
1. **FileWatcherService** detects file changes and **invalidates cache**
2. Frontend periodically fetches latest data via **HTTP polling**
3. **CacheService** avoids frequent file reads

**Cache Strategy:**
| Data Type | TTL | Reason |
|-----------|-----|--------|
| Team Configuration | 30 seconds | Low update frequency |
| Inbox | 60 seconds | Messages require real-time but polling is sufficient |

### 2.2 Why Use Session Log mtime for Status Determination?

**Background:**
Previously used `config.json` mtime for determination, but it was sometimes updated at timings unrelated to team activity.

**Improvement:**
Use session log (`{sessionId}.jsonl`) mtime:
- Session log = actual agent activity record
- mtime = team's last activity time
- **1 hour** as threshold to determine `active` / `stopped`

---

## 3. Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration management (Pydantic Settings)
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── teams.py     # Team-related APIs (list, detail, delete, inboxes)
│   │       ├── tasks.py     # Task-related APIs
│   │       ├── messages.py  # Message & Timeline APIs
│   │       ├── agents.py    # Agent list API
│   │       └── timeline.py  # Unified timeline API
│   ├── models/
│   │   ├── __init__.py
│   │   ├── team.py          # Team/Member/TeamSummary models
│   │   ├── task.py          # Task/TaskSummary models
│   │   ├── message.py       # Message models
│   │   ├── timeline.py      # TimelineItem models
│   │   ├── agent.py         # Agent/AgentSummary models
│   │   ├── chat.py          # Chat-related models
│   │   └── model.py         # Model configuration models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── file_watcher.py  # File monitoring service (cache invalidation)
│   │   ├── cache_service.py # Memory cache service (with TTL)
│   │   ├── timeline_service.py    # inbox + session log integration service
│   │   ├── agent_status_service.py # Agent status inference service
│   │   └── message_parser.py      # Protocol message parsing service
│   └── utils/
│       └── __init__.py
├── tests/
│   ├── __init__.py
│   ├── test_api_teams.py
│   ├── test_api_tasks.py
│   ├── test_api_timeline.py
│   └── test_services/
└── pyproject.toml           # Project configuration & dependencies
```

### 3.1 Module Responsibilities

| Module | Role |
|--------|------|
| `main.py` | FastAPI application creation, lifespan management (FileWatcher/CacheService) |
| `config.py` | Settings class to load configuration from environment variables |
| `api/routes/teams.py` | Team list, detail, inbox, delete, status determination APIs |
| `api/routes/tasks.py` | Task list, detail, status determination APIs |
| `api/routes/messages.py` | Message timeline APIs |
| `api/routes/agents.py` | Agent list APIs |
| `api/routes/timeline.py` | Unified timeline, history, differential update APIs |
| `services/file_watcher.py` | ~/.claude/ monitoring, cache invalidation |
| `services/cache_service.py` | TTL-based memory cache |
| `services/timeline_service.py` | inbox + session log integration |
| `services/agent_status_service.py` | Agent status inference |
| `services/message_parser.py` | Protocol message parsing |
| `models/` | Pydantic data model definitions |

---

## 4. Service Details

### 4.1 FileWatcherService

**Role:** Monitoring changes in `~/.claude/` directory

**Primary Purpose:** **Cache invalidation + logging** (not real-time Push)

**Detection Patterns:**

| Pattern | Event | Action |
|---------|-------|--------|
| `teams/*/config.json` | Team configuration change | Cache invalidation + logging |
| `teams/*/inboxes/*.json` | Inbox update | Cache invalidation + logging |
| `tasks/*/*.json` | Task status change | Logging only |

**Debounce:** 500ms (suppresses consecutive events)

```python
class FileWatcherService:
    def __init__(self, path: Path, debounce_ms: int = 500):
        self.path = path
        self.debounce_ms = debounce_ms
        self._observer: Optional[Observer] = None
```

### 4.2 CacheService

**Role:** TTL-based memory cache

**Configuration:**

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `config_ttl` | 30 seconds | TTL for team configuration |
| `inbox_ttl` | 60 seconds | TTL for inbox |
| `cleanup_interval` | 300 seconds | Cleanup interval for expired entries |

**Main Methods:**

| Method | Description |
|--------|-------------|
| `get_team_config(team_name)` | Get team configuration (cache or file) |
| `get_team_inbox(team_name, agent_name)` | Get inbox |
| `invalidate_team_config(team_name)` | Invalidate team configuration cache |
| `invalidate_team_inbox(team_name, agent_name)` | Invalidate inbox cache |
| `get_stats()` | Get cache statistics |

### 4.3 TimelineService

**Role:** Integration of inbox + session logs

**Input Data Sources:**

| Source | File Path | Content |
|--------|-----------|---------|
| inbox | `teams/{name}/inboxes/{agent}.json` | Inter-agent messages |
| session | `projects/{hash}/{sessionId}.jsonl` | Session history |

**Output:** Chronologically sorted unified timeline

**Session Log Entry Types:**

| Type | Content |
|------|---------|
| `user_message` | User input |
| `assistant_message` | Assistant response |
| `thinking` | Thinking process |
| `tool_use` | Tool invocation |
| `file_change` | File change |

### 4.4 AgentStatusService

**Role:** Agent status inference

**Determination Logic:**

| Status | Condition |
|--------|-----------|
| `idle` | No activity for 5+ minutes |
| `working` | Has in_progress tasks |
| `waiting` | Has blocked tasks |
| `error` | No activity for 30+ minutes |
| `completed` | All tasks completed |

**Data Used:**
- Task definitions (owner, status, blockedBy)
- Inbox (task_assignment, task_completed)
- Session logs (last activity time)

### 4.5 MessageParser

**Role:** Parsing and classification of protocol messages

**Supported Types:**

| Type | Description |
|------|-------------|
| `message` | Regular message |
| `task_assignment` | Task assignment |
| `task_completed` | Task completion notification |
| `idle_notification` | Idle notification |
| `shutdown_request` | Shutdown request |
| `shutdown_response` | Shutdown response |
| `plan_approval_request` | Plan approval request |
| `plan_approval_response` | Plan approval response |

---

## 5. API Design

### 5.1 REST API Endpoints List

#### Team-related

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/teams` | GET | Get team list (with status) |
| `/api/teams/{team_name}` | GET | Get team details |
| `/api/teams/{team_name}` | DELETE | Delete team |
| `/api/teams/{team_name}/inboxes` | GET | Get team inbox list |
| `/api/teams/{team_name}/inboxes/{agent}` | GET | Get agent-specific inbox |

#### Task-related

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks` | GET | Get task list |
| `/api/tasks/team/{team_name}` | GET | Get tasks by team |
| `/api/tasks/{team}/{task_id}` | GET | Get task details |

#### Agent-related

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | Get agent list |

#### Timeline-related

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/teams/{team_name}/messages/timeline` | GET | Message timeline |
| `/api/timeline/{team_name}/history` | GET | Get unified history |
| `/api/timeline/{team_name}/updates` | GET | Get differential updates |
| `/api/file-changes/{team}` | GET | Get file change list |

### 5.2 Team Deletion API Details

```
DELETE /api/teams/{team_name}
```

**Deletable Statuses:** `stopped`, `inactive`, `unknown`

**Deletion Targets:**
1. `teams/{team_name}/` directory
2. `tasks/{team_name}/` directory
3. Session file only (project directory remains)

**Success Response:**
```json
{
  "message": "Deleted team \"{team_name}\"",
  "deletedPaths": [
    "~/.claude/teams/my-team",
    "~/.claude/tasks/my-team",
    "~/.claude/projects/-Users-user-project/abc123.jsonl"
  ]
}
```

**Error Responses:**
- `404 Not Found`: Team does not exist
- `400 Bad Request`: Status is `active` (cannot delete)

---

## 6. Data Models

### 6.1 Team-related Models

```python
class Member(BaseModel):
    """Team member model"""
    agentId: str
    name: str
    agentType: str
    model: str = "unknown"
    joinedAt: int = 0
    status: str = "idle"  # active, idle
    color: Optional[str] = None


class Team(BaseModel):
    """Team detail model"""
    name: str
    description: Optional[str] = ""
    createdAt: int = 0
    leadAgentId: str
    leadSessionId: str = ""
    members: list[Member] = []


class TeamSummary(BaseModel):
    """Team list summary"""
    name: str
    description: Optional[str] = ""
    memberCount: int
    taskCount: int = 0
    status: str  # active, inactive, stopped, unknown
    leadAgentId: str
    createdAt: Optional[int] = None
```

### 6.2 Task-related Models

```python
class Task(BaseModel):
    """Task detail model"""
    id: str
    subject: str
    description: Optional[str] = ""
    activeForm: str = ""
    status: str  # pending, in_progress, completed, deleted, stopped
    owner: Optional[str] = None
    team: Optional[str] = None
    blocks: list[str] = []
    blockedBy: list[str] = []
    metadata: dict = {}


class TaskSummary(BaseModel):
    """Task list summary"""
    id: str
    subject: str
    status: str
    owner: Optional[str] = None
    team: Optional[str] = None
```

### 6.3 Timeline-related Models

```python
class TimelineItem(BaseModel):
    """Timeline item (unified)"""
    id: str
    type: str  # message, task_assignment, thinking, tool_use, etc.
    from_: str = Field(alias="from")
    to: Optional[str] = None
    receiver: Optional[str] = None
    timestamp: str
    text: str
    summary: Optional[str] = None

    class Config:
        populate_by_name = True
```

---

## 7. Status Determination Logic

### 7.1 Team Status Determination

**Implementation:** `api/routes/teams.py` - `get_team_status()`

**Determination Flow:**

```python
def get_team_status(config: dict) -> str:
    """Determine team status.

    Determination criteria:
    - No members → 'inactive'
    - No session log → 'unknown'
    - Session log mtime > 1 hour → 'stopped'
    - Session log mtime ≤ 1 hour → 'active'
    """
    if not config.get("members"):
        return "inactive"

    # Identify session log file
    session_file = _find_session_file(settings.claude_dir, config)

    if not session_file:
        return "unknown"

    # Get session log mtime
    mtime = os.path.getmtime(session_file)
    mtime_dt = datetime.fromtimestamp(mtime, tz=timezone.utc)
    now = datetime.now(timezone.utc)

    # Check if over 1 hour
    if (now - mtime_dt).total_seconds() > 60 * 60:
        return "stopped"

    return "active"
```

**Session Log Identification Logic:**

```python
def _find_session_file(claude_dir: Path, config: dict) -> Optional[Path]:
    """Identify team session log file.

    Get leadSessionId and cwd from config.json to find session log.
    """
    members = config.get("members", [])
    if not members:
        return None

    # Use first member's cwd
    cwd = members[0].get("cwd")
    if not cwd:
        return None

    # Convert to project-hash
    project_hash = _cwd_to_project_hash(cwd)
    project_dir = claude_dir / "projects" / project_hash

    # Find file corresponding to leadSessionId
    lead_session_id = config.get("leadSessionId")
    if lead_session_id:
        session_file = project_dir / f"{lead_session_id}.jsonl"
        if session_file.exists():
            return session_file

    return None


def _cwd_to_project_hash(cwd: str) -> str:
    """Generate project-hash from working directory."""
    return "-" + cwd.lstrip("/").replace("/", "-")
```

### 7.2 Task Stop Determination

Similar logic to determine task file mtime (threshold: 24 hours)

---

## 8. Configuration Management

### 8.1 Settings Class

```python
class Settings(BaseSettings):
    """Application settings"""

    # Server settings
    host: str = "127.0.0.1"
    port: int = 8000
    debug: bool = True

    # Claude directory paths
    claude_dir: Path = Path.home() / ".claude"
    teams_dir: Path = Path.home() / ".claude" / "teams"
    tasks_dir: Path = Path.home() / ".claude" / "tasks"

    # CORS settings
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

    class Config:
        env_prefix = "DASHBOARD_"
```

### 8.2 Environment Variables List

| Environment Variable | Default Value | Description |
|---------------------|---------------|-------------|
| `DASHBOARD_HOST` | `127.0.0.1` | Server listen address |
| `DASHBOARD_PORT` | `8000` | Server listen port |
| `DASHBOARD_DEBUG` | `True` | Debug mode |
| `DASHBOARD_CLAUDE_DIR` | `~/.claude` | Claude data directory |

---

## 9. Test Environment

### 9.1 Test Execution Commands

```bash
# Run all tests
cd backend
pytest

# Verbose output
pytest -v

# With coverage (70%+ required)
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/test_api_teams.py -v

# Specific test function
pytest tests/test_api_teams.py::test_get_team -v
```

### 9.2 Coverage Requirements

`pyproject.toml` requires minimum 70%:

```toml
[tool.pytest.ini_options]
addopts = [
    "--cov-fail-under=70"
]
```

---

## 10. Startup Methods

### 10.1 Development Environment

```bash
# Install dependencies
cd backend
pip install -e ".[dev]"

# Start development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 10.2 Production Environment

```bash
# Install
pip install .

# Start
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 11. Feature and Data Source Mapping

| Feature | Files Read | Service Used |
|---------|------------|--------------|
| Team List | `teams/{name}/config.json` | CacheService |
| Team Status | `projects/{hash}/{session}.jsonl` | (mtime check) |
| Inbox | `teams/{name}/inboxes/{agent}.json` | CacheService |
| Tasks | `tasks/{name}/{id}.json` | (direct read) |
| Unified Timeline | All above + session logs | TimelineService |
| Agent Status | Tasks + Inbox + Session | AgentStatusService |

---

---

## 12. Internationalization (i18n)

### 12.1 Architecture

The backend implements a custom lightweight i18n service for multilingual API error messages and log messages.

### 12.2 Translation File Structure

```
backend/locales/
├── ja/                     # Japanese
│   ├── api.json            # API error messages
│   └── logs.json           # Log messages
├── en/                     # English
│   ├── api.json
│   └── logs.json
└── zh/                     # Chinese
    ├── api.json
    └── logs.json
```

### 12.3 Language Detection Middleware

`LanguageMiddleware` detects language in the following priority:

1. **Accept-Language Header**: HTTP request header
2. **Default Language**: `DASHBOARD_DEFAULT_LANGUAGE` setting

```python
# app/middleware/language.py
class LanguageMiddleware:
    async def dispatch(self, request: Request, call_next):
        # Get language from Accept-Language header
        accept_language = request.headers.get("Accept-Language", "ja")
        language = self._parse_accept_language(accept_language)

        # Save to request state
        request.state.language = language

        response = await call_next(request)
        return response
```

### 12.4 I18nService

```python
# app/services/i18n_service.py
class I18nService:
    def __init__(self, locales_dir: Path, default_language: str = "ja"):
        self._translations: dict[str, dict] = {}
        self._default_language = default_language
        self._load_translations(locales_dir)

    def t(self, key: str, language: str, **kwargs) -> str:
        """Get translated text for a translation key"""
        translation = self._get_nested_value(
            self._translations.get(language, {}),
            key
        )
        return translation.format(**kwargs) if translation else key
```

### 12.5 Usage Example

```python
# Usage in API routes
@router.get("/teams/{team_name}")
async def get_team(
    team_name: str,
    request: Request,
    i18n: I18nService = Depends(get_i18n_service)
):
    language = getattr(request.state, "language", "ja")

    if not team_exists(team_name):
        raise HTTPException(
            status_code=404,
            detail=i18n.t("api.errors.team_not_found", language, team=team_name)
        )
```

### 12.6 Supported Languages

| Language Code | Language Name |
|--------------|---------------|
| `ja` | 日本語 (Default) |
| `en` | English |
| `zh` | 中文 |

---

*Created: 2026-02-16*
*Last Updated: 2026-03-04*
*Version: 2.2.0*
