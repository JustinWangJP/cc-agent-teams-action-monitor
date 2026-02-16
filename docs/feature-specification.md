# Agent Teams Dashboard 機能設計書

## 1. 概要

### 1.1 目的

Claude Code の Agent Teams 機能をリアルタイムに監視・管理するための Web ベースダッシュボード。
`~/.claude/` ディレクトリの JSON ファイルを監視し、チーム構成、タスク進捗、エージェント間通信を可視化する。

### 1.2 検証済みの事実

本設計書は以下の検証結果に基づく：

```
~/.claude/
├── teams/{team_name}/
│   ├── config.json          # チーム構成、メンバー定義、モデル情報
│   └── inboxes/
│       └── {agent_name}.json # エージェント別メッセージ受信箱（JSON配列）
└── tasks/{team_name}/
    └── {task_id}.json       # タスク定義・ステータス
```

**メッセージ形式**:
- 通常メッセージ: `text` フィールドにプレーンテキスト
- プロトコルメッセージ: `text` フィールドに JSON-in-JSON（`idle_notification`, `shutdown_request` など）

### 1.3 参照リソース

- [sinjorjob/claude-code-agent-teams-dashboard](https://github.com/sinjorjob/claude-code-agent-teams-dashboard) - ターミナル版実装
- [Claude Code Agent Teams 公式ガイド](https://claudefa.st/blog/guide/agents/agent-teams)

---

## 2. 設計方針

### 2.1 設計アプローチ: 完全リデザイン

既存の実装をベースにしつつ、可視化特化のデザインに刷新する。

**理由**:
- インタラクティビティを最大限に活かすため、コンポーネント構造を見直し
- D3.js / vis-timeline の活用により、リッチな可視化を実現
- ユーザー体験を一貫して設計可能

### 2.2 技術選定: ハイブリッド構成

| 用途 | ライブラリ | 理由 |
|------|-----------|------|
| タイムライン可視化 | **vis-timeline** | 時間範囲指定、ズーム、ドラッグが標準搭載 |
| ネットワークグラフ | **D3.js** | エージェント通信関係の自由度高い可視化 |
| タスク依存グラフ | **D3.js** | DAG描画の柔軟性 |
| UIコンポーネント | **Radix UI** | アクセシビリティ準拠 |
| 状態管理 | **Zustand** | 軽量でシンプル |
| アニメーション | **Framer Motion** | リッチなトランジション |

---

## 3. 機能一覧

### 3.1 コア機能（既存）

| カテゴリ | 機能 | 優先度 | 状態 |
|---------|------|--------|------|
| チーム監視 | チーム一覧表示 | **P0** | ✅ 実装完了 |
| チーム監視 | チーム詳細表示 | **P0** | ✅ 実装完了 |
| タスク管理 | タスク一覧表示 | **P0** | ✅ 実装完了 |
| タスク管理 | 依存関係表示 | **P1** | ✅ D3.js実装完了 |
| 通信監視 | インボックス表示 | **P0** | ✅ タイムライン実装完了 |
| リアルタイム | WebSocket 更新 | **P0** | ✅ 実装完了 |

### 3.2 新規機能

| カテゴリ | 機能 | 優先度 | 状態 | 説明 |
|---------|------|--------|------|------|
| **モデル可視化** | チーム別モデル表示 | **P0** | ✅ 完了 | チームカードにモデルバッジ表示 |
| **モデル可視化** | モデル別色分けアイコン | **P0** | ✅ 完了 | 各モデルに固有の色とアイコン |
| **メッセージ可視化** | タイムライン表示 | **P0** | ✅ 完了 | vis-timeline による時系列表示 |
| **メッセージ可視化** | 詳細展開モーダル | **P0** | ✅ 完了 | メッセージクリックで全文表示 |
| **メッセージ可視化** | 時間範囲指定 | **P0** | ✅ 完了 | スライダーで特定時間帯フィルタ |
| **メッセージ可視化** | フィルター機能 | **P1** | ✅ 完了 | 送信者/受信者/タイプでフィルタ |
| **メッセージ可視化** | 検索機能 | **P1** | ✅ 完了 | メッセージ本文キーワード検索 |
| **グラフ可視化** | タスク依存グラフ | **P1** | ✅ 完了 | D3.js による DAG 表示 |
| **グラフ可視化** | エージェント通信ネットワーク | **P2** | 未実装 | D3.js による通信関係図 |
| **UI/UX** | ダークモード | **P1** | ✅ 完了 | テーマ切り替え |
| **UI/UX** | リアルタイムインジケーター | **P1** | ✅ 完了 | Live バッジ、接続状態表示 |

---

## 4. UI/UX 設計

### 4.1 レイアウト構成

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
│  │    │ 🟣 Opus×5 🟡 Kimi×2  │  │  │    │ 💬 "API設計完了..."         │  │
│  │    │ 👥 7 members          │  │  │    │    [クリックで詳細展開]      │  │
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

### 4.2 レスポンシブブレークポイント

| ブレークポイント | 幅 | レイアウト |
|-----------------|-----|-----------|
| Mobile | < 640px | 1カラム（Overview → Timeline → Tasks） |
| Tablet | 640-1024px | 2カラム（Overview + Timeline） |
| Desktop | > 1024px | 3ペイン構成 |

### 4.3 カラーシステム

```css
/* テーマカラー */
--color-primary: #3B82F6;      /* blue-500 */
--color-secondary: #8B5CF6;    /* violet-500 */
--color-accent: #F59E0B;       /* amber-500 */

/* ステータスカラー */
--color-active: #10B981;       /* green-500 */
--color-idle: #F59E0B;         /* amber-500 */
--color-pending: #6B7280;      /* gray-500 */
--color-progress: #3B82F6;     /* blue-500 */
--color-completed: #10B981;    /* green-500 */
--color-error: #EF4444;        /* red-500 */

/* モデル別カラー */
--model-opus: #8B5CF6;         /* violet-500 */
--model-sonnet: #3B82F6;       /* blue-500 */
--model-haiku: #10B981;        /* green-500 */
--model-kimi: #F59E0B;         /* amber-500 */
--model-glm: #EF4444;          /* red-500 */

/* ダークモード */
--bg-dark: #0F172A;            /* slate-900 */
--bg-dark-card: #1E293B;       /* slate-800 */
--text-dark-primary: #F1F5F9;  /* slate-100 */
--text-dark-secondary: #94A3B8; /* slate-400 */
```

### 4.4 アニメーション仕様

| 種類 | アニメーション | 時間 | Easing |
|------|--------------|------|--------|
| カード選択 | scale + shadow | 150ms | ease-out |
| ステータス変更 | fade + color | 300ms | ease-in-out |
| 新規メッセージ | slide-in from top | 250ms | spring |
| モーダル展開 | scale + fade | 200ms | ease-out |
| タイムラインズーム | smooth scroll | 400ms | ease-in-out |

---

## 5. 機能詳細設計

### 5.1 モデル可視化機能

#### 5.1.1 ModelBadge コンポーネント

**目的**: 各 AI モデルを一意に識別できる視覚的バッジを提供

**モデル設定定義**:
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

#### 5.1.2 TeamCard モデル表示

**表示内容**:
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

**データ構造**:
```typescript
interface TeamModels {
  teamName: string;
  models: {
    config: ModelConfig;
    count: number;
    agents: string[];  // モデルを使用するエージェント名
  }[];
}

// 算出ロジック
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

### 5.2 メッセージタイムライン機能

#### 5.2.1 タイムライン表示仕様

**vis-timeline 設定**:
```typescript
const timelineOptions: TimelineOptions = {
  // 基本設定
  orientation: { axis: 'top', item: 'top' },
  verticalScroll: true,
  horizontalScroll: true,

  // ズーム設定
  zoomMin: 1000 * 60 * 1,      // 最小: 1分
  zoomMax: 1000 * 60 * 60 * 24, // 最大: 24時間

  // インタラクション
  editable: false,
  selectable: true,

  // スタイル
  margin: { item: { horizontal: 10, vertical: 5 } },
  format: {
    minorLabels: { minute: 'HH:mm', hour: 'HH:mm' },
    majorLabels: { hour: 'YYYY-MM-DD HH:mm' }
  }
};
```

**メッセージアイテム形式**:
```typescript
interface TimelineItem {
  id: string;
  content: string;           // 表示テキスト（短縮版）
  start: Date;               // タイムスタンプ
  type: 'box' | 'point';
  className: string;         // スタイルクラス（message, idle, etc.）
  group: string;             // 送信者でグループ化
  data: ParsedMessage;       // 元メッセージデータ
}
```

#### 5.2.2 詳細展開モーダル（P0）

**トリガー**: タイムラインアイテムクリック

**モーダル内容**:
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
│  │  API設計が完了しました。                     │   │
│  │                                             │   │
│  │  変更内容:                                   │   │
│  │  - エンドポイント構成の見直し                │   │
│  │  - レスポンス形式の統一                      │   │
│  │  - エラーハンドリングの追加                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Metadata:                                          │
│  - Color: blue                                      │
│  - Read: true                                       │
│                                                     │
│                              [Copy] [Close]         │
└─────────────────────────────────────────────────────┘
```

**実装**:
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

#### 5.2.3 時間範囲指定（P0）

**UI コンポーネント**:
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

#### 5.2.4 フィルター機能（P1）

**フィルター条件**:
```typescript
interface MessageFilter {
  senders: string[];        // 送信者でフィルタ
  receivers: string[];      // 受信者でフィルタ
  types: MessageType[];     // メッセージタイプでフィルタ
  unreadOnly: boolean;      // 未読のみ
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

#### 5.2.5 検索機能（P1）

**検索実装**:
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

// 検索フィルター関数
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

### 5.3 タスク依存グラフ機能

#### 5.3.1 D3.js グラフ仕様

**ノード定義**:
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

**グラフ設定**:
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

// D3.js フォースシミュレーション
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

**表示例**:
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

### 5.4 ダークモード機能

#### 5.4.1 テーマ定義

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
    // ... その他
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

#### 5.4.2 テーマ切り替え

```typescript
// Zustand ストア
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

// ThemeToggle コンポーネント
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

## 6. コンポーネント設計

### 6.1 ディレクトリ構成

```
src/components/
├── layout/
│   ├── DashboardLayout.tsx      # 新レイアウト（3ペイン構成）
│   ├── Header.tsx               # 更新（ダークモード切り替え追加）
│   └── Sidebar.tsx              # 新規（ナビゲーション）
│
├── overview/                    # 新規ディレクトリ
│   ├── OverviewPanel.tsx        # チーム一覧パネル
│   ├── TeamCard.tsx             # リデザイン（モデルバッジ付き）
│   └── ModelBadge.tsx           # 新規（モデル別色分けアイコン）
│
├── timeline/                    # 新規ディレクトリ
│   ├── MessageTimeline.tsx      # vis-timeline ラッパー
│   ├── TimelineFilters.tsx      # フィルター・検索 UI
│   ├── TimeRangeSlider.tsx      # 時間範囲指定
│   └── MessageDetailModal.tsx   # 詳細展開モーダル
│
├── graph/                       # 新規ディレクトリ
│   ├── TaskDependencyGraph.tsx  # D3.js タスク依存グラフ
│   └── AgentNetworkGraph.tsx    # D3.js エージェント通信ネットワーク
│
├── stats/                       # 新規ディレクトリ
│   ├── StatsPanel.tsx           # 統計サマリー
│   └── ActivityFeed.tsx         # リデザイン
│
└── common/
    ├── StatusIndicator.tsx      # リアルタイム状態インジケーター
    ├── SearchInput.tsx          # 新規
    ├── ThemeToggle.tsx          # 新規（ダークモード）
    └── Modal.tsx                # 新規（Radix UI Dialog）
```

### 6.2 状態管理設計（Zustand）

```typescript
// stores/dashboardStore.ts
interface DashboardState {
  // 選択状態
  selectedTeam: string | null;
  selectedMessage: ParsedMessage | null;

  // フィルター
  timeRange: { start: Date; end: Date };
  messageFilter: MessageFilter;
  searchQuery: string;

  // UI状態
  isDetailModalOpen: boolean;
  isDarkMode: boolean;

  // アクション
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

## 7. API 設計

### 7.1 REST API 更新

| エンドポイント | メソッド | 説明 | 変更 |
|---------------|---------|------|------|
| `GET /api/teams` | GET | チーム一覧 | モデル情報追加 |
| `GET /api/teams/{name}` | GET | チーム詳細 | モデル情報追加 |
| `GET /api/teams/{name}/messages` | GET | メッセージ一覧 | **新規** |
| `GET /api/teams/{name}/messages/timeline` | GET | タイムライン用 | **新規** |
| `GET /api/teams/{name}/stats` | GET | チーム統計 | **新規** |
| `GET /api/models` | GET | モデル一覧 | **新規** |

### 7.2 新規 API: メッセージタイムライン

```python
@router.get("/teams/{team_name}/messages/timeline")
async def get_message_timeline(
    team_name: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    senders: Optional[str] = None,      # カンマ区切り
    types: Optional[str] = None,        # カンマ区切り
    search: Optional[str] = None,
    unread_only: bool = False
):
    """タイムライン表示用のメッセージを取得"""

    # フィルター適用
    messages = await filter_messages(
        team_name=team_name,
        start_time=start_time,
        end_time=end_time,
        senders=senders.split(',') if senders else None,
        types=types.split(',') if types else None,
        search=search,
        unread_only=unread_only
    )

    # タイムラインアイテム形式に変換
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

### 7.3 新規 API: モデル一覧

```python
@router.get("/models")
async def get_available_models():
    """利用可能なモデル一覧と設定を取得"""
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

## 8. データモデル

### 8.1 Team モデル（拡張）

```typescript
interface Team {
  name: string;
  description?: string;
  createdAt: number;
  leadAgentId: string;
  leadSessionId: string;
  members: Member[];
  // 算出値
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
  primaryModel: string;  // 最も多いモデル
}
```

### 8.2 Message モデル（拡張）

```typescript
interface Message {
  from: string;
  to?: string;            // 受信者（推定）
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

### 8.3 TimelineItem モデル（新規）

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

## 9. 技術スタック

### 9.1 バックエンド

| 技術 | バージョン | 用途 |
|-----|-----------|------|
| Python | 3.11+ | メイン言語 |
| FastAPI | 0.109+ | Webフレームワーク |
| Pydantic | 2.5+ | データ検証 |
| watchdog | 4.0+ | ファイル監視 |
| websockets | 12.0+ | WebSocket |

### 9.2 フロントエンド

| 技術 | バージョン | 用途 |
|-----|-----------|------|
| React | 18.2+ | UIライブラリ |
| TypeScript | 5.3+ | 型安全 |
| Vite | 5.0+ | ビルドツール |
| Tailwind CSS | 3.4+ | スタイリング |
| **vis-timeline** | 7.x | タイムライン可視化 |
| **D3.js** | 7.x | ネットワーク/依存グラフ |
| **Radix UI** | 1.x | アクセシブルコンポーネント |
| **Zustand** | 4.x | 状態管理 |
| **Framer Motion** | 11.x | アニメーション |

---

## 10. 制限事項

### 10.1 Agent Teams の仕様による制限

| 制限 | 影響 | 対応 |
|-----|------|------|
| セッション終了でデータ削除 | 履歴保持不可 | リアルタイム監視専用とする |
| ファイルロック機構が弱い | 競合可能性 | 読み取り専用で運用 |
| タスク間通信が turn 間のみ | リアルタイム性 | ポーリング + WebSocket で補完 |

### 10.2 Dashboard の制限

| 制限 | 説明 |
|-----|------|
| 読み取り専用 | Agent Teams の状態を変更しない |
| ローカルのみ | リモート監視非対応 |

---

## 11. ロードマップ

### Phase 1: 基盤リデザイン
- [ ] 新レイアウト構成への移行
- [ ] Zustand 状態管理導入
- [ ] ダークモード対応
- [ ] ModelBadge コンポーネント実装

### Phase 2: タイムライン機能
- [ ] vis-timeline 統合
- [ ] 詳細展開モーダル
- [ ] 時間範囲指定
- [ ] フィルター・検索機能

### Phase 3: グラフ可視化
- [ ] D3.js タスク依存グラフ
- [ ] エージェント通信ネットワーク
- [ ] インタラクティブ機能強化

---

## 12. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-02-16 | 1.0.0 | 初版作成 |
| 2026-02-16 | 2.0.0 | ブレインストーミング結果を反映：完全リデザイン、モデル可視化、タイムライン機能、インタラクティビティ強化 |

*作成者: Claude Code Agent Teams*
