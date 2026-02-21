# フロントエンド技術スタック技術書

## 1. 技術スタック概要

### 1.1 言語・フレームワーク

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|-----------|------|
| プログラミング言語 | TypeScript | 5.3.0+ | 型安全な開発 |
| UIライブラリ | React | 18.2.0 | コンポーネントベースUI |
| バンドラー | Vite | 5.0.0+ | 高速ビルド・HMR |
| CSSフレームワーク | Tailwind CSS | 3.4.0+ | ユーティリティファーストCSS |
| 状態管理 | Zustand | 4.5.0+ | グローバル状態管理 |
| Markdown | react-markdown | 最新 | Markdownレンダリング |
| Markdown拡張 | remark-gfm | 最新 | GitHub Flavored Markdown |
| 日付処理 | date-fns | 最新 | 日付フォーマット・操作 |

### 1.2 開発用依存関係

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Vitest | 最新 | ユニットテスト |
| @testing-library/react | 最新 | Reactコンポーネントテスト |
| Puppeteer | 24.37.3+ | E2Eテスト |

---

## 2. プロジェクト構造

```
frontend/src/
├── components/
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
│   │   └── TaskCard.tsx
│   └── timeline/           # タイムライン
│       ├── TimelinePanel.tsx
│       ├── TimelineFilters.tsx
│       ├── TimeRangeSlider.tsx
│       └── MessageDetailModal.tsx
├── hooks/                  # カスタムフック
│   ├── useTeams.ts
│   ├── useTasks.ts
│   ├── useInbox.ts
│   ├── useWebSocket.ts
│   └── useAgentMessages.ts
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
└── lib/                    # ライブラリ設定
    ├── queryClient.ts
    └── utils.ts
```

---

## 3. コンポーネント一覧

### 3.1 チャット関連

| コンポーネント | 説明 |
|--------------|------|
| ChatHeader | チャットヘッダー（検索、フィルター） |
| ChatMessageBubble | メッセージバブル（Markdown対応） |
| ChatMessageList | メッセージリスト（仮想スクロール） |
| ChatTimelinePanel | タイムラインパネル |
| ChatSearch | 全文検索 |
| SenderFilter | 送信者フィルター |
| DateSeparator | 日付区切り |
| AgentStatusIndicator | エージェント状態表示 |
| BookmarkButton | ブックマークボタン |

### 3.2 共通コンポーネント

| コンポーネント | 説明 |
|--------------|------|
| StatusBadge | ステータスバッジ（active, idle, stopped等） |
| LoadingSpinner | ローディング表示 |
| ErrorDisplay | エラー表示 |
| ThemeToggle | テーマ切替（ダーク/ライト） |
| PollingIntervalSelector | ポーリング間隔選択 |

### 3.3 ダッシュボード関連

| コンポーネント | 説明 |
|--------------|------|
| TeamCard | チームカード |
| TeamDetailPanel | チーム詳細パネル |
| ActivityFeed | アクティビティフィード |

---

## 4. カスタムフック

| フック | 説明 |
|-------|------|
| useTeams() | チーム一覧取得（ポーリング + WebSocket） |
| useTasks() | タスク一覧取得（ポーリング + WebSocket） |
| useInbox() | インボックス取得 |
| useWebSocket() | WebSocket接続管理（自動再接続） |
| useAgentMessages() | エージェント別メッセージ取得 |

---

## 5. Zustand Store構成

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
  pollingInterval: number;
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

### 5.1 セレクターフック

| フック | 説明 |
|-------|------|
| useTeamSelection() | チーム選択状態 |
| useMessageSelection() | メッセージ選択状態 |
| useFilters() | フィルター状態 |
| useUIState() | UI状態（テーマ、サイドバー） |
| useCurrentView() | 現在のビュー |

---

## 6. 型定義

### 6.1 Team型

```typescript
interface Team {
  name: string;
  description: string;
  createdAt: number;
  leadAgentId: string;
  members: Member[];
  status: 'active' | 'inactive' | 'stopped';
}

interface Member {
  agentId: string;
  name: string;
  agentType: string;
  model: string;
  joinedAt: number;
  status: 'active' | 'idle';
  color: string;
}
```

### 6.2 Task型

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
}
```

### 6.3 Message型

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
  | 'unknown';

interface ParsedMessage {
  id: string;
  from: string;
  to?: string;
  receiver?: string;
  timestamp: string;
  text: string;
  summary?: string;
  parsedType: MessageType;
  parsedData?: Record<string, unknown>;
}
```

---

## 7. ビルド設定

### 7.1 Vite設定

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000' },
      '/ws': { target: 'ws://127.0.0.1:8000', ws: true }
    }
  }
});
```

### 7.2 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run preview` | ビルドプレビュー |
| `npm run test` | テスト実行 |
| `npm run lint` | リント実行 |

---

## 8. テスト構成

### 8.1 テストフレームワーク

- **Vitest**: ユニットテスト
- **@testing-library/react**: Reactコンポーネントテスト
- **Puppeteer**: E2Eテスト

### 8.2 テスト実行

```bash
# ユニットテスト
npm run test

# カバレッジ付き
npm run test -- --coverage

# E2Eテスト
npm run test:e2e
```

---

*作成日: 2026-02-16*
*最終更新日: 2026-02-21*
*バージョン: 1.1.0*
