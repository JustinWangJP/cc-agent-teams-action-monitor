# 应用架构设计文档

**语言:** [English](architecture.en.md) | [日本語](architecture.md) | [中文](architecture.zh.md)

## 1. 架构概述

### 1.1 系统全貌

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Agent Teams Dashboard                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Frontend (React)                          │   │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────────────┐   │   │
│  │  │ Components│  │  Hooks    │  │  Types                 │   │   │
│  │  │ - chat/   │  │ useTeams  │  │ - message.ts           │   │   │
│  │  │ - tasks/  │  │ useTasks  │  │ - team.ts              │   │   │
│  │  │ - timeline│  │ useInbox  │  │ - task.ts              │   │   │
│  │  │ - dashboard│ │ useUnified │ │ - timeline.ts         │   │   │
│  │  │ - common/ │  │  Timeline │  │                        │   │   │
│  │  └───────────┘  └───────────┘  └────────────────────────┘   │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │              Zustand Store (dashboardStore)            │   │   │
│  │  │  - 通过 HTTP 轮询定期更新数据                           │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │ HTTP 轮询（实时更新）                                    │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Backend (FastAPI)                         │   │
│  │  ┌───────────┐  ┌────────────────────────────────────────┐   │   │
│  │  │API Routes │  │ Services                               │   │   │
│  │  │ - teams   │  │ - FileWatcherService (缓存失效)        │   │   │
│  │  │ - tasks   │  │ - CacheService (基于TTL的内存缓存)      │   │   │
│  │  │ - messages│  │ - TimelineService (统一时间线)          │   │   │
│  │  │ - agents  │  │ - AgentStatusService (状态推断)         │   │   │
│  │  │ - timeline│  │ - MessageParser (消息解析)              │   │   │
│  │  └───────────┘  └────────────────────────────────────────┘   │   │
│  │  ┌───────────┐  ┌───────────┐                                │   │
│  │  │  Models   │  │  Config   │                                │   │
│  │  │ - team    │  │ Settings  │                                │   │
│  │  │ - task    │  │           │                                │   │
│  │  │ - message │  │           │                                │   │
│  │  │ - timeline│  │           │                                │   │
│  │  │ - agent   │  │           │                                │   │
│  │  └───────────┘  └───────────┘                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ▼ 文件监控（缓存失效 & 日志输出）                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ~/.claude/ 目录结构                                           │   │
│  │  ├── teams/{team_name}/config.json       # 团队配置          │   │
│  │  │   └── inboxes/{agent_name}.json       # 代理收件箱        │   │
│  │  ├── tasks/{team_name}/{task_id}.json    # 任务定义          │   │
│  │  └── projects/{project-hash}/            # 会话日志           │   │
│  │      └── {sessionId}.jsonl               # 会话历史           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 功能与数据源映射表

| 功能 | 读取目标文件 | 说明 |
|------|-------------|------|
| **团队列表** | `~/.claude/teams/{team_name}/config.json` | 团队配置、成员信息 |
| **团队状态判定** | `~/.claude/projects/{project-hash}/{sessionId}.jsonl` | 根据会话日志 mtime 判定 |
| **收件箱** | `~/.claude/teams/{team_name}/inboxes/{agent_name}.json` | 代理专属消息收件箱 |
| **任务** | `~/.claude/tasks/{team_name}/{task_id}.json` | 任务定义、状态 |
| **统一时间线** | 以上全部 + 会话日志 | inbox + 会话日志整合 |
| **代理状态** | 任务 + 收件箱 + 会话日志 | 根据推断逻辑判定 |

### 1.3 分层结构

| 层级 | 组件 | 职责 |
|----------|---------------|------|
| 展示层 | React Components | UI 渲染、用户交互 |
| 状态管理 | Zustand Store (v5.0.2+) | 全局状态管理、轮询控制 |
| 数据获取 | Custom Hooks + TanStack Query (v5.90.21+) | API 通信、服务端状态缓存 |
| 通信 | HTTP 轮询 | 定期数据更新（5秒-60秒） |
| API | FastAPI Routes | 端点处理 |
| 缓存 | CacheService | 内存缓存管理（带 TTL） |
| 文件监控 | FileWatcherService | 文件变更检测、缓存失效 |
| 数据 | Pydantic Models | 数据定义、验证 |
| 存储 | File System | 数据持久化 |

---

## 2. 设计思想

### 2.1 为什么选择 HTTP 轮询 + 缓存失效

**背景与挑战:**
Claude Code 直接更新 `~/.claude/` 下的文件，无法使用外部的 Webhook 或 Push 通知。此外，文件数量增加时，频繁的文件读取会影响性能。

**选择的方案:**
1. 使用 **FileWatcherService** 监控 `~/.claude/`，检测文件变更
2. 检测到变更时**使相应缓存失效**（同时输出日志）
3. 前端通过 **HTTP 轮询** 定期获取最新数据
4. 通过缓存避免重复读取相同数据

**权衡:**
- 实时性不如 WebSocket Push，但轮询间隔（最短 5 秒）保证了足够的更新频率
- 服务器负载增加，但缓存有效减少了实际文件访问

### 2.2 为什么用会话日志的 mtime 判定状态

**背景与挑战:**
为了判定团队的"活跃状态"，之前使用 `config.json` 的 mtime，但有时会在与团队活动无关的时间被更新。

**选择的方案:**
使用会话日志（`{sessionId}.jsonl`）的 mtime：
- **会话日志** 记录了代理的实际活动（思考、工具执行、文件变更）
- 因此，会话日志的更新时间 = 团队的最后活动时间
- 1 小时内有更新 → `active`，超过 1 小时 → `stopped`

**判定流程:**
```
1. members 为空？ → 'inactive'
2. 没有会话日志？ → 'unknown'
3. 会话日志 mtime > 1 小时？ → 'stopped'
4. 其他情况 → 'active'
```

### 2.3 为什么需要统一时间线服务

**背景与挑战:**
代理之间的消息（inbox）和会话日志（活动历史）分别保存在不同位置，没有统一的视图。

**选择的方案:**
通过 `TimelineService` 整合两者：
- **inbox**: 代理之间的任务分配、完成通知、空闲通知
- **会话日志**: 思考过程、工具执行、文件变更
- 返回按时间顺序排序的统一时间线

**扩展性:**
未来添加新数据源（如：外部 API 调用日志）时，只需在 `TimelineService` 中扩展整合逻辑即可。

---

## 3. 前端架构

### 3.1 组件层级

```
App (主程序)
├── Layout
│   ├── Header
│   │   ├── ThemeToggle
│   │   └── PollingIntervalSelector
│   └── children
├── Overview (团队列表) - View Tab
│   ├── TeamCard[]
│   │   ├── ModelBadge
│   │   └── StatusBadge (active/stopped/unknown/inactive)
│   └── TeamDetailPanel
│       └── DeleteTeamButton (仅在 stopped 时显示)
├── Timeline (统一时间线) - View Tab
│   ├── TimelineTaskSplitLayout
│   │   ├── ChatTimelinePanel (左侧)
│   │   │   ├── ChatHeader
│   │   │   │   ├── ChatSearch
│   │   │   │   └── SenderFilter
│   │   │   ├── ChatMessageList
│   │   │   │   ├── DateSeparator
│   │   │   │   └── ChatMessageBubble
│   │   │   │       ├── BookmarkButton
│   │   │   │       ├── AgentStatusIndicator
│   │   │   │       └── MarkdownRenderer
│   │   │   └── TypingIndicator
│   │   └── TaskMonitorPanel (右侧、可折叠)
│   │       └── TaskCard[]
│   └── MessageDetailModal
└── Tasks (任务列表) - View Tab (看板形式)
    ├── TaskFilter (团队筛选 + 搜索)
    └── TaskCard[] (Pending / In Progress / Completed 列)
```

### 3.2 状态管理模式

- **全局状态**: Zustand Store (dashboardStore)
  - 团队选择、消息选择、任务选择、过滤器、UI 状态、轮询设置
  - 持久化到本地存储（暗黑模式、轮询间隔等）
- **服务端状态**: 自定义 Hooks + HTTP 轮询
  - `useTeams`, `useTasks`, `useInbox`, `useUnifiedTimeline`, `useAgentMessages`
- **本地状态**: useState（组件内）

### 3.3 数据流

```
用户操作 → 组件 → Store/Hook → HTTP API → 后端
                                            ↓
组件 ← Store/Hook ← 状态更新 ← 响应 ←────────┘
                ↑
                └── 轮询定时器定期更新
```

### 3.4 Zustand Store 结构

```typescript
interface DashboardState {
  // 选择状态
  selectedTeam: string | null;
  selectedMessage: ParsedMessage | null;
  selectedTask: Task | null;
  currentView: ViewType;  // 'overview' | 'timeline' | 'tasks' | 'files'

  // 过滤器
  timeRange: TimeRange;
  messageFilter: MessageFilter;
  searchQuery: string;

  // 轮询间隔（各数据源可单独配置）
  teamsInterval: number;      // 团队列表（默认 30 秒）
  tasksInterval: number;      // 任务列表（默认 30 秒）
  inboxInterval: number;      // 收件箱（默认 30 秒）
  messagesInterval: number;   // 代理消息（默认 30 秒）

  // UI 状态
  isDetailModalOpen: boolean;
  isTaskModalOpen: boolean;
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  autoScrollTimeline: boolean;
  isTaskPanelCollapsed: boolean;
}
```

---

## 4. 后端架构

### 4.1 分层结构

```
┌─────────────────────────────────────────┐
│              API 层                      │
│  (FastAPI Routes: teams, tasks,         │
│   messages, agents, timeline)           │
├─────────────────────────────────────────┤
│              服务层                      │
│  - FileWatcherService (监控 & 失效)     │
│  - CacheService (TTL 缓存)               │
│  - TimelineService (统一时间线)          │
│  - AgentStatusService (状态推断)         │
│  - MessageParser (消息解析)              │
├─────────────────────────────────────────┤
│              模型层                      │
│  (Pydantic: Team, Task, Message,        │
│   Timeline, Agent, Chat)                │
├─────────────────────────────────────────┤
│              存储层                      │
│  (文件系统: ~/.claude/)                 │
│  - teams/*/config.json                  │
│  - teams/*/inboxes/*.json               │
│  - tasks/*/*.json                       │
│  - projects/{hash}/*.jsonl              │
└─────────────────────────────────────────┘
```

### 4.2 路由设计

| 路径 | 方法 | 处理器 | 用途 |
|------|---------|----------|------|
| /api/health | GET | health_check | 健康检查 |
| /api/teams | GET | list_teams | 团队列表（含状态） |
| /api/teams/{name} | GET | get_team | 团队详情 |
| /api/teams/{name} | DELETE | delete_team | 删除团队（仅 stopped） |
| /api/teams/{name}/inboxes | GET | get_team_inboxes | 收件箱列表 |
| /api/teams/{name}/inboxes/{agent} | GET | get_agent_inbox | 代理专属收件箱 |
| /api/teams/{name}/messages/timeline | GET | get_team_messages_timeline | 统一时间线 |
| /api/tasks | GET | list_tasks | 任务列表 |
| /api/tasks/{team}/{task_id} | GET | get_task | 任务详情 |
| /api/agents | GET | list_agents | 代理列表 |
| /api/timeline/{team_name}/history | GET | get_history | 统一历史 |
| /api/timeline/{team_name}/updates | GET | get_updates | 差异更新 |
| /api/file-changes/{team} | GET | get_file_changes | 文件变更列表 |

### 4.3 服务结构

#### CacheService
- **职责**: 通过内存缓存减少文件访问
- **TTL**: 团队配置 30 秒、收件箱 60 秒
- **功能**: 自动过期、手动失效、统计信息
- **失效触发**: 来自 FileWatcherService 的文件变更通知

#### FileWatcherService
- **职责**: 监控 `~/.claude/` 目录的变更
- **主要目的**: **缓存失效 + 日志输出**（UI 更新通过 HTTP 轮询）
- **防抖**: 500 毫秒
- **检测模式**:
  - `teams/*/config.json` → 缓存失效 + 日志输出
  - `teams/*/inboxes/*.json` → 缓存失效 + 日志输出
  - `tasks/*/*.json` → 仅日志输出

#### TimelineService
- **职责**: 整合 inbox + 会话日志
- **输入**:
  - `teams/{name}/inboxes/{agent}.json`
  - `projects/{hash}/{sessionId}.jsonl`
- **输出**: 按时间排序的统一时间线

#### AgentStatusService
- **职责**: 推断代理状态
- **输入**: 任务定义、收件箱、会话日志
- **推断逻辑**:
  - `idle`: 5 分钟以上无活动
  - `working`: 有 in_progress 任务
  - `waiting`: 有 blocked 任务
  - `error`: 30 分钟以上无活动
  - `completed`: 所有任务完成

#### MessageParser
- **职责**: 解析和分类消息
- **支持类型**: message, task_assignment, task_completed, idle_notification 等

### 4.4 团队删除 API

**端点**: `DELETE /api/teams/{team_name}`

**可删除的状态**: `stopped`, `inactive`, `unknown`

**删除目标**:
1. 整个 `teams/{team_name}/` 目录
2. 整个 `tasks/{team_name}/` 目录
3. 仅会话文件（`projects/{hash}/{session}.jsonl`）
   - 项目目录本身保留（可能属于其他团队）

**错误响应**:
- `404 Not Found`: 团队不存在
- `400 Bad Request`: 状态为 `active`（不可删除）

### 4.5 中间件结构

| 中间件 | 用途 |
|-------------|------|
| CORSMiddleware | 跨域许可 |
| Lifespan | 启动/关闭处理（FileWatcher, CacheService） |

---

## 5. 通信协议

### 5.1 REST API

- **格式**: JSON
- **方法**: GET, DELETE（仅读取 + 团队删除）
- **错误**: HTTP 状态码 + detail 消息

### 5.2 HTTP 轮询（实时更新）

前端通过以下 Hooks 定期更新数据：

| Hook | API | 默认间隔 |
|--------|-----|--------------|
| useTeams | GET /api/teams | 30 秒 |
| useTasks | GET /api/tasks | 30 秒 |
| useInbox | GET /api/teams/{name}/inboxes | 30 秒 |
| useUnifiedTimeline | GET /api/timeline/{team_name}/history | 30 秒 |

**差异更新**: `/api/timeline/{team_name}/updates?since={timestamp}` 仅获取自上次请求以来的变更

---

## 6. 模块依赖关系

### 6.1 后端依赖图

```
main.py
├── config.py (Settings)
├── api/routes/
│   ├── teams.py
│   │   ├── models/team.py
│   │   ├── services/cache_service.py
│   │   ├── services/timeline_service.py
│   │   └── config.py
│   ├── tasks.py
│   │   ├── models/task.py
│   │   └── config.py
│   ├── messages.py
│   │   ├── models/message.py
│   │   ├── models/timeline.py
│   │   └── config.py
│   ├── timeline.py
│   │   ├── services/timeline_service.py
│   │   ├── services/agent_status_service.py
│   │   └── models/timeline.py
│   └── agents.py
│       └── models/agent.py
├── models/
│   ├── team.py
│   ├── task.py
│   ├── message.py
│   ├── timeline.py
│   ├── agent.py
│   ├── chat.py
│   └── model.py
└── services/
    ├── cache_service.py
    │   └── config.py
    ├── file_watcher.py
    │   ├── config.py
    │   └── services/cache_service.py
    ├── timeline_service.py
    │   ├── config.py
    │   └── models/timeline.py
    ├── agent_status_service.py
    │   ├── models/agent.py
    │   └── models/task.py
    └── message_parser.py
        └── models/message.py
```

### 6.2 前端依赖图

```
App.tsx
├── stores/dashboardStore.ts (Zustand)
├── hooks/
│   ├── useTeams.ts
│   ├── useTasks.ts
│   ├── useInbox.ts
│   ├── useAgentMessages.ts
│   └── useUnifiedTimeline.ts
├── components/
│   ├── layout/
│   │   ├── Layout.tsx
│   │   └── Header.tsx
│   ├── dashboard/
│   │   ├── TeamCard.tsx (包含 StatusBadge)
│   │   ├── TeamDetailPanel.tsx
│   │   └── ActivityFeed.tsx
│   ├── overview/
│   │   ├── TeamCard.tsx
│   │   └── ModelBadge.tsx
│   ├── tasks/
│   │   ├── TaskCard.tsx
│   │   ├── ExpandedTaskCard.tsx
│   │   └── TaskMonitorPanel.tsx
│   ├── timeline/
│   │   ├── TimelinePanel.tsx
│   │   ├── TimelineTaskSplitLayout.tsx
│   │   ├── TimelineFilters.tsx
│   │   ├── MessageTimeline.tsx
│   │   └── MessageDetailModal.tsx
│   ├── chat/
│   │   ├── ChatMessageBubble.tsx
│   │   ├── ChatTimelinePanel.tsx
│   │   ├── ChatHeader.tsx
│   │   ├── ChatMessageList.tsx
│   │   ├── DateSeparator.tsx
│   │   ├── SenderFilter.tsx
│   │   ├── MessageTypeFilter.tsx
│   │   ├── ChatSearch.tsx
│   │   ├── MessageDetailPanel.tsx
│   │   ├── BookmarkButton.tsx
│   │   ├── AgentStatusIndicator.tsx
│   │   └── TypingIndicator.tsx
│   ├── agent/
│   │   └── ExpandedAgentCard.tsx
│   └── common/
│       ├── StatusBadge.tsx
│       ├── PollingIntervalSelector.tsx
│       ├── LoadingSpinner.tsx
│       ├── ErrorDisplay.tsx
│       └── ThemeToggle.tsx
├── types/
│   ├── team.ts
│   ├── task.ts
│   ├── message.ts
│   ├── timeline.ts
│   ├── agent.ts
│   ├── model.ts
│   ├── theme.ts
│   └── css.d.ts
├── config/
│   └── models.ts
├── utils/
│   └── teamModels.ts
└── lib/
    ├── queryClient.ts
    └── utils.ts
```

---

## 7. 部署配置

### 7.1 开发环境

```
┌──────────────────┐     ┌──────────────────┐
│  Frontend (Vite) │     │ Backend (Uvicorn)│
│  Port: 5173      │────▶│ Port: 8000       │
│  Hot Reload      │     │ Auto Reload      │
└──────────────────┘     └──────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌──────────────────┐
         │   ~/.claude/     │
         │   (文件系统)      │
         │   - teams/       │
         │   - tasks/       │
         │   - projects/    │
         └──────────────────┘
```

### 7.2 生产环境（计划）

```
┌──────────────────────────────────────────────┐
│                反向代理                       │
│                (nginx / Caddy)               │
└──────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  Frontend        │  │ Backend          │
│  (静态文件)       │  │ (Uvicorn/Gunicorn)│
│  构建输出         │  │ 多进程           │
└──────────────────┘  └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   ~/.claude/     │
                    │   - teams/       │
                    │   - tasks/       │
                    │   - projects/    │
                    └──────────────────┘
```

### 7.3 基础设施要求

| 项目 | 要求 |
|------|------|
| Python | 3.11+ |
| Node.js | 18+ |
| 内存 | 最小 512MB |
| 磁盘 | 可访问 ~/.claude/ |

---

## 8. 安全设计

### 8.1 当前实现

| 项目 | 状态 |
|------|------|
| CORS | 源限制 |
| 输入验证 | Pydantic 验证 |
| 错误处理 | HTTP 异常处理 |
| 删除保护 | 阻止删除活跃团队 |

### 8.2 未来扩展

| 项目 | 计划 |
|------|------|
| 认证 | API Key / OAuth |
| 授权 | 基于角色的访问控制 |
| 加密 | HTTPS / WSS |
| 日志 | 审计日志 |

---

## 9. 扩展性

### 9.1 扩展点

| 层级 | 扩展点 |
|----------|-------------|
| Frontend | 添加新组件、添加新视图 |
| Store | 添加新状态切片 |
| API | 添加新端点 |
| Service | 整合新数据源（扩展 TimelineService） |
| Cache | 添加新缓存类型 |

### 9.2 设计原则

- **单一职责**: 每个模块只负责单一职责
- **依赖注入**: 配置从环境变量注入
- **接口隔离**: 清晰的模块边界
- **关注点分离**: UI、状态管理、数据获取分离
- **YAGNI**: 仅实现必要功能，避免过度抽象

---

*创建日期: 2026-02-16*
*最后更新: 2026-02-24*
*版本: 2.1.0*
