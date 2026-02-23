# バックエンド技術スタック技術書

## 1. 技術スタック概要

### 1.1 言語・フレームワーク

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|-----------|------|
| プログラミング言語 | Python | 3.11+ | メイン開発言語 |
| Webフレームワーク | FastAPI | 0.109.0+ | REST APIサーバー |
| ASGIサーバー | Uvicorn | 0.27.0+ | 非同期サーバー実行 |
| データ検証 | Pydantic | 2.5.0+ | データモデル・バリデーション |
| 設定管理 | pydantic-settings | 2.1.0+ | 環境変数管理 |
| ファイル監視 | watchdog | 4.0.0+ | ファイルシステムイベント監視 |
| ビルドツール | hatchling | - | パッケージビルド |

### 1.2 開発用依存関係

| 技術 | バージョン | 用途 |
|------|-----------|------|
| pytest | 8.0.0+ | テストフレームワーク |
| pytest-asyncio | 0.23.0+ | 非同期テストサポート |
| pytest-cov | 4.0.0+ | カバレッジ計測 |
| httpx | 0.26.0+ | HTTPクライアント（テスト用） |

---

## 2. 設計思想

### 2.1 なぜキャッシュ + HTTPポーリングか

**背景:**
Claude Code が `~/.claude/` 配下のファイルを直接更新するため、外部からの Webhook や Push 通知が使えない。

**アプローチ:**
1. **FileWatcherService** でファイル変更を検知し、**キャッシュを無効化**
2. フロントエンドは **HTTP ポーリング** で定期的に最新データを取得
3. **CacheService** により、頻繁なファイル読み込みを回避

**キャッシュ戦略:**
| データ種別 | TTL | 理由 |
|-----------|-----|------|
| チーム設定 | 30秒 | 更新頻度が低い |
| インボックス | 60秒 | メッセージはリアルタイム性が重要だが、ポーリングで十分 |

### 2.2 なぜセッションログのmtimeでステータス判定か

**背景:**
従来は `config.json` の mtime で判定していたが、チーム活動と関係ないタイミングで更新される場合があった。

**改善:**
セッションログ（`{sessionId}.jsonl`）の mtime を使用：
- セッションログ = エージェントの実際の活動記録
- mtime = チームの最終活動時刻
- **1時間** を閾値として `active` / `stopped` を判定

---

## 3. プロジェクト構造

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPIアプリケーションエントリーポイント
│   ├── config.py            # 設定管理（Pydantic Settings）
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── teams.py     # チーム関連API（一覧・詳細・削除・インボックス）
│   │       ├── tasks.py     # タスク関連API
│   │       ├── messages.py  # メッセージ・タイムラインAPI
│   │       ├── agents.py    # エージェント一覧API
│   │       └── timeline.py  # 統合タイムラインAPI
│   ├── models/
│   │   ├── __init__.py
│   │   ├── team.py          # Team/Member/TeamSummaryモデル
│   │   ├── task.py          # Task/TaskSummaryモデル
│   │   ├── message.py       # Messageモデル
│   │   ├── timeline.py      # TimelineItemモデル
│   │   ├── agent.py         # Agent/AgentSummaryモデル
│   │   ├── chat.py          # Chat関連モデル
│   │   └── model.py         # Model設定モデル
│   ├── services/
│   │   ├── __init__.py
│   │   ├── file_watcher.py  # ファイル監視サービス（キャッシュ無効化）
│   │   ├── cache_service.py # メモリキャッシュサービス（TTL付き）
│   │   ├── timeline_service.py    # inbox + セッションログ統合サービス
│   │   ├── agent_status_service.py # エージェント状態推論サービス
│   │   └── message_parser.py      # プロトコルメッセージ解析サービス
│   └── utils/
│       └── __init__.py
├── tests/
│   ├── __init__.py
│   ├── test_api_teams.py
│   ├── test_api_tasks.py
│   ├── test_api_timeline.py
│   └── test_services/
└── pyproject.toml           # プロジェクト設定・依存関係
```

### 3.1 各モジュールの役割

| モジュール | 役割 |
|-----------|------|
| `main.py` | FastAPIアプリケーションの作成、lifespan管理（FileWatcher/CacheService） |
| `config.py` | 環境変数から設定を読み込むSettingsクラス |
| `api/routes/teams.py` | チーム一覧・詳細・インボックス・削除・ステータス判定API |
| `api/routes/tasks.py` | タスク一覧・詳細・ステータス判定API |
| `api/routes/messages.py` | メッセージタイムラインAPI |
| `api/routes/agents.py` | エージェント一覧API |
| `api/routes/timeline.py` | 統合タイムライン・履歴・差分更新API |
| `services/file_watcher.py` | ~/.claude/ 監視、キャッシュ無効化 |
| `services/cache_service.py` | TTL付きメモリキャッシュ |
| `services/timeline_service.py` | inbox + セッションログ統合 |
| `services/agent_status_service.py` | エージェント状態推論 |
| `services/message_parser.py` | プロトコルメッセージ解析 |
| `models/` | Pydanticデータモデル定義 |

---

## 4. サービス詳細

### 4.1 FileWatcherService

**役割:** `~/.claude/` ディレクトリの変更監視

**主目的:** **キャッシュ無効化 + ログ出力**（リアルタイムPushではない）

**検知パターン:**

| パターン | イベント | アクション |
|---------|---------|-----------|
| `teams/*/config.json` | チーム設定変更 | キャッシュ無効化 + ログ出力 |
| `teams/*/inboxes/*.json` | インボックス更新 | キャッシュ無効化 + ログ出力 |
| `tasks/*/*.json` | タスク状態変更 | ログ出力のみ |

**デバウンス:** 500ms（連続イベントの抑制）

```python
class FileWatcherService:
    def __init__(self, path: Path, debounce_ms: int = 500):
        self.path = path
        self.debounce_ms = debounce_ms
        self._observer: Optional[Observer] = None
```

### 4.2 CacheService

**役割:** TTL付きメモリキャッシュ

**設定:**

| パラメータ | デフォルト値 | 説明 |
|-----------|-------------|------|
| `config_ttl` | 30秒 | チーム設定のTTL |
| `inbox_ttl` | 60秒 | インボックスのTTL |
| `cleanup_interval` | 300秒 | 期限切れエントリのクリーンアップ間隔 |

**主なメソッド:**

| メソッド | 説明 |
|---------|------|
| `get_team_config(team_name)` | チーム設定を取得（キャッシュまたはファイル） |
| `get_team_inbox(team_name, agent_name)` | インボックスを取得 |
| `invalidate_team_config(team_name)` | チーム設定キャッシュを無効化 |
| `invalidate_team_inbox(team_name, agent_name)` | インボックスキャッシュを無効化 |
| `get_stats()` | キャッシュ統計情報を取得 |

### 4.3 TimelineService

**役割:** inbox + セッションログの統合

**入力データソース:**

| ソース | ファイルパス | 内容 |
|-------|-------------|------|
| inbox | `teams/{name}/inboxes/{agent}.json` | エージェント間メッセージ |
| session | `projects/{hash}/{sessionId}.jsonl` | セッション履歴 |

**出力:** 時系列ソート済みの統合タイムライン

**セッションログエントリタイプ:**

| タイプ | 内容 |
|--------|------|
| `user_message` | ユーザー入力 |
| `assistant_message` | アシスタント応答 |
| `thinking` | 思考プロセス |
| `tool_use` | ツール呼び出し |
| `file_change` | ファイル変更 |

### 4.4 AgentStatusService

**役割:** エージェント状態の推論

**判定ロジック:**

| 状態 | 判定条件 |
|------|---------|
| `idle` | 5分以上無活動 |
| `working` | in_progress タスクあり |
| `waiting` | blocked タスクあり |
| `error` | 30分以上無活動 |
| `completed` | 全タスク完了 |

**使用データ:**
- タスク定義（owner, status, blockedBy）
- インボックス（task_assignment, task_completed）
- セッションログ（最終活動時刻）

### 4.5 MessageParser

**役割:** プロトコルメッセージの解析・分類

**対応タイプ:**

| タイプ | 説明 |
|--------|------|
| `message` | 通常メッセージ |
| `task_assignment` | タスク割り当て |
| `task_completed` | タスク完了通知 |
| `idle_notification` | アイドル通知 |
| `shutdown_request` | シャットダウン要求 |
| `shutdown_response` | シャットダウン応答 |
| `plan_approval_request` | 計画承認要求 |
| `plan_approval_response` | 計画承認応答 |

---

## 5. API設計

### 5.1 REST APIエンドポイント一覧

#### チーム関連

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/health` | GET | ヘルスチェック |
| `/api/teams` | GET | チーム一覧取得（ステータス付き） |
| `/api/teams/{team_name}` | GET | チーム詳細取得 |
| `/api/teams/{team_name}` | DELETE | チーム削除 |
| `/api/teams/{team_name}/inboxes` | GET | チームインボックス一覧 |
| `/api/teams/{team_name}/inboxes/{agent}` | GET | エージェント別インボックス |

#### タスク関連

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/tasks` | GET | タスク一覧取得 |
| `/api/tasks/team/{team_name}` | GET | チーム別タスク取得 |
| `/api/tasks/{team}/{task_id}` | GET | タスク詳細取得 |

#### エージェント関連

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/agents` | GET | エージェント一覧取得 |

#### タイムライン関連

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/teams/{team_name}/messages/timeline` | GET | メッセージタイムライン |
| `/api/history` | GET | 統合履歴取得 |
| `/api/updates` | GET | 差分更新取得 |
| `/api/file-changes/{team}` | GET | ファイル変更一覧 |

### 5.2 チーム削除 API 詳細

```
DELETE /api/teams/{team_name}
```

**削除可能なステータス:** `stopped`, `inactive`, `unknown`

**削除対象:**
1. `teams/{team_name}/` ディレクトリ
2. `tasks/{team_name}/` ディレクトリ
3. セッションファイルのみ（プロジェクトディレクトリは残す）

**レスポンス（成功時）:**
```json
{
  "message": "チーム「{team_name}」を削除しました",
  "deletedPaths": [
    "~/.claude/teams/my-team",
    "~/.claude/tasks/my-team",
    "~/.claude/projects/-Users-user-project/abc123.jsonl"
  ]
}
```

**エラーレスポンス:**
- `404 Not Found`: チームが存在しない
- `400 Bad Request`: ステータスが `active`（削除不可）

---

## 6. データモデル

### 6.1 Team関連モデル

```python
class Member(BaseModel):
    """チームメンバーモデル"""
    agentId: str
    name: str
    agentType: str
    model: str = "unknown"
    joinedAt: int = 0
    status: str = "idle"  # active, idle
    color: Optional[str] = None


class Team(BaseModel):
    """チーム詳細モデル"""
    name: str
    description: Optional[str] = ""
    createdAt: int = 0
    leadAgentId: str
    leadSessionId: str = ""
    members: list[Member] = []


class TeamSummary(BaseModel):
    """チーム一覧用サマリー"""
    name: str
    description: Optional[str] = ""
    memberCount: int
    taskCount: int = 0
    status: str  # active, inactive, stopped, unknown
    leadAgentId: str
    createdAt: Optional[int] = None
```

### 6.2 Task関連モデル

```python
class Task(BaseModel):
    """タスク詳細モデル"""
    id: str
    subject: str
    description: Optional[str] = ""
    activeForm: str = ""
    status: str  # pending, in_progress, completed, deleted, stopped
    owner: Optional[str] = None
    team: Optional[str] = None
    blocks: list[str] = []
    blockedBy: list[str] = []
    metadata: dict = {}


class TaskSummary(BaseModel):
    """タスク一覧用サマリー"""
    id: str
    subject: str
    status: str
    owner: Optional[str] = None
    team: Optional[str] = None
```

### 6.3 Timeline関連モデル

```python
class TimelineItem(BaseModel):
    """タイムラインアイテム（統合）"""
    id: str
    type: str  # message, task_assignment, thinking, tool_use, etc.
    from_: str = Field(alias="from")
    to: Optional[str] = None
    receiver: Optional[str] = None
    timestamp: str
    text: str
    summary: Optional[str] = None

    class Config:
        populate_by_name = True
```

---

## 7. ステータス判定ロジック

### 7.1 チームステータス判定

**実装箇所:** `api/routes/teams.py` - `get_team_status()`

**判定フロー:**

```python
def get_team_status(config: dict) -> str:
    """チームのステータスを判定。

    判定基準:
    - members が存在しない → 'inactive'
    - セッションログが存在しない → 'unknown'
    - セッションログの mtime が1時間超過 → 'stopped'
    - セッションログの mtime が1時間以内 → 'active'
    """
    if not config.get("members"):
        return "inactive"

    # セッションログファイルを特定
    session_file = _find_session_file(settings.claude_dir, config)

    if not session_file:
        return "unknown"

    # セッションログの mtime を取得
    mtime = os.path.getmtime(session_file)
    mtime_dt = datetime.fromtimestamp(mtime, tz=timezone.utc)
    now = datetime.now(timezone.utc)

    # 1時間を超過しているか判定
    if (now - mtime_dt).total_seconds() > 60 * 60:
        return "stopped"

    return "active"
```

**セッションログ特定ロジック:**

```python
def _find_session_file(claude_dir: Path, config: dict) -> Optional[Path]:
    """チームのセッションログファイルを特定。

    config.json から leadSessionId と cwd を取得し、セッションログを探す。
    """
    members = config.get("members", [])
    if not members:
        return None

    # 最初のメンバーの cwd を使用
    cwd = members[0].get("cwd")
    if not cwd:
        return None

    # project-hash に変換
    project_hash = _cwd_to_project_hash(cwd)
    project_dir = claude_dir / "projects" / project_hash

    # leadSessionId に対応するファイルを探す
    lead_session_id = config.get("leadSessionId")
    if lead_session_id:
        session_file = project_dir / f"{lead_session_id}.jsonl"
        if session_file.exists():
            return session_file

    return None


def _cwd_to_project_hash(cwd: str) -> str:
    """作業ディレクトリから project-hash を生成。"""
    return "-" + cwd.lstrip("/").replace("/", "-")
```

### 7.2 タスク停止判定

同様のロジックでタスクファイルの mtime を判定（閾値: 24時間）

---

## 8. 設定管理

### 8.1 設定クラス

```python
class Settings(BaseSettings):
    """アプリケーション設定"""

    # サーバー設定
    host: str = "127.0.0.1"
    port: int = 8000
    debug: bool = True

    # Claudeディレクトリパス
    claude_dir: Path = Path.home() / ".claude"
    teams_dir: Path = Path.home() / ".claude" / "teams"
    tasks_dir: Path = Path.home() / ".claude" / "tasks"

    # CORS設定
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

    class Config:
        env_prefix = "DASHBOARD_"
```

### 8.2 環境変数一覧

| 環境変数 | デフォルト値 | 説明 |
|----------|-------------|------|
| `DASHBOARD_HOST` | `127.0.0.1` | サーバー待ち受けアドレス |
| `DASHBOARD_PORT` | `8000` | サーバー待ち受けポート |
| `DASHBOARD_DEBUG` | `True` | デバッグモード |
| `DASHBOARD_CLAUDE_DIR` | `~/.claude` | Claudeデータディレクトリ |

---

## 9. テスト環境

### 9.1 テスト実行コマンド

```bash
# 全テスト実行
cd backend
pytest

# 詳細出力
pytest -v

# カバレッジ付き（70%以上が必須）
pytest --cov=app --cov-report=html

# 特定テストファイル
pytest tests/test_api_teams.py -v

# 特定テスト関数
pytest tests/test_api_teams.py::test_get_team -v
```

### 9.2 カバレッジ要件

`pyproject.toml` で最低70%を要求：

```toml
[tool.pytest.ini_options]
addopts = [
    "--cov-fail-under=70"
]
```

---

## 10. 起動方法

### 10.1 開発環境

```bash
# 依存関係インストール
cd backend
pip install -e ".[dev]"

# 開発サーバー起動
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 10.2 本番環境

```bash
# インストール
pip install .

# 起動
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 11. 各機能とデータソース対応表

| 機能 | 読み込み対象ファイル | 使用サービス |
|------|---------------------|-------------|
| チーム一覧 | `teams/{name}/config.json` | CacheService |
| チームステータス | `projects/{hash}/{session}.jsonl` | (mtime確認) |
| インボックス | `teams/{name}/inboxes/{agent}.json` | CacheService |
| タスク | `tasks/{name}/{id}.json` | (直接読み込み) |
| 統合タイムライン | 上記すべて + セッションログ | TimelineService |
| エージェント状態 | タスク + インボックス + セッション | AgentStatusService |

---

*作成日: 2026-02-16*
*最終更新日: 2026-02-23*
*バージョン: 2.0.0*
