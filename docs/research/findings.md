# コードベース調査レポート

## 1. プロジェクト概要

### プロジェクト名
**Agent Teams Dashboard** (Claude Code Agent Teams Monitoring Dashboard)

### 目的
Claude CodeのAgent Teams機能をリアルタイムに監視・管理するためのダッシュボードアプリケーション。チームの状態、タスクの進捗、エージェント間のメッセージ通信を可視化する。

### 主要な機能
- **チーム監視**: Claude Codeで作成されたチームの一覧表示、メンバー構成の確認
- **タスク管理**: チームごとのタスク進捗状況の表示（pending/in_progress/completed）
- **リアルタイム更新**: WebSocketによるファイルシステム変更の監視と自動更新
- **アクティビティフィード**: チーム内のメッセージ、タスク更新、メンバー変更の履歴表示

---

## 2. 使用技術スタック

### バックエンド

| カテゴリ | 技術 |
|----------|------|
| 言語 | Python 3.11+ |
| フレームワーク | FastAPI 0.109.0+ |
| ASGIサーバー | Uvicorn 0.27.0+ |
| データ検証 | Pydantic 2.5.0+, pydantic-settings 2.1.0+ |
| ファイル監視 | watchdog 4.0.0+ |
| WebSocket | websockets 12.0+ |
| ビルドツール | hatchling |

### フロントエンド

| カテゴリ | 技術 |
|----------|------|
| 言語 | TypeScript 5.3.0+ |
| フレームワーク | React 18.2.0 |
| バンドラー | Vite 5.0.0+ |
| CSSフレームワーク | Tailwind CSS 3.4.0+ |
| コンポーネント | カスタムコンポーネント |
| E2Eテスト | Puppeteer 24.37.3+ |

---

## 3. ディレクトリ構造

```
cc-agent-teams-action-monitor/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPIアプリケーションエントリーポイント
│   │   ├── config.py            # 設定管理（Pydantic Settings）
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── teams.py     # チーム関連API
│   │   │   │   ├── tasks.py     # タスク関連API
│   │   │   │   └── websocket.py # WebSocketエンドポイント
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── team.py          # Team/Member/TeamSummaryモデル
│   │   │   ├── task.py          # Task/TaskSummary/TaskUpdateモデル
│   │   │   └── message.py       # InboxMessage/ProtocolMessage/ActivityEventモデル
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── file_watcher.py  # ~/.claude/ディレクトリ監視サービス
│   │   └── utils/
│   │       └── __init__.py
│   ├── tests/
│   │   └── __init__.py
│   └── pyproject.toml           # Python依存関係定義
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # メインアプリケーションコンポーネント
│   │   ├── main.tsx             # Reactエントリーポイント
│   │   ├── index.css            # グローバルスタイル（Tailwind）
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   └── StatusBadge.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── TeamCard.tsx
│   │   │   │   └── ActivityFeed.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Layout.tsx
│   │   │   └── tasks/
│   │   │       └── TaskCard.tsx
│   │   ├── hooks/
│   │   │   ├── useTeams.ts      # チームデータ取得フック
│   │   │   ├── useTasks.ts      # タスクデータ取得フック
│   │   │   └── useWebSocket.ts  # WebSocket接続管理フック
│   │   └── types/
│   │       ├── team.ts          # Team関連型定義
│   │       ├── task.ts          # Task関連型定義
│   │       └── message.ts       # Message関連型定義
│   ├── index.html
│   ├── package.json             # Node.js依存関係定義
│   ├── vite.config.ts           # Vite設定（プロキシ含む）
│   ├── tailwind.config.js       # Tailwind CSS設定
│   └── tsconfig.json            # TypeScript設定
│
├── docs/
│   └── research/
│       └── findings.md          # 本ドキュメント
│
└── CLAUDE.md                    # Claude Code用プロジェクトガイド
```

---

## 4. 主要コンポーネント一覧

### バックエンド

#### APIエンドポイント

| エンドポイント | メソッド | 説明 |
|----------------|----------|------|
| `/api/health` | GET | ヘルスチェック |
| `/api/teams` | GET | 全チーム一覧取得 |
| `/api/teams/{team_name}` | GET | 特定チーム詳細取得 |
| `/api/teams/{team_name}/inboxes` | GET | チームのインボックスメッセージ取得 |
| `/api/tasks` | GET | 全タスク一覧取得 |
| `/api/tasks/team/{team_name}` | GET | チーム別タスク取得 |
| `/api/tasks/{task_id}` | GET | 特定タスク詳細取得 |
| `/ws/{channel}` | WebSocket | リアルタイム更新チャンネル |

#### モデル（Pydantic）

**Team系** (`backend/app/models/team.py`)
- `Member`: チームメンバー情報
- `Team`: チーム詳細情報
- `TeamSummary`: チーム一覧用サマリー

**Task系** (`backend/app/models/task.py`)
- `Task`: タスク詳細情報
- `TaskSummary`: タスク一覧用サマリー
- `TaskUpdate`: タスク更新イベント

**Message系** (`backend/app/models/message.py`)
- `InboxMessage`: インボックスメッセージ
- `ProtocolMessage`: プロトコルメッセージ
- `ActivityEvent`: アクティビティフィードイベント

#### サービス

**FileWatcherService** (`backend/app/services/file_watcher.py`)
- `~/.claude/` ディレクトリを監視
- `watchdog.Observer` でファイル変更イベントを検知
- JSONファイルの変更時にWebSocketで更新をブロードキャスト
- デバウンス処理（500ms）で過剰なイベント発火を抑制

---

### フロントエンド

#### コンポーネント

**Common** (`src/components/common/`)
- `LoadingSpinner`: ローディング表示
- `StatusBadge`: ステータス表示バッジ

**Dashboard** (`src/components/dashboard/`)
- `TeamCard`: チームカード表示
- `ActivityFeed`: アクティビティフィード表示

**Layout** (`src/components/layout/`)
- `Header`: ヘッダー（タイトル、WebSocket接続状態）
- `Layout`: レイアウトラッパー

**Tasks** (`src/components/tasks/`)
- `TaskCard`: タスクカード表示

#### カスタムフック

| フック | 説明 |
|--------|------|
| `useTeams()` | チーム一覧取得、10秒間隔のポーリング |
| `useTeam(teamName)` | 特定チームの詳細取得 |
| `useTasks()` | タスク一覧取得、10秒間隔のポーリング |
| `useTeamTasks(teamName)` | チーム別タスク取得 |
| `useWebSocket(channel)` | WebSocket接続管理、自動再接続 |

#### 型定義

**team.ts**
- `Member`, `Team`, `TeamSummary`

**task.ts**
- `Task`, `TaskSummary`

**message.ts**
- `InboxMessage`, `ProtocolMessage`, `ActivityEvent`, `WebSocketMessage`

---

## 5. データフロー

### WebSocket通信の仕組み

```
┌─────────────────────────────────────────────────────────────────────┐
│                        データフロー概要                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ~/.claude/ディレクトリ                                              │
│       │                                                            │
│       │ ファイル変更                                                │
│       ▼                                                            │
│  ┌─────────────────────┐                                           │
│  │  FileWatcherService │  watchdogで監視                           │
│  └─────────────────────┘                                           │
│       │                                                            │
│       │ JSON解析・ルーティング                                       │
│       ▼                                                            │
│  ┌─────────────────────┐                                           │
│  │  ConnectionManager  │  WebSocket管理                            │
│  └─────────────────────┘                                           │
│       │                                                            │
│       │ ブロードキャスト                                            │
│       ▼                                                            │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │              WebSocket (/ws/{channel})                     │    │
│  │   - dashboard: チーム更新、インボックス更新                    │    │
│  │   - tasks: タスク更新                                       │    │
│  └───────────────────────────────────────────────────────────┘    │
│       ▲                                                            │
│       │                                                            │
│  ┌────┴───────────────────────────────────────────────────────┐    │
│  │                   useWebSocket Hook                         │    │
│  │  - 自動再接続（指数バックオフ）                               │    │
│  │  - ping/pongキープアライブ（30秒間隔）                         │    │
│  │  - ページリロード検知                                        │    │
│  └────────────────────────────────────────────────────────────┘    │
│       │                                                            │
│       │ メッセージ受信                                               │
│       ▼                                                            │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │                      App.tsx                               │    │
│  │  - lastMessage監視                                         │    │
│  │  - アクティビティ追加                                       │    │
│  │  - データ再取得                                             │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### メッセージタイプ

| タイプ | チャンネル | 説明 |
|--------|-----------|------|
| `team_update` | dashboard | チーム設定変更 |
| `inbox_update` | dashboard | インボックスメッセージ更新 |
| `task_update` | tasks | タスク状態変更 |
| `ping` / `pong` | 全て | キープアライブ |

### フロントエンドとバックエンドの連携

1. **初期ロード時**
   - `useTeams()` で `/api/teams` からチーム一覧を取得
   - `useTasks()` で `/api/tasks` からタスク一覧を取得
   - `useWebSocket('dashboard')` でWebSocket接続確立

2. **リアルタイム更新時**
   - FileWatcherがファイル変更を検知
   - 対応するWebSocketメッセージを送信
   - フロントエンドで `lastMessage` が更新
   - 適切なAPIを再コールしてデータを更新
   - アクティビティフィードにイベントを追加

3. **ポーリング（フォールバック）**
   - 10秒間隔でAPIを再コール
   - WebSocketが切断された場合のデータ整合性保証

---

## 6. 設定ファイル

### バックエンド設定

**config.py** - `Settings` クラス
```python
class Settings(BaseSettings):
    # サーバー設定
    host: str = "127.0.0.1"
    port: int = 8000
    debug: bool = True

    # Claudeディレクトリパス
    claude_dir: Path = Path.home() / ".claude"
    teams_dir: Path = Path.home() / ".claude" / "teams"
    tasks_dir: Path = Path.home() / ".claude" / "tasks"

    # CORS設定
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
```

環境変数プレフィックス: `DASHBOARD_`

### フロントエンド設定

**vite.config.ts**
- 開発サーバー: ポート5173
- プロキシ設定:
  - `/api` → `http://127.0.0.1:8000`
  - `/ws` → `ws://127.0.0.1:8000`

**tailwind.config.js**
- カスタムカラー: `primary` (青系)
- コンテンツ: `index.html`, `src/**/*.{js,ts,jsx,tsx}`

**tsconfig.json**
- ターゲット: ES2020
- JSX: react-jsx
- パスエイリアス: `@/*` → `src/*`
- 厳格モード: 有効

---

## 7. Claude Codeデータ構造

### チームデータ (`~/.claude/teams/{team_name}/`)

```
~/.claude/teams/{team_name}/
├── config.json          # チーム設定
└── inboxes/
    └── {agent_name}.json # エージェント別インボックス
```

**config.json 構造**
```json
{
  "name": "team-name",
  "description": "Team description",
  "createdAt": 1234567890,
  "leadAgentId": "team-lead",
  "leadSessionId": "session-uuid",
  "members": [
    {
      "agentId": "agent-id",
      "name": "Agent Name",
      "agentType": "type",
      "model": "model-name",
      "joinedAt": 1234567890,
      "tmuxPaneId": "pane-id",
      "cwd": "/path/to/cwd",
      "subscriptions": [],
      "color": "#color",
      "status": "active|idle"
    }
  ]
}
```

### タスクデータ (`~/.claude/tasks/{team_name}/`)

```
~/.claude/tasks/{team_name}/
└── {task_id}.json      # タスク定義
```

**task.json 構造**
```json
{
  "id": "task-id",
  "subject": "Task subject",
  "description": "Task description",
  "activeForm": "Active form text",
  "status": "pending|in_progress|completed|deleted",
  "owner": "agent-id",
  "blocks": ["task-id-1"],
  "blockedBy": ["task-id-2"],
  "metadata": {}
}
```

---

## 8. 技術的特徴

### バックエンドの特徴
- **非同期処理**: FastAPIのasync/awaitパターン
- **ファイル監視**: watchdogによるリアルタイム監視
- **デバウンス**: 500msのデバウンスで過剰なイベント発火を抑制
- **CORS対応**: ローカル開発環境のオリジンを許可
- **Lifespan管理**: アプリケーション起動/終了時のリソース管理

### フロントエンドの特徴
- **React Hooks**: カスタムフックによる状態管理
- **型安全**: TypeScriptによる厳格な型定義
- **自動再接続**: 指数バックオフ（最大30秒）
- **キープアライブ**: 30秒間隔のping/pong
- **ページリロード検知**: beforeunloadイベントで不要な再接続を防止
- **ポーリング併用**: WebSocket切断時のデータ整合性保証

### CSSの特徴
- **ユーティリティファースト**: Tailwind CSS
- **レスポンシブデザイン**: モバイルファーストのブレークポイント
- **カスタムクラス**: `.card`, `.status-badge`, `.status-*` など

---

## 9. 今後の拡張ポイント

1. **認証・認可**: 現在は未実装
2. **データベース**: ファイルシステムのみを使用
3. **E2Eテスト**: Puppeteerは依存関係にあるが、テストコード未実装
4. **エラーハンドリング**: 基本的な実装のみ
5. **ログ管理**: コンソール出力のみ
6. **パフォーマンス監視**: 未実装

---

*作成日: 2026-02-16*
*調査対象バージョン: 0.1.0*
