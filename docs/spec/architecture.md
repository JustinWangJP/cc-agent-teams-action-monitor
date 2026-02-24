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
│  │  │ - dashboard│ │ useUnified │ │ - timeline.ts         │   │   │
│  │  │ - common/ │  │  Timeline │  │                        │   │   │
│  │  └───────────┘  └───────────┘  └────────────────────────┘   │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │              Zustand Store (dashboardStore)            │   │   │
│  │  │  - HTTP ポーリングで定期的にデータ更新                  │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │ HTTP ポーリング（リアルタイム更新）                         │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Backend (FastAPI)                         │   │
│  │  ┌───────────┐  ┌────────────────────────────────────────┐   │   │
│  │  │API Routes │  │ Services                               │   │   │
│  │  │ - teams   │  │ - FileWatcherService (キャッシュ無効化) │   │   │
│  │  │ - tasks   │  │ - CacheService (TTL付きメモリキャッシュ)│   │   │
│  │  │ - messages│  │ - TimelineService (統合タイムライン)   │   │   │
│  │  │ - agents  │  │ - AgentStatusService (状態推論)        │   │   │
│  │  │ - timeline│  │ - MessageParser (メッセージ解析)       │   │   │
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
│         ▼ ファイル監視（キャッシュ無効化・ログ出力）                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ~/.claude/ Directory                        │   │
│  │  ├── teams/{team_name}/config.json       # チーム設定         │   │
│  │  │   └── inboxes/{agent_name}.json       # エージェント別受信箱│   │
│  │  ├── tasks/{team_name}/{task_id}.json    # タスク定義         │   │
│  │  └── projects/{project-hash}/            # セッションログ     │   │
│  │      └── {sessionId}.jsonl               # セッション履歴     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 各機能とデータソース対応表

| 機能 | 読み込み対象ファイル | 説明 |
|------|---------------------|------|
| **チーム一覧** | `~/.claude/teams/{team_name}/config.json` | チーム設定、メンバー情報 |
| **チームステータス判定** | `~/.claude/projects/{project-hash}/{sessionId}.jsonl` | セッションログの mtime で判定 |
| **インボックス** | `~/.claude/teams/{team_name}/inboxes/{agent_name}.json` | エージェント別メッセージ受信箱 |
| **タスク** | `~/.claude/tasks/{team_name}/{task_id}.json` | タスク定義・ステータス |
| **統合タイムライン** | 上記すべて + セッションログ | inbox + セッションログ統合 |
| **エージェント状態** | タスク + インボックス + セッションログ | 状態推論ロジックで判定 |

### 1.3 レイヤー構成

| レイヤー | コンポーネント | 責務 |
|----------|---------------|------|
| プレゼンテーション | React Components | UI描画、ユーザー操作 |
| 状態管理 | Zustand Store (v5.0.2+) | グローバル状態管理、ポーリング制御 |
| データ取得 | Custom Hooks + TanStack Query (v5.90.21+) | API通信、サーバー状態キャッシュ |
| 通信 | HTTP ポーリング | 定期的なデータ更新（5秒〜60秒） |
| API | FastAPI Routes | エンドポイント処理 |
| キャッシュ | CacheService | メモリキャッシュ管理（TTL付き） |
| ファイル監視 | FileWatcherService | ファイル変更検知、キャッシュ無効化 |
| データ | Pydantic Models | データ定義・検証 |
| ストレージ | File System | データ永続化 |

---

## 2. 設計思想

### 2.1 なぜHTTPポーリング + キャッシュ無効化か

**背景と課題:**
Claude Code が `~/.claude/` 配下のファイルを直接更新するため、外部からの Webhook や Push 通知が使えない。また、ファイル数が増加すると頻繁なファイル読み込みがパフォーマンスに影響する。

**選択したアプローチ:**
1. **FileWatcherService** で `~/.claude/` を監視し、ファイル変更を検知
2. 変更検知時に該当する **キャッシュを無効化**（ログ出力も行う）
3. フロントエンドは **HTTP ポーリング** で定期的に最新データを取得
4. キャッシュにより、同一データの再読み込みを回避

**トレードオフ:**
- リアルタイム性は WebSocket Push より劣るが、ポーリング間隔（最小5秒）で十分な更新頻度を確保
- サーバー負荷は増加するが、キャッシュにより実質的なファイルアクセスを削減

### 2.2 なぜセッションログのmtimeでステータス判定か

**背景と課題:**
チームの「アクティブ状態」を判定するために、`config.json` の mtime を使用していたが、チーム活動と関係ないタイミングで更新される場合があった。

**選択したアプローチ:**
セッションログ（`{sessionId}.jsonl`）の mtime を使用：
- **セッションログ** はエージェントの実際の活動（思考、ツール実行、ファイル変更）を記録
- したがって、セッションログの更新時刻 = チームの最終活動時刻 とみなせる
- 1時間以内の更新 → `active`、1時間超過 → `stopped`

**判定フロー:**
```
1. members が空？ → 'inactive'
2. セッションログなし？ → 'unknown'
3. セッションログ mtime > 1時間？ → 'stopped'
4. それ以外 → 'active'
```

### 2.3 なぜ統合タイムラインサービスか

**背景と課題:**
エージェント間のメッセージ（inbox）とセッションログ（活動履歴）が別々の場所に保存されており、統一されたビューがなかった。

**選択したアプローチ:**
`TimelineService` で両者を統合：
- **inbox**: エージェント間のタスク割り当て、完了通知、アイドル通知
- **セッションログ**: 思考プロセス、ツール実行、ファイル変更
- 統合タイムラインで時系列順にソートして返却

**拡張性:**
将来的に新しいデータソース（例：外部API呼び出しログ）を追加する場合、`TimelineService` に統合ロジックを追加するだけで対応可能。

---

## 3. フロントエンドアーキテクチャ

### 3.1 コンポーネント階層

```
App (メイン)
├── Layout
│   ├── Header
│   │   ├── ThemeToggle
│   │   └── PollingIntervalSelector
│   └── children
├── Overview (チーム一覧) - View Tab
│   ├── TeamCard[]
│   │   ├── ModelBadge
│   │   └── StatusBadge (active/stopped/unknown/inactive)
│   └── TeamDetailPanel
│       └── DeleteTeamButton (stopped時のみ表示)
├── Timeline (統合タイムライン) - View Tab
│   ├── TimelineTaskSplitLayout
│   │   ├── ChatTimelinePanel (左側)
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
│   │   └── TaskMonitorPanel (右側・折りたたみ可能)
│   │       └── TaskCard[]
│   └── MessageDetailModal
└── Tasks (タスク一覧) - View Tab (カンバン形式)
    ├── TaskFilter (チームフィルタ + 検索)
    └── TaskCard[] (Pending / In Progress / Completed 列)
```

### 3.2 状態管理パターン

- **グローバル状態**: Zustand Store (dashboardStore)
  - チーム選択、メッセージ選択、タスク選択、フィルター、UI状態、ポーリング設定
  - ローカルストレージへの永続化（ダークモード、ポーリング間隔等）
- **サーバー状態**: カスタムフック + HTTP ポーリング
  - `useTeams`, `useTasks`, `useInbox`, `useUnifiedTimeline`, `useAgentMessages`
- **ローカル状態**: useState (コンポーネント内)

### 3.3 データフロー

```
User Action → Component → Store/Hook → HTTP API → Backend
                                            ↓
Component ← Store/Hook ← State Update ← Response ←────┘
                ↑
                └── ポーリングタイマーで定期更新
```

### 3.4 Zustand Store 構成

```typescript
interface DashboardState {
  // 選択状態
  selectedTeam: string | null;
  selectedMessage: ParsedMessage | null;
  selectedTask: Task | null;
  currentView: ViewType;  // 'overview' | 'timeline' | 'tasks' | 'files'

  // フィルター
  timeRange: TimeRange;
  messageFilter: MessageFilter;
  searchQuery: string;

  // ポーリング間隔（各データソースごとに個別設定可能）
  teamsInterval: number;      // チーム一覧（デフォルト30秒）
  tasksInterval: number;      // タスク一覧（デフォルト30秒）
  inboxInterval: number;      // インボックス（デフォルト30秒）
  messagesInterval: number;   // エージェントメッセージ（デフォルト30秒）

  // UI状態
  isDetailModalOpen: boolean;
  isTaskModalOpen: boolean;
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  autoScrollTimeline: boolean;
  isTaskPanelCollapsed: boolean;
}
```

---

## 4. バックエンドアーキテクチャ

### 4.1 レイヤー構成

```
┌─────────────────────────────────────────┐
│              API Layer                   │
│  (FastAPI Routes: teams, tasks,         │
│   messages, agents, timeline)           │
├─────────────────────────────────────────┤
│             Service Layer                │
│  - FileWatcherService (監視・無効化)    │
│  - CacheService (TTLキャッシュ)         │
│  - TimelineService (統合タイムライン)   │
│  - AgentStatusService (状態推論)        │
│  - MessageParser (メッセージ解析)       │
├─────────────────────────────────────────┤
│              Model Layer                 │
│  (Pydantic: Team, Task, Message,        │
│   Timeline, Agent, Chat)                │
├─────────────────────────────────────────┤
│            Storage Layer                 │
│  (File System: ~/.claude/)              │
│  - teams/*/config.json                  │
│  - teams/*/inboxes/*.json               │
│  - tasks/*/*.json                       │
│  - projects/{hash}/*.jsonl              │
└─────────────────────────────────────────┘
```

### 4.2 ルーティング設計

| パス | メソッド | ハンドラ | 用途 |
|------|---------|----------|------|
| /api/health | GET | health_check | ヘルスチェック |
| /api/teams | GET | list_teams | チーム一覧（ステータス付き） |
| /api/teams/{name} | GET | get_team | チーム詳細 |
| /api/teams/{name} | DELETE | delete_team | チーム削除（stopped時のみ） |
| /api/teams/{name}/inboxes | GET | get_team_inboxes | インボックス一覧 |
| /api/teams/{name}/inboxes/{agent} | GET | get_agent_inbox | エージェント別インボックス |
| /api/teams/{name}/messages/timeline | GET | get_team_messages_timeline | 統合タイムライン |
| /api/tasks | GET | list_tasks | タスク一覧 |
| /api/tasks/{team}/{task_id} | GET | get_task | タスク詳細 |
| /api/agents | GET | list_agents | エージェント一覧 |
| /api/history | GET | get_history | 統合履歴取得 |
| /api/updates | GET | get_updates | 差分更新取得 |
| /api/file-changes/{team} | GET | get_file_changes | ファイル変更一覧 |

### 4.3 サービス構成

#### CacheService
- **役割**: メモリキャッシュによるファイルアクセス削減
- **TTL**: チーム設定 30秒、インボックス 60秒
- **機能**: 自動期限切れ、手動無効化、統計情報
- **無効化トリガー**: FileWatcherService からのファイル変更通知

#### FileWatcherService
- **役割**: `~/.claude/` ディレクトリの変更監視
- **主目的**: **キャッシュ無効化 + ログ出力**（UI更新は HTTP ポーリング）
- **デバウンス**: 500ms
- **検知パターン**:
  - `teams/*/config.json` → キャッシュ無効化 + ログ出力
  - `teams/*/inboxes/*.json` → キャッシュ無効化 + ログ出力
  - `tasks/*/*.json` → ログ出力のみ

#### TimelineService
- **役割**: inbox + セッションログの統合
- **入力**:
  - `teams/{name}/inboxes/{agent}.json`
  - `projects/{hash}/{sessionId}.jsonl`
- **出力**: 時系列ソート済みの統合タイムライン

#### AgentStatusService
- **役割**: エージェント状態の推論
- **入力**: タスク定義、インボックス、セッションログ
- **判定ロジック**:
  - `idle`: 5分以上無活動
  - `working`: in_progress タスクあり
  - `waiting`: blocked タスクあり
  - `error`: 30分以上無活動
  - `completed`: 全タスク完了

#### MessageParser
- **役割**: メッセージの解析・分類
- **対応タイプ**: message, task_assignment, task_completed, idle_notification 等

### 4.4 チーム削除 API

**エンドポイント**: `DELETE /api/teams/{team_name}`

**削除可能なステータス**: `stopped`, `inactive`, `unknown`

**削除対象**:
1. `teams/{team_name}/` ディレクトリ全体
2. `tasks/{team_name}/` ディレクトリ全体
3. セッションファイル（`projects/{hash}/{session}.jsonl`）のみ
   - プロジェクトディレクトリ自体は残す（他チームの可能性）

**エラーレスポンス**:
- `404 Not Found`: チームが存在しない
- `400 Bad Request`: ステータスが `active`（削除不可）

### 4.5 ミドルウェア構成

| ミドルウェア | 用途 |
|-------------|------|
| CORSMiddleware | クロスオリジン許可 |
| Lifespan | 起動/終了時処理（FileWatcher, CacheService） |

---

## 5. 通信プロトコル

### 5.1 REST API

- **形式**: JSON
- **メソッド**: GET, DELETE（読み取り + チーム削除のみ）
- **エラー**: HTTP ステータスコード + detail メッセージ

### 5.2 HTTP ポーリング（リアルタイム更新）

フロントエンドは以下のフックで定期的にデータを更新：

| フック | API | デフォルト間隔 |
|--------|-----|---------------|
| useTeams | GET /api/teams | 30秒 |
| useTasks | GET /api/tasks | 30秒 |
| useInbox | GET /api/teams/{name}/inboxes | 30秒 |
| useUnifiedTimeline | GET /api/history | 30秒 |

**差分更新**: `/api/updates?since={timestamp}` で前回以降の変更のみ取得可能

---

## 6. モジュール間の依存関係

### 6.1 バックエンド依存関係図

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

### 6.2 フロントエンド依存関係図

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
│   │   ├── TeamCard.tsx (StatusBadge含む)
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

## 7. デプロイ構成

### 7.1 開発環境

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
         │   - teams/       │
         │   - tasks/       │
         │   - projects/    │
         └──────────────────┘
```

### 7.2 本番環境（想定）

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
                    │   - teams/       │
                    │   - tasks/       │
                    │   - projects/    │
                    └──────────────────┘
```

### 7.3 インフラ要件

| 項目 | 要件 |
|------|------|
| Python | 3.11+ |
| Node.js | 18+ |
| メモリ | 最小512MB |
| ディスク | ~/.claude/へのアクセス |

---

## 8. セキュリティ設計

### 8.1 現在の実装

| 項目 | 実装状況 |
|------|----------|
| CORS | 許可オリジン制限 |
| 入力検証 | Pydantic バリデーション |
| エラーハンドリング | HTTP例外処理 |
| 削除保護 | active チームの削除禁止 |

### 8.2 将来の拡張予定

| 項目 | 計画 |
|------|------|
| 認証 | API Key / OAuth |
| 認可 | ロールベースアクセス制御 |
| 暗号化 | HTTPS / WSS |
| ログ | 監査ログ |

---

## 9. 拡張性

### 9.1 拡張ポイント

| レイヤー | 拡張ポイント |
|----------|-------------|
| Frontend | 新規コンポーネント追加、新規ビュー追加 |
| Store | 新規状態スライス追加 |
| API | 新規エンドポイント追加 |
| Service | 新規データソース統合（TimelineService拡張） |
| Cache | 新規キャッシュタイプ追加 |

### 9.2 設計原則

- **単一責任**: 各モジュールは単一の責務を持つ
- **依存性注入**: 設定は環境変数から注入
- **インターフェース分離**: 明確なモジュール境界
- **関心の分離**: UI、状態管理、データ取得を分離
- **YAGNI**: 必要な機能のみ実装、過剰な抽象化を避ける

---

*作成日: 2026-02-16*
*最終更新日: 2026-02-24*
*バージョン: 2.1.0*
