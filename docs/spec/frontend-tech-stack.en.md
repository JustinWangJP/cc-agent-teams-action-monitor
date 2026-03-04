# Frontend Technology Stack

## 1. Technology Stack Overview

### 1.1 Languages & Frameworks

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Programming Language | TypeScript | 5.3.0+ | Type-safe development |
| UI Library | React | 18.2.0 | Component-based UI |
| Bundler | Vite | 5.0.0+ | Fast build & HMR |
| CSS Framework | Tailwind CSS | 3.4.0+ | Utility-first CSS |
| State Management | Zustand | 5.0.2+ | Global state management |
| Data Fetching | TanStack Query | 5.90.21+ | Server state & cache |
| Markdown | react-markdown | 10.1.0+ | Markdown rendering |
| Markdown Extension | remark-gfm | 4.0.1+ | GitHub Flavored Markdown |
| Date Handling | date-fns | 4.1.0+ | Date formatting & manipulation |
| Icons | lucide-react | 0.344.0+ | Icon library |
| Virtual Scroll | @tanstack/react-virtual | 3.10.8+ | Virtual scrolling for large data |
| Graph Visualization | D3.js | 7.8.5+ | Network/dependency graphs |
| Timeline | vis-timeline | 7.7.3+ | Time series data display |
| UI Components | Radix UI | 1.x | Accessible UI components |
| Internationalization | i18next | 24.2.0+ | Internationalization framework |
| Internationalization | react-i18next | 15.4.0+ | React i18n binding |

### 1.2 Development Dependencies

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 1.1.0+ | Unit testing |
| @testing-library/react | 14.1.2+ | React component testing |
| @testing-library/jest-dom | 6.4.0+ | DOM assertion extensions |
| @testing-library/user-event | 14.5.1+ | User event simulation |
| jsdom | 24.0.0+ | DOM environment simulation |
| @vitest/coverage-v8 | 1.1.0+ | Coverage reports |
| @vitest/ui | 1.1.0+ | Test UI |
| Puppeteer | 24.37.3+ | E2E testing |
| Playwright | 1.58.2+ | Browser automation testing |

---

## 2. Design Philosophy

### 2.1 Why HTTP Polling

**Background:**
Claude Code updates files directly, making server push notifications impossible.

**Approach:**
- **HTTP Polling** for periodic data fetching
- Polling interval selectable from **5s-60s** (default 30s)
- Auto-refresh via TanStack Query's `refetchInterval`

**Trade-offs:**
- Real-time capability is inferior to WebSocket Push, but configurable intervals provide sufficient update frequency
- Server load increases, but caching (TTL) reduces actual I/O

### 2.2 Why Zustand + TanStack Query

**Zustand:**
- Global state management (UI state, selection state, polling settings)
- Lightweight and simple API
- Easy persistence to localStorage

**TanStack Query:**
- Server state management (teams, tasks, messages)
- Automatic caching, refetching, and invalidation
- Built-in polling functionality

**Responsibility Separation:**
- Zustand = Client state
- TanStack Query = Server state

---

## 3. Project Structure

```
frontend/src/
├── components/
│   ├── agent/               # Agent-related
│   │   └── ExpandedAgentCard.tsx
│   ├── chat/               # Chat-related components
│   │   ├── ChatHeader.tsx
│   │   ├── ChatMessageBubble.tsx
│   │   ├── ChatMessageList.tsx
│   │   ├── ChatTimelinePanel.tsx
│   │   ├── ChatSearch.tsx
│   │   ├── SenderFilter.tsx
│   │   ├── MessageTypeFilter.tsx
│   │   ├── DateSeparator.tsx
│   │   ├── AgentStatusIndicator.tsx
│   │   ├── BookmarkButton.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── MessageDetailPanel.tsx
│   ├── common/             # Common components
│   │   ├── StatusBadge.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorDisplay.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── PollingIntervalSelector.tsx
│   ├── dashboard/          # Dashboard-related
│   │   ├── TeamCard.tsx
│   │   ├── TeamDetailPanel.tsx
│   │   └── ActivityFeed.tsx
│   ├── layout/             # Layout
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── overview/           # Overview
│   │   ├── TeamCard.tsx
│   │   └── ModelBadge.tsx
│   ├── tasks/              # Task-related
│   │   ├── TaskCard.tsx
│   │   ├── ExpandedTaskCard.tsx
│   │   └── TaskMonitorPanel.tsx
│   └── timeline/           # Timeline
│       ├── TimelinePanel.tsx
│       ├── TimelineFilters.tsx
│       ├── TimelineTaskSplitLayout.tsx
│       ├── TimeRangeSlider.tsx
│       ├── MessageTimeline.tsx
│       ├── MessageSearch.tsx
│       └── MessageDetailModal.tsx
├── hooks/                  # Custom hooks
│   ├── useTeams.ts
│   ├── useTasks.ts
│   ├── useInbox.ts
│   ├── useAgentMessages.ts
│   └── useUnifiedTimeline.ts
├── stores/                 # Zustand stores
│   └── dashboardStore.ts
├── types/                  # TypeScript type definitions
│   ├── team.ts
│   ├── task.ts
│   ├── message.ts
│   ├── timeline.ts
│   ├── model.ts
│   └── theme.ts
├── config/                 # Configuration
│   └── models.ts
├── utils/                  # Utilities
│   └── teamModels.ts
├── lib/                    # Library configuration
│   ├── queryClient.ts
│   └── utils.ts
└── test/                   # Test setup
    └── setup.ts
```

### 3.1 Module Roles

| Module | Role |
|--------|------|
| `components/chat/` | Chat panel, message display, search & filters |
| `components/common/` | Reusable common components |
| `components/dashboard/` | Team list, detail panel, activity feed |
| `components/tasks/` | Task cards, monitor panel |
| `components/timeline/` | Unified timeline, filters, detail modal |
| `hooks/` | Data fetching, HTTP polling |
| `stores/` | Global state management (UI state, selection state) |
| `types/` | TypeScript type definitions |

---

## 4. Component List

### 4.1 Chat Components

| Component | Description |
|-----------|-------------|
| ChatHeader | Chat header (search, filters) |
| ChatMessageBubble | Message bubble (Markdown support, type-specific icons) |
| ChatMessageList | Message list |
| ChatTimelinePanel | Chat timeline panel |
| ChatSearch | Full-text search |
| SenderFilter | Sender filter |
| MessageTypeFilter | Message type filter |
| DateSeparator | Date separator |
| AgentStatusIndicator | Agent status indicator (idle/working/waiting/error/completed) |
| BookmarkButton | Bookmark button |
| MessageDetailPanel | Message detail panel (slide-in) |

### 4.2 Common Components

| Component | Description |
|-----------|-------------|
| StatusBadge | Status badge (active/stopped/unknown/inactive) |
| LoadingSpinner | Loading display |
| ErrorDisplay | Error display |
| ThemeToggle | Theme toggle (dark/light) |
| PollingIntervalSelector | Polling interval selector (5s/10s/20s/30s/60s) |

### 4.3 Dashboard Components

| Component | Description |
|-----------|-------------|
| TeamCard | Team card (status display, delete button) |
| TeamDetailPanel | Team detail panel |
| ActivityFeed | Activity feed |

### 4.4 Task Components

| Component | Description |
|-----------|-------------|
| TaskCard | Task card |
| ExpandedTaskCard | Expanded task card |
| TaskMonitorPanel | Task monitor panel |

### 4.5 Timeline Components

| Component | Description |
|-----------|-------------|
| TimelinePanel | Timeline panel |
| TimelineFilters | Filter component |
| TimelineTaskSplitLayout | Timeline-task split layout |
| TimeRangeSlider | Time range slider |
| MessageTimeline | Message timeline |
| MessageSearch | Message search |
| MessageDetailModal | Message detail modal |

---

## 5. Custom Hooks

### 5.1 Data Fetching Hooks

| Hook | API | Description |
|------|-----|-------------|
| useTeams() | GET /api/teams | Fetch team list (polling) |
| useTasks() | GET /api/tasks | Fetch task list (polling) |
| useInbox() | GET /api/teams/{name}/inboxes | Fetch inbox (polling) |
| useAgentMessages() | GET /api/teams/{name}/inboxes/{agent} | Fetch messages by agent |
| useUnifiedTimeline() | GET /api/timeline/{team_name}/history | Fetch unified timeline (polling) |

### 5.2 Polling Implementation Example

```typescript
// useTeams.ts
export function useTeams() {
  const pollingInterval = useDashboardStore((state) => state.pollingInterval);
  const isPollingPaused = useDashboardStore((state) => state.isPollingPaused);

  return useQuery({
    queryKey: ['teams'],
    queryFn: () => fetch('/api/teams').then((res) => res.json()),
    refetchInterval: isPollingPaused ? false : pollingInterval,
    staleTime: 10000, // Use cache for 10 seconds
  });
}
```

---

## 6. Zustand Store Configuration

### 6.1 State Definition

```typescript
interface DashboardState {
  // Selection state
  selectedTeamName: string | null;
  selectedMessageId: string | null;

  // Filters
  timeRange: TimeRange;
  messageFilter: MessageFilter;

  // UI state
  currentView: ViewType;
  theme: ThemeMode;
  sidebarCollapsed: boolean;

  // Polling
  pollingInterval: number;  // 5000, 10000, 20000, 30000, 60000
  isPollingPaused: boolean;

  // Actions
  setSelectedTeam: (name: string | null) => void;
  setSelectedMessage: (id: string | null) => void;
  setTimeRange: (range: TimeRange) => void;
  setMessageFilter: (filter: MessageFilter) => void;
  setCurrentView: (view: ViewType) => void;
  toggleTheme: () => void;
  setPollingInterval: (interval: number) => void;
  togglePollingPause: () => void;
}
```

### 6.2 Polling Interval Settings

```typescript
const POLLING_INTERVALS = [
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '20s', value: 20000 },
  { label: '30s (recommended)', value: 30000 },
  { label: '60s', value: 60000 },
];

const DEFAULT_POLLING_INTERVAL = 30000; // 30 seconds
```

### 6.3 Selector Hooks

| Hook | Description |
|------|-------------|
| useTeamSelection() | Team selection state |
| useMessageSelection() | Message selection state |
| useFilters() | Filter state |
| useUIState() | UI state (theme, sidebar) |
| usePolling() | Polling settings |

---

## 7. Type Definitions

### 7.1 Team Type

```typescript
interface Team {
  name: string;
  description: string;
  createdAt: number;
  leadAgentId: string;
  leadSessionId: string;
  members: Member[];
}

interface TeamSummary {
  name: string;
  description: string;
  memberCount: number;
  taskCount: number;
  status: 'active' | 'inactive' | 'stopped' | 'unknown';
  leadAgentId: string;
  createdAt?: number;
}

interface Member {
  agentId: string;
  name: string;
  agentType: string;
  model: string;
  joinedAt: number;
  status: 'active' | 'idle';
  color?: string;
}
```

### 7.2 Task Type

```typescript
interface Task {
  id: string;
  subject: string;
  description: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deleted' | 'stopped';
  owner: string;
  team: string;
  blocks: string[];
  blockedBy: string[];
  metadata: Record<string, unknown>;
}

interface TaskSummary {
  id: string;
  subject: string;
  status: string;
  owner?: string;
  team?: string;
}
```

### 7.3 Message / Timeline Type

```typescript
type MessageType =
  | 'message'
  | 'idle_notification'
  | 'shutdown_request'
  | 'shutdown_response'
  | 'shutdown_approved'
  | 'plan_approval_request'
  | 'plan_approval_response'
  | 'task_assignment'
  | 'task_completed'
  | 'unknown';

type SessionLogType =
  | 'user_message'
  | 'assistant_message'
  | 'thinking'
  | 'tool_use'
  | 'file_change';

interface TimelineItem {
  id: string;
  type: MessageType | SessionLogType;
  from: string;
  to?: string;
  receiver?: string;
  timestamp: string;
  text: string;
  summary?: string;
  parsedType?: string;
  parsedData?: Record<string, unknown>;
}
```

### 7.4 Agent Type

```typescript
interface AgentSummary {
  agentId: string;
  name: string;
  teamName: string;
  status: 'idle' | 'working' | 'waiting' | 'error' | 'completed';
  model: string;
}
```

---

## 8. Build Configuration

### 8.1 Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### 8.2 Tailwind CSS Configuration

```typescript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // Class-based dark mode
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Custom colors, etc.
    },
  },
};
```

### 8.3 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build (tsc + vite build) |
| `npm run preview` | Build preview |
| `npm run test` | Run tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | With coverage |
| `npm run lint` | Run linter |

---

## 9. Test Configuration

### 9.1 Test Frameworks

- **Vitest**: Unit testing (fast, Vite-integrated)
- **@testing-library/react**: React component testing
- **jsdom**: DOM environment simulation

### 9.2 Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';

// Global mocks
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// localStorage mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;
```

### 9.3 Test File Placement

```
src/
├── components/
│   ├── chat/
│   │   └── __tests__/
│   │       └── ChatMessageBubble.test.tsx
│   ├── common/
│   │   └── __tests__/
│   │       ├── StatusBadge.test.tsx
│   │       ├── ThemeToggle.test.tsx
│   │       └── ...
│   └── ...
└── hooks/
    └── __tests__/
        └── ...
```

### 9.4 Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# UI mode
npm run test:ui
```

---

## 10. Dark Mode Implementation

### 10.1 Implementation Method

- **Tailwind CSS class-based**: `darkMode: 'class'`
- Toggle by adding/removing `dark` class on `html` element
- State managed by Zustand Store, persisted to localStorage

### 10.2 Usage Example

```tsx
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-white">Text</p>
</div>
```

---

## 11. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Components                         │   │
│  │  TeamCard, ChatMessageBubble, TimelinePanel, etc.   │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Custom Hooks (TanStack Query)           │   │
│  │  useTeams, useTasks, useInbox, useUnifiedTimeline   │   │
│  │                                                      │   │
│  │  - HTTP polling (refetchInterval)                    │   │
│  │  - Auto cache                                        │   │
│  │  - staleTime: 10s                                    │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Zustand Store (dashboardStore)          │   │
│  │  - Selection state (team, message)                   │   │
│  │  - Filters (time range, sender)                      │   │
│  │  - UI state (theme, sidebar)                         │   │
│  │  - Polling settings (interval, pause)                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼ HTTP polling (5s-60s)
                    ┌──────────────┐
                    │   Backend    │
                    │  (FastAPI)   │
                    └──────────────┘
```

---

## 12. Internationalization (i18n)

### 12.1 Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| i18next | 24.2.0+ | Internationalization framework |
| react-i18next | 15.4.0+ | React i18n binding |

### 12.2 Translation File Structure

```
frontend/src/locales/
├── ja/                     # Japanese
│   ├── common.json         # Common translations
│   ├── dashboard.json      # Dashboard
│   ├── tasks.json          # Task management
│   ├── timeline.json       # Timeline
│   ├── errors.json         # Error messages
│   ├── header.json         # Header
│   ├── a11y.json           # Accessibility
│   ├── models.json         # Model-related
│   └── teamDetail.json     # Team detail
├── en/                     # English
│   └── ...（same structure）
└── zh/                     # Chinese
    └── ...（same structure）
```

### 12.3 Language Detection Priority

1. **localStorage**: Language setting saved in `i18nextLng` key
2. **Browser Settings**: `navigator.language`
3. **Default**: Japanese (`ja`)

### 12.4 Usage Example

```tsx
import { useTranslation } from 'react-i18next';

function TeamCard({ team }: { team: TeamSummary }) {
  const { t } = useTranslation();

  return (
    <div>
      <h3>{team.name}</h3>
      <span>{t(`common.status.${team.status}`)}</span>
      <button>{t('common.delete')}</button>
    </div>
  );
}
```

### 12.5 Language Switching

Language can be switched from the header's language selector:

```tsx
const { i18n } = useTranslation();

// Change language
await i18n.changeLanguage('en');
```

### 12.6 Translation Key Consistency Check

The `scripts/verify-translations.js` script runs automatically via pre-commit hook to verify translation key consistency across all languages.

---

*Created: 2026-02-16*
*Last Updated: 2026-03-04*
*Version: 2.2.0*

---

**Language:** [English](./frontend-tech-stack.en.md) | [日本語](./frontend-tech-stack.md) | [中文](./frontend-tech-stack.zh.md)
