# Agent Teams Dashboard Memory

## Project Overview

Agent Teams Dashboard is a real-time monitoring dashboard for Claude Code Agent Teams.
Monitors `~/.claude/` directory for team configuration, task progress, and agent activities.

## Key Architecture Decisions

### State Management
- **Zustand** for global state management (selectedTeam, filters, UI state)
- LocalStorage persistence for user preferences (darkMode, sidebar state)
- Selector hooks for component-level subscriptions (`useTeamSelection`, `useFilters`, etc.)

### Visualization Libraries
- **vis-timeline** for message timeline visualization
- **D3.js** for task dependency graphs (force simulation)
- **Radix UI** for accessible components (Dialog, Slider, Select)

### Type Safety Patterns
- DataSet types from vis-data use `any` for complex generic compatibility
- D3.js selections simplified without generic parameters to avoid type conflicts
- Optional props with store fallback pattern (e.g., MessageDetailModal)

## Common Patterns

### Component Store Integration
```tsx
const { selectedMessage, setSelectedMessage } = useDashboardStore();
// or use selector hook
const { timeRange, setTimeRange } = useFilters();
```

### View Switching
```tsx
// ViewType: 'overview' | 'timeline' | 'tasks' | 'graphs'
const { currentView, setCurrentView } = useCurrentView();
```

### D3.js Dynamic Import
```tsx
const initGraph = async () => {
  const d3 = await import('d3');
  // Use d3 here
};
```

## File Structure

```
frontend/src/
├── components/
│   ├── common/        # Shared UI (ThemeToggle, LoadingSpinner)
│   ├── dashboard/     # Dashboard widgets (TeamCard, ActivityFeed)
│   ├── graph/         # D3.js graphs (TaskDependencyGraph)
│   ├── layout/        # Layout components (Layout, Header)
│   ├── overview/      # Overview components (ModelBadge)
│   ├── tasks/         # Task components (TaskCard)
│   └── timeline/      # Timeline components (MessageTimeline, TimelinePanel)
├── stores/            # Zustand stores
├── types/             # TypeScript type definitions
├── config/            # Configuration (models.ts)
├── hooks/             # Custom hooks
└── utils/             # Utility functions

backend/app/
├── api/routes/        # API endpoints (messages.py, teams.py, tasks.py)
├── models/            # Pydantic models
├── services/          # Business logic (file_watcher.py)
└── config.py          # Settings
```

## Known Issues

### Test Files
- Test files have TypeScript errors due to vitest globals
- Tests pass but `tsc --noEmit` fails on test files
- Solution: Run `vite build` directly to skip test type checking

### vis-data DataSet Types
- Generic parameters for DataSet cause type conflicts
- Workaround: Use `DataSet<any, 'id'>` for items dataset

## Backend API Endpoints

- `GET /api/teams` - List teams
- `GET /api/teams/{name}` - Team details
- `GET /api/teams/{name}/messages/timeline` - Timeline data with filters
- `GET /api/teams/{name}/messages` - Raw messages
- `GET /api/tasks` - List tasks
- `GET /api/models` - Model configurations (color, icon, label)

## Model Configuration

Models are configured in both frontend and backend:
- Frontend: `frontend/src/config/models.ts`
- Backend: `backend/app/api/routes/messages.py` (MODEL_CONFIGS)

Supported models: Claude Opus 4.6, Sonnet 4.5, Haiku 4.5, Kimi K2.5, GLM-5
