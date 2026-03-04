# 前端技术栈技术书

## 1. 技术栈概览

### 1.1 语言与框架

| 类别 | 技术 | 版本 | 用途 |
|----------|------|-----------|------|
| 编程语言 | TypeScript | 5.3.0+ | 类型安全开发 |
| UI 库 | React | 18.2.0 | 组件化 UI |
| 打包工具 | Vite | 5.0.0+ | 快速构建与热更新 |
| CSS 框架 | Tailwind CSS | 3.4.0+ | 原子化 CSS |
| 状态管理 | Zustand | 5.0.2+ | 全局状态管理 |
| 数据获取 | TanStack Query | 5.90.21+ | 服务器状态管理与缓存 |
| Markdown | react-markdown | 10.1.0+ | Markdown 渲染 |
| Markdown 扩展 | remark-gfm | 4.0.1+ | GitHub 风格 Markdown |
| 日期处理 | date-fns | 4.1.0+ | 日期格式化与操作 |
| 图标 | lucide-react | 0.344.0+ | 图标库 |
| 虚拟滚动 | @tanstack/react-virtual | 3.10.8+ | 大数据量虚拟滚动 |
| 图表可视化 | D3.js | 7.8.5+ | 网络/依赖图 |
| 时间轴 | vis-timeline | 7.7.3+ | 时序数据显示 |
| UI 组件 | Radix UI | 1.x | 无障碍 UI 组件 |
| 国际化 | i18next | 24.2.0+ | 国际化框架 |
| 国际化 | react-i18next | 15.4.0+ | React i18n 绑定 |

### 1.2 开发依赖

| 技术 | 版本 | 用途 |
|------|-----------|------|
| Vitest | 1.1.0+ | 单元测试 |
| @testing-library/react | 14.1.2+ | React 组件测试 |
| @testing-library/jest-dom | 6.4.0+ | DOM 断言扩展 |
| @testing-library/user-event | 14.5.1+ | 用户事件模拟 |
| jsdom | 24.0.0+ | DOM 环境模拟 |
| @vitest/coverage-v8 | 1.1.0+ | 覆盖率报告 |
| @vitest/ui | 1.1.0+ | 测试 UI |
| Puppeteer | 24.37.3+ | E2E 测试 |
| Playwright | 1.58.2+ | 浏览器自动化测试 |

---

## 2. 设计理念

### 2.1 为什么使用 HTTP 轮询

**背景：**
Claude Code 直接更新文件，无法实现服务器推送通知。

**方案：**
- **HTTP 轮询** 定期获取数据
- 轮询间隔可在 **5秒至60秒** 之间选择（默认30秒）
- 通过 TanStack Query 的 `refetchInterval` 实现自动刷新

**权衡：**
- 实时性不如 WebSocket 推送，但可配置的间隔提供了足够的更新频率
- 服务器负载增加，但缓存（TTL）可减少实际 I/O

### 2.2 为什么选择 Zustand + TanStack Query

**Zustand：**
- 全局状态管理（UI 状态、选择状态、轮询设置）
- 轻量简洁的 API
- 易于持久化到 localStorage

**TanStack Query：**
- 服务器状态管理（团队、任务、消息）
- 自动缓存、重新获取、失效
- 内置轮询功能

**职责分离：**
- Zustand = 客户端状态
- TanStack Query = 服务器状态

---

## 3. 项目结构

```
frontend/src/
├── components/
│   ├── agent/               # 代理相关
│   │   └── ExpandedAgentCard.tsx
│   ├── chat/               # 聊天相关组件
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
│   ├── common/             # 通用组件
│   │   ├── StatusBadge.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorDisplay.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── PollingIntervalSelector.tsx
│   ├── dashboard/          # 仪表盘相关
│   │   ├── TeamCard.tsx
│   │   ├── TeamDetailPanel.tsx
│   │   └── ActivityFeed.tsx
│   ├── layout/             # 布局
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── overview/           # 概览
│   │   ├── TeamCard.tsx
│   │   └── ModelBadge.tsx
│   ├── tasks/              # 任务相关
│   │   ├── TaskCard.tsx
│   │   ├── ExpandedTaskCard.tsx
│   │   └── TaskMonitorPanel.tsx
│   └── timeline/           # 时间轴
│       ├── TimelinePanel.tsx
│       ├── TimelineFilters.tsx
│       ├── TimelineTaskSplitLayout.tsx
│       ├── TimeRangeSlider.tsx
│       ├── MessageTimeline.tsx
│       ├── MessageSearch.tsx
│       └── MessageDetailModal.tsx
├── hooks/                  # 自定义钩子
│   ├── useTeams.ts
│   ├── useTasks.ts
│   ├── useInbox.ts
│   ├── useAgentMessages.ts
│   └── useUnifiedTimeline.ts
├── stores/                 # Zustand 状态管理
│   └── dashboardStore.ts
├── types/                  # TypeScript 类型定义
│   ├── team.ts
│   ├── task.ts
│   ├── message.ts
│   ├── timeline.ts
│   ├── model.ts
│   └── theme.ts
├── config/                 # 配置
│   └── models.ts
├── utils/                  # 工具函数
│   └── teamModels.ts
├── lib/                    # 库配置
│   ├── queryClient.ts
│   └── utils.ts
└── test/                   # 测试设置
    └── setup.ts
```

### 3.1 各模块职责

| 模块 | 职责 |
|-----------|------|
| `components/chat/` | 聊天面板、消息显示、搜索与过滤 |
| `components/common/` | 可复用的通用组件 |
| `components/dashboard/` | 团队列表、详情面板、动态信息流 |
| `components/tasks/` | 任务卡片、监控面板 |
| `components/timeline/` | 统一时间轴、过滤器、详情弹窗 |
| `hooks/` | 数据获取、HTTP 轮询 |
| `stores/` | 全局状态管理（UI 状态、选择状态） |
| `types/` | TypeScript 类型定义 |

---

## 4. 组件列表

### 4.1 聊天相关组件

| 组件 | 说明 |
|--------------|------|
| ChatHeader | 聊天头部（搜索、过滤器） |
| ChatMessageBubble | 消息气泡（支持 Markdown，类型图标） |
| ChatMessageList | 消息列表 |
| ChatTimelinePanel | 聊天时间轴面板 |
| ChatSearch | 全文搜索 |
| SenderFilter | 发送者过滤器 |
| MessageTypeFilter | 消息类型过滤器 |
| DateSeparator | 日期分隔符 |
| AgentStatusIndicator | 代理状态指示器（idle/working/waiting/error/completed） |
| BookmarkButton | 书签按钮 |
| MessageDetailPanel | 消息详情面板（侧滑） |

### 4.2 通用组件

| 组件 | 说明 |
|--------------|------|
| StatusBadge | 状态徽章（active/stopped/unknown/inactive） |
| LoadingSpinner | 加载显示 |
| ErrorDisplay | 错误显示 |
| ThemeToggle | 主题切换（深色/浅色） |
| PollingIntervalSelector | 轮询间隔选择（5s/10s/20s/30s/60s） |

### 4.3 仪表盘相关组件

| 组件 | 说明 |
|--------------|------|
| TeamCard | 团队卡片（状态显示、删除按钮） |
| TeamDetailPanel | 团队详情面板 |
| ActivityFeed | 动态信息流 |

### 4.4 任务相关组件

| 组件 | 说明 |
|--------------|------|
| TaskCard | 任务卡片 |
| ExpandedTaskCard | 展开式任务卡片 |
| TaskMonitorPanel | 任务监控面板 |

### 4.5 时间轴相关组件

| 组件 | 说明 |
|--------------|------|
| TimelinePanel | 时间轴面板 |
| TimelineFilters | 过滤器组件 |
| TimelineTaskSplitLayout | 时间轴-任务分栏布局 |
| TimeRangeSlider | 时间范围滑块 |
| MessageTimeline | 消息时间轴 |
| MessageSearch | 消息搜索 |
| MessageDetailModal | 消息详情弹窗 |

---

## 5. 自定义钩子

### 5.1 数据获取钩子

| 钩子 | API | 说明 |
|-------|-----|------|
| useTeams() | GET /api/teams | 获取团队列表（轮询） |
| useTasks() | GET /api/tasks | 获取任务列表（轮询） |
| useInbox() | GET /api/teams/{name}/inboxes | 获取收件箱（轮询） |
| useAgentMessages() | GET /api/teams/{name}/inboxes/{agent} | 按代理获取消息 |
| useUnifiedTimeline() | GET /api/timeline/{team_name}/history | 获取统一时间轴（轮询） |

### 5.2 轮询实现示例

```typescript
// useTeams.ts
export function useTeams() {
  const pollingInterval = useDashboardStore((state) => state.pollingInterval);
  const isPollingPaused = useDashboardStore((state) => state.isPollingPaused);

  return useQuery({
    queryKey: ['teams'],
    queryFn: () => fetch('/api/teams').then((res) => res.json()),
    refetchInterval: isPollingPaused ? false : pollingInterval,
    staleTime: 10000, // 10秒内使用缓存
  });
}
```

---

## 6. Zustand Store 配置

### 6.1 状态定义

```typescript
interface DashboardState {
  // 选择状态
  selectedTeamName: string | null;
  selectedMessageId: string | null;

  // 过滤器
  timeRange: TimeRange;
  messageFilter: MessageFilter;

  // UI 状态
  currentView: ViewType;
  theme: ThemeMode;
  sidebarCollapsed: boolean;

  // 轮询
  pollingInterval: number;  // 5000, 10000, 20000, 30000, 60000
  isPollingPaused: boolean;

  // 操作
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

### 6.2 轮询间隔设置

```typescript
const POLLING_INTERVALS = [
  { label: '5秒', value: 5000 },
  { label: '10秒', value: 10000 },
  { label: '20秒', value: 20000 },
  { label: '30秒（推荐）', value: 30000 },
  { label: '60秒', value: 60000 },
];

const DEFAULT_POLLING_INTERVAL = 30000; // 30秒
```

### 6.3 选择器钩子

| 钩子 | 说明 |
|-------|------|
| useTeamSelection() | 团队选择状态 |
| useMessageSelection() | 消息选择状态 |
| useFilters() | 过滤器状态 |
| useUIState() | UI 状态（主题、侧边栏） |
| usePolling() | 轮询设置 |

---

## 7. 类型定义

### 7.1 Team 类型

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

### 7.2 Task 类型

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

### 7.3 Message / Timeline 类型

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

### 7.4 Agent 类型

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

## 8. 构建配置

### 8.1 Vite 配置

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

### 8.2 Tailwind CSS 配置

```typescript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // 基于类的深色模式
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 自定义颜色等
    },
  },
};
```

### 8.3 开发命令

| 命令 | 说明 |
|---------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建（tsc + vite build） |
| `npm run preview` | 构建预览 |
| `npm run test` | 运行测试 |
| `npm run test:watch` | 监听模式 |
| `npm run test:coverage` | 带覆盖率 |
| `npm run lint` | 运行代码检查 |

---

## 9. 测试配置

### 9.1 测试框架

- **Vitest**: 单元测试（快速，集成 Vite）
- **@testing-library/react**: React 组件测试
- **jsdom**: DOM 环境模拟

### 9.2 测试设置

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';

// 全局模拟
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

// localStorage 模拟
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;
```

### 9.3 测试文件放置

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

### 9.4 运行测试

```bash
# 单元测试
npm run test

# 监听模式
npm run test:watch

# 带覆盖率
npm run test:coverage

# UI 模式
npm run test:ui
```

---

## 10. 深色模式实现

### 10.1 实现方式

- **Tailwind CSS 基于类**: `darkMode: 'class'`
- 通过在 `html` 元素上添加/移除 `dark` 类来切换
- 由 Zustand Store 管理状态，持久化到 localStorage

### 10.2 使用示例

```tsx
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-white">文本</p>
</div>
```

---

## 11. 数据流图

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
│  │  - HTTP 轮询（refetchInterval）                      │   │
│  │  - 自动缓存                                          │   │
│  │  - staleTime: 10秒                                   │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Zustand Store (dashboardStore)          │   │
│  │  - 选择状态（团队、消息）                             │   │
│  │  - 过滤器（时间范围、发送者）                         │   │
│  │  - UI 状态（主题、侧边栏）                            │   │
│  │  - 轮询设置（间隔、暂停）                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼ HTTP 轮询（5s-60s）
                    ┌──────────────┐
                    │   Backend    │
                    │  (FastAPI)   │
                    └──────────────┘
```

---

## 12. 国际化（i18n）

### 12.1 技术栈

| 技术 | 版本 | 用途 |
|------|-----------|------|
| i18next | 24.2.0+ | 国际化框架 |
| react-i18next | 15.4.0+ | React i18n 绑定 |

### 12.2 翻译文件结构

```
frontend/src/locales/
├── ja/                     # 日语
│   ├── common.json         # 通用翻译
│   ├── dashboard.json      # 仪表板
│   ├── tasks.json          # 任务管理
│   ├── timeline.json       # 时间线
│   ├── errors.json         # 错误消息
│   ├── header.json         # 页头
│   ├── a11y.json           # 无障碍
│   ├── models.json         # 模型相关
│   └── teamDetail.json     # 团队详情
├── en/                     # 英语
│   └── ...（同结构）
└── zh/                     # 中文
    └── ...（同结构）
```

### 12.3 语言检测优先级

1. **localStorage**: `i18nextLng` 键中保存的语言设置
2. **浏览器设置**: `navigator.language`
3. **默认**: 日语（`ja`）

### 12.4 使用示例

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

### 12.5 语言切换

可通过页头语言选择器切换：

```tsx
const { i18n } = useTranslation();

// 切换语言
await i18n.changeLanguage('en');
```

### 12.6 翻译键一致性检查

pre-commit 钩子自动运行 `scripts/verify-translations.js`，验证所有语言的翻译键是否一致。

---

*创建日期: 2026-02-16*
*最后更新: 2026-03-04*
*版本: 2.2.0*

---

**语言：** [English](./frontend-tech-stack.en.md) | [日本語](./frontend-tech-stack.md) | [中文](./frontend-tech-stack.zh.md)
