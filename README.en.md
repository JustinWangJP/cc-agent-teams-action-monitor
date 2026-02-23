# Agent Teams Dashboard

Real-time monitoring dashboard for Claude Code Agent Teams

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)

---

## Languages

- [日本語](README.md) (Default)
- [English](README.en.md)
- [中文](README.zh.md)

---

## Design Philosophy

### Why HTTP Polling?

This system uses **HTTP Polling instead of WebSocket**. The reasons are:

1. **Simple Architecture**: No WebSocket connection management required, operates as a stateless API server
2. **Cache Utilization**: TanStack Query's caching (staleTime: 10s) reduces unnecessary requests
3. **Scalability**: Polling interval (5s-60s) is user-adjustable, controlling server load

### Team Status Determination Logic

Team status is determined by **session log mtime**:

| Status | Condition | Can Delete |
|--------|-----------|------------|
| `active` | Session log mtime ≤ 1 hour | ❌ No |
| `stopped` | Session log mtime > 1 hour | ✅ Yes |
| `unknown` | No session log | ❌ No |
| `inactive` | Empty members array | ❌ No |

### Data Sources

| Data | File Path |
|------|-----------|
| Team Config | `~/.claude/teams/{team_name}/config.json` |
| Status | `~/.claude/projects/{project-hash}/{sessionId}.jsonl` |
| Inbox | `~/.claude/teams/{team_name}/inboxes/{agent_name}.json` |
| Tasks | `~/.claude/tasks/{team_name}/{task_id}.json` |

---

## Features

| Feature | Description |
|---------|-------------|
| Team List | Display active agent teams as cards |
| Team Details | Member info, status, last activity time |
| Team Status | Auto-determination by session log mtime (active/stopped/unknown/inactive) |
| Team Deletion | Delete stopped teams only |
| Task List | Display tasks by status (Pending/In Progress/Completed) |
| Task Details | Description, owner, dependencies |
| Unified Timeline | Integrated display of inbox + session logs |
| Agent Status Inference | Infer status from task state and activity time (working/idle/waiting/completed/error) |
| Activity Feed | Real-time agent activity history |
| Auto Update | HTTP polling with configurable interval (5s-60s) |
| Dark Mode | Theme switching support |

---

## Prerequisites

### Required Environment

| Software | Version | Check Command |
|----------|---------|---------------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

### Claude Code Environment

- Claude Code installed
- Agent Teams feature in use
- `~/.claude/` directory exists

---

## Installation

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd cc-agent-teams-action-monitor
```

### Step 2: Backend Setup

```bash
cd backend
pip install -e ".[dev]"

# Verify installation
python -c "from app.main import app; print('Backend setup completed!')"
```

### Step 3: Frontend Setup

```bash
cd ../frontend
npm install

# Verify installation
npm run build
```

---

## Starting the Application

### Start Backend

```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Start Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

### Access

Open http://localhost:5173/ in your browser.

---

## Screen Overview

### Team Status

| Badge | Status | Description |
|-------|--------|-------------|
| 🟢 active | Session log mtime ≤ 1 hour | Team is active |
| ⚫ stopped | Session log mtime > 1 hour | Team stopped (deletable) |
| ⚪ unknown | No session log | Status unknown |
| ⚫ inactive | No members | No members present |

### Agent Status

| Display | Status | Description |
|---------|--------|-------------|
| 🔵 working | Has in_progress tasks | Working |
| 💤 idle | No activity for 5+ minutes | Idle |
| ⏳ waiting | Has blocked tasks | Waiting |
| ✅ completed | All tasks completed | Completed |
| ❌ error | No activity for 30+ minutes | Error state |

### Polling Interval Adjustment

Adjust polling interval from the header:
- 5s / 10s / 20s / 30s (default) / 60s
- staleTime: 10s (cache validity period)

---

## Operations

### Select Team

1. Click on a team card
2. Selected team is highlighted
3. Click again to deselect

### Delete Team

1. Click the 🗑️ icon on a stopped team card
2. Confirm deletion in the dialog
3. Team config, tasks, and session logs are deleted

**Note**: Active teams cannot be deleted.

### Change Polling Interval

1. Use the polling interval selector in the header
2. Select from 5s to 60s
3. Default is 30s

### View Tasks

Tasks are color-coded by status:

| Status | Color | Description |
|--------|-------|-------------|
| Pending | Gray | Not started |
| In Progress | Blue | In progress |
| Completed | Green | Completed |

---

## API Endpoints

### Health Check

```http
GET /api/health
```

### Team List

```http
GET /api/teams
```

### Team Details

```http
GET /api/teams/{team_name}
```

### Team Inbox

```http
GET /api/teams/{team_name}/inboxes
```

### Delete Team

```http
DELETE /api/teams/{team_name}
```

**Condition**: Only stopped teams can be deleted

### Unified Timeline

```http
GET /api/history?team_name={team_name}&limit=50&types=message,task_assignment
```

### Incremental Updates

```http
GET /api/updates?team_name={team_name}&since=2026-02-23T11:00:00Z
```

### Task List

```http
GET /api/tasks
```

---

## Development

### Run Tests

```bash
# Backend tests
cd backend
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest --cov=app          # With coverage

# Frontend tests
cd frontend
npm run test              # Run tests
```

### Development Commands

```bash
# Backend (with hot reload)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Frontend (with HMR)
npm run dev

# Type check
npx tsc --noEmit

# Build
npm run build
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHBOARD_HOST` | `127.0.0.1` | Server listen address |
| `DASHBOARD_PORT` | `8000` | Server listen port |
| `DASHBOARD_DEBUG` | `True` | Debug mode |
| `DASHBOARD_CLAUDE_DIR` | `~/.claude` | Claude data directory |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                                  │
│  ┌───────────┐  ┌───────────┐  ┌────────────────────────────────┐  │
│  │ Components│  │  Hooks    │  │  Types                         │  │
│  │ - TeamCard│  │ - useTeams│  │  - Team, Task, Message         │  │
│  │ - TaskCard│  │ - useTasks│  │                                │  │
│  └───────────┘  └───────────┘  └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │ HTTP/REST              │ HTTP Polling
         ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                                 │
│  ┌───────────┐  ┌───────────┐  ┌────────────────────────────────┐  │
│  │API Routes │  │ Cache     │  │ File Watcher Service           │  │
│  │ /api/teams│  │ Service   │  │ - Session log monitoring       │  │
│  │ /api/tasks│  │ - 30s TTL │  │ - Cache invalidation           │  │
│  └───────────┘  └───────────┘  └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼ File monitoring (watchdog)
┌─────────────────────────────────────────────────────────────────────┐
│                  ~/.claude/ Directory                                │
│  ├── teams/{team_name}/config.json      # Team config               │
│  │   └── inboxes/{agent_name}.json      # Agent inbox               │
│  ├── tasks/{team_name}/{task_id}.json   # Task definitions          │
│  └── projects/{project-hash}/{sessionId}.jsonl  # Session logs      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Teams not displayed | `~/.claude/teams/` is empty | Create a team in Claude Code |
| HTTP connection error | Backend stopped | Restart the backend |
| Page not loading | Frontend not started | Run `npm run dev` |
| Real-time updates not working | Port blocked | Check firewall settings |

---

## License

MIT License

---

*Created: 2026-02-16*
*Last Updated: 2026-02-24*
*Version: 2.1.0*
