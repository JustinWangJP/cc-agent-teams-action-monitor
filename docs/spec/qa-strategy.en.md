# QA Strategy Document

*Language: [English](qa-strategy.en.md) | [日本語](qa-strategy.md) | [中文](qa-strategy.zh.md)*

## 1. Quality Goals

| Metric | Target | Current Status |
|-----------|--------|----------------|
| Test Coverage (Backend) | 80%+ | 70%+ (required in pyproject.toml) |
| Test Coverage (Frontend) | 80%+ | In preparation |
| TypeScript strict mode errors | 0 | 0 (achieved) |
| Lint errors | 0 | Not measured |
| E2E test pass rate | 100% | Not implemented |

### 1.1 Design Philosophy

#### Basic Testing Policy

This system achieves real-time updates via **HTTP polling**, so WebSocket testing is unnecessary. Instead, prioritize:

1. **Polling behavior testing**: TanStack Query's `refetchInterval` and `staleTime` coordination
2. **Cache invalidation testing**: Verify FileWatcher-based cache invalidation behavior
3. **Status determination testing**: Verify session log mtime-based determination logic

#### Important Logic to Test

| Logic | Testing Perspective | Priority |
|---------|-------------------|----------|
| Team status determination | mtime ≤ 1 hour → active, mtime > 1 hour → stopped | High |
| Agent status inference | Status inference from task state and activity time | High |
| Unified timeline | inbox + session log integration | High |
| Team deletion | Only non-active states can be deleted | High |
| Message parsing | Accurate parsing of JSON-in-JSON | Medium |

---

## 2. Test Environment

### 2.1 Backend

```bash
cd backend
pip install -e ".[dev]"

# Run tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test
pytest tests/test_api_teams.py -v
```

### 2.2 Frontend

```bash
cd frontend
npm install

# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# UI
npm run test:ui
```

---

## 3. Test Implementation Status

### 3.1 Frontend

| Component/Hook | Test File | Status |
|----------------|-----------|--------|
| StatusBadge | `__tests__/StatusBadge.test.tsx` | ✅ Complete |
| TeamCard | `__tests__/TeamCard.test.tsx` | ✅ Complete |
| TaskCard | `__tests__/TaskCard.test.tsx` | ✅ Complete |
| LoadingSpinner | `__tests__/LoadingSpinner.test.tsx` | ✅ Complete |
| ActivityFeed | `__tests__/ActivityFeed.test.tsx` | ✅ Complete |
| ThemeToggle | `__tests__/ThemeToggle.test.tsx` | ✅ Complete |
| useTeams | `__tests__/useTeams.test.tsx` | ✅ Complete (includes polling behavior) |
| useTasks | `__tests__/useTasks.test.tsx` | ✅ Complete |
| useInbox | `__tests__/useInbox.test.tsx` | ✅ Complete |
| useUnifiedTimeline | `__tests__/useUnifiedTimeline.test.tsx` | 📝 Planned |
| useAgentMessages | `__tests__/useAgentMessages.test.tsx` | 📝 Planned |
| dashboardStore | `__tests__/dashboardStore.test.ts` | 📝 Planned |

### 3.2 Backend

| Module | Test File | Status |
|-----------|-----------|--------|
| Teams API | `test_api_teams.py` | ✅ Basically complete |
| Teams Delete API | `test_api_teams.py` | 📝 Planned |
| Tasks API | `test_api_tasks.py` | ✅ Basically complete |
| Timeline API | `test_api_timeline.py` | 📝 Planned |
| Agents API | `test_api_agents.py` | 📝 Planned |
| Models | `test_models.py` | 📝 Planned |
| FileWatcher | `test_file_watcher.py` | 📝 Planned |
| CacheService | `test_cache_service.py` | 📝 Planned |
| TimelineService | `test_timeline_service.py` | 📝 Planned |
| AgentStatusService | `test_agent_status_service.py` | 📝 Planned |
| MessageParser | `test_message_parser.py` | 📝 Planned |

---

## 4. Code Review Checklist

### 4.1 Common

- [ ] Code is written in consistent style
- [ ] Appropriate error handling is implemented
- [ ] Magic numbers are defined as constants
- [ ] Appropriate naming conventions are used
- [ ] Unnecessary comments and code are removed

### 4.2 Frontend (TypeScript/React)

- [ ] No TypeScript strict mode errors
- [ ] Props have appropriate type definitions
- [ ] useCallback/useMemo are used appropriately
- [ ] No rendering performance issues
- [ ] Accessibility (ARIA) is considered

### 4.3 Backend (Python/FastAPI)

- [ ] Type hints are used appropriately
- [ ] Async processing (async/await) is used correctly
- [ ] Pydantic model validation is appropriate
- [ ] Logging is performed appropriately
- [ ] Security (input validation, authorization) is considered

---

## 5. Quality Gates

### 5.1 PR Merge Conditions

1. All tests pass
2. Coverage meets target values
3. No lint errors
4. At least one reviewer approval

### 5.2 Release Conditions

1. All Critical/High bugs are fixed
2. All E2E tests pass
3. Performance requirements are met

---

## 6. Next Actions

1. [x] Install test libraries (Vitest, pytest)
2. [x] Implement unit tests for existing code (basic components)
3. [ ] Implement tests for new services
   - [ ] TimelineService tests
   - [ ] AgentStatusService tests
   - [ ] MessageParser tests
   - [ ] Team deletion API tests
4. [ ] Unified timeline related tests
   - [ ] useUnifiedTimeline hook tests
   - [ ] Timeline API tests
5. [ ] Implement E2E tests
6. [ ] Integration into CI/CD pipeline

---

## 7. Test Category Priority

### P0: Essential Tests (Release Blockers)

| Category | Test Items | Reason |
|---------|-----------|--------|
| Team status determination | mtime-based determination logic | Core functionality |
| Team deletion | Permission checks, file deletion | Prevent data loss |
| Unified timeline | Data source integration | Key functionality |
| Agent status inference | State transition logic | Key functionality |

### P1: Important Tests

| Category | Test Items |
|---------|-----------|
| HTTP polling | refetchInterval behavior |
| Cache invalidation | FileWatcher integration |
| Message parsing | All message types |
| Error handling | API error responses |

### P2: Recommended Tests

| Category | Test Items |
|---------|-----------|
| UI components | Display, interaction |
| Theme switching | Dark mode |
| Performance | Behavior with large datasets |

---

*Created: 2026-02-16*
*Last updated: 2026-02-24*
*Version: 2.1.0*
