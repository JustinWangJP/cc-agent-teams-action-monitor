# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Agent Teams Dashboard - Claude Code Agent Teams のリアルタイム監視ダッシュボード。
`~/.claude/` ディレクトリを監視し、チーム構成、タスク進捗、エージェント活動を可視化します。

## 必須ガイドライン

### 言語設定

`.claude/rules/japanese-default.md` に従い、以下を遵守すること：

- すべての会話は**日本語**で行う
- コード内のコメントは**日本語**で記述
- エラーメッセージの説明は**日本語**
- ドキュメント生成は**日本語**
- 変数名・関数名は英語（camelCase / snake_case）

### Teamworks Skill（重要）

`.claude/skills/teamworks/SKILL.md` を参照し、**HARD-GATE**制約を厳守すること：

> **チーム体制をユーザーへ提示し、明示的な承認を得るまで、以下を一切実行してはならない:**
> - コードの記述・編集
> - ファイルの作成・変更
> - スキャフォールディング
> - その他すべての実装作業

## 技術スタック

### バックエンド
- **FastAPI** (Python 3.11+) - REST API サーバー
- **Pydantic v2** - データバリデーション・設定管理
- **Watchdog** - ファイルシステム監視

### フロントエンド
- **React 18** - UIフレームワーク
- **TypeScript 5.3+** - 型安全な開発
- **Vite 5** - ビルドツール
- **TanStack Query (React Query)** - データフェッチング・キャッシュ
- **Zustand** - 状態管理
- **Tailwind CSS 3.4** - スタイリング

## 開発コマンド

### バックエンド (backend/)

```bash
# 依存関係インストール
cd backend
pip install -e ".[dev]"

# 開発サーバー起動
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# テスト実行
pytest                                    # 全テスト実行
pytest -v                                # 詳細出力
pytest tests/test_api_teams.py -v        # 個別テストファイル
pytest tests/test_api_teams.py::test_get_team -v  # 特定テスト関数
pytest --cov=app --cov-report=html       # カバレッジ付き

# カバレッジレポート確認
open htmlcov/index.html
```

### フロントエンド (frontend/)

```bash
# 依存関係インストール
cd frontend
npm install

# 開発サーバー起動 (http://localhost:5173)
npm run dev

# 型チェック
npx tsc --noEmit                         # 型エラー確認（ビルドなし）

# テスト実行
npm run test                             # テスト実行（単発）
npm run test:watch                       # ウォッチモード
npm run test:coverage                    # カバレッジ付き
npm run test:ui                          # UIモード

# 本番ビルド（tsc + vite build）
npm run build

# ビルドプレビュー
npm run preview
```

## 高レベルアーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ useTeams    │  │ useTasks    │  │ useInbox            │  │
│  │ (RQ poll)   │  │ (RQ poll)   │  │ (RQ poll)           │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │ HTTP           │ HTTP               │ HTTP
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ /api/teams  │  │ /api/tasks  │  │ CacheService        │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
│                                              │              │
│  ┌───────────────────────────────────────────▼────────────┐ │
│  │              FileWatcherService                         │ │
│  │         (watchdog で ~/.claude/ を監視)                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
          │
          ▼ ファイル変更イベント（ログ出力のみ）
┌─────────────────────────────────────────────────────────────┐
│              ~/.claude/ ディレクトリ構造                      │
│  ├── teams/{team_name}/config.json      # チーム設定         │
│  │   └── inboxes/{agent_name}.json      # エージェント別受信箱│
│  ├── tasks/{team_name}/{task_id}.json   # タスク定義         │
│  └── projects/{project-hash}/           # セッションログ     │
│      └── {sessionId}.jsonl              # セッション履歴     │
└─────────────────────────────────────────────────────────────┘
```

### ライフサイクル管理（重要）

`app/main.py` の `lifespan` コンテキストマネージャーで以下のサービスを管理：

1. **FileWatcherService** - `~/.claude/` のファイル変更を監視（ログ出力のみ）
2. **CacheService** - チーム設定・インボックスのキャッシュ管理（TTL: 30秒/60秒）

```python
# startup で開始、shutdown で停止
@asynccontextmanager
async def lifespan(app: FastAPI):
    watcher = FileWatcherService()
    await watcher.start()        # watchdog 監視開始
    app.state.watcher = watcher

    cache = await start_cache_service(config_ttl=30, inbox_ttl=60)
    app.state.cache = cache

    yield

    await watcher.stop()         # 監視停止
    await stop_cache_service()   # キャッシュ解放
```

### データフェッチング（React Query）

HTTP Polling によるリアルタイム更新：

| フック | API エンドポイント | ポーリング間隔 | 用途 |
|--------|-------------------|---------------|------|
| `useTeams` | `GET /api/teams` | 30秒（設定可） | チーム一覧 |
| `useTasks` | `GET /api/tasks` | 30秒（設定可） | タスク一覧 |
| `useInbox` | `GET /api/teams/{name}/inboxes` | 30秒（設定可） | インボックス |
| `useAgentMessages` | `GET /api/teams/{name}/inboxes/{agent}` | 30秒（設定可） | エージェント別メッセージ |

ポーリング間隔は Zustand Store で管理（5s/10s/20s/30s/60sから選択可能）。

```typescript
// dashboardStore.ts
const DEFAULT_POLLING_INTERVAL = 30000; // 30秒
```

### 重要なパス・エイリアス

#### バックエンド
- モジュールパス: `app.*` で統一（例: `from app.models.team import Team`）

#### フロントエンド（vite.config.ts）
- エイリアス: `@/` → `src/` （例: `import { useTeams } from '@/hooks/useTeams'`）
- プロキシ: `/api` → `http://127.0.0.1:8000`（開発時のCORS回避）

```typescript
// vite.config.ts
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
    },
  },
}
```

### ファイル監視とキャッシュ無効化

FileWatcherService は以下のパターンを検知（ログ出力のみ、500msデバウンス）：

| パターン | イベント | キャッシュ無効化メソッド |
|---------|---------|------------------------|
| `**/teams/*/config.json` | チーム設定変更 | `invalidate_team_config(team_name)` |
| `**/teams/*/inboxes/*.json` | インボックス更新 | `invalidate_team_inbox(team_name, agent_name)` |
| `**/tasks/*/*.json` | タスク状態変更 | ログ出力のみ |

ファイル変更検知時、対応するキャッシュを自動的に無効化し、次回のAPI呼び出しで新しいデータが返されます。

### ダークモード実装

Tailwind CSS のクラスベースダークモード（`darkMode: 'class'`）を使用：

- `html` 要素に `dark` クラスを付与/削除で切り替え
- Zustand Store で状態管理（`isDarkMode`）、ローカルストレージへ永続化
- システム設定の検出は行わず、手動切り替えのみ対応

### フロントエンドテスト環境

`src/test/setup.ts` で以下のグローバルモックを設定：

| モック | 用途 |
|--------|------|
| `IntersectionObserver` | 可視性検出（無限スクロール等） |
| `ResizeObserver` | リサイズ検出 |
| `localStorage` | ストレージ操作のモック |
| `matchMedia` | メディアクエリ（ダークモード検出等） |

テストファイルは `**/__tests__/**/*.test.tsx` パターンで配置し、Vitest + React Testing Library を使用。

### テストカバレッジ要件

`backend/pyproject.toml` で最低70%を要求：

```toml
[tool.pytest.ini_options]
addopts = [
    "--cov-fail-under=70"
]
```

## 主要コンポーネント

### バックエンド

| ファイル | 説明 |
|---------|------|
| `app/main.py` | FastAPI エントリーポイント、lifespan 管理（FileWatcher/CacheService） |
| `app/config.py` | Pydantic Settings（環境変数プレフィックス: `DASHBOARD_`） |
| `app/api/routes/teams.py` | チーム REST API、インボックスAPI |
| `app/api/routes/tasks.py` | タスク REST API |
| `app/api/routes/messages.py` | メッセージ関連 API |
| `app/api/routes/agents.py` | エージェント関連 API |
| `app/api/routes/timeline.py` | タイムライン API（セッションログ統合） |
| `app/services/timeline_service.py` | inbox + セッションログ統合サービス |
| `app/services/agent_status_service.py` | エージェント状態推論サービス |
| `app/services/file_watcher.py` | watchdog によるファイル監視、ログ出力のみ |
| `app/services/cache_service.py` | TTLベースキャッシュ、クリーンアップ間隔5分 |
| `app/models/*.py` | Pydantic データモデル |

### フロントエンド

| ファイル | 説明 |
|---------|------|
| `src/hooks/useTeams.ts` | チームデータ取得（React Query + ポーリング） |
| `src/hooks/useTasks.ts` | タスクデータ取得（React Query + ポーリング） |
| `src/hooks/useInbox.ts` | インボックス取得（React Query + ポーリング） |
| `src/hooks/useAgentMessages.ts` | エージェント別メッセージ取得（React Query + ポーリング） |
| `src/hooks/useFileChanges.ts` | ファイル変更監視フック |
| `src/hooks/useUnifiedTimeline.ts` | 統合タイムラインデータ取得フック |
| `src/stores/dashboardStore.ts` | Zustand Store（ポーリング間隔管理含む） |
| `src/components/dashboard/TeamCard.tsx` | チームカード表示 |
| `src/components/tasks/TaskCard.tsx` | タスクカード表示 |
| `src/components/chat/ChatMessageBubble.tsx` | メッセージバブル（inbox/session統合表示） |
| `src/types/*.ts` | TypeScript 型定義 |

## 環境変数

バックエンドは `DASHBOARD_` プレフィックスの環境変数で設定：

| 環境変数 | デフォルト | 説明 |
|---------|-----------|------|
| `DASHBOARD_HOST` | `127.0.0.1` | サーバー待ち受けアドレス |
| `DASHBOARD_PORT` | `8000` | サーバー待ち受けポート |
| `DASHBOARD_DEBUG` | `True` | デバッグモード |
| `DASHBOARD_CLAUDE_DIR` | `~/.claude` | Claude データディレクトリ |

## セッションログ監視（統合タイムライン）

### セッションログの場所

Claude Code のセッションログは以下のパスに保存されます：

```
~/.claude/projects/{project-hash}/{sessionId}.jsonl
```

- **project-hash**: cwd（作業ディレクトリ）から生成（先頭に `-` を付与し、`/` を `-` に置換）
- **sessionId**: チーム設定（`config.json`）の `leadSessionId` から取得

### 統合タイムラインサービス

`TimelineService` が inbox メッセージとセッションログを統合：

| データソース | ファイルパス | 用途 |
|------------|-------------|------|
| inbox | `teams/{name}/inboxes/{agent}.json` | エージェント間メッセージ |
| session | `projects/{hash}/{sessionId}.jsonl` | セッション履歴（thinking, tool_use, file_change 等） |

### セッションログエントリタイプ

| タイプ | 内容 | 表示アイコン |
|--------|------|-------------|
| `user_message` | ユーザー入力 | 👤 |
| `assistant_message` | アシスタント応答 | 🤖 |
| `thinking` | 思考プロセス | 💭 |
| `tool_use` | ツール呼び出し | 🔧 |
| `file_change` | ファイル変更 | 📁 |

### エージェント状態推論

`AgentStatusService` が以下の情報からエージェント状態を推論：

| 状態 | 判定条件 | 表示 |
|------|---------|------|
| `idle` | 5分以上無活動 | 💤 待機中 |
| `working` | in_progressタスクあり | 🔵 作業中 |
| `waiting` | blockedなタスクあり | ⏳ 待ち状態 |
| `error` | 30分以上無活動 | ❌ エラー |
| `completed` | 全タスク完了 | ✅ 完了 |

状態推論に使用するデータ：
- inbox メッセージ（task_assignment, task_completed 等）
- タスク定義（owner, status, blockedBy）
- セッションログ（最終活動時刻、使用モデル）

### ファイル変更履歴

`file-history-snapshot` エントリからファイル変更を抽出：

| 操作 | アイコン | 色 |
|------|---------|-----|
| `created` | ✨ | 緑 |
| `modified` | ✏️ | 青 |
| `deleted` | 🗑️ | 赤 |
| `read` | 📖 | 灰 |

### タイムラインAPIエンドポイント

| エンドポイント | 用途 | パラメータ |
|--------------|------|-----------|
| `GET /api/history` | 統合タイムライン取得 | `team_name`, `limit`, `types`, `before_event_id` |
| `GET /api/updates` | 差分更新取得 | `team_name`, `since`（ISO8601タイムスタンプ） |
| `GET /api/file-changes/{team}` | ファイル変更一覧 | `team_name` |

差分更新（`/api/updates`）により、ポーリング時のデータ転送を最小化します。

詳細ドキュメントは `docs/` に配置:
- `architecture.md` - アプリケーションアーキテクチャ
- `backend-tech-stack.md` - バックエンド技術詳細
- `frontend-tech-stack.md` - フロントエンド技術詳細
- `system-design.md` - システム設計書
- `ut-plan.md` - ユニットテスト計画
- `user-guide.md` - ユーザーガイド
