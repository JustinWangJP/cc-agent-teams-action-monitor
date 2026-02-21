# アプリアーキテクチャ設計書

## 1. アーキテクチャ概要

### 1.1 システム全体像

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
│  │  │ - dashboard│ │ useWebSocket│ │ - timeline.ts         │   │   │
│  │  │ - common/ │  │           │  │                        │   │   │
│  │  └───────────┘  └───────────┘  └────────────────────────┘   │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │              Zustand Store (dashboardStore)            │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │ HTTP/REST              │ WebSocket                        │
│         ▼                        ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Backend (FastAPI)                         │   │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────────────┐   │   │
│  │  │API Routes │  │ WebSocket │  │ Services               │   │   │
│  │  │ - teams   │  │ Manager   │  │ - FileWatcherService   │   │   │
│  │  │ - tasks   │  │           │  │ - CacheService         │   │   │
│  │  │ - messages│  │           │  │                        │   │   │
│  │  │ - agents  │  │           │  │                        │   │   │
│  │  └───────────┘  └───────────┘  └────────────────────────┘   │   │
│  │  ┌───────────┐  ┌───────────┐                                │   │
│  │  │  Models   │  │  Config   │                                │   │
│  │  │ - team    │  │ Settings  │                                │   │
│  │  │ - task    │  │           │                                │   │
│  │  │ - message │  │           │                                │   │
│  │  │ - timeline│  │           │                                │   │
│  │  └───────────┘  └───────────┘                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ▼ ファイル監視                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  ~/.claude/ Directory                        │   │
│  │  ├── teams/{team_name}/config.json                          │   │
│  │  ├── teams/{team_name}/inboxes/{agent}.json                 │   │
│  │  └── tasks/{team_name}/{task_id}.json                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 レイヤー構成

| レイヤー | コンポーネント | 責務 |
|----------|---------------|------|
| プレゼンテーション | React Components | UI描画、ユーザー操作 |
| 状態管理 | Zustand Store | グローバル状態管理 |
| データ取得 | Custom Hooks | API通信、キャッシュ |
| 通信 | REST/WebSocket | サーバー通信 |
| API | FastAPI Routes | エンドポイント処理 |
| キャッシュ | CacheService | メモリキャッシュ管理 |
| ファイル監視 | FileWatcherService | ファイル変更検知 |
| データ | Pydantic Models | データ定義・検証 |
| ストレージ | File System | データ永続化 |

---

## 2. フロントエンドアーキテクチャ

### 2.1 コンポーネント階層

```
App (メイン)
├── Layout
│   ├── Header
│   │   ├── ThemeToggle
│   │   └── PollingIntervalSelector
│   └── children
├── Overview (チーム一覧)
│   ├── TeamCard[]
│   │   └── ModelBadge
│   └── TeamDetailPanel
├── Tasks (タスク一覧)
│   └── TaskCard[]
├── Timeline (タイムライン)
│   ├── TimelinePanel
│   │   ├── TimelineFilters
│   │   └── MessageTimeline
│   └── MessageDetailModal
└── Chat (チャットパネル)
    ├── ChatHeader
    │   ├── ChatSearch
    │   └── SenderFilter
    ├── ChatTimelinePanel
    │   ├── DateSeparator
    │   ├── ChatMessageList
    │   │   └── ChatMessageBubble
    │   │       ├── BookmarkButton
    │   │       ├── AgentStatusIndicator
    │   │       └── MarkdownRenderer
    │   └── TypingIndicator
    └── MessageDetailPanel
```

### 2.2 状態管理パターン

- **グローバル状態**: Zustand Store (dashboardStore)
  - チーム選択、メッセージ選択、フィルター、UI状態、ポーリング設定
- **サーバー状態**: カスタムフック + ポーリング
- **リアルタイム状態**: WebSocket接続
- **ローカル状態**: useState (コンポーネント内)

### 2.3 データフロー

```
User Action → Component → Store/Hook → API/WebSocket → Backend
                                               ↓
Component ← Store/Hook ← State Update ← Response ←────┘
```

### 2.4 Zustand Store 構成

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
}
```

---

## 3. バックエンドアーキテクチャ

### 3.1 レイヤー構成

```
┌─────────────────────────────────────────┐
│              API Layer                   │
│  (FastAPI Routes: teams, tasks,         │
│   messages, agents, websocket)          │
├─────────────────────────────────────────┤
│             Service Layer                │
│  (FileWatcher, CacheService)            │
├─────────────────────────────────────────┤
│              Model Layer                 │
│  (Pydantic: Team, Task, Message,        │
│   Timeline, Agent, Chat)                │
├─────────────────────────────────────────┤
│            Storage Layer                 │
│  (File System: ~/.claude/)              │
└─────────────────────────────────────────┘
```

### 3.2 ルーティング設計

| パス | ハンドラ | 用途 |
|------|----------|------|
| /api/health | health_check | ヘルスチェック |
| /api/teams | list_teams | チーム一覧 |
| /api/teams/{name} | get_team | チーム詳細 |
| /api/teams/{name}/messages/timeline | get_team_messages_timeline | メッセージタイムライン |
| /api/tasks | list_tasks | タスク一覧 |
| /api/tasks/{team}/{task_id} | get_task | タスク詳細 |
| /api/agents | list_agents | エージェント一覧 |
| /ws/{channel} | websocket_endpoint | リアルタイム通信 |

### 3.3 サービス構成

#### CacheService
- **役割**: メモリキャッシュによるファイルアクセス削減
- **TTL**: チーム設定 30秒、インボックス 60秒
- **機能**: 自動期限切れ、手動無効化、統計情報

#### FileWatcherService
- **役割**: ~/.claude/ ディレクトリの変更監視
- **デバウンス**: 500ms
- **検知対象**: config.json, inboxes/*.json, tasks/*.json

### 3.4 ミドルウェア構成

| ミドルウェア | 用途 |
|-------------|------|
| CORSMiddleware | クロスオリジン許可 |
| Lifespan | 起動/終了時処理（キャッシュサービス、ファイル監視） |

---

## 4. 通信プロトコル

### 4.1 REST API

- **形式**: JSON
- **メソッド**: GET のみ（読み取り専用）
- **エラー**: HTTP ステータスコード + detail メッセージ

### 4.2 WebSocket

- **エンドポイント**: /ws/{channel}
- **チャンネル**: dashboard, tasks
- **メッセージ形式**: JSON

#### メッセージタイプ

| タイプ | 方向 | 用途 |
|--------|------|------|
| ping | Client→Server | キープアライブ |
| pong | Server→Client | キープアライブ応答 |
| team_update | Server→Client | チーム更新通知 |
| task_update | Server→Client | タスク更新通知 |
| inbox_update | Server→Client | メッセージ受信通知 |

---

## 5. モジュール間の依存関係

### 5.1 バックエンド依存関係図

```
main.py
├── config.py (Settings)
├── api/routes/
│   ├── teams.py
│   │   ├── models/team.py
│   │   ├── services/cache_service.py
│   │   └── config.py
│   ├── tasks.py
│   │   ├── models/task.py
│   │   └── config.py
│   ├── messages.py
│   │   ├── models/message.py
│   │   ├── models/timeline.py
│   │   └── config.py
│   └── websocket.py
│       └── (ConnectionManager)
└── services/
    ├── cache_service.py
    │   └── config.py
    └── file_watcher.py
        ├── config.py
        ├── services/cache_service.py
        └── api/routes/websocket.py (ConnectionManager)
```

### 5.2 フロントエンド依存関係図

```
App.tsx
├── stores/dashboardStore.ts (Zustand)
├── hooks/
│   ├── useTeams.ts
│   ├── useTasks.ts
│   ├── useInbox.ts
│   ├── useWebSocket.ts
│   └── useAgentMessages.ts
├── components/
│   ├── layout/
│   ├── dashboard/
│   ├── tasks/
│   ├── timeline/
│   ├── chat/
│   └── common/
├── types/
│   ├── team.ts
│   ├── task.ts
│   ├── message.ts
│   ├── timeline.ts
│   └── model.ts
└── config/
    └── models.ts
```

---

## 6. デプロイ構成

### 6.1 開発環境

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
         │   (File System)  │
         └──────────────────┘
```

### 6.2 本番環境（想定）

```
┌──────────────────────────────────────────────┐
│                Reverse Proxy                 │
│                (nginx / Caddy)               │
└──────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  Frontend        │  │ Backend          │
│  (Static Files)  │  │ (Uvicorn/Gunicorn)│
│  Build Output    │  │ Multiple Workers │
└──────────────────┘  └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   ~/.claude/     │
                    └──────────────────┘
```

### 6.3 インフラ要件

| 項目 | 要件 |
|------|------|
| Python | 3.11+ |
| Node.js | 18+ |
| メモリ | 最小512MB |
| ディスク | ~/.claude/へのアクセス |

---

## 7. セキュリティ設計

### 7.1 現在の実装

| 項目 | 実装状況 |
|------|----------|
| CORS | 許可オリジン制限 |
| 入力検証 | Pydantic バリデーション |
| エラーハンドリング | HTTP例外処理 |

### 7.2 将来の拡張予定

| 項目 | 計画 |
|------|------|
| 認証 | API Key / OAuth |
| 認可 | ロールベースアクセス制御 |
| 暗号化 | HTTPS / WSS |
| ログ | 監査ログ |

---

## 8. 拡張性

### 8.1 拡張ポイント

| レイヤー | 拡張ポイント |
|----------|-------------|
| Frontend | 新規コンポーネント追加、新規ビュー追加 |
| Store | 新規状態スライス追加 |
| API | 新規エンドポイント追加 |
| WebSocket | 新規チャンネル追加 |
| Service | 新規サービス追加 |
| Cache | 新規キャッシュタイプ追加 |

### 8.2 設計原則

- **単一責任**: 各モジュールは単一の責務を持つ
- **依存性注入**: 設定は環境変数から注入
- **インターフェース分離**: 明確なモジュール境界
- **関心の分離**: UI、状態管理、データ取得を分離

---

*作成日: 2026-02-16*
*最終更新日: 2026-02-21*
*バージョン: 1.1.0*
