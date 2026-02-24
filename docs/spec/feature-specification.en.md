# Agent Teams Dashboard Feature Specification

[日本語](feature-specification.md) | [English](feature-specification.en.md) | [中文](feature-specification.zh.md)

## 1. Overview

### 1.1 Purpose

A web-based dashboard for real-time monitoring and management of Claude Code's Agent Teams functionality.
Monitors JSON files in the `~/.claude/` directory to visualize team configuration, task progress, and inter-agent communication.

### 1.2 Verified Facts

This specification is based on the following verified findings:

```
~/.claude/
├── teams/{team_name}/
│   ├── config.json          # Team configuration, member definitions, model information
│   └── inboxes/
│       └── {agent_name}.json # Per-agent message inbox (JSON array)
├── tasks/{team_name}/
│   └── {task_id}.json       # Task definition and status
└── projects/{project-hash}/
    └── {sessionId}.jsonl    # Session logs (user interactions, tool usage, etc.)
```

**Message Formats**:
- Regular messages: `text` field contains plain text
- Protocol messages: `text` field contains JSON-in-JSON (`idle_notification`, `shutdown_request`, etc.)

### 1.3 Reference Resources

- [sinjorjob/claude-code-agent-teams-dashboard](https://github.com/sinjorjob/claude-code-agent-teams-dashboard) - Terminal implementation
- [Claude Code Agent Teams Official Guide](https://claudefa.st/blog/guide/agents/agent-teams)

### 1.4 Design Philosophy

#### Why HTTP Polling + Cache Invalidation

Since Claude Code directly updates files, push notifications from the server are not possible. Therefore, a two-layer structure is adopted:

1. **FileWatcherService**: Detects file changes and invalidates cache
2. **HTTP Polling**: Frontend periodically fetches data

| Approach | Pros | Cons |
|----------|------|------|
| HTTP Polling (adopted) | Simple, works well with Claude Code | Lower real-time capability |
| WebSocket Push | High real-time capability | Cannot receive notifications from Claude Code |

Polling interval can be selected from **5 seconds to 60 seconds** (default: 30 seconds).

#### Why Team Status Based on Session Log mtime

To accurately reflect team activity, the **last modification time (mtime) of the session log** is used:

- `config.json` mtime may be updated at different timings
- Session log is the true indicator of team activity

#### Data Source Mapping

| Feature | Monitored/Read From | Description |
|---------|---------------------|-------------|
| **Team List** | `~/.claude/teams/{team_name}/config.json` | Team settings, member information |
| **Team Status Determination** | `~/.claude/projects/{project-hash}/{sessionId}.jsonl` | Based on session log mtime |
| **Inboxes** | `~/.claude/teams/{team_name}/inboxes/{agent_name}.json` | Per-agent message inboxes |
| **Tasks** | `~/.claude/tasks/{team_name}/{task_id}.json` | Task definition and status |
| **Unified Timeline** | All above + session logs | inbox + session log integration |

---

## 2. Design Approach

### 2.1 Design Approach: Complete Redesign

While based on existing implementation, the design is refreshed for visualization-focused approach.

**Reasons**:
- Review component structure to maximize interactivity
- Rich visualization through D3.js / vis-timeline
- Consistent user experience design

### 2.2 Technology Selection: Hybrid Configuration

| Purpose | Library | Reason |
|---------|---------|--------|
| Timeline Visualization | **vis-timeline** | Time range selection, zoom, drag built-in |
| Network Graph | **D3.js** | High flexibility for agent communication visualization |
| Task Dependency Graph | **D3.js** | DAG drawing flexibility |
| UI Components | **Radix UI** | Accessibility compliant |
| State Management | **Zustand** | Lightweight and simple |
| Animation | **Framer Motion** | Rich transitions |

---

## 3. Feature List

### 3.1 Core Features (Existing)

| Category | Feature | Priority | Status |
|----------|---------|----------|--------|
| Team Monitoring | Team list display | **P0** | ✅ Completed |
| Team Monitoring | Team detail display | **P0** | ✅ Completed |
| Team Monitoring | Team status determination | **P0** | ✅ Based on session log mtime |
| Team Monitoring | Team deletion | **P0** | ✅ Only stopped teams can be deleted |
| Task Management | Task list display | **P0** | ✅ Completed |
| Task Management | Dependency visualization | **P1** | ✅ D3.js implementation completed |
| Communication Monitoring | Inbox display | **P0** | ✅ Timeline implementation completed |
| Communication Monitoring | Unified timeline | **P0** | ✅ inbox + session log integration |
| Agent | Agent status inference | **P0** | ✅ idle/working/waiting/error/completed |
| Real-time | HTTP polling updates | **P0** | ✅ Configurable 5s-60s |

### 3.2 New Features

| Category | Feature | Priority | Status | Description |
|----------|---------|----------|--------|-------------|
| **Model Visualization** | Per-team model display | **P0** | ✅ Completed | Model badge on team cards |
| **Model Visualization** | Model-specific colored icons | **P0** | ✅ Completed | Unique color and icon per model |
| **Message Visualization** | Timeline display | **P0** | ✅ Completed | vis-timeline chronological display |
| **Message Visualization** | Detail expansion modal | **P0** | ✅ Completed | Click to view full message |
| **Message Visualization** | Time range selection | **P0** | ✅ Completed | Slider to filter specific time range |
| **Message Visualization** | Filter functionality | **P1** | ✅ Completed | Filter by sender/receiver/type |
| **Message Visualization** | Search functionality | **P1** | ✅ Completed | Keyword search in message body |
| **Graph Visualization** | Task dependency graph | **P1** | ✅ Completed | D3.js DAG display |
| **Graph Visualization** | Agent communication network | **P2** | ✅ Completed | D3.js communication diagram |
| **UI/UX** | Dark mode | **P1** | ✅ Completed | Theme switching |
| **UI/UX** | Real-time indicator | **P1** | ✅ Completed | Live badge, connection status display |

---

## 4. UI/UX Design

### 4.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🤖 Agent Teams Dashboard                    🔴 Live    🌙 Dark    ⚙ Settings │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │    📊 Overview Panel         │  │    💬 Message Timeline             │  │
│  │    (Teams + Models)          │  │    (vis-timeline)                  │  │
│  │                              │  │                                    │  │
│  │    ┌──────────────────────┐  │  │    ▲ 17:05:45                     │  │
│  │    │ dashboard-dev-v2     │  │  │    │ architect ──▶ team-lead      │  │
│  │    │ 🟣 Opus×5 🟡 Kimi×2  │  │  │    │ 💬 "API design complete..."  │  │
│  │    │ 👥 7 members          │  │  │    │    [Click for detail]        │  │
│  │    │ 📋 12 tasks          │  │  │    │                              │  │
│  │    └──────────────────────┘  │  │    ├ 17:04:30                     │  │
│  │    ┌──────────────────────┐  │  │    │ python-eng ──▶ team-lead    │  │
│  │    │ docs-team            │  │  │    │ 🟡 idle_notification        │  │
│  │    │ 🟣 Opus×3            │  │  │    │                              │  │
│  │    │ 👥 3 members          │  │  │    ▼ 16:42:44                     │  │
│  │    │ 📋 5 tasks           │  │  │    ────── ⏱ Time Range ──────     │  │
│  │    └──────────────────────┘  │  │    [==========●===========]       │  │
│  │                              │  │                                    │  │
│  │    [🔍 Search...]            │  │    🔍 [Search messages...]         │  │
│  └──────────────────────────────┘  │    🔽 Filter: [All ▼] [All Type ▼] │  │
│                                    └────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │    📋 Task Dependencies (D3.js)                                    │   │
│  │    [1]──▶[2]──▶[3]──▶[4]                    📊 Stats │ 🕐 Activity  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | 1 column (Overview → Timeline → Tasks) |
| Tablet | 640-1024px | 2 columns (Overview + Timeline) |
| Desktop | > 1024px | 3-pane structure |

### 4.3 Color System

```css
/* Theme colors */
--color-primary: #3B82F6;      /* blue-500 */
--color-secondary: #8B5CF6;    /* violet-500 */
--color-accent: #F59E0B;       /* amber-500 */

/* Status colors */
--color-active: #10B981;       /* green-500 */
--color-idle: #F59E0B;         /* amber-500 */
--color-pending: #6B7280;      /* gray-500 */
--color-progress: #3B82F6;     /* blue-500 */
--color-completed: #10B981;    /* green-500 */
--color-error: #EF4444;        /* red-500 */

/* Model-specific colors */
--model-opus: #8B5CF6;         /* violet-500 */
--model-sonnet: #3B82F6;       /* blue-500 */
--model-haiku: #10B981;        /* green-500 */
--model-kimi: #F59E0B;         /* amber-500 */
--model-glm: #EF4444;          /* red-500 */

/* Dark mode */
--bg-dark: #0F172A;            /* slate-900 */
--bg-dark-card: #1E293B;       /* slate-800 */
--text-dark-primary: #F1F5F9;  /* slate-100 */
--text-dark-secondary: #94A3B8; /* slate-400 */
```

### 4.4 Animation Specifications

| Type | Animation | Duration | Easing |
|------|-----------|----------|--------|
| Card selection | scale + shadow | 150ms | ease-out |
| Status change | fade + color | 300ms | ease-in-out |
| New message | slide-in from top | 250ms | spring |
| Modal expansion | scale + fade | 200ms | ease-out |
| Timeline zoom | smooth scroll | 400ms | ease-in-out |

---

## 5. Detailed Feature Design

### 5.1 Model Visualization Feature

#### 5.1.1 ModelBadge Component

**Purpose**: Provide visual badges to uniquely identify each AI model

**Model Configuration Definition**:
```typescript
interface ModelConfig {
  id: string;
  color: string;
  icon: string;
  label: string;
  provider: 'anthropic' | 'moonshot' | 'zhipu' | 'other';
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'claude-opus-4-6': {
    id: 'claude-opus-4-6',
    color: '#8B5CF6',
    icon: '🟣',
    label: 'Opus 4.6',
    provider: 'anthropic'
  },
  'claude-sonnet-4-5': {
    id: 'claude-sonnet-4-5',
    color: '#3B82F6',
    icon: '🔵',
    label: 'Sonnet 4.5',
    provider: 'anthropic'
  },
  'claude-haiku-4-5': {
    id: 'claude-haiku-4-5',
    color: '#10B981',
    icon: '🟢',
    label: 'Haiku 4.5',
    provider: 'anthropic'
  },
  'kimi-k2.5': {
    id: 'kimi-k2.5',
    color: '#F59E0B',
    icon: '🟡',
    label: 'Kimi K2.5',
    provider: 'moonshot'
  },
  'glm-5': {
    id: 'glm-5',
    color: '#EF4444',
    icon: '🔴',
    label: 'GLM-5',
    provider: 'zhipu'
  },
  'default': {
    id: 'unknown',
    color: '#6B7280',
    icon: '⚪',
    label: 'Unknown',
    provider: 'other'
  }
};
```

#### 5.1.2 TeamCard Model Display

**Display Content**:
```
┌────────────────────────────────────┐
│  dashboard-dev-v2                  │
│  ────────────────────────────────  │
│  🟣 Opus 4.6 × 5  🟡 Kimi K2.5 × 2 │
│  ────────────────────────────────  │
│  👥 7 members    📋 12 tasks       │
│  🟢 Active                          │
└────────────────────────────────────┘
```

**Data Structure**:
```typescript
interface TeamModels {
  teamName: string;
  models: {
    config: ModelConfig;
    count: number;
    agents: string[];  // Agent names using this model
  }[];
}

// Computation logic
function computeTeamModels(team: Team): TeamModels {
  const modelCounts = new Map<string, { config: ModelConfig; agents: string[] }>();

  team.members.forEach(member => {
    const config = MODEL_CONFIGS[member.model] || MODEL_CONFIGS['default'];
    const existing = modelCounts.get(config.id);
    if (existing) {
      existing.agents.push(member.name);
    } else {
      modelCounts.set(config.id, { config, agents: [member.name] });
    }
  });

  return {
    teamName: team.name,
    models: Array.from(modelCounts.values()).map(m => ({
      config: m.config,
      count: m.agents.length,
      agents: m.agents
    }))
  };
}
```

### 5.2 Message Timeline Feature

#### 5.2.1 Timeline Display Specification

**vis-timeline Configuration**:
```typescript
const timelineOptions: TimelineOptions = {
  // Basic settings
  orientation: { axis: 'top', item: 'top' },
  verticalScroll: true,
  horizontalScroll: true,

  // Zoom settings
  zoomMin: 1000 * 60 * 1,      // Minimum: 1 minute
  zoomMax: 1000 * 60 * 60 * 24, // Maximum: 24 hours

  // Interaction
  editable: false,
  selectable: true,

  // Style
  margin: { item: { horizontal: 10, vertical: 5 } },
  format: {
    minorLabels: { minute: 'HH:mm', hour: 'HH:mm' },
    majorLabels: { hour: 'YYYY-MM-DD HH:mm' }
  }
};
```

**Message Item Format**:
```typescript
interface TimelineItem {
  id: string;
  content: string;           // Display text (shortened)
  start: Date;               // Timestamp
  type: 'box' | 'point';
  className: string;         // Style class (message, idle, etc.)
  group: string;             // Group by sender
  data: ParsedMessage;       // Original message data
}
```

#### 5.2.2 Detail Expansion Modal (P0)

**Trigger**: Click on timeline item

**Modal Content**:
```
┌─────────────────────────────────────────────────────┐
│  Message Detail                              [×]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  From: architect                    To: team-lead   │
│  Time: 2026-02-16 17:05:45                          │
│  Type: 💬 Message                                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  API design complete.                      │   │
│  │                                             │   │
│  │  Changes:                                   │   │
│  │  - Endpoint structure review                │   │
│  │  - Response format standardization          │   │
│  │  - Error handling added                     │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Metadata:                                          │
│  - Color: blue                                      │
│  - Read: true                                       │
│                                                     │
│                              [Copy] [Close]         │
└─────────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
interface MessageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ParsedMessage | null;
}

const MessageDetailModal: React.FC<MessageDetailModalProps> = ({
  isOpen,
  onClose,
  message
}) => {
  if (!message) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        Message Detail
        <CloseButton onClick={onClose}>×</CloseButton>
      </ModalHeader>
      <ModalBody>
        <MetaInfo>
          <MetaItem label="From" value={message.raw.from} />
          <MetaItem label="Time" value={formatTimestamp(message.raw.timestamp)} />
          <MetaItem label="Type" value={message.parsedType} icon={getTypeIcon(message.parsedType)} />
        </MetaInfo>
        <MessageContent>
          {message.parsedType === 'message'
            ? message.raw.text
            : JSON.stringify(message.parsedData, null, 2)}
        </MessageContent>
        <Metadata>
          <MetaItem label="Color" value={message.raw.color} />
          <MetaItem label="Read" value={message.raw.read ? 'Yes' : 'No'} />
        </Metadata>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={() => copyToClipboard(message.raw.text)}>
          Copy
        </Button>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};
```

#### 5.2.3 Time Range Selection (P0)

**UI Component**:
```typescript
interface TimeRangeSliderProps {
  startTime: Date;
  endTime: Date;
  selectedRange: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
}

const TimeRangeSlider: React.FC<TimeRangeSliderProps> = ({
  startTime,
  endTime,
  selectedRange,
  onChange
}) => {
  return (
    <TimeRangeContainer>
      <RangeLabel>{formatTime(selectedRange.start)}</RangeLabel>
      <Slider
        min={startTime.getTime()}
        max={endTime.getTime()}
        value={[selectedRange.start.getTime(), selectedRange.end.getTime()]}
        onChange={([start, end]) => onChange({ start: new Date(start), end: new Date(end) })}
      />
      <RangeLabel>{formatTime(selectedRange.end)}</RangeLabel>
      <QuickRangeButtons>
        <Button onClick={() => setLastMinutes(5)}>5m</Button>
        <Button onClick={() => setLastMinutes(15)}>15m</Button>
        <Button onClick={() => setLastMinutes(60)}>1h</Button>
        <Button onClick={() => setAllRange()}>All</Button>
      </QuickRangeButtons>
    </TimeRangeContainer>
  );
};
```

#### 5.2.4 Filter Functionality (P1)

**Filter Criteria**:
```typescript
interface MessageFilter {
  senders: string[];        // Filter by sender
  receivers: string[];      // Filter by receiver
  types: MessageType[];     // Filter by message type
  unreadOnly: boolean;      // Unread only
}

type MessageType =
  | 'message'
  | 'idle_notification'
  | 'shutdown_request'
  | 'shutdown_approved'
  | 'task_assignment'
  | 'unknown';

const TimelineFilters: React.FC<{
  filter: MessageFilter;
  onChange: (filter: MessageFilter) => void;
  availableSenders: string[];
  availableTypes: MessageType[];
}> = ({ filter, onChange, availableSenders, availableTypes }) => {
  return (
    <FiltersContainer>
      <Select
        label="Sender"
        options={availableSenders.map(s => ({ value: s, label: s }))}
        value={filter.senders}
        onChange={(senders) => onChange({ ...filter, senders })}
        isMulti
      />
      <Select
        label="Type"
        options={availableTypes.map(t => ({ value: t, label: getTypeLabel(t) }))}
        value={filter.types}
        onChange={(types) => onChange({ ...filter, types })}
        isMulti
      />
      <Checkbox
        label="Unread only"
        checked={filter.unreadOnly}
        onChange={(unreadOnly) => onChange({ ...filter, unreadOnly })}
      />
    </FiltersContainer>
  );
};
```

#### 5.2.5 Search Functionality (P1)

**Search Implementation**:
```typescript
interface SearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  searchResults: number;
}

const MessageSearch: React.FC<SearchProps> = ({
  query,
  onQueryChange,
  searchResults
}) => {
  return (
    <SearchContainer>
      <SearchIcon />
      <SearchInput
        type="text"
        placeholder="Search messages..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      {query && (
        <ClearButton onClick={() => onQueryChange('')}>×</ClearButton>
      )}
      {searchResults > 0 && (
        <ResultCount>{searchResults} results</ResultCount>
      )}
    </SearchContainer>
  );
};

// Search filter function
function filterMessagesByQuery(
  messages: ParsedMessage[],
  query: string
): ParsedMessage[] {
  if (!query.trim()) return messages;

  const lowerQuery = query.toLowerCase();
  return messages.filter(msg => {
    const text = msg.raw.text.toLowerCase();
    const summary = msg.raw.summary?.toLowerCase() || '';
    const from = msg.raw.from.toLowerCase();

    return text.includes(lowerQuery) ||
           summary.includes(lowerQuery) ||
           from.includes(lowerQuery);
  });
}
```

### 5.3 Task Dependency Graph Feature

#### 5.3.1 D3.js Graph Specification

**Node Definition**:
```typescript
interface TaskNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner?: string;
  x?: number;
  y?: number;
}

interface TaskEdge extends d3.SimulationLinkDatum<TaskNode> {
  source: string;
  target: string;
}
```

**Graph Configuration**:
```typescript
const graphConfig = {
  nodeRadius: 25,
  nodePadding: 50,
  linkDistance: 100,
  chargeStrength: -300,

  statusColors: {
    pending: '#6B7280',
    in_progress: '#3B82F6',
    completed: '#10B981'
  }
};

// D3.js force simulation
function createForceSimulation(
  nodes: TaskNode[],
  edges: TaskEdge[]
): d3.Simulation<TaskNode, TaskEdge> {
  return d3.forceSimulation(nodes)
    .force('link', d3.forceLink(edges).id(d => d.id).distance(graphConfig.linkDistance))
    .force('charge', d3.forceManyBody().strength(graphConfig.chargeStrength))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(graphConfig.nodeRadius + graphConfig.nodePadding));
}
```

**Display Example**:
```
         ┌─────────┐
         │ Task 1  │
         │ ✅ Done │
         └────┬────┘
              │
              ▼
         ┌─────────┐
         │ Task 2  │
         │ ✅ Done │
         └────┬────┘
              │
        ┌─────┴─────┐
        ▼           ▼
   ┌─────────┐ ┌─────────┐
   │ Task 3  │ │ Task 4  │
   │ 🔄 In   │ │ ⏳ Pend │
   │ Progress│ │         │
   └────┬────┘ └────┬────┘
        │           │
        └─────┬─────┘
              ▼
         ┌─────────┐
         │ Task 5  │
         │ ⏳ Pend │
         └─────────┘
```

### 5.4 Dark Mode Feature

#### 5.4.1 Theme Definition

```typescript
interface Theme {
  name: 'light' | 'dark';
  colors: {
    background: string;
    backgroundCard: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    accent: string;
    // ... others
  };
}

const themes: Record<string, Theme> = {
  light: {
    name: 'light',
    colors: {
      background: '#FFFFFF',
      backgroundCard: '#F8FAFC',
      textPrimary: '#0F172A',
      textSecondary: '#64748B',
      border: '#E2E8F0',
      accent: '#3B82F6'
    }
  },
  dark: {
    name: 'dark',
    colors: {
      background: '#0F172A',
      backgroundCard: '#1E293B',
      textPrimary: '#F1F5F9',
      textSecondary: '#94A3B8',
      border: '#334155',
      accent: '#60A5FA'
    }
  }
};
```

#### 5.4.2 Theme Toggle

```typescript
// Zustand store
interface ThemeStore {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'light',
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),
  setTheme: (theme) => set({ theme })
}));

// ThemeToggle component
const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <ToggleButton onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'light' ? '🌙' : '☀️'}
    </ToggleButton>
  );
};
```

---

## 6. Component Design

### 6.1 Directory Structure

```
src/components/
├── layout/
│   ├── DashboardLayout.tsx      # New layout (3-pane structure)
│   ├── Header.tsx               # Updated (dark mode toggle added)
│   └── Sidebar.tsx              # New (navigation)
│
├── overview/                    # New directory
│   ├── OverviewPanel.tsx        # Team list panel
│   ├── TeamCard.tsx             # Redesigned (with model badge)
│   └── ModelBadge.tsx           # New (model-specific colored icons)
│
├── timeline/                    # New directory
│   ├── MessageTimeline.tsx      # vis-timeline wrapper
│   ├── TimelineFilters.tsx      # Filter and search UI
│   ├── TimeRangeSlider.tsx      # Time range selection
│   └── MessageDetailModal.tsx   # Detail expansion modal
│
├── graph/                       # New directory
│   ├── TaskDependencyGraph.tsx  # D3.js task dependency graph
│   └── AgentNetworkGraph.tsx    # D3.js agent communication network
│
├── stats/                       # New directory
│   ├── StatsPanel.tsx           # Statistics summary
│   └── ActivityFeed.tsx         # Redesigned
│
└── common/
    ├── StatusIndicator.tsx      # Real-time status indicator
    ├── SearchInput.tsx          # New
    ├── ThemeToggle.tsx          # New (dark mode)
    └── Modal.tsx                # New (Radix UI Dialog)
```

### 6.2 State Management Design (Zustand)

```typescript
// stores/dashboardStore.ts
interface DashboardState {
  // Selection state
  selectedTeam: string | null;
  selectedMessage: ParsedMessage | null;

  // Filters
  timeRange: { start: Date; end: Date };
  messageFilter: MessageFilter;
  searchQuery: string;

  // UI state
  isDetailModalOpen: boolean;
  isDarkMode: boolean;

  // Actions
  setSelectedTeam: (team: string | null) => void;
  setSelectedMessage: (message: ParsedMessage | null) => void;
  setTimeRange: (range: { start: Date; end: Date }) => void;
  setMessageFilter: (filter: MessageFilter) => void;
  setSearchQuery: (query: string) => void;
  toggleDetailModal: () => void;
  toggleDarkMode: () => void;
}

const useDashboardStore = create<DashboardState>((set) => ({
  selectedTeam: null,
  selectedMessage: null,
  timeRange: { start: new Date(Date.now() - 3600000), end: new Date() },
  messageFilter: { senders: [], receivers: [], types: [], unreadOnly: false },
  searchQuery: '',
  isDetailModalOpen: false,
  isDarkMode: false,

  setSelectedTeam: (team) => set({ selectedTeam: team }),
  setSelectedMessage: (message) => set({ selectedMessage: message }),
  setTimeRange: (range) => set({ timeRange: range }),
  setMessageFilter: (filter) => set({ messageFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleDetailModal: () => set((state) => ({ isDetailModalOpen: !state.isDetailModalOpen })),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode }))
}));
```

---

## 7. API Design

### 7.1 REST API Updates

| Endpoint | Method | Description | Changes |
|----------|--------|-------------|---------|
| `GET /api/teams` | GET | Team list | Model information added |
| `GET /api/teams/{name}` | GET | Team detail | Model information added |
| `GET /api/teams/{name}/messages` | GET | Message list | **New** |
| `GET /api/teams/{name}/messages/timeline` | GET | For timeline | **New** |
| `GET /api/teams/{name}/stats` | GET | Team statistics | **New** |
| `GET /api/models` | GET | Model list | **New** |

### 7.2 New API: Message Timeline

```python
@router.get("/teams/{team_name}/messages/timeline")
async def get_message_timeline(
    team_name: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    senders: Optional[str] = None,      # Comma-separated
    types: Optional[str] = None,        # Comma-separated
    search: Optional[str] = None,
    unread_only: bool = False
):
    """Get messages for timeline display"""

    # Apply filters
    messages = await filter_messages(
        team_name=team_name,
        start_time=start_time,
        end_time=end_time,
        senders=senders.split(',') if senders else None,
        types=types.split(',') if types else None,
        search=search,
        unread_only=unread_only
    )

    # Convert to timeline item format
    timeline_items = [
        {
            "id": f"{msg['from']}-{idx}",
            "content": truncate_text(msg['text'], 50),
            "start": msg['timestamp'],
            "type": "box",
            "className": get_message_class(msg),
            "group": msg['from'],
            "data": parse_message(msg)
        }
        for idx, msg in enumerate(messages)
    ]

    return {
        "items": timeline_items,
        "groups": get_unique_senders(messages),
        "timeRange": {
            "min": get_earliest_timestamp(messages),
            "max": get_latest_timestamp(messages)
        }
    }
```

### 7.3 New API: Model List

```python
@router.get("/models")
async def get_available_models():
    """Get list of available models and their configurations"""
    return {
        "models": [
            {"id": "claude-opus-4-6", "color": "#8B5CF6", "icon": "🟣", "label": "Opus 4.6", "provider": "anthropic"},
            {"id": "claude-sonnet-4-5", "color": "#3B82F6", "icon": "🔵", "label": "Sonnet 4.5", "provider": "anthropic"},
            {"id": "claude-haiku-4-5", "color": "#10B981", "icon": "🟢", "label": "Haiku 4.5", "provider": "anthropic"},
            {"id": "kimi-k2.5", "color": "#F59E0B", "icon": "🟡", "label": "Kimi K2.5", "provider": "moonshot"},
            {"id": "glm-5", "color": "#EF4444", "icon": "🔴", "label": "GLM-5", "provider": "zhipu"}
        ]
    }
```

---

## 8. Data Models

### 8.1 Team Model (Extended)

```typescript
interface Team {
  name: string;
  description?: string;
  createdAt: number;
  leadAgentId: string;
  leadSessionId: string;
  members: Member[];
  // Computed values
  modelSummary?: TeamModelSummary;
}

interface Member {
  agentId: string;
  name: string;
  agentType: string;
  model: string;
  color: string;
  joinedAt: number;
  tmuxPaneId: string;
  cwd: string;
  backendType: 'in-process' | 'tmux';
  status?: 'active' | 'idle' | 'unknown';
}

interface TeamModelSummary {
  models: {
    config: ModelConfig;
    count: number;
    agents: string[];
  }[];
  primaryModel: string;  // Most used model
}
```

### 8.2 Message Model (Extended)

```typescript
interface Message {
  from: string;
  to?: string;            // Receiver (inferred)
  text: string;
  timestamp: string;
  color: string;
  read: boolean;
  summary?: string;
}

interface ParsedMessage extends Message {
  parsedType: MessageType;
  parsedData?: {
    type: string;
    from: string;
    timestamp?: string;
    idleReason?: string;
    [key: string]: unknown;
  };
}

type MessageType =
  | 'message'
  | 'idle_notification'
  | 'shutdown_request'
  | 'shutdown_approved'
  | 'task_assignment'
  | 'unknown';
```

### 8.3 TimelineItem Model (New)

```typescript
interface TimelineItem {
  id: string;
  content: string;
  start: string;
  type: 'box' | 'point';
  className: string;
  group: string;
  data: ParsedMessage;
}

interface TimelineGroup {
  id: string;
  content: string;
  className?: string;
}

interface TimelineData {
  items: TimelineItem[];
  groups: TimelineGroup[];
  timeRange: {
    min: string;
    max: string;
  };
}
```

---

## 9. Technology Stack

### 9.1 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Main language |
| FastAPI | 0.109+ | Web framework |
| Pydantic | 2.5+ | Data validation |
| watchdog | 4.0+ | File monitoring |

### 9.2 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2+ | UI library |
| TypeScript | 5.3+ | Type safety |
| Vite | 5.0+ | Build tool |
| Tailwind CSS | 3.4+ | Styling |
| **vis-timeline** | 7.x | Timeline visualization |
| **D3.js** | 7.x | Network/dependency graphs |
| **Radix UI** | 1.x | Accessible components |
| **Zustand** | 5.x | State management |
| **Framer Motion** | 11.x | Animation |

---

## 10. Limitations

### 10.1 Limitations Due to Agent Teams Specification

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Data deleted on session end | Cannot preserve history | Real-time monitoring only |
| Weak file locking | Possible conflicts | Read-only operation |
| Inter-task communication only between turns | Real-time capability | Complemented by HTTP polling |
| Claude Code directly updates files | Cannot push notifications | HTTP polling + cache invalidation |

### 10.2 Dashboard Limitations

| Limitation | Description |
|------------|-------------|
| Team deletion restriction | Only stopped, inactive, unknown statuses can be deleted |
| Local only | Remote monitoring not supported |
| Session log dependency | Team status determination depends on session log mtime |

---

## 10.5 Session Log Integration Specification

### Session Log Location

```
~/.claude/projects/{project-hash}/{sessionId}.jsonl
```

- **project-hash**: Generated from cwd (working directory) with `-` prefix and `/` replaced by `-`
- **sessionId**: Obtained from `leadSessionId` in team configuration (`config.json`)

### Session Log Entry Types

| Type | Content | Display Icon |
|------|---------|--------------|
| `user_message` | User input | 👤 |
| `assistant_message` | Assistant response | 🤖 |
| `thinking` | Thinking process | 💭 |
| `tool_use` | Tool call | 🔧 |
| `file_change` | File change | 📁 |

### Unified Timeline

**TimelineService** integrates two data sources:

1. **inbox messages**: Inter-agent communication
2. **session logs**: User interactions, tool usage

---

## 10.6 Team Status Determination Specification

### Determination Logic

```
1. members array empty → inactive
2. No session log → unknown
3. Session log mtime > 1 hour → stopped
4. Session log mtime ≤ 1 hour → active
```

### Status List

| Status | Determination Condition | Delete Button | Display Color |
|--------|-------------------------|---------------|---------------|
| **active** | Session log mtime ≤ 1 hour | Hidden | 🟢 Green |
| **stopped** | Session log mtime > 1 hour | **Visible** | 🟡 Yellow |
| **unknown** | No session log | Hidden | ⚪ White |
| **inactive** | No members | Hidden | ⚫ Black |

---

## 10.7 Agent Status Inference Specification

### Inference Logic

| Status | Determination Condition | Display |
|--------|-------------------------|---------|
| `idle` | No activity for 5+ minutes | 💤 Idle |
| `working` | Has in_progress tasks | 🔵 Working |
| `waiting` | Has blocked tasks | ⏳ Waiting |
| `error` | No activity for 30+ minutes | ❌ Error |
| `completed` | All tasks completed | ✅ Completed |

### Data Used

- inbox messages (task_assignment, task_completed, etc.)
- Task definitions (owner, status, blockedBy)
- Session logs (last activity time, model used)

---

## 10.8 Team Deletion API Specification

### Endpoint

```
DELETE /api/teams/{team_name}
```

### Deletable Statuses

- `stopped`
- `inactive`
- `unknown`

### Files to Delete

1. `~/.claude/teams/{team-name}/` - Entire team configuration
2. `~/.claude/tasks/{team-name}/` - Task definitions
3. `~/.claude/projects/{project-hash}/{session}.jsonl` - Session log (directory remains)

### Error Responses

| Status Code | Condition |
|-------------|-----------|
| 404 Not Found | Team does not exist |
| 400 Bad Request | Status is not `stopped` |

---

## 11. Roadmap

### Phase 1: Foundation Redesign ✅ Completed
- [x] Migration to new layout structure (4-view switching in App.tsx)
- [x] Zustand state management (dashboardStore.ts)
- [x] Dark mode support (ThemeToggle.tsx)
- [x] ModelBadge component implementation (ModelBadge.tsx)

### Phase 2: Timeline Features ✅ Completed
- [x] vis-timeline integration (MessageTimeline.tsx)
- [x] Detail expansion modal (MessageDetailModal.tsx)
- [x] Time range selection (TimeRangeSlider.tsx)
- [x] Filter and search functionality (TimelineFilters.tsx)

### Phase 3: Graph Visualization ✅ Completed
- [x] D3.js task dependency graph (TaskDependencyGraph.tsx)
- [x] Agent communication network (AgentNetworkGraph.tsx)
- [x] Interactive feature enhancements (drag, zoom, pan support)

---

## 12. Change History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-16 | 1.0.0 | Initial release |
| 2026-02-16 | 2.0.0 | Reflecting brainstorming results: complete redesign, model visualization, timeline features, enhanced interactivity |
| 2026-02-16 | 2.1.0 | Reflecting implementation completion: Phase 1-2 complete, Phase 3 in progress (D3.js graph implemented, communication network not implemented) |
| 2026-02-16 | 2.2.0 | All features implementation complete: Phase 3 complete (agent communication network implemented), TypeScript errors fixed |
| 2026-02-23 | 3.0.0 | Design philosophy added, session log integration specification, team status determination (mtime-based), agent status inference, team deletion API, HTTP polling explanation added |

*Created by: Claude Code Agent Teams*
