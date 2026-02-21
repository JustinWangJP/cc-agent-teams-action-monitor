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
│  │  └───────────┘  └───────────┘  └────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │ HTTP/REST              │ WebSocket                        │
│         ▼                        ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Backend (FastAPI)                         │   │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────────────┐   │   │
│  │  │API Routes │  │ WebSocket │  │ File Watcher Service   │   │   │
│  │  └───────────┘  └───────────┘  └────────────────────────┘   │   │
│  │  ┌───────────┐  ┌───────────┐                                │   │
│  │  │  Models   │  │  Config   │                                │   │
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
| 状態管理 | Custom Hooks | データ取得、状態管理 |
| 通信 | REST/WebSocket | サーバー通信 |
| API | FastAPI Routes | エンドポイント処理 |
| サービス | File Watcher | ファイル監視 |
| データ | Pydantic Models | データ定義・検証 |
| ストレージ | File System | データ永続化 |

---

## 2. フロントエンドアーキテクチャ

### 2.1 コンポーネント階層

```
App (メイン)
├── Layout
│   ├── Header
│   └── children
├── TeamSection
│   └── TeamCard[]
├── TaskSection
│   └── TaskCard[]
└── ActivitySection
    └── ActivityFeed
```

### 2.2 状態管理パターン

- **ローカル状態**: useState (コンポーネント内)
- **サーバー状態**: カスタムフック + ポーリング
- **リアルタイム状態**: WebSocket接続

### 2.3 データフロー

```
User Action → Component → Hook → API/WebSocket → Backend
                                               ↓
Component ← Hook ← State Update ← Response ←────┘
```

---

## 3. バックエンドアーキテクチャ

### 3.1 レイヤー構成

```
┌─────────────────────────────────────────┐
│              API Layer                   │
│  (FastAPI Routes: teams, tasks, ws)     │
├─────────────────────────────────────────┤
│             Service Layer                │
│  (FileWatcher, ConnectionManager)       │
├─────────────────────────────────────────┤
│              Model Layer                 │
│  (Pydantic: Team, Task, Message)        │
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
| /api/tasks | list_tasks | タスク一覧 |
| /ws/{channel} | websocket_endpoint | リアルタイム通信 |

### 3.3 ミドルウェア構成

| ミドルウェア | 用途 |
|-------------|------|
| CORSMiddleware | クロスオリジン許可 |
| Lifespan | 起動/終了時処理 |

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

### 5.1 依存関係図

```
main.py
├── config.py
├── api/routes/teams.py
│   ├── models/team.py
│   └── config.py
├── api/routes/tasks.py
│   ├── models/task.py
│   └── config.py
├── api/routes/websocket.py
│   └── (standalone)
└── services/file_watcher.py
    ├── config.py
    └── api/routes/websocket.py (ConnectionManager)
```

### 5.2 インターフェース定義

**Settings (config.py)**
- host, port, debug: サーバー設定
- claude_dir, teams_dir, tasks_dir: パス設定
- cors_origins: CORS設定

**ConnectionManager (websocket.py)**
- connect(websocket, channel): 接続確立
- disconnect(websocket, channel): 接続解除
- broadcast(channel, message): 一斉送信

**FileWatcherService (file_watcher.py)**
- start(): 監視開始
- stop(): 監視停止

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
| Frontend | 新規コンポーネント追加 |
| API | 新規エンドポイント追加 |
| WebSocket | 新規チャンネル追加 |
| Service | 新規サービス追加 |

### 8.2 設計原則

- **単一責任**: 各モジュールは単一の責務を持つ
- **依存性注入**: 設定は環境変数から注入
- **インターフェース分離**: 明確なモジュール境界

---

*作成日: 2026-02-16*
*バージョン: 1.0.0*
