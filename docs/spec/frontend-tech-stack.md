# フロントエンド技術スタック技術書

## 1. 技術スタック概要

### 1.1 言語・フレームワーク

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|-----------|------|
| プログラミング言語 | TypeScript | 5.3.0+ | 型安全な開発 |
| UIライブラリ | React | 18.2.0 | コンポーネントベースUI |
| バンドラー | Vite | 5.0.0+ | 高速ビルド・HMR |
| CSSフレームワーク | Tailwind CSS | 3.4.0+ | ユーティリティファーストCSS |
| 状態管理 | Zustand | 5.0.2+ | グローバル状態管理 |
| データフェッチ | TanStack Query | 5.90.21+ | サーバー状態管理・キャッシュ |
| Markdown | react-markdown | 10.1.0+ | Markdownレンダリング |
| Markdown拡張 | remark-gfm | 4.0.1+ | GitHub Flavored Markdown |
| 日付処理 | date-fns | 4.1.0+ | 日付フォーマット・操作 |
| アイコン | lucide-react | 0.344.0+ | アイコンライブラリ |
| 仮想スクロール | @tanstack/react-virtual | 3.10.8+ | 大量データの仮想スクロール |
| グラフ可視化 | D3.js | 7.8.5+ | ネットワーク/依存グラフ |
| タイムライン | vis-timeline | 7.7.3+ | 時系列データ表示 |
| UIコンポーネント | Radix UI | 1.x | アクセシブルUIコンポーネント |

### 1.2 開発用依存関係

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Vitest | 1.1.0+ | ユニットテスト |
| @testing-library/react | 14.1.2+ | Reactコンポーネントテスト |
| @testing-library/jest-dom | 6.4.0+ | DOMアサーション拡張 |
| @testing-library/user-event | 14.5.1+ | ユーザーイベントシミュレート |
| jsdom | 24.0.0+ | DOM環境シミュレート |
| @vitest/coverage-v8 | 1.1.0+ | カバレッジレポート |
| @vitest/ui | 1.1.0+ | テストUI |
| Puppeteer | 24.37.3+ | E2Eテスト |
| Playwright | 1.58.2+ | ブラウザ自動化テスト |

---

## 2. 設計思想

### 2.1 なぜHTTPポーリングか

**背景:**
Claude Code がファイルを直接更新するため、サーバーからの Push 通知ができない。

**アプローチ:**
- **HTTP ポーリング** で定期的にデータを取得
- ポーリング間隔は **5秒〜60秒** から選択可能（デフォルト30秒）
- TanStack Query の `refetchInterval` で自動更新

**トレードオフ:**
- リアルタイム性は WebSocket Push より劣るが、設定可能な間隔で十分な更新頻度
- サーバー負荷は増加するが、キャッシュ（TTL）で実質的な I/O を削減

### 2.2 なぜZustand + TanStack Queryか

**Zustand:**
- グローバル状態（UI状態、選択状態、ポーリング設定）の管理
- 軽量でシンプルなAPI
- ローカルストレージへの永続化が容易

**TanStack Query:**
- サーバー状態（チーム、タスク、メッセージ）の管理
- 自動キャッシュ、再取得、無効化
- ポーリング機能が組み込み済み

**責務分離:**
- Zustand = クライアント状態
- TanStack Query = サーバー状態

---

## 3. プロジェクト構造

```
frontend/src/
├── components/
│   ├── agent/               # エージェント関連
│   │   └── ExpandedAgentCard.tsx
│   ├── chat/               # チャット関連コンポーネント
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
│   ├── common/             # 共通コンポーネント
│   │   ├── StatusBadge.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorDisplay.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── PollingIntervalSelector.tsx
│   ├── dashboard/          # ダッシュボード関連
│   │   ├── TeamCard.tsx
│   │   ├── TeamDetailPanel.tsx
│   │   └── ActivityFeed.tsx
│   ├── layout/             # レイアウト
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── overview/           # オーバービュー
│   │   ├── TeamCard.tsx
│   │   └── ModelBadge.tsx
│   ├── tasks/              # タスク関連
│   │   ├── TaskCard.tsx
│   │   ├── ExpandedTaskCard.tsx
│   │   └── TaskMonitorPanel.tsx
│   └── timeline/           # タイムライン
│       ├── TimelinePanel.tsx
│       ├── TimelineFilters.tsx
│       ├── TimelineTaskSplitLayout.tsx
│       ├── TimeRangeSlider.tsx
│       ├── MessageTimeline.tsx
│       ├── MessageSearch.tsx
│       └── MessageDetailModal.tsx
├── hooks/                  # カスタムフック
│   ├── useTeams.ts
│   ├── useTasks.ts
│   ├── useInbox.ts
│   ├── useAgentMessages.ts
│   └── useUnifiedTimeline.ts
├── stores/                 # Zustandストア
│   └── dashboardStore.ts
├── types/                  # TypeScript型定義
│   ├── team.ts
│   ├── task.ts
│   ├── message.ts
│   ├── timeline.ts
│   ├── model.ts
│   └── theme.ts
├── config/                 # 設定
│   └── models.ts
├── utils/                  # ユーティリティ
│   └── teamModels.ts
├── lib/                    # ライブラリ設定
│   ├── queryClient.ts
│   └── utils.ts
└── test/                   # テスト設定
    └── setup.ts
```

### 3.1 各モジュールの役割

| モジュール | 役割 |
|-----------|------|
| `components/chat/` | チャットパネル、メッセージ表示、検索・フィルター |
| `components/common/` | 再利用可能な共通コンポーネント |
| `components/dashboard/` | チーム一覧、詳細パネル、アクティビティフィード |
| `components/tasks/` | タスクカード、モニターパネル |
| `components/timeline/` | 統合タイムライン、フィルター、詳細モーダル |
| `hooks/` | データフェッチ、HTTPポーリング |
| `stores/` | グローバル状態管理（UI状態、選択状態） |
| `types/` | TypeScript型定義 |

---

## 4. コンポーネント一覧

### 4.1 チャット関連

| コンポーネント | 説明 |
|--------------|------|
| ChatHeader | チャットヘッダー（検索、フィルター） |
| ChatMessageBubble | メッセージバブル（Markdown対応、タイプ別アイコン） |
| ChatMessageList | メッセージリスト |
| ChatTimelinePanel | チャットタイムラインパネル |
| ChatSearch | 全文検索 |
| SenderFilter | 送信者フィルター |
| MessageTypeFilter | メッセージタイプフィルター |
| DateSeparator | 日付区切り |
| AgentStatusIndicator | エージェント状態表示（idle/working/waiting/error/completed） |
| BookmarkButton | ブックマークボタン |
| MessageDetailPanel | メッセージ詳細パネル（スライドイン） |

### 4.2 共通コンポーネント

| コンポーネント | 説明 |
|--------------|------|
| StatusBadge | ステータスバッジ（active/stopped/unknown/inactive） |
| LoadingSpinner | ローディング表示 |
| ErrorDisplay | エラー表示 |
| ThemeToggle | テーマ切替（ダーク/ライト） |
| PollingIntervalSelector | ポーリング間隔選択（5s/10s/20s/30s/60s） |

### 4.3 ダッシュボード関連

| コンポーネント | 説明 |
|--------------|------|
| TeamCard | チームカード（ステータス表示、削除ボタン） |
| TeamDetailPanel | チーム詳細パネル |
| ActivityFeed | アクティビティフィード |

### 4.4 タスク関連

| コンポーネント | 説明 |
|--------------|------|
| TaskCard | タスクカード |
| ExpandedTaskCard | 展開タスクカード |
| TaskMonitorPanel | タスクモニターパネル |

### 4.5 タイムライン関連

| コンポーネント | 説明 |
|--------------|------|
| TimelinePanel | タイムラインパネル |
| TimelineFilters | フィルターコンポーネント |
| TimelineTaskSplitLayout | タイムライン・タスク分割レイアウト |
| TimeRangeSlider | 時間範囲スライダー |
| MessageTimeline | メッセージタイムライン |
| MessageSearch | メッセージ検索 |
| MessageDetailModal | メッセージ詳細モーダル |

---

## 5. カスタムフック

### 5.1 データフェッチフック

| フック | API | 説明 |
|-------|-----|------|
| useTeams() | GET /api/teams | チーム一覧取得（ポーリング） |
| useTasks() | GET /api/tasks | タスク一覧取得（ポーリング） |
| useInbox() | GET /api/teams/{name}/inboxes | インボックス取得（ポーリング） |
| useAgentMessages() | GET /api/teams/{name}/inboxes/{agent} | エージェント別メッセージ取得 |
| useUnifiedTimeline() | GET /api/timeline/{team_name}/history | 統合タイムライン取得（ポーリング） |

### 5.2 ポーリング実装例

```typescript
// useTeams.ts
export function useTeams() {
  const pollingInterval = useDashboardStore((state) => state.pollingInterval);
  const isPollingPaused = useDashboardStore((state) => state.isPollingPaused);

  return useQuery({
    queryKey: ['teams'],
    queryFn: () => fetch('/api/teams').then((res) => res.json()),
    refetchInterval: isPollingPaused ? false : pollingInterval,
    staleTime: 10000, // 10秒間はキャッシュを使用
  });
}
```

---

## 6. Zustand Store構成

### 6.1 状態定義

```typescript
interface DashboardState {
  // 選択状態
  selectedTeamName: string | null;
  selectedMessageId: string | null;

  // フィルター
  timeRange: TimeRange;
  messageFilter: MessageFilter;

  // UI状態
  currentView: ViewType;
  theme: ThemeMode;
  sidebarCollapsed: boolean;

  // ポーリング
  pollingInterval: number;  // 5000, 10000, 20000, 30000, 60000
  isPollingPaused: boolean;

  // アクション
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

### 6.2 ポーリング間隔設定

```typescript
const POLLING_INTERVALS = [
  { label: '5秒', value: 5000 },
  { label: '10秒', value: 10000 },
  { label: '20秒', value: 20000 },
  { label: '30秒（推奨）', value: 30000 },
  { label: '60秒', value: 60000 },
];

const DEFAULT_POLLING_INTERVAL = 30000; // 30秒
```

### 6.3 セレクターフック

| フック | 説明 |
|-------|------|
| useTeamSelection() | チーム選択状態 |
| useMessageSelection() | メッセージ選択状態 |
| useFilters() | フィルター状態 |
| useUIState() | UI状態（テーマ、サイドバー） |
| usePolling() | ポーリング設定 |

---

## 7. 型定義

### 7.1 Team型

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

### 7.2 Task型

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

### 7.3 Message / Timeline型

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

### 7.4 Agent型

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

## 8. ビルド設定

### 8.1 Vite設定

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

### 8.2 Tailwind CSS 設定

```typescript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // クラスベースのダークモード
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // カスタムカラー等
    },
  },
};
```

### 8.3 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド（tsc + vite build） |
| `npm run preview` | ビルドプレビュー |
| `npm run test` | テスト実行 |
| `npm run test:watch` | ウォッチモード |
| `npm run test:coverage` | カバレッジ付き |
| `npm run lint` | リント実行 |

---

## 9. テスト構成

### 9.1 テストフレームワーク

- **Vitest**: ユニットテスト（高速、Vite統合）
- **@testing-library/react**: Reactコンポーネントテスト
- **jsdom**: DOM環境シミュレート

### 9.2 テストセットアップ

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';

// グローバルモック
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

// localStorage モック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;
```

### 9.3 テストファイル配置

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

### 9.4 テスト実行

```bash
# ユニットテスト
npm run test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage

# UIモード
npm run test:ui
```

---

## 10. ダークモード実装

### 10.1 実装方式

- **Tailwind CSS クラスベース**: `darkMode: 'class'`
- `html` 要素に `dark` クラスを付与/削除で切り替え
- Zustand Store で状態管理、ローカルストレージへ永続化

### 10.2 使用例

```tsx
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-white">テキスト</p>
</div>
```

---

## 11. データフロー図

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
│  │  - HTTP ポーリング（refetchInterval）                 │   │
│  │  - 自動キャッシュ                                     │   │
│  │  -  staleTime: 10秒                                  │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Zustand Store (dashboardStore)          │   │
│  │  - 選択状態（チーム、メッセージ）                      │   │
│  │  - フィルター（時間範囲、送信者）                      │   │
│  │  - UI状態（テーマ、サイドバー）                        │   │
│  │  - ポーリング設定（間隔、一時停止）                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼ HTTP ポーリング（5s〜60s）
                    ┌──────────────┐
                    │   Backend    │
                    │  (FastAPI)   │
                    └──────────────┘
```

---

*作成日: 2026-02-16*
*最終更新日: 2026-02-24*
*バージョン: 2.1.0*
