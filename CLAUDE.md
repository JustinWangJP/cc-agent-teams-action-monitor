# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Agent Teams Dashboard - Claude Code Agent Teams のリアルタイム監視ダッシュボード。
~/.claude/ ディレクトリを監視し、チーム構成、タスク進捗、エージェント活動を可視化します。

## 技術スタック

### バックエンド
- **FastAPI** (Python 3.11+) - REST API サーバー
- **Pydantic v2** - データバリデーション・設定管理
- **WebSocket** - リアルタイム通信
- **Watchdog** - ファイルシステム監視

### フロントエンド
- **React 18** - UIフレームワーク
- **TypeScript 5.3+** - 型安全な開発
- **Vite 5** - ビルドツール
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
pytest

# 個別テスト実行
pytest tests/test_xxx.py -v
```

### フロントエンド (frontend/)

```bash
# 依存関係インストール
cd frontend
npm install

# 開発サーバー起動 (http://localhost:5173)
npm run dev

# 本番ビルド
npm run build

# ビルドプレビュー
npm run preview
```

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ useTeams    │  │ useTasks    │  │ useWebSocket        │  │
│  │ (polling)   │  │ (polling)   │  │ (real-time)         │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼───────────────────┼──────────────┘
          │ HTTP           │ HTTP              │ WebSocket
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ /api/teams  │  │ /api/tasks  │  │ ConnectionManager   │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
│                                              │              │
│  ┌───────────────────────────────────────────▼────────────┐ │
│  │              FileWatcherService                         │ │
│  │         (watchdog で ~/.claude/ を監視)                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
          │
          ▼ ファイル変更イベント
┌─────────────────────────────────────────────────────────────┐
│              ~/.claude/ ディレクトリ構造                      │
│  ├── teams/{team_name}/config.json      # チーム設定         │
│  │   └── inboxes/{agent_name}.json      # エージェント別受信箱│
│  └── tasks/{team_name}/{task_id}.json   # タスク定義         │
└─────────────────────────────────────────────────────────────┘
```

## 主要コンポーネント

### バックエンド

| ファイル | 説明 |
|---------|------|
| `app/main.py` | FastAPI エントリーポイント、lifespan 管理 |
| `app/config.py` | Pydantic Settings による設定管理 |
| `app/api/routes/websocket.py` | WebSocket 接続管理、チャンネル別ブロードキャスト |
| `app/api/routes/teams.py` | チーム REST API |
| `app/api/routes/tasks.py` | タスク REST API |
| `app/services/file_watcher.py` | ~/.claude/ 監視、デバウンス処理 |
| `app/models/*.py` | Pydantic データモデル |

### フロントエンド

| ファイル | 説明 |
|---------|------|
| `src/hooks/useWebSocket.ts` | WebSocket 接続、再接続ロジック |
| `src/hooks/useTeams.ts` | チームデータ取得 (ポーリング + WebSocket) |
| `src/hooks/useTasks.ts` | タスクデータ取得 (ポーリング + WebSocket) |
| `src/components/dashboard/TeamCard.tsx` | チームカード表示 |
| `src/components/tasks/TaskCard.tsx` | タスクカード表示 |
| `src/components/layout/Layout.tsx` | ページレイアウト |
| `src/types/*.ts` | TypeScript 型定義 |

## WebSocket チャンネル

- **dashboard**: チーム設定更新、インボックスメッセージ
- **tasks**: タスク作成・更新・完了イベント

## ファイル監視パターン

FileWatcherService は以下のパターンを検知:

1. `**/teams/*/config.json` → `team_update` イベント
2. `**/teams/*/inboxes/*.json` → `inbox_update` イベント
3. `**/tasks/*/*.json` → `task_update` イベント

デバウンス: 500ms（連続イベントの抑制）

## 通信パターン

### WebSocket 再接続
- 指数バックオフ: 1s → 2s → 4s → 8s (最大 30s)
- ポーリングフォールバック: WebSocket 接続不可時に HTTP ポーリング

### API プロキシ設定 (vite.config.ts)
```typescript
proxy: {
  '/api': { target: 'http://127.0.0.1:8000' },
  '/ws':  { target: 'ws://127.0.0.1:8000', ws: true }
}
```

## ドキュメント

詳細ドキュメントは `docs/` に配置:
- `architecture.md` - アプリケーションアーキテクチャ
- `backend-tech-stack.md` - バックエンド技術詳細
- `frontend-tech-stack.md` - フロントエンド技術詳細
- `system-design.md` - システム設計書
- `ut-plan.md` - ユニットテスト計画
- `user-guide.md` - ユーザーガイド
