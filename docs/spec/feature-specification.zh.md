# Agent Teams 仪表盘功能规格说明书

[日本語](feature-specification.md) | [English](feature-specification.en.md) | [中文](feature-specification.zh.md)

## 1. 概述

### 1.1 目的

一个用于实时监控和管理 Claude Code Agent Teams 功能的 Web 仪表盘。
监控 `~/.claude/` 目录中的 JSON 文件，可视化团队配置、任务进度和代理间通信。

### 1.2 已验证的事实

本规格说明书基于以下验证结果：

```
~/.claude/
├── teams/{team_name}/
│   ├── config.json          # 团队配置、成员定义、模型信息
│   └── inboxes/
│       └── {agent_name}.json # 每个代理的消息收件箱（JSON 数组）
├── tasks/{team_name}/
│   └── {task_id}.json       # 任务定义和状态
└── projects/{project-hash}/
    └── {sessionId}.jsonl    # 会话日志（用户交互、工具使用等）
```

**消息格式**：
- 普通消息：`text` 字段包含纯文本
- 协议消息：`text` 字段包含 JSON-in-JSON（`idle_notification`、`shutdown_request` 等）

### 1.3 参考资源

- [sinjorjob/claude-code-agent-teams-dashboard](https://github.com/sinjorjob/claude-code-agent-teams-dashboard) - 终端实现
- [Claude Code Agent Teams 官方指南](https://claudefa.st/blog/guide/agents/agent-teams)

### 1.4 设计理念

#### 为什么选择 HTTP 轮询 + 缓存失效

由于 Claude Code 直接更新文件，无法从服务器推送通知。因此采用两层结构：

1. **FileWatcherService**：检测文件变化并使缓存失效
2. **HTTP 轮询**：前端定期获取数据

| 方式 | 优点 | 缺点 |
|------|------|------|
| HTTP 轮询（已采用） | 简单，与 Claude Code 兼容性好 | 实时性较差 |
| WebSocket 推送 | 高实时性 | 无法接收来自 Claude Code 的通知 |

轮询间隔可从 **5 秒到 60 秒** 中选择（默认：30 秒）。

#### 为什么使用会话日志 mtime 判断团队状态

为了准确反映团队活动，使用**会话日志的最后修改时间（mtime）**：

- `config.json` 的 mtime 可能在不同时间更新
- 会话日志是团队活动的真实指标

#### 数据源对应表

| 功能 | 监控/读取来源 | 说明 |
|------|--------------|------|
| **团队列表** | `~/.claude/teams/{team_name}/config.json` | 团队设置、成员信息 |
| **团队状态判定** | `~/.claude/projects/{project-hash}/{sessionId}.jsonl` | 基于会话日志 mtime |
| **收件箱** | `~/.claude/teams/{team_name}/inboxes/{agent_name}.json` | 每个代理的消息收件箱 |
| **任务** | `~/.claude/tasks/{team_name}/{task_id}.json` | 任务定义和状态 |
| **统一时间线** | 以上所有 + 会话日志 | 收件箱 + 会话日志集成 |

---

## 2. 设计方法

### 2.1 设计方法：完全重新设计

在现有实现的基础上，重新设计为专注于可视化的方案。

**原因**：
- 重新审视组件结构以最大化交互性
- 通过 D3.js / vis-timeline 实现丰富的可视化
- 一致的用户体验设计

### 2.2 技术选型：混合配置

| 用途 | 库 | 原因 |
|------|-----|------|
| 时间线可视化 | **vis-timeline** | 内置时间范围选择、缩放、拖拽 |
| 网络图 | **D3.js** | 代理通信可视化的高灵活性 |
| 任务依赖图 | **D3.js** | DAG 绘制的灵活性 |
| UI 组件 | **Radix UI** | 符合无障碍标准 |
| 状态管理 | **Zustand** | 轻量简单 |
| 动画 | **Framer Motion** | 丰富的过渡效果 |

---

## 3. 功能列表

### 3.1 核心功能（现有）

| 类别 | 功能 | 优先级 | 状态 |
|------|------|--------|------|
| 团队监控 | 团队列表显示 | **P0** | ✅ 已完成 |
| 团队监控 | 团队详情显示 | **P0** | ✅ 已完成 |
| 团队监控 | 团队状态判定 | **P0** | ✅ 基于会话日志 mtime |
| 团队监控 | 团队删除 | **P0** | ✅ 仅 stopped 状态可删除 |
| 任务管理 | 任务列表显示 | **P0** | ✅ 已完成 |
| 任务管理 | 依赖关系可视化 | **P1** | ✅ D3.js 实现完成 |
| 通信监控 | 收件箱显示 | **P0** | ✅ 时间线实现完成 |
| 通信监控 | 统一时间线 | **P0** | ✅ 收件箱 + 会话日志集成 |
| 代理 | 代理状态推断 | **P0** | ✅ idle/working/waiting/error/completed |
| 实时 | HTTP 轮询更新 | **P0** | ✅ 可配置 5s-60s |

### 3.2 新功能

| 类别 | 功能 | 优先级 | 状态 | 说明 |
|------|------|--------|------|------|
| **模型可视化** | 按团队显示模型 | **P0** | ✅ 已完成 | 团队卡片上的模型徽章 |
| **模型可视化** | 模型特定颜色图标 | **P0** | ✅ 已完成 | 每个模型独特的颜色和图标 |
| **消息可视化** | 时间线显示 | **P0** | ✅ 已完成 | vis-timeline 按时间顺序显示 |
| **消息可视化** | 详情展开模态框 | **P0** | ✅ 已完成 | 点击查看完整消息 |
| **消息可视化** | 时间范围选择 | **P0** | ✅ 已完成 | 滑块过滤特定时间范围 |
| **消息可视化** | 过滤功能 | **P1** | ✅ 已完成 | 按发送者/接收者/类型过滤 |
| **消息可视化** | 搜索功能 | **P1** | ✅ 已完成 | 消息正文关键词搜索 |
| **图表可视化** | 任务依赖图 | **P1** | ✅ 已完成 | D3.js DAG 显示 |
| **图表可视化** | 代理通信网络 | **P2** | ✅ 已完成 | D3.js 通信关系图 |
| **UI/UX** | 暗色模式 | **P1** | ✅ 已完成 | 主题切换 |
| **UI/UX** | 实时指示器 | **P1** | ✅ 已完成 | Live 徽章、连接状态显示 |

---

## 4. UI/UX 设计

### 4.1 布局结构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🤖 Agent Teams 仪表盘              🔴 实时    🌙 暗色    ⚙ 设置            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │    📊 概览面板               │  │    💬 消息时间线                  │  │
│  │    (团队 + 模型)             │  │    (vis-timeline)                 │  │
│  │                              │  │                                    │  │
│  │    ┌──────────────────────┐  │  │    ▲ 17:05:45                     │  │
│  │    │ dashboard-dev-v2     │  │  │    │ architect ──▶ team-lead      │  │
│  │    │ 🟣 Opus×5 🟡 Kimi×2  │  │  │    │ 💬 "API 设计完成..."        │  │
│  │    │ 👥 7 成员              │  │  │    │    [点击查看详情]           │  │
│  │    │ 📋 12 任务             │  │  │    │                              │  │
│  │    └──────────────────────┘  │  │    ├ 17:04:30                     │  │
│  │    ┌──────────────────────┐  │  │    │ python-eng ──▶ team-lead    │  │
│  │    │ docs-team            │  │  │    │ 🟡 idle_notification        │  │
│  │    │ 🟣 Opus×3            │  │  │    │                              │  │
│  │    │ 👥 3 成员              │  │  │    ▼ 16:42:44                     │  │
│  │    │ 📋 5 任务              │  │  │    ────── ⏱ 时间范围 ──────     │  │
│  │    └──────────────────────┘  │  │    [==========●===========]       │  │
│  │                              │  │                                    │  │
│  │    [🔍 搜索...]              │  │    🔍 [搜索消息...]                │  │
│  └──────────────────────────────┘  │    🔽 过滤: [全部 ▼] [全部类型 ▼]  │  │
│                                    └────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │    📋 任务依赖关系 (D3.js)                                          │   │
│  │    [1]──▶[2]──▶[3]──▶[4]                    📊 统计 │ 🕐 活动       │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 响应式断点

| 断点 | 宽度 | 布局 |
|------|------|------|
| 移动端 | < 640px | 1 列（概览 → 时间线 → 任务） |
| 平板 | 640-1024px | 2 列（概览 + 时间线） |
| 桌面 | > 1024px | 3 面板结构 |

### 4.3 颜色系统

```css
/* 主题颜色 */
--color-primary: #3B82F6;      /* blue-500 */
--color-secondary: #8B5CF6;    /* violet-500 */
--color-accent: #F59E0B;       /* amber-500 */

/* 状态颜色 */
--color-active: #10B981;       /* green-500 */
--color-idle: #F59E0B;         /* amber-500 */
--color-pending: #6B7280;      /* gray-500 */
--color-progress: #3B82F6;     /* blue-500 */
--color-completed: #10B981;    /* green-500 */
--color-error: #EF4444;        /* red-500 */

/* 模型特定颜色 */
--model-opus: #8B5CF6;         /* violet-500 */
--model-sonnet: #3B82F6;       /* blue-500 */
--model-haiku: #10B981;        /* green-500 */
--model-kimi: #F59E0B;         /* amber-500 */
--model-glm: #EF4444;          /* red-500 */

/* 暗色模式 */
--bg-dark: #0F172A;            /* slate-900 */
--bg-dark-card: #1E293B;       /* slate-800 */
--text-dark-primary: #F1F5F9;  /* slate-100 */
--text-dark-secondary: #94A3B8; /* slate-400 */
```

### 4.4 动画规格

| 类型 | 动画 | 持续时间 | 缓动 |
|------|------|----------|------|
| 卡片选择 | 缩放 + 阴影 | 150ms | ease-out |
| 状态更改 | 淡入 + 颜色 | 300ms | ease-in-out |
| 新消息 | 从顶部滑入 | 250ms | spring |
| 模态框展开 | 缩放 + 淡入 | 200ms | ease-out |
| 时间线缩放 | 平滑滚动 | 400ms | ease-in-out |

---

## 5. 详细功能设计

### 5.1 模型可视化功能

#### 5.1.1 ModelBadge 组件

**目的**：提供视觉徽章以唯一标识每个 AI 模型

**模型配置定义**：
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
    label: '未知',
    provider: 'other'
  }
};
```

#### 5.1.2 TeamCard 模型显示

**显示内容**：
```
┌────────────────────────────────────┐
│  dashboard-dev-v2                  │
│  ────────────────────────────────  │
│  🟣 Opus 4.6 × 5  🟡 Kimi K2.5 × 2 │
│  ────────────────────────────────  │
│  👥 7 成员       📋 12 任务         │
│  🟢 活跃中                          │
└────────────────────────────────────┘
```

**数据结构**：
```typescript
interface TeamModels {
  teamName: string;
  models: {
    config: ModelConfig;
    count: number;
    agents: string[];  // 使用此模型的代理名称
  }[];
}

// 计算逻辑
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

### 5.2 消息时间线功能

#### 5.2.1 时间线显示规格

**vis-timeline 配置**：
```typescript
const timelineOptions: TimelineOptions = {
  // 基本设置
  orientation: { axis: 'top', item: 'top' },
  verticalScroll: true,
  horizontalScroll: true,

  // 缩放设置
  zoomMin: 1000 * 60 * 1,      // 最小：1 分钟
  zoomMax: 1000 * 60 * 60 * 24, // 最大：24 小时

  // 交互
  editable: false,
  selectable: true,

  // 样式
  margin: { item: { horizontal: 10, vertical: 5 } },
  format: {
    minorLabels: { minute: 'HH:mm', hour: 'HH:mm' },
    majorLabels: { hour: 'YYYY-MM-DD HH:mm' }
  }
};
```

**消息项目格式**：
```typescript
interface TimelineItem {
  id: string;
  content: string;           // 显示文本（缩短版）
  start: Date;               // 时间戳
  type: 'box' | 'point';
  className: string;         // 样式类（message, idle 等）
  group: string;             // 按发送者分组
  data: ParsedMessage;       // 原始消息数据
}
```

#### 5.2.2 详情展开模态框（P0）

**触发**：点击时间线项目

**模态框内容**：
```
┌─────────────────────────────────────────────────────┐
│  消息详情                                     [×]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  发送者: architect              接收者: team-lead   │
│  时间: 2026-02-16 17:05:45                          │
│  类型: 💬 消息                                       │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  API 设计已完成。                           │   │
│  │                                             │   │
│  │  更改内容：                                  │   │
│  │  - 端点结构审查                             │   │
│  │  - 响应格式统一                             │   │
│  │  - 添加错误处理                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  元数据：                                            │
│  - 颜色：蓝色                                       │
│  - 已读：是                                         │
│                                                     │
│                              [复制] [关闭]          │
└─────────────────────────────────────────────────────┘
```

**实现**：
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
        消息详情
        <CloseButton onClick={onClose}>×</CloseButton>
      </ModalHeader>
      <ModalBody>
        <MetaInfo>
          <MetaItem label="发送者" value={message.raw.from} />
          <MetaItem label="时间" value={formatTimestamp(message.raw.timestamp)} />
          <MetaItem label="类型" value={message.parsedType} icon={getTypeIcon(message.parsedType)} />
        </MetaInfo>
        <MessageContent>
          {message.parsedType === 'message'
            ? message.raw.text
            : JSON.stringify(message.parsedData, null, 2)}
        </MessageContent>
        <Metadata>
          <MetaItem label="颜色" value={message.raw.color} />
          <MetaItem label="已读" value={message.raw.read ? '是' : '否'} />
        </Metadata>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={() => copyToClipboard(message.raw.text)}>
          复制
        </Button>
        <Button variant="primary" onClick={onClose}>
          关闭
        </Button>
      </ModalFooter>
    </Modal>
  );
};
```

#### 5.2.3 时间范围选择（P0）

**UI 组件**：
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
        <Button onClick={() => setLastMinutes(5)}>5分钟</Button>
        <Button onClick={() => setLastMinutes(15)}>15分钟</Button>
        <Button onClick={() => setLastMinutes(60)}>1小时</Button>
        <Button onClick={() => setAllRange()}>全部</Button>
      </QuickRangeButtons>
    </TimeRangeContainer>
  );
};
```

#### 5.2.4 过滤功能（P1）

**过滤条件**：
```typescript
interface MessageFilter {
  senders: string[];        // 按发送者过滤
  receivers: string[];      // 按接收者过滤
  types: MessageType[];     // 按消息类型过滤
  unreadOnly: boolean;      // 仅未读
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
        label="发送者"
        options={availableSenders.map(s => ({ value: s, label: s }))}
        value={filter.senders}
        onChange={(senders) => onChange({ ...filter, senders })}
        isMulti
      />
      <Select
        label="类型"
        options={availableTypes.map(t => ({ value: t, label: getTypeLabel(t) }))}
        value={filter.types}
        onChange={(types) => onChange({ ...filter, types })}
        isMulti
      />
      <Checkbox
        label="仅未读"
        checked={filter.unreadOnly}
        onChange={(unreadOnly) => onChange({ ...filter, unreadOnly })}
      />
    </FiltersContainer>
  );
};
```

#### 5.2.5 搜索功能（P1）

**搜索实现**：
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
        placeholder="搜索消息..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      {query && (
        <ClearButton onClick={() => onQueryChange('')}>×</ClearButton>
      )}
      {searchResults > 0 && (
        <ResultCount>{searchResults} 条结果</ResultCount>
      )}
    </SearchContainer>
  );
};

// 搜索过滤函数
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

### 5.3 任务依赖图功能

#### 5.3.1 D3.js 图规格

**节点定义**：
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

**图配置**：
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

// D3.js 力导向模拟
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

**显示示例**：
```
         ┌─────────┐
         │ 任务 1   │
         │ ✅ 已完成 │
         └────┬────┘
              │
              ▼
         ┌─────────┐
         │ 任务 2   │
         │ ✅ 已完成 │
         └────┬────┘
              │
        ┌─────┴─────┐
        ▼           ▼
   ┌─────────┐ ┌─────────┐
   │ 任务 3   │ │ 任务 4   │
   │ 🔄 进行中│ │ ⏳ 待定  │
   │          │ │         │
   └────┬────┘ └────┬────┘
        │           │
        └─────┬─────┘
              ▼
         ┌─────────┐
         │ 任务 5   │
         │ ⏳ 待定  │
         └─────────┘
```

### 5.4 暗色模式功能

#### 5.4.1 主题定义

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
    // ... 其他
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

#### 5.4.2 主题切换

```typescript
// Zustand 存储
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

// ThemeToggle 组件
const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <ToggleButton onClick={toggleTheme} aria-label="切换主题">
      {theme === 'light' ? '🌙' : '☀️'}
    </ToggleButton>
  );
};
```

---

## 6. 组件设计

### 6.1 目录结构

```
src/components/
├── layout/
│   ├── DashboardLayout.tsx      # 新布局（3 面板结构）
│   ├── Header.tsx               # 更新（添加暗色模式切换）
│   └── Sidebar.tsx              # 新增（导航）
│
├── overview/                    # 新目录
│   ├── OverviewPanel.tsx        # 团队列表面板
│   ├── TeamCard.tsx             # 重新设计（带模型徽章）
│   └── ModelBadge.tsx           # 新增（模型特定颜色图标）
│
├── timeline/                    # 新目录
│   ├── MessageTimeline.tsx      # vis-timeline 包装器
│   ├── TimelineFilters.tsx      # 过滤和搜索 UI
│   ├── TimeRangeSlider.tsx      # 时间范围选择
│   └── MessageDetailModal.tsx   # 详情展开模态框
│
├── graph/                       # 新目录
│   ├── TaskDependencyGraph.tsx  # D3.js 任务依赖图
│   └── AgentNetworkGraph.tsx    # D3.js 代理通信网络
│
├── stats/                       # 新目录
│   ├── StatsPanel.tsx           # 统计摘要
│   └── ActivityFeed.tsx         # 重新设计
│
└── common/
    ├── StatusIndicator.tsx      # 实时状态指示器
    ├── SearchInput.tsx          # 新增
    ├── ThemeToggle.tsx          # 新增（暗色模式）
    └── Modal.tsx                # 新增（Radix UI Dialog）
```

### 6.2 状态管理设计（Zustand）

```typescript
// stores/dashboardStore.ts
interface DashboardState {
  // 选择状态
  selectedTeam: string | null;
  selectedMessage: ParsedMessage | null;

  // 过滤器
  timeRange: { start: Date; end: Date };
  messageFilter: MessageFilter;
  searchQuery: string;

  // UI 状态
  isDetailModalOpen: boolean;
  isDarkMode: boolean;

  // 操作
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

## 7. API 设计

### 7.1 REST API 更新

| 端点 | 方法 | 说明 | 更改 |
|------|------|------|------|
| `GET /api/teams` | GET | 团队列表 | 添加模型信息 |
| `GET /api/teams/{name}` | GET | 团队详情 | 添加模型信息 |
| `GET /api/teams/{name}/messages` | GET | 消息列表 | **新增** |
| `GET /api/teams/{name}/messages/timeline` | GET | 时间线专用 | **新增** |
| `GET /api/teams/{name}/stats` | GET | 团队统计 | **新增** |
| `GET /api/models` | GET | 模型列表 | **新增** |

### 7.2 新增 API：消息时间线

```python
@router.get("/teams/{team_name}/messages/timeline")
async def get_message_timeline(
    team_name: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    senders: Optional[str] = None,      # 逗号分隔
    types: Optional[str] = None,        # 逗号分隔
    search: Optional[str] = None,
    unread_only: bool = False
):
    """获取时间线显示的消息"""

    # 应用过滤器
    messages = await filter_messages(
        team_name=team_name,
        start_time=start_time,
        end_time=end_time,
        senders=senders.split(',') if senders else None,
        types=types.split(',') if types else None,
        search=search,
        unread_only=unread_only
    )

    # 转换为时间线项目格式
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

### 7.3 新增 API：模型列表

```python
@router.get("/models")
async def get_available_models():
    """获取可用模型列表和配置"""
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

## 8. 数据模型

### 8.1 Team 模型（扩展）

```typescript
interface Team {
  name: string;
  description?: string;
  createdAt: number;
  leadAgentId: string;
  leadSessionId: string;
  members: Member[];
  // 计算值
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
  primaryModel: string;  // 使用最多的模型
}
```

### 8.2 Message 模型（扩展）

```typescript
interface Message {
  from: string;
  to?: string;            // 接收者（推断）
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

### 8.3 TimelineItem 模型（新增）

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

## 9. 技术栈

### 9.1 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.11+ | 主语言 |
| FastAPI | 0.109+ | Web 框架 |
| Pydantic | 2.5+ | 数据验证 |
| watchdog | 4.0+ | 文件监控 |

### 9.2 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2+ | UI 库 |
| TypeScript | 5.3+ | 类型安全 |
| Vite | 5.0+ | 构建工具 |
| Tailwind CSS | 3.4+ | 样式 |
| **vis-timeline** | 7.x | 时间线可视化 |
| **D3.js** | 7.x | 网络/依赖图 |
| **Radix UI** | 1.x | 无障碍组件 |
| **Zustand** | 5.x | 状态管理 |
| **Framer Motion** | 11.x | 动画 |

---

## 10. 限制

### 10.1 Agent Teams 规范导致的限制

| 限制 | 影响 | 应对措施 |
|------|------|----------|
| 会话结束时删除数据 | 无法保留历史 | 仅用于实时监控 |
| 文件锁定机制薄弱 | 可能冲突 | 只读操作 |
| 任务间通信仅在回合间 | 实时性 | HTTP 轮询补充 |
| Claude Code 直接更新文件 | 无法推送通知 | HTTP 轮询 + 缓存失效 |

### 10.2 仪表盘限制

| 限制 | 说明 |
|------|------|
| 团队删除限制 | 仅 stopped、inactive、unknown 状态可删除 |
| 仅本地 | 不支持远程监控 |
| 依赖会话日志 | 团队状态判定依赖于会话日志 mtime |

---

## 10.5 会话日志集成规格

### 会话日志位置

```
~/.claude/projects/{project-hash}/{sessionId}.jsonl
```

- **project-hash**：从 cwd（工作目录）生成（前缀 `-`，`/` 替换为 `-`）
- **sessionId**：从团队配置（`config.json`）的 `leadSessionId` 获取

### 会话日志条目类型

| 类型 | 内容 | 显示图标 |
|------|------|----------|
| `user_message` | 用户输入 | 👤 |
| `assistant_message` | 助手响应 | 🤖 |
| `thinking` | 思考过程 | 💭 |
| `tool_use` | 工具调用 | 🔧 |
| `file_change` | 文件更改 | 📁 |

### 统一时间线

**TimelineService** 集成两个数据源：

1. **收件箱消息**：代理间通信
2. **会话日志**：用户交互、工具使用

---

## 10.6 团队状态判定规格

### 判定逻辑

```
1. members 数组为空 → inactive
2. 无会话日志 → unknown
3. 会话日志 mtime > 1 小时 → stopped
4. 会话日志 mtime ≤ 1 小时 → active
```

### 状态列表

| 状态 | 判定条件 | 删除按钮 | 显示颜色 |
|------|----------|----------|----------|
| **active** | 会话日志 mtime ≤ 1 小时 | 隐藏 | 🟢 绿色 |
| **stopped** | 会话日志 mtime > 1 小时 | **可见** | 🟡 黄色 |
| **unknown** | 无会话日志 | 隐藏 | ⚪ 白色 |
| **inactive** | 无成员 | 隐藏 | ⚫ 黑色 |

---

## 10.7 代理状态推断规格

### 推断逻辑

| 状态 | 判定条件 | 显示 |
|------|----------|------|
| `idle` | 5 分钟以上无活动 | 💤 空闲 |
| `working` | 有 in_progress 任务 | 🔵 工作中 |
| `waiting` | 有被阻塞的任务 | ⏳ 等待中 |
| `error` | 30 分钟以上无活动 | ❌ 错误 |
| `completed` | 所有任务已完成 | ✅ 已完成 |

### 使用的数据

- 收件箱消息（task_assignment、task_completed 等）
- 任务定义（owner、status、blockedBy）
- 会话日志（最后活动时间、使用的模型）

---

## 10.8 团队删除 API 规格

### 端点

```
DELETE /api/teams/{team_name}
```

### 可删除的状态

- `stopped`
- `inactive`
- `unknown`

### 删除文件

1. `~/.claude/teams/{team-name}/` - 整个团队配置
2. `~/.claude/tasks/{team-name}/` - 任务定义
3. `~/.claude/projects/{project-hash}/{session}.jsonl` - 会话日志（目录保留）

### 错误响应

| 状态码 | 条件 |
|--------|------|
| 404 Not Found | 团队不存在 |
| 400 Bad Request | 状态不是 `stopped` |

---

## 11. 路线图

### Phase 1：基础重新设计 ✅ 已完成
- [x] 迁移到新布局结构（App.tsx 中的 4 视图切换）
- [x] Zustand 状态管理（dashboardStore.ts）
- [x] 暗色模式支持（ThemeToggle.tsx）
- [x] ModelBadge 组件实现（ModelBadge.tsx）

### Phase 2：时间线功能 ✅ 已完成
- [x] vis-timeline 集成（MessageTimeline.tsx）
- [x] 详情展开模态框（MessageDetailModal.tsx）
- [x] 时间范围选择（TimeRangeSlider.tsx）
- [x] 过滤和搜索功能（TimelineFilters.tsx）

### Phase 3：图表可视化 ✅ 已完成
- [x] D3.js 任务依赖图（TaskDependencyGraph.tsx）
- [x] 代理通信网络（AgentNetworkGraph.tsx）
- [x] 交互功能增强（拖拽、缩放、平移支持）

---

## 12. 变更历史

| 日期 | 版本 | 更改 |
|------|------|------|
| 2026-02-16 | 1.0.0 | 初始版本 |
| 2026-02-16 | 2.0.0 | 反映头脑风暴结果：完全重新设计、模型可视化、时间线功能、增强交互性 |
| 2026-02-16 | 2.1.0 | 反映实现完成：Phase 1-2 完成、Phase 3 进行中（D3.js 图表已实现、通信网络未实现） |
| 2026-02-16 | 2.2.0 | 所有功能实现完成：Phase 3 完成（代理通信网络已实现）、修复 TypeScript 错误 |
| 2026-02-23 | 3.0.0 | 添加设计理念、会话日志集成规格、团队状态判定（基于 mtime）、代理状态推断、团队删除 API、HTTP 轮询说明 |

*创建者：Claude Code Agent Teams*
