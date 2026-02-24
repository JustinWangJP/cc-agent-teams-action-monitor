# System User Guide

**Language:** [English](user-guide.en.md) | [日本語](user-guide.md) | [中文](user-guide.zh.md)

## 1. Introduction

### 1.1 System Overview

Agent Teams Dashboard is a dashboard application for monitoring and managing Claude Code's Agent Teams functionality in real-time.

### 1.2 Intended Users

- Developers using Claude Code to operate Agent Teams
- Project managers who want to check task progress
- Users who want to verify inter-agent communications

### 1.3 Prerequisites

- Claude Code must be installed
- Using Agent Teams functionality
- `~/.claude/` directory must exist

### 1.4 Design Philosophy

#### Why HTTP Polling

Since Claude Code directly updates files, push notifications from the server are not possible. Therefore, **HTTP polling** is used to periodically fetch data.

| Method | Advantages | Disadvantages |
|--------|------------|---------------|
| HTTP Polling (adopted) | Simple implementation, compatible with Claude Code | Lower real-time performance |
| WebSocket Push | High real-time performance | Cannot receive notifications from Claude Code |

Polling interval can be selected from **5 seconds to 60 seconds** (default: 30 seconds).

#### Team Status Determination

Team status is determined based on the **last modification time (mtime) of the session log**:

| Status | Condition | Delete Button |
|--------|-----------|---------------|
| **active** | Session log mtime ≤ 1 hour | Hidden |
| **stopped** | Session log mtime > 1 hour | **Shown** |
| **unknown** | No session log | **Shown** |
| **inactive** | No members | **Shown** |

#### Unified Timeline

**TimelineService** integrates two data sources:

1. **inbox messages**: `~/.claude/teams/{name}/inboxes/{agent}.json`
2. **session logs**: `~/.claude/projects/{hash}/{sessionId}.jsonl`

This allows centralized viewing of inter-agent communications and user interactions.

---

## 2. System Requirements

### 2.1 Hardware Requirements

| Item | Minimum | Recommended |
|------|---------|-------------|
| CPU | 2 cores | 4 cores or more |
| Memory | 512MB | 1GB or more |
| Disk | 100MB | 500MB or more |

### 2.2 Software Requirements

| Software | Version |
|----------|---------|
| Python | 3.11 or higher |
| Node.js | 18 or higher |
| npm | 9 or higher |

### 2.3 Network Requirements

- Port 8000 (backend)
- Port 5173 (frontend dev server)

---

## 3. Installation

### 3.1 Backend

```bash
# 1. Navigate to project directory
cd cc-agent-teams-action-monitor/backend

# 2. Install dependencies
pip install -e ".[dev]"

# 3. Verify installation
python -c "from app.main import app; print('OK')"
```

### 3.2 Frontend

```bash
# 1. Navigate to project directory
cd cc-agent-teams-action-monitor/frontend

# 2. Install dependencies
npm install

# 3. Verify installation
npm run build
```

---

## 4. Startup

### 4.1 Starting Backend

```bash
# Start in development mode
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Example output on successful startup:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
File watcher started on /Users/xxx/.claude
CacheService started (config_ttl=30s, inbox_ttl=60s)
```

### 4.2 Starting Frontend

```bash
# Start in development mode
cd frontend
npm run dev
```

Example output on successful startup:
```
VITE v5.0.0  ready in 500 ms
➜  Local:   http://localhost:5173/
```

### 4.3 Access

Open your browser and access http://localhost:5173/.

---

## 5. Screen Description

### 5.1 Main Screen Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Agent Teams Dashboard    [🌙] [⏱️30s]           ● Connected        │
├─────────────────────────────────────────────────────────────────────┤
│ [Overview] [Tasks] [Timeline]                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────┐  ┌───────────────────────────────────┐│
│  │     Team List           │  │         Chat Panel                ││
│  │  ┌─────┐ ┌─────┐       │  │  [Search] [Filter]                 ││
│  │  │Team │ │Team │       │  │  ─────────────────────────────    ││
│  │  │  A  │ │  B  │       │  │  📋 task-lead → backend-dev       ││
│  │  └─────┘ └─────┘       │  │  P0: Implement virtual scrolling   ││
│  │                         │  │  ─────────────────────────────    ││
│  │  ┌─────────────────┐   │  │  💤 backend-dev: Idle             ││
│  │  │  Team Details   │   │  │  ─────────────────────────────    ││
│  │  │  Member List    │   │  │  💬 frontend-dev → team-lead      ││
│  │  │  Model Usage    │   │  │  Implementation complete          ││
│  │  └─────────────────┘   │  │                                   ││
│  └─────────────────────────┘  └───────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 View List

| View | Description |
|------|-------------|
| Overview | Team list and details panel |
| Tasks | Task list (with filter and search) |
| Timeline | Message timeline |

### 5.3 Header Features

| Feature | Description |
|---------|-------------|
| 🌙/☀️ Theme Toggle | Switch between dark mode and light mode |
| ⏱️ Polling Interval | Set data refresh interval (5s/10s/20s/30s/60s) |

### 5.4 Team Status Display

Team cards show the current status:

| Status | Icon | Description |
|--------|------|-------------|
| active | 🟢 | Session active (updated within 1 hour) |
| stopped | 🟡 | Session stopped (no update for over 1 hour) |
| unknown | ⚪ | No session log |
| inactive | ⚫ | No members |

### 5.5 Agent Status Display

Agent status is inferred using the following logic:

| Status | Icon | Condition |
|--------|------|-----------|
| idle | 💤 | No activity for 5 minutes or more |
| working | 🔵 | Has in_progress tasks |
| waiting | ⏳ | Has blocked tasks |
| error | ❌ | No activity for 30 minutes or more |
| completed | ✅ | All tasks completed |

Data used for status inference:
- inbox messages (task_assignment, task_completed, etc.)
- task definitions (owner, status, blockedBy)
- session logs (last activity time, model used)

---

## 6. Operations

### 6.1 Selecting a Team

1. Click on a team card
2. Selected team is highlighted
3. Member information is displayed in the details panel
4. Click again to deselect

### 6.2 Checking Tasks

1. Switch to Tasks view
2. Tasks are displayed by status:
   - Pending: Gray
   - In Progress: Blue
   - Completed: Green
   - Stopped: Dark gray (no update for 24+ hours)
3. Use team filter to show only specific team's tasks
4. Use search box to search by subject or assignee

### 6.3 Using Message Timeline

#### Time Range Filter
- Presets: 1 hour, 24 hours, 7 days, 30 days, all time
- Custom: Specify range with slider

#### Sender Filter
- Show only messages from specific agents
- Multiple selection available

#### Message Type Filter
- message: Regular messages
- task_assignment: Task assignment
- idle_notification: Idle notification
- shutdown*: Shutdown related
- plan*: Plan approval related

#### Search Function
- Full-text search for message content

#### Bookmark Function
- Hover over a message and click the bookmark button
- Saved to browser's local storage

### 6.4 Using Chat Panel

1. Chat panel is displayed when a team is selected
2. Messages are displayed in chronological order
3. Separated by date separators
4. Markdown messages are formatted for display

### 6.5 Deleting a Team

Teams with status other than **active** (stopped / unknown / inactive) can be deleted.

1. Click the "Delete" button (🗑️) on a deletable team card
2. Select "Delete" in the confirmation dialog
3. The following files will be deleted:
   - `~/.claude/teams/{team-name}/` - Entire team configuration
   - `~/.claude/tasks/{team-name}/` - Task definitions
   - `~/.claude/projects/{project-hash}/{session}.jsonl` - Session log

**Note**: Active teams cannot be deleted.

### 6.6 Adjusting Polling Interval

Configure via the polling interval selector in the header:

| Interval | Use Case |
|----------|----------|
| 5 seconds | Real-time priority (high load) |
| 10 seconds | Balanced |
| 20 seconds | Normal use |
| 30 seconds (recommended) | Default value |
| 60 seconds | Low load, power saving |

### 6.7 Using Unified Timeline

The Timeline view displays inbox messages and session logs integrated together.

#### Session Log Entry Types

| Type | Content | Icon |
|------|---------|------|
| user_message | User input | 👤 |
| assistant_message | Assistant response | 🤖 |
| thinking | Thinking process | 💭 |
| tool_use | Tool call | 🔧 |
| file_change | File change | 📁 |

#### File Change History

File changes are displayed from `file-history-snapshot` entries:

| Operation | Icon | Color |
|-----------|------|-------|
| created | ✨ | Green |
| modified | ✏️ | Blue |
| deleted | 🗑️ | Red |
| read | 📖 | Gray |

---

## 7. Troubleshooting

### 7.1 Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Teams not displayed | ~/.claude/teams/ is empty | Create a team in Claude Code |
| Data not updating | Backend stopped | Restart backend |
| Page won't load | Frontend not started | Run npm run dev |
| API error | CORS configuration mismatch | Check configuration |
| Messages not displayed | Empty inbox | Agent sends messages |
| Updates are slow | Long polling interval | Shorten interval from header |
| Team cannot be deleted | Active status | Can delete after session stops |

### 7.2 Error Message List

| Error | Description | Action |
|-------|-------------|--------|
| 404 Not Found | Resource does not exist | Check data |
| 500 Internal Error | Server error | Check logs |

### 7.3 How to Check Logs

**Backend Logs**
```bash
# Check console output
# Verify in the terminal where backend was started
```

**Frontend Logs**
```bash
# Check in browser developer tools (F12)
# Open Console tab
```

---

## 8. FAQ

### Q1: How do I create a team?

A: Use the `/teamworks` command or `TeamCreate` tool in Claude Code.

### Q2: Data is not updating

A: Please check the following:
1. Backend is running
2. Polling interval is appropriately configured
3. Port 8000 is not blocked

### Q3: Where is data stored?

A: Stored in JSON files under the `~/.claude/` directory.

### Q4: Team shows as "stopped" status

A: Teams with no session log updates for **more than 1 hour** are automatically displayed as "stopped" status. Resuming the team will return it to "active".

### Q5: Where are message bookmarks saved?

A: Saved to browser's local storage. They are not transferred when switching browsers.

---

## 9. Glossary

| Term | Description |
|------|-------------|
| Agent Team | A group of agents defined in Claude Code |
| Task | A unit of work managed within a team |
| Inbox | Message inbox between agents |
| Timeline | A view that displays messages chronologically |
| Protocol Message | Standardized messages for inter-agent communication |
| HTTP Polling | A method of periodically sending requests to a server to fetch data |
| FileWatcher | A service that monitors file system changes and invalidates cache |
| CacheService | A high-speed service using in-memory cache |
| Session Log | Claude Code session history (.jsonl file) |
| mtime | File last modification time (used for status determination) |

---

## 10. Contact

If the issue persists, please check GitHub Issues.

---

*Created: 2026-02-16*
*Last Updated: 2026-02-24*
*Version: 2.1.0*
