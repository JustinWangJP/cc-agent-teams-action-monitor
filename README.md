# Agent Teams Dashboard

Claude Code Agent Teams のリアルタイム監視ダッシュボード

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)

---

## 設計思想

### なぜ HTTP ポーリングなのか

本システムは **WebSocket ではなく HTTP ポーリング** を採用しています。理由は以下の通りです：

1. **シンプルなアーキテクチャ**: WebSocket 接続管理が不要で、ステートレスな API サーバーとして運用可能
2. **キャッシュの活用**: TanStack Query のキャッシュ機能（staleTime: 10秒）により、不要なリクエストを削減
3. **スケーラビリティ**: ポーリング間隔（5秒〜60秒）をユーザーが調整可能で、サーバー負荷を制御

### チームステータス判定ロジック

チームのステータスは **セッションログの mtime** で判定します：

| ステータス | 判定条件 | 削除可否 |
|-----------|---------|---------|
| `active` | セッションログ mtime ≤ 1時間 | ❌ 不可 |
| `stopped` | セッションログ mtime > 1時間 | ✅ 可能 |
| `unknown` | セッションログなし | ❌ 不可 |
| `inactive` | members 配列が空 | ❌ 不可 |

### データソース

| データ | ファイルパス |
|--------|------------|
| チーム設定 | `~/.claude/teams/{team_name}/config.json` |
| ステータス判定 | `~/.claude/projects/{project-hash}/{sessionId}.jsonl` |
| インボックス | `~/.claude/teams/{team_name}/inboxes/{agent_name}.json` |
| タスク | `~/.claude/tasks/{team_name}/{task_id}.json` |

---

## 目次

- [概要](#概要)
- [機能一覧](#機能一覧)
- [システム利用者向けガイド](#システム利用者向けガイド)
  - [前提条件](#前提条件)
  - [インストール手順](#インストール手順)
  - [起動方法](#起動方法)
  - [画面説明](#画面説明)
  - [操作方法](#操作方法)
  - [トラブルシューティング](#トラブルシューティング)
- [システム開発者向けガイド](#システム開発者向けガイド)
  - [技術スタック](#技術スタック)
  - [プロジェクト構造](#プロジェクト構造)
  - [開発環境セットアップ](#開発環境セットアップ)
  - [API仕様](#api仕様)
  - [テスト](#テスト)
  - [コーディング規約](#コーディング規約)
- [システム運用者向けガイド](#システム運用者向けガイド)
  - [システム要件](#システム要件)
  - [デプロイ構成](#デプロイ構成)
  - [環境変数](#環境変数)
  - [監視・ロギング](#監視ロギング)
  - [バックアップ・復旧](#バックアップ復旧)
- [アーキテクチャ](#アーキテクチャ)
- [ライセンス](#ライセンス)

---

## 概要

Agent Teams Dashboard は、Claude Code の Agent Teams 機能をリアルタイムに監視・管理するための Web アプリケーションです。`~/.claude/` ディレクトリを監視し、チーム構成、タスク進捗、エージェント間のメッセージングを可視化します。

### 主な特徴

- **リアルタイム更新**: HTTP Polling による自動データ更新
- **チーム監視**: アクティブなエージェントチームの一覧表示
- **タスク管理**: ステータス別のタスク可視化
- **アクティビティフィード**: エージェント間のメッセージ履歴
- **レスポンシブデザイン**: デスクトップ・タブレット・モバイル対応

---

## 機能一覧

| 機能 | 説明 |
|------|------|
| チーム一覧表示 | アクティブなエージェントチームをカード形式で表示 |
| チーム詳細表示 | メンバー情報、ステータス、最終活動時刻 |
| チームステータス判定 | セッションログ mtime による自動判定（active/stopped/unknown/inactive） |
| チーム削除 | stopped 状態のチームのみ削除可能 |
| タスク一覧表示 | ステータス別（Pending/In Progress/Completed）タスク表示 |
| タスク詳細表示 | 説明、所有者、依存関係の表示 |
| 統合タイムライン | inbox + セッションログの統合表示 |
| エージェント状態推論 | タスク状態・活動時刻からの状態推論（working/idle/waiting/completed/error） |
| アクティビティフィード | リアルタイムのエージェント活動履歴 |
| 自動更新 | HTTP Polling によるデータ自動更新（間隔設定可: 5秒〜60秒） |
| ダークモード | テーマ切り替え対応 |

---

# システム利用者向けガイド

このセクションは、Agent Teams Dashboard を使用して Claude Code Agent Teams を監視するエンドユーザー向けです。

## 前提条件

### 必須環境

| ソフトウェア | バージョン | 確認コマンド |
|-------------|-----------|-------------|
| Python | 3.11以上 | `python --version` |
| Node.js | 18以上 | `node --version` |
| npm | 9以上 | `npm --version` |

### Claude Code 環境

- Claude Code がインストールされていること
- Agent Teams 機能を使用していること
- `~/.claude/` ディレクトリが存在すること

### ハードウェア要件

| 項目 | 最小要件 | 推奨要件 |
|------|----------|----------|
| CPU | 2コア | 4コア以上 |
| メモリ | 512MB | 1GB以上 |
| ディスク | 100MB | 500MB以上 |

### ネットワーク要件

- ポート 8000（バックエンド API）
- ポート 5173（フロントエンド開発サーバー）

---

## インストール手順

### ステップ 1: リポジトリのクローン

```bash
git clone <repository-url>
cd cc-agent-teams-action-monitor
```

### ステップ 2: バックエンドのセットアップ

```bash
# バックエンドディレクトリに移動
cd backend

# 依存関係をインストール
pip install -e ".[dev]"

# インストール確認
python -c "from app.main import app; print('Backend setup completed!')"
```

### ステップ 3: フロントエンドのセットアップ

```bash
# フロントエンドディレクトリに移動
cd ../frontend

# 依存関係をインストール
npm install

# インストール確認
npm run build
```

---

## 起動方法

### バックエンドの起動

```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**起動成功時の出力:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
File watcher started on /Users/xxx/.claude
INFO:     Application startup complete.
```

### フロントエンドの起動

別のターミナルで実行:

```bash
cd frontend
npm run dev
```

**起動成功時の出力:**
```
VITE v5.0.0  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

### アクセス方法

ブラウザで http://localhost:5173/ にアクセスしてください。

---

## 画面説明

### ダッシュボード画面レイアウト

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Agent Teams Dashboard                              ● Connected          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Active Teams (3 teams)                          │  Activity Feed        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │  ┌─────────────────┐ │
│  │ ● my-team   │ │ ● dev-team  │ │ ○ test-team │ │  │ 📨 Message from │ │
│  │ 3 members   │ │ 2 members   │ │ 1 member    │ │  │    agent-1      │ │
│  │ Lead: alice │ │ Lead: bob   │ │ Lead: carol │ │  │ ✅ Task #12     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ │  │    completed    │ │
│                                                   │  │ 📝 New task     │ │
│  Tasks Overview (5 tasks)                        │  │    created      │ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │  │ ...             │ │
│  │ ⏳ Pending  │ │ 🔄 Progress │ │ ✅ Complete │ │  │                 │ │
│  │    2        │ │    2        │ │    1        │ │  │                 │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ │  └─────────────────┘ │
│                                                   │                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 各セクションの説明

| セクション | 説明 | 更新タイミング |
|-----------|------|---------------|
| **ヘッダー** | タイトルと接続状態 | リアルタイム |
| **Active Teams** | アクティブなチーム一覧 | チーム設定変更時 |
| **Tasks Overview** | ステータス別タスク数 | タスク状態変更時 |
| **Activity Feed** | エージェント活動履歴 | メッセージ/タスク更新時 |

### ステータスインジケーター

| 表示 | 状態 | 説明 |
|------|------|------|
| ● 緑色 | Connected | HTTP接続正常 |
| ● 黄色 | Connecting | 再接続中 |
| ● 赤色 | Disconnected | 接続切断 |

### チームステータス

| バッジ | ステータス | 説明 |
|--------|-----------|------|
| 🟢 active | セッションログ mtime ≤ 1時間 | チームが活動中 |
| ⚫ stopped | セッションログ mtime > 1時間 | チームが停止（削除可能） |
| ⚪ unknown | セッションログなし | ステータス不明 |
| ⚫ inactive | members なし | メンバー不在 |

### エージェント状態

| 表示 | 状態 | 説明 |
|------|------|------|
| 🔵 working | in_progress タスクあり | 作業中 |
| 💤 idle | 5分以上無活動 | 待機中 |
| ⏳ waiting | blocked タスクあり | 待ち状態 |
| ✅ completed | 全タスク完了 | 完了 |
| ❌ error | 30分以上無活動 | エラー状態 |

### ポーリング間隔調整

ヘッダーからポーリング間隔を調整できます：
- 5秒 / 10秒 / 20秒 / 30秒（デフォルト）/ 60秒
- staleTime: 10秒（キャッシュ有効期間）

---

## 操作方法

### チームの選択

1. 表示されているチームカードをクリック
2. 選択されたチームがハイライト表示されます
3. もう一度クリックすると選択が解除されます

### チームの削除

1. stopped 状態のチームカードに表示される🗑️アイコンをクリック
2. 確認ダイアログで「削除」をクリック
3. チーム設定、タスク、セッションログが削除されます

**注意**: active 状態のチームは削除できません。

### ポーリング間隔の変更

1. ヘッダーのポーリング間隔セレクターを使用
2. 5秒〜60秒から選択可能
3. デフォルトは30秒

### タスクの確認

タスクはステータス別に色分け表示されます:

| ステータス | 色 | 説明 |
|-----------|-----|------|
| Pending | 灰色 | 未着手のタスク |
| In Progress | 青色 | 作業中のタスク |
| Completed | 緑色 | 完了したタスク |

### 接続状態の確認

ヘッダー右側のインジケーターで現在の接続状態を確認できます。切断時は自動的に再接続を試行します。

---

## トラブルシューティング

### よくある問題と解決方法

| 問題 | 原因 | 解決方法 |
|------|------|----------|
| チームが表示されない | `~/.claude/teams/` が空 | Claude Code でチームを作成してください |
| HTTP 接続エラー | バックエンド停止 | バックエンドを再起動してください |
| ページが読み込めない | フロントエンド未起動 | `npm run dev` を実行してください |
| リアルタイム更新が動作しない | ポートがブロックされている | ファイアウォール設定を確認してください |

### エラーメッセージ一覧

| エラー | 説明 | 対処法 |
|--------|------|--------|
| 404 Not Found | リソースが存在しない | データが存在することを確認 |
| 500 Internal Error | サーバー内部エラー | バックエンドログを確認 |
| Connection refused | サーバーに接続できない | バックエンドが起動しているか確認 |

### ログ確認方法

**バックエンドログ:**
```bash
# 起動したターミナルでログを確認
# または環境変数でログレベルを設定
DASHBOARD_DEBUG=True uvicorn app.main:app --reload
```

**フロントエンドログ:**
```
1. ブラウザの開発者ツールを開く（F12 キー）
2. Console タブを選択
3. エラーメッセージを確認
```

---

# システム開発者向けガイド

このセクションは、Agent Teams Dashboard の開発・保守を行うエンジニア向けです。

## 技術スタック

### バックエンド

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|-----------|------|
| プログラミング言語 | Python | 3.11+ | メイン開発言語 |
| Web フレームワーク | FastAPI | 0.109.0+ | REST API サーバー |
| ASGI サーバー | Uvicorn | 0.27.0+ | 非同期サーバー実行 |
| データ検証 | Pydantic | 2.5.0+ | データモデル・バリデーション |
| 設定管理 | pydantic-settings | 2.1.0+ | 環境変数管理 |
| ファイル監視 | watchdog | 4.0.0+ | ファイルシステムイベント監視 |
| HTTP クライアント | httpx | 0.26.0+ | 非同期 HTTP リクエスト |

### フロントエンド

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|-----------|------|
| プログラミング言語 | TypeScript | 5.3.0+ | 型安全な開発 |
| UI ライブラリ | React | 18.2.0 | コンポーネントベース UI |
| バンドラー | Vite | 5.0.0+ | 高速ビルド・HMR |
| CSS フレームワーク | Tailwind CSS | 3.4.0+ | ユーティリティファースト CSS |
| E2E テスト | Puppeteer | 24.37.3+ | ブラウザ自動化テスト |

### 開発ツール

| ツール | 用途 |
|--------|------|
| pytest | テストフレームワーク |
| pytest-asyncio | 非同期テストサポート |
| httpx | HTTP クライアント（テスト用） |

---

## プロジェクト構造

```
cc-agent-teams-action-monitor/
├── backend/                          # バックエンドアプリケーション
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI エントリーポイント
│   │   ├── config.py                 # 設定管理（Pydantic Settings）
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes/
│   │   │       ├── __init__.py
│   │   │       ├── teams.py          # チーム関連 API エンドポイント
│   │   │       ├── tasks.py          # タスク関連 API エンドポイント
│   │   │       └── messages.py         # メッセージ API エンドポイント
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── team.py               # Team/Member モデル
│   │   │   ├── task.py               # Task モデル
│   │   │   └── message.py            # Message モデル
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── file_watcher.py       # ファイル監視サービス
│   │   └── utils/
│   │       └── __init__.py
│   ├── tests/
│   │   └── __init__.py
│   └── pyproject.toml                # プロジェクト設定・依存関係
│
├── frontend/                         # フロントエンドアプリケーション
│   ├── src/
│   │   ├── main.tsx                  # エントリーポイント
│   │   ├── App.tsx                   # ルートコンポーネント
│   │   ├── index.css                 # グローバルスタイル
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
│   │   │   ├── useTeams.ts
│   │   │   ├── useTasks.ts
│   │   │   │   ├── useTeams.ts
│   │   │   │   ├── useTasks.ts
│   │   │   │   └── useInbox.ts
│   │   └── types/
│   │       ├── team.ts
│   │       ├── task.ts
│   │       └── message.ts
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── docs/                             # ドキュメント
│   ├── architecture.md               # アーキテクチャ設計書
│   ├── backend-tech-stack.md         # バックエンド技術詳細
│   ├── frontend-tech-stack.md        # フロントエンド技術詳細
│   ├── system-design.md              # システム設計書
│   ├── ut-plan.md                    # ユニットテスト計画
│   └── user-guide.md                 # ユーザーガイド
│
├── CLAUDE.md                         # Claude Code 用ガイダンス
└── README.md                         # このファイル
```

---

## 開発環境セットアップ

### 初回セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd cc-agent-teams-action-monitor

# バックエンド
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e ".[dev]"

# フロントエンド
cd ../frontend
npm install
```

### 開発サーバー起動

**ターミナル 1（バックエンド）:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**ターミナル 2（フロントエンド）:**
```bash
cd frontend
npm run dev
```

### ホットリロード

- **バックエンド**: `--reload` フラグでファイル変更時に自動再起動
- **フロントエンド**: Vite の HMR で即座に反映

---

## API仕様

### REST API エンドポイント

#### ヘルスチェック

```http
GET /api/health
```

**レスポンス:**
```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

#### チーム一覧

```http
GET /api/teams
```

**レスポンス:**
```json
[
  {
    "name": "my-team",
    "description": "Team description",
    "memberCount": 3,
    "status": "active",
    "lastActivity": "2026-02-16T12:00:00Z",
    "leadAgentId": "team-lead"
  }
]
```

#### チーム詳細

```http
GET /api/teams/{team_name}
```

**レスポンス:**
```json
{
  "name": "my-team",
  "description": "Team description",
  "createdAt": 1234567890,
  "leadAgentId": "team-lead",
  "leadSessionId": "session-uuid",
  "members": [
    {
      "agentId": "agent-1",
      "name": "Agent One",
      "agentType": "general-purpose",
      "model": "claude-3-sonnet",
      "joinedAt": 1234567890,
      "status": "active",
      "color": "#3b82f6"
    }
  ]
}
```

#### チームインボックス

```http
GET /api/teams/{team_name}/inboxes
```

**レスポンス:**
```json
{
  "agent-1": [
    {
      "from": "agent-2",
      "text": "Hello!",
      "timestamp": "2026-02-16T12:00:00Z",
      "read": false
    }
  ]
}
```

#### チーム削除

```http
DELETE /api/teams/{team_name}
```

**条件**: stopped 状態のチームのみ削除可能

**成功レスポンス (200):**
```json
{
  "message": "Team deleted successfully",
  "deleted_files": {
    "team_dir": true,
    "tasks_dir": true,
    "session_logs": ["session-1.jsonl", "session-2.jsonl"]
  }
}
```

**エラーレスポンス (400):**
```json
{
  "detail": "Cannot delete team with status 'active'. Only stopped teams can be deleted."
}
```

#### 統合タイムライン

```http
GET /api/history?team_name={team_name}&limit=50&types=message,task_assignment
```

**レスポンス:**
```json
[
  {
    "id": "event-1",
    "type": "message",
    "timestamp": "2026-02-23T12:00:00Z",
    "source": "inbox",
    "data": {
      "from": "agent-1",
      "text": "Hello!"
    }
  }
]
```

#### 差分更新

```http
GET /api/updates?team_name={team_name}&since=2026-02-23T11:00:00Z
```

**レスポンス:**
```json
{
  "events": [...],
  "has_more": false
}
```

#### タスク一覧

```http
GET /api/tasks
```

**レスポンス:**
```json
[
  {
    "id": "task-1",
    "subject": "Implement feature",
    "status": "in_progress",
    "owner": "agent-1",
    "blockedCount": 0,
    "teamName": "my-team"
  }
]
```

#### チーム別タスク

```http
GET /api/tasks/team/{team_name}
```

#### 特定タスク

```http
GET /api/tasks/{task_id}?team_name={team_name}
```

---

## テスト

### テスト実行コマンド

```bash
# バックエンドテスト
cd backend
pytest                    # 全テスト実行
pytest -v                 # 詳細出力
pytest --cov=app          # カバレッジ付き
pytest tests/test_xxx.py  # 個別テスト

# フロントエンド E2E テスト
cd frontend
npm run test              # テスト実行（設定必要）
```

### テスト構成例

```python
# tests/test_api.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_list_teams(client):
    response = await client.get("/api/teams")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

---

## コーディング規約

### Python (PEP 257 準拠)

```python
def calculate_total(items: List[Item]) -> float:
    """アイテムリストの合計金額を計算します。（30-60 文字）

    各アイテムの価格と数量を掛け合わせ、税込み合計を返します。
    空のリストの場合は 0.0 を返します。（50-200 文字）

    Args:
        items: 計算対象のアイテムリスト

    Returns:
        税込み合計金額

    @claude
    """
    pass
```

### TypeScript (JSDoc 準拠)

```typescript
/**
 * ユーザープロフィールを表示するコンポーネントです。（30-60 文字）
 *
 * アバター画像、ユーザー名、ステータス情報を表示し、
 * クリック時にプロフィール詳細画面へ遷移します。（50-200 文字）
 *
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.userId - ユーザー ID
 * @returns {JSX.Element} レンダリングされたコンポーネント
 *
 * 
 */
const UserProfile = ({ userId }: UserProfileProps): JSX.Element => {
```

### 共通ルール

- コメント・ドキュメントは日本語で記述
- 変数名・関数名は英語（camelCase / snake_case）
- Claude マーカー（`@claude` / `@`）を docstring に付与

---

# システム運用者向けガイド

このセクションは、Agent Teams Dashboard を本番環境で運用・保守するエンジニア向けです。

## システム要件

### 本番環境ハードウェア

| 項目 | 最小要件 | 推奨要件 |
|------|----------|----------|
| CPU | 2コア | 4コア以上 |
| メモリ | 1GB | 2GB以上 |
| ディスク | 1GB | 5GB以上（ログ含む） |

### 本番環境ソフトウェア

| ソフトウェア | バージョン | 用途 |
|-------------|-----------|------|
| Python | 3.11+ | アプリケーション実行 |
| Node.js | 18+ | フロントエンドビルドのみ |
| nginx / Caddy | 最新安定版 | リバースプロキシ |
| systemd | - | プロセス管理 |

---

## デプロイ構成

### 推奨アーキテクチャ

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Optional)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Reverse Proxy  │
                    │  (nginx/Caddy)  │
                    │  Port: 80/443   │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼───────┐ ┌──────▼──────┐ ┌───────▼───────┐
    │   Frontend    │ │   Backend   │ │   Backend    │
    │  (Static)     │ │  (Worker 1) │ │  (Worker 2)  │
    │  nginx serve  │ │  Port: 8000 │ │  Port: 8001  │
    └───────────────┘ └─────────────┘ └───────────────┘
                               │
                      ┌────────▼────────┐
                      │   ~/.claude/    │
                      │  (Shared NFS)   │
                      └─────────────────┘
```

### nginx 設定例

```nginx
# /etc/nginx/sites-available/agent-teams-dashboard
server {
    listen 80;
    server_name dashboard.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.example.com;

    ssl_certificate /etc/letsencrypt/live/dashboard.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.example.com/privkey.pem;

    # Frontend static files
    location / {
        root /var/www/agent-teams-dashboard/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### systemd サービス設定

```ini
# /etc/systemd/system/agent-teams-dashboard.service
[Unit]
Description=Agent Teams Dashboard Backend
After=network.target

[Service]
Type=simple
User=dashboard
Group=dashboard
WorkingDirectory=/opt/agent-teams-dashboard/backend
Environment="PATH=/opt/agent-teams-dashboard/venv/bin"
Environment="DASHBOARD_HOST=127.0.0.1"
Environment="DASHBOARD_PORT=8000"
Environment="DASHBOARD_DEBUG=False"
ExecStart=/opt/agent-teams-dashboard/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### デプロイスクリプト

```bash
#!/bin/bash
# deploy.sh

set -e

echo "=== Building Frontend ==="
cd frontend
npm ci
npm run build

echo "=== Deploying Frontend ==="
rm -rf /var/www/agent-teams-dashboard/frontend/dist
cp -r dist /var/www/agent-teams-dashboard/frontend/

echo "=== Installing Backend ==="
cd ../backend
source venv/bin/activate
pip install -e ".[dev]"

echo "=== Restarting Service ==="
sudo systemctl restart agent-teams-dashboard

echo "=== Deployment Complete ==="
```

---

## 環境変数

### バックエンド環境変数

| 環境変数 | デフォルト値 | 説明 |
|----------|-------------|------|
| `DASHBOARD_HOST` | `127.0.0.1` | サーバー待ち受けアドレス |
| `DASHBOARD_PORT` | `8000` | サーバー待ち受けポート |
| `DASHBOARD_DEBUG` | `True` | デバッグモード |
| `DASHBOARD_CLAUDE_DIR` | `~/.claude` | Claude データディレクトリ |
| `DASHBOARD_TEAMS_DIR` | `~/.claude/teams` | チーム設定ディレクトリ |
| `DASHBOARD_TASKS_DIR` | `~/.claude/tasks` | タスクディレクトリ |
| `DASHBOARD_CORS_ORIGINS` | `["http://localhost:5173"]` | 許可するオリジン |

### 本番環境設定例

```bash
# /etc/agent-teams-dashboard/env
DASHBOARD_HOST=127.0.0.1
DASHBOARD_PORT=8000
DASHBOARD_DEBUG=False
DASHBOARD_CLAUDE_DIR=/opt/agent-teams-dashboard/.claude
DASHBOARD_TEAMS_DIR=/opt/agent-teams-dashboard/.claude/teams
DASHBOARD_TASKS_DIR=/opt/agent-teams-dashboard/.claude/tasks
DASHBOARD_CORS_ORIGINS=["https://dashboard.example.com"]
```

---

## 監視・ロギング

### ヘルスチェック

```bash
# HTTP ヘルスチェック
curl http://localhost:8000/api/health

# 期待されるレスポンス
# {"status": "healthy", "version": "0.1.0"}
```

### ログ設定

```python
# 本番環境でのログ設定例
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/agent-teams-dashboard/app.log'),
        logging.StreamHandler()
    ]
)
```

### ログローテーション (logrotate)

```conf
# /etc/logrotate.d/agent-teams-dashboard
/var/log/agent-teams-dashboard/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 dashboard dashboard
    postrotate
        systemctl reload agent-teams-dashboard > /dev/null 2>&1 || true
    endscript
}
```

### 監視メトリクス

推奨監視項目:

| メトリクス | 閾値 | アクション |
|-----------|------|-----------|
| プロセス稼働 | - | プロセスダウン時は再起動 |
| HTTP 応答時間 | > 1s | アラート |
| エラーレート | > 1% | アラート |
| HTTP リクエスト数 | - | モニタリング |
| メモリ使用量 | > 80% | アラート |
| CPU 使用率 | > 80% | アラート |

---

## バックアップ・復旧

### バックアップ対象

- `~/.claude/` ディレクトリ（チーム設定・タスク）
- 設定ファイル
- SSL 証明書

### バックアップスクリプト

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/agent-teams-dashboard"
DATE=$(date +%Y%m%d_%H%M%S)

# Claude データディレクトリ
tar -czf "$BACKUP_DIR/claude_data_$DATE.tar.gz" -C ~/.claude .

# 設定ファイル
cp /etc/agent-teams-dashboard/env "$BACKUP_DIR/env_$DATE"

# 古いバックアップの削除（14日以上）
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +14 -delete

echo "Backup completed: $DATE"
```

### 復旧手順

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE="/backup/agent-teams-dashboard/claude_data_20260216_120000.tar.gz"

# サービス停止
sudo systemctl stop agent-teams-dashboard

# データ復旧
tar -xzf "$BACKUP_FILE" -C ~/.claude

# サービス起動
sudo systemctl start agent-teams-dashboard

echo "Restore completed"
```

---

# アーキテクチャ

## システム構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Agent Teams Dashboard                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Frontend (React)                          │   │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────────────┐   │   │
│  │  │ Components│  │  Hooks    │  │  Types                 │   │   │
│  │  │           │  │           │  │                        │   │   │
│  │  │ - TeamCard│  │ - useTeams│  │ - Team                 │   │   │
│  │  │ - TaskCard│  │ - useTasks│  │ - Task                 │   │   │
│  │  │ - Header  │  │ - useInbox│  │ - Message              │   │   │
│  │  └───────────┘  └───────────┘  └────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │ HTTP/REST              │ HTTP Polling                     │
│         ▼                        ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Backend (FastAPI)                         │   │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────────────┐   │   │
│  │  │API Routes │  │ Cache     │  │ File Watcher Service   │   │   │
│  │  │           │  │ Service   │  │                        │   │   │
│  │  │ /api/teams│  │           │  │ - ClaudeFileHandler    │   │   │
│  │  │ /api/tasks│  │ - 30s TTL │  │ - 500ms debounce       │   │   │
│  │  │ /api/health│ │ - 60s TTL │  │ - recursive watch      │   │   │
│  │  └───────────┘  └───────────┘  └────────────────────────┘   │   │
│  │  ┌───────────┐  ┌───────────┐                                │   │
│  │  │  Models   │  │  Config   │                                │   │
│  │  │ (Pydantic)│  │ (Settings)│                                │   │
│  │  └───────────┘  └───────────┘                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         ▼ ファイル監視 (watchdog)                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  ~/.claude/ Directory                        │   │
│  │  ├── teams/{team_name}/config.json      # チーム設定         │   │
│  │  │   └── inboxes/{agent_name}.json      # エージェント別受信箱│   │
│  │  └── tasks/{team_name}/{task_id}.json   # タスク定義         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## データフロー

```
User Action → Component → Hook → API/HTTP → Backend
                                               ↓
Component ← Hook ← State Update ← Response ←────┘
```

## HTTP Polling

| API エンドポイント | 用途 | デフォルト間隔 |
|-------------------|------|---------------|
| `GET /api/teams` | チーム一覧取得 | 30秒 |
| `GET /api/tasks` | タスク一覧取得 | 30秒 |
| `GET /api/teams/{name}/inboxes` | インボックス取得 | 30秒 |
| `GET /api/teams/{name}/inboxes/{agent}` | エージェント別メッセージ | 30秒 |
| `GET /api/history` | 統合タイムライン | 30秒 |
| `GET /api/updates` | 差分更新 | 30秒 |

ポーリング間隔は Zustand Store で管理し、UIから5秒/10秒/20秒/30秒/60秒から選択可能。
staleTime: 10秒（キャッシュ有効期間）

## ファイル監視パターン

| パスパターン | イベントタイプ | 通知内容 |
|-------------|---------------|---------|
| `**/teams/*/config.json` | `team_update` | チーム設定全体 |
| `**/teams/*/inboxes/*.json` | `inbox_update` | エージェント別メッセージ |
| `**/tasks/*/*.json` | `task_update` | タスク詳細 |

---

## ライセンス

MIT License

---

## 貢献

プロジェクトへの貢献を歓迎します。プルリクエストや Issue の報告をお待ちしています。

---

## サポート

問題が発生した場合は、以下の手順でお問い合わせください：

1. [トラブルシューティング](#トラブルシューティング)を確認
2. GitHub の Issue を検索
3. 新しい Issue を作成（ログと再現手順を含める）

---

*作成日: 2026-02-16*
*最終更新日: 2026-02-23*
*バージョン: 2.0.0*
