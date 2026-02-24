# Agent Teams Dashboard - UAT Test Cases

**Target Version**: 2.1.0
**Created**: 2026-02-16
**Last Updated**: 2026-02-24
**Target Audience**: Product Owner, Testers

**Language**: [日本語](uat-test-cases.md) | [English](uat-test-cases.en.md) | [中文](uat-test-cases.zh.md)

---

## Table of Contents

1. [Test Overview](#1-test-overview)
2. [Team Monitoring Features](#2-team-monitoring-features)
3. [Message Timeline Features](#3-message-timeline-features)
4. [Task Dependency Graph Features](#4-task-dependency-graph-features)
5. [Agent Communication Network Features](#5-agent-communication-network-features)
6. [UI/UX Features](#6-uiux-features)
7. [Integration/End-to-End Scenarios](#7-integration-end-to-end-scenarios)
8. [Appendix](#8-appendix)
9. [Chat-Style Timeline Features](#9-chat-style-timeline-features)
10. [Team Status & Deletion Features](#10-team-status--deletion-features)
11. [Test Completion Checklist (Updated)](#11-test-completion-checklist-updated)

---

## 1. Test Overview

### 1.1 Test Purpose

To verify that the Agent Teams Dashboard features work correctly according to the functional design specifications and meet the expectations of the Product Owner and end users.

### 1.2 Test Environment

| Item | Requirements |
|-----|-------------|
| Backend | FastAPI server (port 8000) |
| Frontend | Vite dev server (port 5173) |
| Browser | Chrome, Firefox, Safari latest versions |
| Screen Size | Desktop (1920×1080) *Tablet/Mobile excluded |
| Test Data | Team/Task data in `~/.claude/` directory |

### 1.3 Priority Definitions

| Priority | Description |
|----------|-------------|
| **P0** | Release blocker. Required feature. Cannot release without this working. |
| **P1** | Important feature. Affects major user scenarios. Address as much as possible. |
| **P2** | Enhancement feature. Improvements and edge cases. Address if time permits. |

### 1.4 Test Result Recording Method

Record the following at the end of each test case:

```
Execution Date: YYYY-MM-DD
Tester: [Name]
Result: ✅ Pass / ❌ Fail / ⏭️ Skip
Notes: [Issues or comments]
```

### 1.5 Design Philosophy

#### HTTP Polling Related Testing

This system achieves real-time updates through **HTTP polling**. WebSocket testing is not required.

Important testing considerations:
1. **Polling Interval**: Can be set from 5 to 60 seconds via header
2. **staleTime**: Uses cache for 10 seconds
3. **refetchInterval**: Automatically refetches at set intervals

#### Team Status Determination

Status is determined by **session log mtime**:

| Status | Criteria |
|--------|----------|
| active | Session log mtime ≤ 1 hour |
| stopped | Session log mtime > 1 hour |
| unknown | No session log |
| inactive | No members |

---

## 2. Team Monitoring Features

### TC-001: Team List Display (Basic)

| Item | Description |
|-----|-------------|
| **Test ID** | TC-001 |
| **Test Item** | Team Monitoring - Basic Team List Display |
| **Priority** | P0 |
| **Prerequisites** | Backend server is running. One or more teams exist in `~/.claude/teams/`. |

**Test Steps**:
1. Access `http://localhost:5173` in browser
2. Wait for Overview Panel to be displayed (max 5 seconds)

**Expected Results**:
- [ ] Team cards are displayed vertically in a list
- [ ] Team name is displayed on each team card
- [ ] Member count and task count are displayed
- [ ] Team status (Active/Idle) is displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-002: Team List Display (Multiple Teams)

| Item | Description |
|-----|-------------|
| **Test ID** | TC-002 |
| **Test Item** | Team Monitoring - Display Order of Multiple Teams |
| **Priority** | P1 |
| **Prerequisites** | Three or more teams exist in `~/.claude/teams/`. |

**Test Steps**:
1. Display dashboard
2. Verify team list

**Expected Results**:
- [ ] All teams are displayed
- [ ] Teams are sorted by creation date (newest first)
- [ ] All teams accessible via scrolling

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-003: Team Detail Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-003 |
| **Test Item** | Team Monitoring - Team Detail Information Display |
| **Priority** | P0 |
| **Prerequisites** | One or more teams exist. |

**Test Steps**:
1. Click on a team card
2. Verify team detail panel

**Expected Results**:
- [ ] Team name, description, creation date are displayed
- [ ] Lead agent information is displayed
- [ ] Member list (name, model, status) is displayed
- [ ] Can return to list via "Back" or close action

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-004: Model Visualization - ModelBadge Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-004 |
| **Test Item** | Model Visualization - Badge Display for Each Model |
| **Priority** | P0 |
| **Prerequisites** | Team using GLM-5 model exists. Test dummy files created. |

**Test Data Creation Method**:
```bash
# Create test team config file
mkdir -p ~/.claude/teams/test-model-team

# Specify GLM-5 model in config.json
cat > ~/.claude/teams/test-model-team/config.json << 'EOF'
{
  "name": "test-model-team",
  "description": "Model Badge Test Team",
  "createdAt": 1704067200,
  "leadAgentId": "lead-001",
  "leadSessionId": "session-001",
  "members": [
    {
      "agentId": "agent-001",
      "name": "glm-agent",
      "agentType": "tester",
      "model": "glm-5",
      "color": "red",
      "joinedAt": 1704067200,
      "tmuxPaneId": "pane-001",
      "cwd": "/tmp",
      "backendType": "in-process"
    }
  ]
}
EOF
```

**Test Steps**:
1. Create the above dummy file
2. Display dashboard (or reload)
3. Verify test-model-team card
4. Verify other models (if available)

**Expected Results**:
- [ ] GLM-5: 🔴 Red badge (#EF4444)
- [ ] Unknown: ⚪ Gray badge (when non-existent model specified)

**Notes**:
- Also verify Kimi K2.5 and Claude series models if available in actual environment
- Model color definitions can be checked in `frontend/src/config/models.ts`

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-005: Model Visualization - Per-Team Model Aggregation

| Item | Description |
|-----|-------------|
| **Test ID** | TC-005 |
| **Test Item** | Model Visualization - Model Distribution Display Within Team |
| **Priority** | P0 |
| **Prerequisites** | Team using multiple models exists (e.g., 3×Opus, 2×Kimi). |

**Test Steps**:
1. Verify team card using multiple models

**Expected Results**:
- [ ] Count per model is displayed (e.g., "🟣 Opus 4.6 × 3")
- [ ] Multiple models displayed side by side
- [ ] Total member count matches sum of model counts

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-006: Team Search Feature

| Item | Description |
|-----|-------------|
| **Test ID** | TC-006 |
| **Test Item** | Team Monitoring - Team Name Search |
| **Priority** | P1 |
| **Prerequisites** | Multiple teams exist. |

**Test Steps**:
1. Enter partial team name in search box
2. Verify search results
3. Reset search via clear button

**Expected Results**:
- [ ] Only matching teams are displayed
- [ ] Case-insensitive search works
- [ ] "No results" message shown when no matches
- [ ] All teams re-displayed when cleared

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-007: Real-time Update - Team Addition

| Item | Description |
|-----|-------------|
| **Test ID** | TC-007 |
| **Test Item** | Team Monitoring - Real-time Reflection of New Team Addition |
| **Priority** | P1 |
| **Prerequisites** | HTTP polling is running. |

**Test Steps**:
1. Display dashboard
2. Create new Agent Team in terminal (`claude team create test-team`)
3. Verify dashboard display (wait max 5 seconds)

**Expected Results**:
- [ ] New team automatically added to list
- [ ] Animation (slide-in) plays
- [ ] Live badge is displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-008: Real-time Update - Member Status Change

| Item | Description |
|-----|-------------|
| **Test ID** | TC-008 |
| **Test Item** | Team Monitoring - Real-time Update of Member Status |
| **Priority** | P1 |
| **Prerequisites** | Active team exists. |

**Test Steps**:
1. Display team details
2. Wait for agent to complete task and become idle (or simulate)

**Expected Results**:
- [ ] Member status automatically updates
- [ ] Icon color changes (active: green → idle: yellow)
- [ ] Update animation (fade + color) plays

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

## 3. Message Timeline Features

### TC-101: Timeline Basic Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-101 |
| **Test Item** | Message Timeline - Basic Display |
| **Priority** | P0 |
| **Prerequisites** | Team is selected and one or more messages exist. |

**Test Steps**:
1. Select a team
2. Verify Message Timeline panel

**Expected Results**:
- [ ] vis-timeline is displayed
- [ ] Time axis (X-axis) displayed at top
- [ ] Messages arranged chronologically
- [ ] Sender name is displayed
- [ ] First 50 characters of message body displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-102: Timeline Message Type Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-102 |
| **Test Item** | Message Timeline - Visual Distinction by Message Type |
| **Priority** | P0 |
| **Prerequisites** | Regular and protocol messages are mixed. |

**Test Steps**:
1. Display timeline
2. Verify different message types

**Expected Results**:
- [ ] Regular message: Standard style (box)
- [ ] idle_notification: Yellow icon/background
- [ ] shutdown_request: Red icon/background
- [ ] shutdown_approved: Green icon/background
- [ ] task_assignment: Blue icon/background

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-103: Timeline Zoom Feature

| Item | Description |
|-----|-------------|
| **Test ID** | TC-103 |
| **Test Item** | Message Timeline - Zoom In/Out |
| **Priority** | P0 |
| **Prerequisites** | Multiple messages exist over time. |

**Test Steps**:
1. Display timeline
2. Zoom in with mouse wheel
3. Zoom out with mouse wheel
4. Use zoom control buttons

**Expected Results**:
- [ ] Zoom in: Detailed time display (minutes)
- [ ] Zoom out: Wide range display (hours)
- [ ] Zoom range: Minimum 1 minute to maximum 24 hours
- [ ] Smooth animation (400ms, ease-in-out)

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-104: Timeline Pan Feature

| Item | Description |
|-----|-------------|
| **Test ID** | TC-104 |
| **Test Item** | Message Timeline - Horizontal Scroll (Pan) |
| **Priority** | P1 |
| **Prerequisites** | Multiple messages exist. |

**Test Steps**:
1. Display timeline
2. Drag left and right
3. Move via scrollbar

**Expected Results**:
- [ ] Can drag timeline left/right
- [ ] Can also move via scrollbar
- [ ] Inertial scrolling enabled

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-105: Message Detail Modal Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-105 |
| **Test Item** | Message Timeline - Detail Modal |
| **Priority** | P0 |
| **Prerequisites** | Messages are displayed on timeline. |

**Test Steps**:
1. Click a message on timeline
2. Verify modal
3. Close modal via close button

**Expected Results**:
- [ ] Modal displayed in center (animation: scale + fade, 200ms)
- [ ] From/To/Time/Type displayed
- [ ] Full message text displayed
- [ ] Metadata (color, read status) displayed
- [ ] Copy button copies text
- [ ] Closable via Close button or ×

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-106: Message Detail Modal - JSON Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-106 |
| **Test Item** | Message Timeline - JSON Display of Protocol Messages |
| **Priority** | P1 |
| **Prerequisites** | Protocol messages (idle_notification, etc.) exist. |

**Test Steps**:
1. Click on protocol message
2. Verify modal content

**Expected Results**:
- [ ] Protocol type shown in Type field
- [ ] Body displayed as formatted JSON
- [ ] JSON has syntax highlighting

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-107: Time Range Selection - Slider

| Item | Description |
|-----|-------------|
| **Test ID** | TC-107 |
| **Test Item** | Message Timeline - Time Range Slider |
| **Priority** | P0 |
| **Prerequisites** | Messages exist spanning multiple times. |

**Test Steps**:
1. Verify Time Range slider
2. Move slider handles to change range
3. Verify timeline display

**Expected Results**:
- [ ] Slider is displayed
- [ ] Start/end times labeled
- [ ] Timeline updates immediately on range change
- [ ] Out-of-range messages hidden

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-108: Time Range Selection - Quick Buttons

| Item | Description |
|-----|-------------|
| **Test ID** | TC-108 |
| **Test Item** | Message Timeline - Quick Time Range Buttons |
| **Priority** | P1 |
| **Prerequisites** | Messages exist. |

**Test Steps**:
1. Click "5m" button
2. Click "15m" button
3. Click "1h" button
4. Click "All" button

**Expected Results**:
- [ ] "5m": Range from now to 5 minutes ago
- [ ] "15m": Range from now to 15 minutes ago
- [ ] "1h": Range from now to 1 hour ago
- [ ] "All": Display all period messages

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-109: Filter - Sender

| Item | Description |
|-----|-------------|
| **Test ID** | TC-109 |
| **Test Item** | Message Timeline - Sender Filter |
| **Priority** | P1 |
| **Prerequisites** | Messages from multiple senders exist. |

**Test Steps**:
1. Open sender dropdown in "Filter" section
2. Select specific sender
3. Verify timeline
4. Select multiple senders
5. Clear filter

**Expected Results**:
- [ ] Only selected sender messages shown
- [ ] All matching messages shown when multiple selected
- [ ] All messages re-displayed when cleared

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-110: Filter - Message Type

| Item | Description |
|-----|-------------|
| **Test ID** | TC-110 |
| **Test Item** | Message Timeline - Message Type Filter |
| **Priority** | P1 |
| **Prerequisites** | Different message types are mixed. |

**Test Steps**:
1. Open Type filter dropdown
2. Select only "idle_notification"
3. Verify timeline
4. Select multiple types
5. Clear filter

**Expected Results**:
- [ ] Only selected type messages shown
- [ ] Icon/color per message type maintained
- [ ] All types re-displayed when cleared

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-111: Filter - Unread Only

| Item | Description |
|-----|-------------|
| **Test ID** | TC-111 |
| **Test Item** | Message Timeline - Unread Filter |
| **Priority** | P1 |
| **Prerequisites** | Read and unread messages are mixed. |

**Test Steps**:
1. Turn on "Unread only" checkbox
2. Verify timeline
3. Turn off checkbox

**Expected Results**:
- [ ] Only unread messages displayed
- [ ] Unread messages have prominent marker (●)
- [ ] All messages re-displayed when off

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-112: Search Feature

| Item | Description |
|-----|-------------|
| **Test ID** | TC-112 |
| **Test Item** | Message Timeline - Keyword Search |
| **Priority** | P1 |
| **Prerequisites** | Multiple messages exist. |

**Test Steps**:
1. Enter keyword in search box
2. Verify search results
3. Verify result count
4. Reset search via clear button

**Expected Results**:
- [ ] Results filtered in real-time
- [ ] Search targets: message body, summary, sender name
- [ ] Case-insensitive
- [ ] Result count displayed (e.g., "5 results")
- [ ] "0 results" shown when no matches
- [ ] All messages re-displayed when cleared

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-113: Real-time Update - New Messages

| Item | Description |
|-----|-------------|
| **Test ID** | TC-113 |
| **Test Item** | Message Timeline - Real-time Addition of New Messages |
| **Priority** | P0 |
| **Prerequisites** | HTTP polling is running. Active team is selected. |

**Test Steps**:
1. Display timeline
2. Send/receive messages between agents (or add test data)
3. Verify timeline update

**Expected Results**:
- [ ] New messages automatically added to timeline
- [ ] Animation (slide-in from top, 250ms, spring) plays
- [ ] Scroll to or marker on new message

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-114: Empty State Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-114 |
| **Test Item** | Message Timeline - Display When No Messages |
| **Priority** | P1 |
| **Prerequisites** | Team with zero messages exists (or all filtered out). |

**Test Steps**:
1. Select team with no messages
2. Verify empty state

**Expected Results**:
- [ ] "No messages" or similar message displayed
- [ ] Information icon or illustration displayed
- [ ] Guidance for next action (e.g., select different team)

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

## 4. Task Dependency Graph Features

### TC-201: Task Dependency Graph Basic Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-201 |
| **Test Item** | Task Dependency Graph - Basic Display |
| **Priority** | P0 |
| **Prerequisites** | One or more tasks exist. |

**Test Steps**:
1. Select "Task Dependencies" view
2. Verify graph

**Expected Results**:
- [ ] D3.js graph displayed
- [ ] Each task shown as node (circle)
- [ ] Dependencies shown as arrows
- [ ] Task name or ID shown in node

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-202: Task Status Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-202 |
| **Test Item** | Task Dependency Graph - Color Coding by Status |
| **Priority** | P0 |
| **Prerequisites** | Tasks with different statuses (pending, in_progress, completed) exist. |

**Test Steps**:
1. Display graph
2. Verify each node's color

**Expected Results**:
- [ ] Pending: Gray (#6B7280)
- [ ] In Progress: Blue (#3B82F6)
- [ ] Completed: Green (#10B981)
- [ ] Legend displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-203: Task Node Dragging

| Item | Description |
|-----|-------------|
| **Test ID** | TC-203 |
| **Test Item** | Task Dependency Graph - Node Drag Movement |
| **Priority** | P1 |
| **Prerequisites** | Multiple tasks exist. |

**Test Steps**:
1. Display graph
2. Drag node to move
3. Verify relationship with other nodes

**Expected Results**:
- [ ] Can drag node to move
- [ ] Lines (links) follow during drag
- [ ] Simulation continues after drag ends
- [ ] Constraint preventing node from leaving screen (optional)

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-204: Task Node Hover

| Item | Description |
|-----|-------------|
| **Test ID** | TC-204 |
| **Test Item** | Task Dependency Graph - Node Hover Information |
| **Priority** | P1 |
| **Prerequisites** | Tasks exist. |

**Test Steps**:
1. Display graph
2. Hover mouse over node
3. Verify tooltip

**Expected Results**:
- [ ] Tooltip displayed
- [ ] Task name, status, owner shown
- [ ] Node highlighted during hover (scale up)

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-205: Graph Zoom & Pan

| Item | Description |
|-----|-------------|
| **Test ID** | TC-205 |
| **Test Item** | Task Dependency Graph - Zoom and Pan |
| **Priority** | P1 |
| **Prerequisites** | Multiple tasks exist. |

**Test Steps**:
1. Display graph
2. Zoom with mouse wheel
3. Pan by dragging

**Expected Results**:
- [ ] Zoom in/out possible
- [ ] Pan (movement) possible
- [ ] Zoom control buttons shown (+/-)
- [ ] "Fit to Screen" button shows all

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-206: Real-time Update

| Item | Description |
|-----|-------------|
| **Test ID** | TC-206 |
| **Test Item** | Task Dependency Graph - Real-time Reflection of Task Updates |
| **Priority** | P1 |
| **Prerequisites** | HTTP polling is running. |

**Test Steps**:
1. Display graph
2. Change task status (to completed)
3. Verify graph update

**Expected Results**:
- [ ] Task color automatically changes
- [ ] Animation (color transition, 300ms) plays
- [ ] New task adds node when added

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-207: DAG Display Verification

| Item | Description |
|-----|-------------|
| **Test ID** | TC-207 |
| **Test Item** | Task Dependency Graph - DAG Structure Without Circular Dependencies |
| **Priority** | P2 |
| **Prerequisites** | Group of tasks with dependencies exists. |

**Test Steps**:
1. Display graph with complex dependencies
2. Verify structure

**Expected Results**:
- [ ] All dependencies correctly shown with arrows
- [ ] No circular dependencies (theoretically)
- [ ] Hierarchical structure visually understandable

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

## 5. Agent Communication Network Features

### TC-301: Network Graph Basic Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-301 |
| **Test Item** | Agent Communication Network - Basic Display |
| **Priority** | P1 |
| **Prerequisites** | Multiple agents exist with message exchanges. |

**Test Steps**:
1. Select "Agent Network" view
2. Verify graph

**Expected Results**:
- [ ] D3.js network graph displayed
- [ ] Each agent shown as node
- [ ] Message communication shown as lines (edges)
- [ ] Edge thickness/color indicates frequency/type

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-302: Agent Node Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-302 |
| **Test Item** | Agent Communication Network - Agent Node Details |
| **Priority** | P1 |
| **Prerequisites** | Multiple agents exist. |

**Test Steps**:
1. Display network graph
2. Verify agent nodes

**Expected Results**:
- [ ] Agent name displayed
- [ ] Icon with model-specific color displayed
- [ ] Active/Idle state visually indicated
- [ ] Node size varies by importance/activity (optional)

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-303: Communication Edge Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-303 |
| **Test Item** | Agent Communication Network - Communication Relationship Display |
| **Priority** | P1 |
| **Prerequisites** | Message communication history exists. |

**Test Steps**:
1. Display network graph
2. Verify edges (lines)

**Expected Results**:
- [ ] Arrow showing send→receive direction
- [ ] Edge thickness by communication count
- [ ] Color coding by message type
- [ ] Edge hover shows communication details

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-304: Network Interaction

| Item | Description |
|-----|-------------|
| **Test ID** | TC-304 |
| **Test Item** | Agent Communication Network - Drag, Zoom, Pan |
| **Priority** | P1 |
| **Prerequisites** | Multiple agents exist. |

**Test Steps**:
1. Drag node
2. Zoom in/out
3. Pan (move)

**Expected Results**:
- [ ] Node drag adjusts layout
- [ ] Zoom in/out possible
- [ ] Pan moves entire view

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-305: Node Hover Details

| Item | Description |
|-----|-------------|
| **Test ID** | TC-305 |
| **Test Item** | Agent Communication Network - Agent Detail Tooltip |
| **Priority** | P1 |
| **Prerequisites** | Agents exist. |

**Test Steps**:
1. Hover over agent node
2. Verify tooltip

**Expected Results**:
- [ ] Agent name, model, status displayed
- [ ] Sent/received message counts displayed
- [ ] Connected agent list displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-306: Real-time Update

| Item | Description |
|-----|-------------|
| **Test ID** | TC-306 |
| **Test Item** | Agent Communication Network - Real-time Reflection of New Communications |
| **Priority** | P1 |
| **Prerequisites** | HTTP polling is running. |

**Test Steps**:
1. Display network graph
2. Send new message between agents
3. Verify graph update

**Expected Results**:
- [ ] New edge added (if new communication)
- [ ] Existing edge highlighted (if existing communication)
- [ ] Edge addition animation plays

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

## 6. UI/UX Features

### TC-401: Dark Mode Toggle

| Item | Description |
|-----|-------------|
| **Test ID** | TC-401 |
| **Test Item** | UI/UX - Dark Mode Toggle |
| **Priority** | P1 |
| **Prerequisites** | Dashboard is displayed. |

**Test Steps**:
1. Click 🌙 icon in header
2. Verify dark mode
3. Click ☀️ icon
4. Verify light mode

**Expected Results**:
- [ ] Light→Dark: Background darkens, text lightens
- [ ] Dark→Light: Returns to original color scheme
- [ ] Color scheme changes consistently across all components
- [ ] Toggle animation smooth (300ms)

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-402: Dark Mode Persistence

| Item | Description |
|-----|-------------|
| **Test ID** | TC-402 |
| **Test Item** | UI/UX - Dark Mode Setting Persistence |
| **Priority** | P1 |
| **Prerequisites** | None |

**Test Steps**:
1. Switch to dark mode
2. Reload page
3. Verify setting

**Expected Results**:
- [ ] Dark mode maintained after reload
- [ ] Setting saved in localStorage

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-403: Real-time Indicator

| Item | Description |
|-----|-------------|
| **Test ID** | TC-403 |
| **Test Item** | UI/UX - Live Badge and Connection Status Display |
| **Priority** | P0 |
| **Prerequisites** | HTTP polling is running. |

**Test Steps**:
1. Verify connection status indicator in header
2. Stop backend (disconnect HTTP)
3. Verify status change
4. Restart backend

**Expected Results**:
- [ ] Connected: 🔴 Live badge displayed (blinking animation)
- [ ] Disconnected: Gray "Disconnected" display
- [ ] Reconnecting: "Connecting" → "Live" change
- [ ] Polling fallback based on connection status

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-404: Responsive Layout - Desktop

| Item | Description |
|-----|-------------|
| **Test ID** | TC-404 |
| **Test Item** | UI/UX - Desktop Layout (>1024px) |
| **Priority** | P0 |
| **Prerequisites** | Browser window width ≥1024px. |

**Test Steps**:
1. Set browser width to 1920px
2. Verify layout

**Expected Results**:
- [ ] 3-pane layout (Overview + Timeline + Graph/Stats)
- [ ] Each panel displayed at appropriate width
- [ ] No horizontal scrolling needed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-405: Responsive Layout - Tablet/Mobile (Skip)

| Item | Description |
|-----|-------------|
| **Test ID** | TC-405 |
| **Test Item** | UI/UX - Tablet/Mobile Layout |
| **Priority** | P2 |
| **Prerequisites** | None |

**Notes**:
This test case is skipped. Only Desktop (1920×1080) will be verified as UAT scope.

Tablet (1024×768) and Mobile (375×667) support will be considered separately as future enhancements.

**Execution Record**:
```
Execution Date: N/A
Tester: N/A
Result: ⏭️ Skip
Notes: Non-desktop excluded from UAT
```

---

### TC-407: Loading State

| Item | Description |
|-----|-------------|
| **Test ID** | TC-407 |
| **Test Item** | UI/UX - Loading Indicator |
| **Priority** | P1 |
| **Prerequisites** | None |

**Test Steps**:
1. Reload page
2. Verify initial loading
3. Verify data fetch state

**Expected Results**:
- [ ] Loading spinner or skeleton displayed
- [ ] "Loading..." text displayed
- [ ] Content displays smoothly after data loads

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-408: Error State

| Item | Description |
|-----|-------------|
| **Test ID** | TC-408 |
| **Test Item** | UI/UX - Error Display and Recovery |
| **Priority** | P1 |
| **Prerequisites** | Backend connection can be disconnected. |

**Test Steps**:
1. Stop backend
2. Verify error display
3. Click retry button

**Expected Results**:
- [ ] Error message displayed
- [ ] "Reconnect" or "Retry" button displayed
- [ ] UI remains intact despite error
- [ ] Retry attempts recovery

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

## 7. Integration/End-to-End Scenarios

### TC-501: Complete Workflow - Team Monitoring to Detail View

| Item | Description |
|-----|-------------|
| **Test ID** | TC-501 |
| **Test Item** | E2E - Complete Flow from Team Selection to Message Detail |
| **Priority** | P0 |
| **Prerequisites** | Teams and messages exist. |

**Test Steps**:
1. Open dashboard
2. Select a team
3. Click message in timeline
4. Verify detail modal
5. Close modal
6. Select different team

**Expected Results**:
- [ ] UI transitions smoothly at each step
- [ ] Data displayed correctly
- [ ] State properly managed (selected team, modal state, etc.)

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-502: Complete Workflow - Filtering and Search

| Item | Description |
|-----|-------------|
| **Test ID** | TC-502 |
| **Test Item** | E2E - Combination of Message Filtering and Search |
| **Priority** | P1 |
| **Prerequisites** | Many messages exist. |

**Test Steps**:
1. Select a team
2. Set time range to "1h"
3. Apply sender filter
4. Execute keyword search
5. Click message to verify details
6. Clear all filters

**Expected Results**:
- [ ] Filters applied cumulatively
- [ ] Result count updates in real-time
- [ ] Filter state maintained after detail view

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-503: Complete Workflow - Graph View Switching

| Item | Description |
|-----|-------------|
| **Test ID** | TC-503 |
| **Test Item** | E2E - Switching Between Task Graph and Network Graph |
| **Priority** | P1 |
| **Prerequisites** | Tasks and agent communications exist. |

**Test Steps**:
1. Select "Task Dependencies" view
2. Verify graph
3. Select "Agent Network" view
4. Verify graph
5. Return to "Overview"

**Expected Results**:
- [ ] View switching smooth (animation 300ms)
- [ ] Each view's data displayed correctly
- [ ] Previous view state maintained (scroll position, etc.)

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-504: Complete Workflow - Real-time Monitoring

| Item | Description |
|-----|-------------|
| **Test ID** | TC-504 |
| **Test Item** | E2E - Continuous Monitoring of Real-time Updates |
| **Priority** | P0 |
| **Priority** | P0 |
| **Prerequisites** | HTTP polling is running. Active team exists. |

**Test Steps**:
1. Open dashboard
2. Monitor for 5 minutes
3. Execute the following:
   - Create new Agent Team
   - Send messages between agents
   - Add/complete tasks
4. Verify each update

**Expected Results**:
- [ ] All updates reflected in real-time
- [ ] Automatic polling reconnection on disconnect
- [ ] No memory leaks (long-term monitoring)

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-505: Performance - Large Data Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-505 |
| **Test Item** | E2E - Display Performance with Large Messages/Tasks |
| **Priority** | P2 |
| **Prerequisites** | 100+ messages, 20+ tasks exist. |

**Test Steps**:
1. Select team with large data
2. Verify timeline scroll performance
3. Verify graph operation performance
4. Verify filter application speed

**Expected Results**:
- [ ] Initial display within 3 seconds
- [ ] Scrolling smooth at 60fps
- [ ] Filter application within 1 second
- [ ] Memory usage stable (not continuously increasing)

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

## 8. Appendix

### 8.1 Test Completion Checklist

- [ ] All P0 tests Pass
- [ ] 80%+ of P1 tests Pass
- [ ] Zero critical bugs
- [ ] Minor bugs documented and mitigation planned
- [ ] Performance criteria met
- [ ] Cross-browser testing complete

### 8.2 Known Limitations

| Limitation | Description | Mitigation |
|-----------|-------------|------------|
| Data deletion on session end | Agent Teams specification | Use for real-time monitoring only |
| File locking | Read-only to avoid conflicts | Read-only operation |

### 8.3 Contacts

| Role | Contact |
|------|---------|
| Product Owner | [Fill in] |
| Test Lead | [Fill in] |
| Development Lead | [Fill in] |

---

## 9. Chat-Style Timeline Features (2026-02-18 Design Specification)

This section contains new test cases based on the Chat-Style Message Timeline Design Specification (2026-02-18-chat-timeline-design.md).

### TC-601: Chat Timeline Basic Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-601 |
| **Test Item** | Chat Timeline - Basic Display |
| **Priority** | P0 |
| **Prerequisites** | Team is selected and one or more messages exist. |

**Test Steps**:
1. Select Timeline tab
2. Select a team
3. Verify chat timeline panel

**Expected Results**:
- [ ] Chat header displayed (title, search box, filter, refresh button)
- [ ] Message bubbles displayed chronologically (ascending)
- [ ] Avatar circular with agent initials
- [ ] Sender name displayed
- [ ] Message body displayed in bubble
- [ ] Timestamp displayed at bottom-right of bubble

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-602: Message Type Icon Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-602 |
| **Test Item** | Chat Timeline - Message Type Icons |
| **Priority** | P0 |
| **Prerequisites** | Different message types are mixed. |

**Test Steps**:
1. Display chat timeline
2. Verify each message's icon

**Expected Results**:
- [ ] message: 💬 icon
- [ ] idle_notification: 💤 icon
- [ ] shutdown_request: 🛑 icon
- [ ] shutdown_response: ✓ icon
- [ ] plan_approval_request: 📋 icon
- [ ] plan_approval_response: ✅ icon
- [ ] task_assignment: 📝 icon
- [ ] unknown: ❓ icon

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-603: Agent-Specific Coloring

| Item | Description |
|-----|-------------|
| **Test ID** | TC-603 |
| **Test Item** | Chat Timeline - Agent-Specific Bubble Colors |
| **Priority** | P1 |
| **Prerequisites** | Multiple agents have sent messages. |

**Test Steps**:
1. Verify message bubbles from different agents
2. Verify each agent's background color

**Expected Results**:
- [ ] team-lead: bg-blue-100 / text-blue-800
- [ ] backend-dev: bg-green-100 / text-green-800
- [ ] frontend-dev: bg-purple-100 / text-purple-800
- [ ] reviewer: bg-yellow-100 / text-yellow-800
- [ ] Unassigned: bg-gray-100 / text-gray-800

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-604: Smart Scroll Feature

| Item | Description |
|-----|-------------|
| **Test ID** | TC-604 |
| **Test Item** | Chat Timeline - Smart Scroll |
| **Priority** | P0 |
| **Prerequisites** | Chat timeline is displayed. |

**Test Steps**:
1. Set scroll position to bottom
2. Receive new message (or wait for polling update)
3. Verify auto-scroll
4. Move scroll position up
5. Receive new message
6. Verify new message notification

**Expected Results**:
- [ ] Within 100px of bottom: Auto-scroll on new message
- [ ] More than 100px up: "New messages" notification displayed
- [ ] Click notification to scroll to bottom

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-605: Message Search Feature

| Item | Description |
|-----|-------------|
| **Test ID** | TC-605 |
| **Test Item** | Chat Timeline - Real-time Search |
| **Priority** | P0 |
| **Prerequisites** | Multiple messages exist. |

**Test Steps**:
1. Enter keyword in search box
2. Verify real-time filtering
3. Verify result count
4. Verify full display on search clear

**Expected Results**:
- [ ] Results filtered in real-time during typing
- [ ] Search targets: sender name, message body, metadata
- [ ] Case-insensitive
- [ ] Result count displayed (e.g., "5 results")

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-606: Message Type Filter

| Item | Description |
|-----|-------------|
| **Test ID** | TC-606 |
| **Test Item** | Chat Timeline - Message Type Filter |
| **Priority** | P0 |
| **Prerequisites** | Different message types are mixed. |

**Test Steps**:
1. Click filter button
2. Select message types (multiple allowed)
3. Verify results
4. Clear filter

**Expected Results**:
- [ ] Only selected types displayed
- [ ] Multiple selection possible
- [ ] Active filters visually indicated
- [ ] All messages re-displayed when cleared

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-607: Message Detail Panel Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-607 |
| **Test Item** | Chat Timeline - Message Detail Panel |
| **Priority** | P0 |
| **Prerequisites** | Messages are displayed. |

**Test Steps**:
1. Click message bubble
2. Verify detail panel slide-in
3. Verify panel content
4. Close via × button or outside click

**Expected Results**:
- [ ] Slide-in animation from right
- [ ] Sender information (name, avatar) displayed
- [ ] Recipient information displayed
- [ ] Message body displayed
- [ ] Detailed timestamp displayed
- [ ] Message type displayed
- [ ] JSON raw data (collapsed) displayed
- [ ] Copy button works
- [ ] Closable via × button / outside click

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-608: Polling Interval Change

| Item | Description |
|-----|-------------|
| **Test ID** | TC-608 |
| **Test Item** | Chat Timeline - Polling Interval Selection |
| **Priority** | P0 |
| **Prerequisites** | Chat timeline is displayed. |

**Test Steps**:
1. Operate polling interval selector
2. Change interval (5s, 10s, 30s, off)
3. Verify data update interval

**Expected Results**:
- [ ] Data updates at selected interval
- [ ] Changes take effect immediately
- [ ] Auto-update stops when off selected

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-609: Refresh Button Action

| Item | Description |
|-----|-------------|
| **Test ID** | TC-609 |
| **Test Item** | Chat Timeline - Manual Refresh |
| **Priority** | P1 |
| **Prerequisites** | Chat timeline is displayed. |

**Test Steps**:
1. Click refresh button
2. Verify loading indicator
3. Verify data update

**Expected Results**:
- [ ] Click triggers data refetch
- [ ] Spinner animation during loading
- [ ] Latest data displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-610: Guide Display When No Team Selected

| Item | Description |
|-----|-------------|
| **Test ID** | TC-610 |
| **Test Item** | Chat Timeline - Unselected Guide |
| **Priority** | P1 |
| **Prerequisites** | Timeline tab is selected. |

**Test Steps**:
1. Display timeline without selecting a team

**Expected Results**:
- [ ] "Please select a team" message displayed
- [ ] Alert icon (AlertCircle) displayed
- [ ] Appropriate guidance displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-611: Error Display on API Error

| Item | Description |
|-----|-------------|
| **Test ID** | TC-611 |
| **Test Item** | Chat Timeline - Error Handling |
| **Priority** | P0 |
| **Prerequisites** | Chat timeline is displayed. |

**Test Steps**:
1. Stop backend server
2. Click refresh button
3. Verify error display
4. Restart server
5. Verify reconnection

**Expected Results**:
- [ ] Error message displayed
- [ ] Error icon (AlertCircle) displayed
- [ ] Highlighted with red background
- [ ] Auto-recover on reconnection

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-612: Dark Mode Support

| Item | Description |
|-----|-------------|
| **Test ID** | TC-612 |
| **Test Item** | Chat Timeline - Dark Mode |
| **Priority** | P1 |
| **Prerequisites** | Chat timeline is displayed. |

**Test Steps**:
1. Switch to dark mode via theme toggle
2. Verify each element's display

**Expected Results**:
- [ ] Background color: dark:bg-slate-900
- [ ] Bubble colors dark-mode compatible
- [ ] Text color: dark:text-slate-100
- [ ] Border color: dark:border-slate-700
- [ ] Consistent color scheme across all elements

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-613: Message Parse Processing

| Item | Description |
|-----|-------------|
| **Test ID** | TC-613 |
| **Test Item** | Chat Timeline - Message JSON Parse |
| **Priority** | P0 |
| **Prerequisites** | Protocol messages exist. |

**Test Steps**:
1. Verify messages with JSON in text field
2. Verify parsedType is correctly set

**Expected Results**:
- [ ] parsedType correctly set from message.type
- [ ] summary extracted from data.summary or data.reason
- [ ] to field correctly set
- [ ] JSON parse errors treated as 'message'

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-614: Performance with Large Messages

| Item | Description |
|-----|-------------|
| **Test ID** | TC-614 |
| **Test Item** | Chat Timeline - Performance |
| **Priority** | P1 |
| **Prerequisites** | 100+ messages exist. |

**Test Steps**:
1. Display timeline with many messages
2. Scroll operation
3. Apply filter

**Expected Results**:
- [ ] Initial display within 3 seconds
- [ ] Scrolling smooth (60fps)
- [ ] Filter application within 1 second
- [ ] No memory leaks

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-615: Agent-to-Agent Message (DM) Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-615 |
| **Test Item** | Chat Timeline - Agent-to-Agent DM |
| **Priority** | P2 |
| **Prerequisites** | DM messages between agents exist. |

**Test Steps**:
1. Verify DM message
2. Verify "🔒 Secret" label

**Expected Results**:
- [ ] DMs displayed mixed with regular messages
- [ ] "🔒 Secret" label displayed
- [ ] Only messages where self is sender or recipient displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-616: Bookmark Feature

| Item | Description |
|-----|-------------|
| **Test ID** | TC-616 |
| **Test Item** | Chat Timeline - Bookmark |
| **Priority** | P2 |
| **Prerequisites** | Messages are displayed. |

**Test Steps**:
1. Click message bookmark button (⭐)
2. Verify bookmark saved
3. Remove bookmark

**Expected Results**:
- [ ] Icon changes
- [ ] Saved to localStorage
- [ ] Visible in bookmark list

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-617: Agent Status Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-617 |
| **Test Item** | Chat Timeline - Agent Status |
| **Priority** | P2 |
| **Prerequisites** | Messages are displayed. |

**Test Steps**:
1. Verify avatar status indicator
2. Verify last activity via tooltip

**Expected Results**:
- [ ] 🟢 Online (within 5 minutes)
- [ ] 🟡 Idle (5-30 minutes)
- [ ] ⚫ Offline (30+ minutes)
- [ ] Tooltip shows last activity time

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-618: Typing Indicator

| Item | Description |
|-----|-------------|
| **Test ID** | TC-618 |
| **Test Item** | Chat Timeline - Typing Display |
| **Priority** | P2 |
| **Prerequisites** | Can create agent typing state. |

**Test Steps**:
1. Simulate agent typing state
2. Verify typing indicator

**Expected Results**:
- [ ] "Agent name is typing..." displayed
- [ ] Animation dots (● ● ●) displayed
- [ ] Multiple agents supported

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-619: Message Count Display

| Item | Description |
|-----|-------------|
| **Test ID** | TC-619 |
| **Test Item** | Chat Timeline - Message Count |
| **Priority** | P1 |
| **Prerequisites** | Chat timeline is displayed. |

**Test Steps**:
1. Verify message count in header
2. Verify count change when filter applied

**Expected Results**:
- [ ] Displayed as "30 messages" format
- [ ] Count updates when filter applied
- [ ] Count is accurate

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### TC-620: Chat Timeline E2E Integration Test

| Item | Description |
|-----|-------------|
| **Test ID** | TC-620 |
| **Test Item** | Chat Timeline - E2E Complete Flow |
| **Priority** | P0 |
| **Prerequisites** | Backend/Frontend are running. |

**Test Steps**:
1. Access application
2. Select Timeline tab
3. Select team
4. Verify messages displayed
5. Keyword search in search box
6. Apply filter
7. Click message to open detail panel
8. Close detail panel
9. Change polling interval
10. Manual refresh via refresh button
11. Switch to dark mode
12. Verify all features work normally

**Expected Results**:
- [ ] UI transitions smoothly at all steps
- [ ] Data displayed correctly
- [ ] No errors occur
- [ ] Responsive operation

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

## 10. Team Status & Deletion Features

This section contains test cases for team status determination and team deletion features.

### 10.1 Team Status Determination Tests

#### TC-701: Team Status active Determination

| Item | Description |
|-----|-------------|
| **Test ID** | TC-701 |
| **Test Item** | Team Status - active Determination |
| **Priority** | P0 |
| **Prerequisites** | Team exists with session log mtime within 1 hour. |

**Test Steps**:
1. Verify team with session log mtime ≤ 1 hour
2. Verify team card status badge

**Expected Results**:
- [ ] Status badge displayed as "active" (green)
- [ ] Delete button not displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-702: Team Status stopped Determination

| Item | Description |
|-----|-------------|
| **Test ID** | TC-702 |
| **Test Item** | Team Status - stopped Determination |
| **Priority** | P0 |
| **Prerequisites** | Team exists with session log mtime > 1 hour. |

**Test Steps**:
1. Verify team with session log mtime > 1 hour
2. Verify team card status badge

**Expected Results**:
- [ ] Status badge displayed as "stopped" (dark gray)
- [ ] Delete button displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-703: Team Status unknown Determination

| Item | Description |
|-----|-------------|
| **Test ID** | TC-703 |
| **Test Item** | Team Status - unknown Determination |
| **Priority** | P0 |
| **Prerequisites** | Team exists without session log (members exist). |

**Test Steps**:
1. Verify team without session log
2. Verify team card status badge

**Expected Results**:
- [ ] Status badge displayed as "unknown" (gray)
- [ ] Delete button **displayed**

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-704: Team Status inactive Determination

| Item | Description |
|-----|-------------|
| **Test ID** | TC-704 |
| **Test Item** | Team Status - inactive Determination |
| **Priority** | P0 |
| **Prerequisites** | Team with empty members array exists. |

**Test Steps**:
1. Verify team with no members
2. Verify team card status badge

**Expected Results**:
- [ ] Status badge displayed as "inactive" (light gray)
- [ ] Delete button **displayed**

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### 10.2 Team Deletion Tests

#### TC-710: Team Deletion - stopped Status

| Item | Description |
|-----|-------------|
| **Test ID** | TC-710 |
| **Test Item** | Team Deletion - Deletion in stopped Status |
| **Priority** | P0 |
| **Prerequisites** | Team in stopped status exists. |

**Test Steps**:
1. Verify stopped status team card
2. Click delete button (🗑️)
3. Click "Delete" in confirmation dialog
4. Verify deletion result

**Expected Results**:
- [ ] Delete button displayed
- [ ] Confirmation dialog displayed
- [ ] Team removed from list
- [ ] Success toast displayed
- [ ] Following files are deleted:
  - `teams/{team-name}/` directory
  - `tasks/{team-name}/` directory
  - `projects/{project-hash}/{session}.jsonl` session log

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-711: Team Deletion - active Status Rejection

| Item | Description |
|-----|-------------|
| **Test ID** | TC-711 |
| **Test Item** | Team Deletion - Delete Rejection in active Status |
| **Priority** | P0 |
| **Prerequisites** | Team in active status exists. |

**Test Steps**:
1. Verify active status team card
2. Verify delete button presence

**Expected Results**:
- [ ] Delete button not displayed
- [ ] Delete operation not possible

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-712: Team Deletion - Direct API Call (active Rejection)

| Item | Description |
|-----|-------------|
| **Test ID** | TC-712 |
| **Test Item** | Team Deletion - API Active Team Delete Rejection |
| **Priority** | P0 |
| **Prerequisites** | Active status team exists. API testing tool available. |

**Test Steps**:
1. Execute `DELETE /api/teams/{active_team_name}` via API tool
2. Verify response

**Expected Results**:
- [ ] HTTP 400 Bad Request returned
- [ ] Error message contains "active"
- [ ] Team not deleted

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-713: Team Deletion - Nonexistent Team

| Item | Description |
|-----|-------------|
| **Test ID** | TC-713 |
| **Test Item** | Team Deletion - Nonexistent Team |
| **Priority** | P1 |
| **Prerequisites** | Specify nonexistent team name. |

**Test Steps**:
1. Execute `DELETE /api/teams/nonexistent-team` via API tool
2. Verify response

**Expected Results**:
- [ ] HTTP 404 Not Found returned
- [ ] Error message displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-714: Team Deletion - Cancel Operation

| Item | Description |
|-----|-------------|
| **Test ID** | TC-714 |
| **Test Item** | Team Deletion - Cancel in Confirmation Dialog |
| **Priority** | P1 |
| **Prerequisites** | Stopped status team exists. |

**Test Steps**:
1. Click delete button on stopped status team
2. Click "Cancel" in confirmation dialog

**Expected Results**:
- [ ] Team not deleted
- [ ] Dialog closes
- [ ] No change to team list

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### 10.3 Agent Status Inference Tests

#### TC-720: Agent Status - working Inference

| Item | Description |
|-----|-------------|
| **Test ID** | TC-720 |
| **Test Item** | Agent Status - working Inference |
| **Priority** | P0 |
| **Prerequisites** | Agent with in_progress task assigned exists. |

**Test Steps**:
1. Verify agent with in_progress task
2. Verify agent status display

**Expected Results**:
- [ ] 🔵 "Working" or "working" displayed
- [ ] Related task information displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-721: Agent Status - idle Inference

| Item | Description |
|-----|-------------|
| **Test ID** | TC-721 |
| **Test Item** | Agent Status - idle Inference |
| **Priority** | P0 |
| **Prerequisites** | Agent with 5+ minutes of inactivity exists (no tasks). |

**Test Steps**:
1. Verify agent with 5+ minutes inactive
2. Verify agent status display

**Expected Results**:
- [ ] 💤 "Idle" or "idle" displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-722: Agent Status - waiting Inference

| Item | Description |
|-----|-------------|
| **Test ID** | TC-722 |
| **Test Item** | Agent Status - waiting Inference |
| **Priority** | P0 |
| **Prerequisites** | Agent with blocked task (has blockedBy) assigned exists. |

**Test Steps**:
1. Verify agent with blocked task
2. Verify agent status display

**Expected Results**:
- [ ] ⏳ "Waiting" or "waiting" displayed
- [ ] Block cause identifiable

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-723: Agent Status - completed Inference

| Item | Description |
|-----|-------------|
| **Test ID** | TC-723 |
| **Test Item** | Agent Status - completed Inference |
| **Priority** | P1 |
| **Prerequisites** | Agent with all tasks completed exists. |

**Test Steps**:
1. Verify agent with all tasks completed
2. Verify agent status display

**Expected Results**:
- [ ] ✅ "Completed" or "completed" displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-724: Agent Status - error Inference

| Item | Description |
|-----|-------------|
| **Test ID** | TC-724 |
| **Test Item** | Agent Status - error Inference |
| **Priority** | P1 |
| **Prerequisites** | Agent with 30+ minutes of inactivity exists. |

**Test Steps**:
1. Verify agent with 30+ minutes inactive
2. Verify agent status display

**Expected Results**:
- [ ] ❌ "Error" or "error" displayed

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

### 10.4 Polling Interval Adjustment Tests

#### TC-730: Polling Interval - Change

| Item | Description |
|-----|-------------|
| **Test ID** | TC-730 |
| **Test Item** | Polling Interval - Interval Change |
| **Priority** | P0 |
| **Prerequisites** | Dashboard is displayed. |

**Test Steps**:
1. Verify polling interval selector in header
2. Change interval to "5 seconds"
3. Verify data update timing
4. Change interval to "60 seconds"
5. Verify data update timing

**Expected Results**:
- [ ] Can select from 5s, 10s, 20s, 30s, 60s
- [ ] Data updates at selected interval
- [ ] Default is 30 seconds

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

#### TC-731: Polling Interval - staleTime Behavior

| Item | Description |
|-----|-------------|
| **Test ID** | TC-731 |
| **Test Item** | Polling Interval - staleTime Cache Behavior |
| **Priority** | P1 |
| **Prerequisites** | Dashboard is displayed. Can verify network in dev tools. |

**Test Steps**:
1. Open network tab in dev tools
2. Verify no duplicate API calls within 10 seconds
3. Verify refetch after staleTime (10 seconds) elapsed

**Expected Results**:
- [ ] Cache used within 10 seconds
- [ ] No unnecessary API calls

**Execution Record**:
```
Execution Date:
Tester:
Result:
Notes:
```

---

## 11. Test Completion Checklist (Updated)

### 10.1 Overall Checklist

- [ ] All P0 tests Pass
- [ ] 80%+ of P1 tests Pass
- [ ] 50%+ of P2 tests Pass
- [ ] Zero critical bugs
- [ ] Minor bugs documented and mitigation planned
- [ ] Performance criteria met
- [ ] Cross-browser testing complete

### 10.2 Chat Timeline Additional Checklist

- [ ] All tests TC-601 through TC-620 executed
- [ ] Message bubble display matches design specification
- [ ] Smart scroll works normally
- [ ] Search and filter features work normally
- [ ] Detail panel works normally
- [ ] Dark mode support complete
- [ ] Performance criteria met

---

**Document History**

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-16 | 1.0.0 | Initial release |
| 2026-02-18 | 2.0.0 | Added chat-style timeline test cases (TC-601〜TC-620) |
| 2026-02-23 | 3.0.0 | Added design philosophy section, corrected WebSocket→HTTP polling, added team status & deletion tests (TC-701〜TC-731) |
| 2026-02-24 | 2.1.0 | Version number unification, document consistency corrections |

*Created by: Claude Code Agent Teams*
