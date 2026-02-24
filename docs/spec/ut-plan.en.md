# Unit Test Plan & Test Specification

**Language:** [English](./ut-plan.en.md) | [日本語](./ut-plan.md) | [中文](./ut-plan.zh.md)

## 1. Test Overview

### 1.1 Test Purpose

To ensure the quality of the Agent Teams Dashboard by conducting unit tests for both backend and frontend.

### 1.2 Test Scope

| Category | Scope |
|----------|-------|
| Backend | API Routes, Services, Models |
| Frontend | Components, Hooks, Stores |

### 1.3 Test Environment

| Environment | Tools |
|-------------|-------|
| Backend | pytest, pytest-asyncio, httpx |
| Frontend | Vitest, @testing-library/react |
| E2E | Puppeteer |

### 1.4 Design Philosophy

#### Why Test HTTP Polling

This system implements real-time updates via **HTTP polling**, so WebSocket testing is unnecessary. Instead:

- Verify polling interval behavior
- Verify cache TTL behavior
- Verify coordination between staleTime and refetchInterval

#### Testing Status Determination Logic

Team status is determined by **session log mtime**, requiring filesystem mocking:

```
Session log mtime ≤ 1 hour → active
Session log mtime > 1 hour → stopped
No session log → unknown
No members → inactive
```

---

## 2. Test Environment Setup

### 2.1 Backend

```bash
cd backend
pip install -e ".[dev]"
pytest --version
```

### 2.2 Frontend

```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

---

## 3. Backend Test Plan

### 3.1 API Routes Tests

#### teams.py Test Cases

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-API-001 | list_teams_success | Get team list (success) | 200, return team list | High |
| T-API-002 | list_teams_empty | Get team list (no data) | 200, return empty array | High |
| T-API-003 | get_team_success | Get team details (success) | 200, return team details | High |
| T-API-004 | get_team_not_found | Get team details (not exist) | 404 | High |
| T-API-005 | get_team_inboxes | Get inboxes | 200, message list | Medium |
| T-API-006 | get_team_status_active | Team status active determination | Session log mtime ≤ 1 hour | High |
| T-API-007 | get_team_status_stopped | Team status stopped determination | Session log mtime > 1 hour | High |
| T-API-008 | get_team_status_unknown | Team status unknown determination | No session log | High |
| T-API-009 | get_team_status_inactive | Team status inactive determination | No members | High |
| T-API-010 | delete_team_success | Delete team (stopped status) | 200, deletion success | High |
| T-API-011 | delete_team_active_forbidden | Delete team (active status) | 400, deletion forbidden | High |
| T-API-012 | delete_team_not_found | Delete team (not exist) | 404 | High |

#### tasks.py Test Cases

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-API-013 | list_tasks_success | Get task list (success) | 200, return task list | High |
| T-API-014 | list_tasks_empty | Get task list (no data) | 200, return empty array | High |
| T-API-015 | list_team_tasks | Get tasks by team | 200, task list | High |
| T-API-016 | get_task_success | Get task details (success) | 200, task details | High |
| T-API-017 | get_task_not_found | Get task details (not exist) | 404 | High |

#### timeline.py Test Cases (New)

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-API-018 | get_history_success | Get unified timeline | 200, timeline items | High |
| T-API-019 | get_history_with_team | Get with team filter | Filtered results | High |
| T-API-020 | get_history_with_types | Get with type filter | Filtered results | High |
| T-API-021 | get_history_pagination | Pagination | before_event_id works | Medium |
| T-API-022 | get_updates_since | Get incremental updates | Data since timestamp | High |
| T-API-023 | get_file_changes | Get file changes list | File change history | High |

#### agents.py Test Cases (New)

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-API-024 | list_agents_success | Get agent list | 200, agent list | High |
| T-API-025 | list_agents_empty | No agents | 200, empty array | Medium |
| T-API-026 | get_agent_status_working | Agent status working | Has in_progress task | High |
| T-API-027 | get_agent_status_idle | Agent status idle | No activity for 5+ minutes | High |
| T-API-028 | get_agent_status_waiting | Agent status waiting | Has blocked task | High |
| T-API-029 | get_agent_status_completed | Agent status completed | All tasks completed | High |

### 3.2 Services Tests

#### file_watcher.py Test Cases

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-SVC-001 | start_watcher | Start watching | Observer starts | High |
| T-SVC-002 | stop_watcher | Stop watching | Observer stops | High |
| T-SVC-003 | file_modified_config | Detect config.json change | Cache invalidation | High |
| T-SVC-004 | file_modified_inbox | Detect inbox.json change | Cache invalidation | High |
| T-SVC-005 | debounce | Debounce processing | 500ms delay | Medium |

#### cache_service.py Test Cases

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-SVC-006 | cache_get_set | Cache get/set | Normal operation | High |
| T-SVC-007 | cache_expiry | TTL expiration | Returns None when expired | High |
| T-SVC-008 | cache_invalidate | Cache invalidation | Re-fetch after invalidation | High |
| T-SVC-009 | cache_cleanup | Auto cleanup | Expired entries removed | Medium |

#### timeline_service.py Test Cases (New)

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-SVC-010 | get_unified_timeline | Get unified timeline | inbox + session log integrated | High |
| T-SVC-011 | parse_session_log | Parse session log | Normal parse | High |
| T-SVC-012 | filter_by_time_range | Time range filter | Filtered results | High |
| T-SVC-013 | filter_by_types | Type filter | Filtered results | High |
| T-SVC-014 | sort_by_timestamp | Timestamp sort | Ascending order | High |

#### agent_status_service.py Test Cases (New)

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-SVC-015 | infer_status_idle | idle status inference | No activity for 5+ minutes | High |
| T-SVC-016 | infer_status_working | working status inference | Has in_progress task | High |
| T-SVC-017 | infer_status_waiting | waiting status inference | Has blocked task | High |
| T-SVC-018 | infer_status_error | error status inference | No activity for 30+ minutes | High |
| T-SVC-019 | infer_status_completed | completed status inference | All tasks completed | High |
| T-SVC-020 | get_last_activity | Get last activity time | Normal retrieval | High |

#### message_parser.py Test Cases (New)

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-SVC-021 | parse_task_assignment | Parse task assignment | parsedType='task_assignment' | High |
| T-SVC-022 | parse_idle_notification | Parse idle notification | parsedType='idle_notification' | High |
| T-SVC-023 | parse_shutdown_request | Parse shutdown request | parsedType='shutdown_request' | High |
| T-SVC-024 | parse_plan_approval | Parse plan approval | parsedType='plan_approval_request' | High |
| T-SVC-025 | parse_unknown | Parse unknown type | parsedType='unknown' | Medium |

### 3.3 Models Tests

#### Pydantic Model Test Cases

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-MOD-001 | team_validation | Team validation | Normal creation | High |
| T-MOD-002 | task_validation | Task validation | Normal creation | High |
| T-MOD-003 | timeline_item_validation | TimelineItem validation | Normal creation | High |
| T-MOD-004 | invalid_data | Invalid data | ValidationError | High |

---

## 4. Frontend Test Plan

### 4.1 Components Tests

#### Common Components

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-CMP-001 | LoadingSpinner_render | Loading display | Spinner displayed | Medium |
| T-CMP-002 | StatusBadge_active | active status | Green badge | High |
| T-CMP-003 | StatusBadge_stopped | stopped status | Dark gray badge | High |
| T-CMP-004 | ThemeToggle_click | Theme toggle | Theme changes | High |
| T-CMP-005 | PollingIntervalSelector | Polling interval selection | Interval changes | Medium |

#### Chat Components (New)

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-CMP-006 | ChatMessageBubble_render | Message bubble display | Normal rendering | High |
| T-CMP-007 | ChatMessageBubble_markdown | Markdown display | Formatted display | High |
| T-CMP-008 | ChatMessageBubble_type_icon | Type-specific icons | Appropriate icons | High |
| T-CMP-009 | ChatMessageBubble_click | Click event | onClick invoked | High |
| T-CMP-010 | ChatHeader_search | Search functionality | Filter works | High |
| T-CMP-011 | ChatHeader_filters | Filter functionality | Filters applied | High |
| T-CMP-012 | ChatTimelinePanel_empty | Empty state display | Guide displayed | Medium |
| T-CMP-013 | BookmarkButton_toggle | Bookmark toggle | Save/delete | Medium |
| T-CMP-014 | AgentStatusIndicator_online | Online status | Green display | Medium |
| T-CMP-015 | MessageDetailPanel_render | Detail panel display | Slide-in | High |

#### Dashboard Components

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-CMP-016 | TeamCard_render | Team card display | Normal rendering | High |
| T-CMP-017 | TeamCard_click | Click event | onClick invoked | High |
| T-CMP-018 | TeamCard_stopped | stopped status display | Appropriate display | High |
| T-CMP-019 | TaskCard_render | Task card display | Normal rendering | High |
| T-CMP-020 | ActivityFeed_render | Feed display | Normal rendering | Medium |

### 4.2 Hooks Tests

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-HK-001 | useTeams_fetch | Data fetch | teams updated | High |
| T-HK-002 | useTeams_loading | Loading state | loading=true → false | High |
| T-HK-003 | useTeams_polling | Polling behavior | Periodic update (refetchInterval) | High |
| T-HK-004 | useTeams_stale_time | staleTime behavior | Cache used for 10 seconds | High |
| T-HK-005 | useTasks_fetch | Data fetch | tasks updated | High |
| T-HK-006 | useTasks_polling | Polling behavior | Periodic update | High |
| T-HK-007 | useInbox_fetch | Inbox fetch | Messages retrieved | High |
| T-HK-008 | useUnifiedTimeline_fetch | Unified timeline fetch | Timeline items | High |
| T-HK-009 | useUnifiedTimeline_polling | Polling behavior | Periodic update | High |
| T-HK-010 | useAgentMessages_fetch | Agent-specific messages fetch | Messages retrieved | High |

### 4.3 Store Tests (New)

| Test ID | Test Name | Test Content | Expected Result | Priority |
|---------|-----------|--------------|-----------------|----------|
| T-STR-001 | dashboardStore_selection | Selection state management | Normal operation | High |
| T-STR-002 | dashboardStore_filters | Filter management | Normal operation | High |
| T-STR-003 | dashboardStore_polling | Polling control | Normal operation | High |
| T-STR-004 | dashboardStore_theme | Theme management | Normal operation | Medium |

---

## 5. Test Implementation Samples

### 5.1 Backend (pytest)

```python
# tests/test_api_teams.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_list_teams_success(client):
    """T-API-001: Get team list (success)"""
    response = await client.get("/api/teams")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_team_not_found(client):
    """T-API-004: Get team details (not exist)"""
    response = await client.get("/api/teams/nonexistent")
    assert response.status_code == 404
```

### 5.2 Frontend (Vitest)

```typescript
// src/components/chat/__tests__/ChatMessageBubble.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatMessageBubble } from '../ChatMessageBubble';
import type { ParsedMessage } from '@/types/message';

describe('ChatMessageBubble', () => {
  const mockMessage: ParsedMessage = {
    from: 'test-agent',
    text: 'Hello World',
    timestamp: '2026-02-21T12:00:00Z',
    read: true,
    parsedType: 'message',
  };

  it('T-CMP-006: Message bubble display', () => {
    render(<ChatMessageBubble message={mockMessage} />);
    expect(screen.getByText('test-agent')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('T-CMP-008: Type-specific icons - message', () => {
    render(<ChatMessageBubble message={mockMessage} />);
    expect(screen.getByText('💬')).toBeInTheDocument();
  });
});
```

---

## 6. Test Execution Commands

### 6.1 Backend

```bash
cd backend

# Run all tests
pytest

# Verbose output
pytest -v

# With coverage
pytest --cov=app --cov-report=html

# Specific test
pytest tests/test_api_teams.py -v
```

### 6.2 Frontend

```bash
cd frontend

# Run all tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# UI mode
npm run test:ui
```

---

## 7. Coverage Goals

| Category | Target Coverage |
|----------|-----------------|
| Backend API | 80%+ |
| Backend Services | 70%+ |
| Backend Models | 90%+ |
| Frontend Components | 70%+ |
| Frontend Hooks | 80%+ |
| Frontend Stores | 85%+ |

---

## 8. Test Execution Schedule

### Phase 1: Basic Tests (1 week)
- Backend API Routes tests
- Pydantic Models tests
- Frontend common components tests

### Phase 2: Functional Tests (1 week)
- File Watcher tests
- Cache Service tests
- Timeline Service tests
- Agent Status Service tests
- Message Parser tests
- Chat components tests

### Phase 3: UI Tests (1 week)
- Frontend Components tests
- Frontend Hooks tests (including polling behavior)
- Frontend Stores tests

### Phase 4: Integration Tests (1 week)
- E2E test expansion
- Performance tests (polling load)
- Cross-browser tests

---

*Created: 2026-02-16*
*Last Updated: 2026-02-24*
*Version: 2.1.0*
