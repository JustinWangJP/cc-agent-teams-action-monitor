# バックエンド技術スタック技術書

## 1. 技術スタック概要

### 1.1 言語・フレームワーク

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|-----------|------|
| プログラミング言語 | Python | 3.11+ | メイン開発言語 |
| Webフレームワーク | FastAPI | 0.109.0+ | REST API・WebSocketサーバー |
| ASGIサーバー | Uvicorn | 0.27.0+ | 非同期サーバー実行 |
| データ検証 | Pydantic | 2.5.0+ | データモデル・バリデーション |
| 設定管理 | pydantic-settings | 2.1.0+ | 環境変数管理 |
| ファイル監視 | watchdog | 4.0.0+ | ファイルシステムイベント監視 |
| WebSocket | websockets | 12.0+ | 双方向リアルタイム通信 |
| ビルドツール | hatchling | - | パッケージビルド |

### 1.2 開発用依存関係

| 技術 | バージョン | 用途 |
|------|-----------|------|
| pytest | 8.0.0+ | テストフレームワーク |
| pytest-asyncio | 0.23.0+ | 非同期テストサポート |
| httpx | 0.26.0+ | HTTPクライアント（テスト用） |

---

## 2. プロジェクト構造

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
│   │       ├── teams.py     # チーム関連APIエンドポイント
│   │       ├── tasks.py     # タスク関連APIエンドポイント
│   │       ├── messages.py  # メッセージ・タイムラインAPI
│   │       ├── agents.py    # エージェント一覧API
│   │       └── websocket.py # WebSocketエンドポイント
│   ├── models/
│   │   ├── __init__.py
│   │   ├── team.py          # Team/Memberモデル
│   │   ├── task.py          # Taskモデル
│   │   ├── message.py       # Messageモデル
│   │   ├── timeline.py      # TimelineItemモデル
│   │   ├── agent.py         # Agentモデル
│   │   ├── chat.py          # Chat関連モデル
│   │   └── model.py         # Model設定モデル
│   ├── services/
│   │   ├── __init__.py
│   │   ├── file_watcher.py  # ファイル監視サービス
│   │   └── cache_service.py # メモリキャッシュサービス
│   └── utils/
│       └── __init__.py
├── tests/
│   └── __init__.py
└── pyproject.toml           # プロジェクト設定・依存関係
```

### 2.1 各モジュールの役割

| モジュール | 役割 |
|-----------|------|
| `main.py` | FastAPIアプリケーションの作成、ミドルウェア設定、lifespan管理 |
| `config.py` | 環境変数から設定を読み込むSettingsクラス |
| `api/routes/teams.py` | チーム一覧・詳細・インボックス・停止判定API |
| `api/routes/tasks.py` | タスク一覧・詳細・停止判定API |
| `api/routes/messages.py` | メッセージタイムラインAPI |
| `api/routes/agents.py` | エージェント一覧API |
| `api/routes/websocket.py` | WebSocket接続管理・ブロードキャスト |
| `services/file_watcher.py` | ~/.claude/ディレクトリ監視サービス |
| `services/cache_service.py` | メモリキャッシュサービス（TTL付き） |
| `models/` | Pydanticデータモデル定義 |

---

## 3. API設計

### 3.1 REST APIエンドポイント詳細

#### ヘルスチェック

```
GET /api/health
```

**レスポンス**
```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

#### チーム一覧取得

```
GET /api/teams
```

**レスポンス** (`TeamSummary[]`)
```json
[
  {
    "name": "my-team",
    "description": "Team description",
    "memberCount": 3,
    "status": "active",
    "lastActivity": "2026-02-21T12:00:00Z",
    "leadAgentId": "team-lead"
  }
]
```

#### チーム詳細取得

```
GET /api/teams/{team_name}
```

**レスポンス** (`Team`)
```json
{
  "name": "my-team",
  "description": "Team description",
  "createdAt": 1234567890,
  "leadAgentId": "team-lead",
  "status": "active",
  "members": [
    {
      "agentId": "agent-1",
      "name": "Agent One",
      "agentType": "general-purpose",
      "model": "claude-sonnet-4-6",
      "joinedAt": 1234567890,
      "status": "active",
      "color": "#3b82f6"
    }
  ]
}
```

#### メッセージタイムライン取得

```
GET /api/teams/{team_name}/messages/timeline
```

**クエリパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `start_time` | string | 開始時刻（ISO形式） |
| `end_time` | string | 終了時刻（ISO形式） |
| `since` | string | 差分取得用の基準時刻 |
| `senders` | string | 送信者フィルター（カンマ区切り） |
| `types` | string | メッセージタイプフィルター（カンマ区切り） |
| `search` | string | 全文検索クエリ |
| `limit` | int | 取得件数上限 |

**レスポンス** (`TimelineItem[]`)
```json
[
  {
    "id": "msg-1",
    "type": "task_assignment",
    "from": "team-lead",
    "to": "backend-dev",
    "receiver": "backend-dev",
    "timestamp": "2026-02-21T12:00:00Z",
    "text": "Task details...",
    "summary": "P0: バーチャルスクロール実装"
  }
]
```

#### タスク一覧取得

```
GET /api/tasks
```

**レスポンス** (`TaskSummary[]`)
```json
[
  {
    "id": "task-1",
    "subject": "Implement feature",
    "status": "in_progress",
    "owner": "agent-1",
    "team": "my-team"
  }
]
```

#### エージェント一覧取得

```
GET /api/agents
```

**レスポンス** (`AgentSummary[]`)
```json
[
  {
    "agentId": "agent-1",
    "name": "Agent One",
    "teamName": "my-team",
    "status": "active",
    "model": "claude-sonnet-4-6"
  }
]
```

---

## 4. データモデル

### 4.1 Team関連モデル

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
    members: list[Member] = []
    status: str = "active"  # active, inactive, stopped
    lastActivity: Optional[datetime] = None


class TeamSummary(BaseModel):
    """チーム一覧用サマリー"""
    name: str
    description: Optional[str] = ""
    memberCount: int
    status: str  # active, inactive, stopped
    lastActivity: Optional[str] = None
    leadAgentId: str
```

### 4.2 Task関連モデル

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

### 4.3 Timeline関連モデル

```python
class TimelineItem(BaseModel):
    """タイムラインアイテム"""
    id: str
    type: str  # message, task_assignment, idle_notification, etc.
    from_: str = Field(alias="from")
    to: Optional[str] = None
    receiver: Optional[str] = None
    timestamp: str
    text: str
    summary: Optional[str] = None
```

---

## 5. WebSocket実装

### 5.1 接続管理

```python
class ConnectionManager:
    """WebSocket接続管理クラス"""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {
            "dashboard": [],
            "tasks": [],
        }

    async def connect(self, websocket: WebSocket, channel: str):
        """新規接続の受け入れ"""
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        """接続の削除"""
        if channel in self.active_connections:
            if websocket in self.active_connections[channel]:
                self.active_connections[channel].remove(websocket)

    async def broadcast(self, channel: str, message: dict):
        """チャンネルへのブロードキャスト"""
        for connection in self.active_connections.get(channel, []):
            await connection.send_json(message)
```

### 5.2 チャンネル設計

| チャンネル | 用途 | メッセージタイプ |
|-----------|------|-----------------|
| `dashboard` | ダッシュボード更新 | `team_update`, `inbox_update` |
| `tasks` | タスク更新 | `task_update` |

---

## 6. ファイル監視サービス

### 6.1 監視対象

```
~/.claude/
├── teams/
│   └── {team_name}/
│       ├── config.json
│       └── inboxes/
│           └── {agent_name}.json
└── tasks/
    └── {team_name}/
        └── {task_id}.json
```

### 6.2 イベント処理フロー

- **監視**: watchdog.Observer で再帰的監視
- **デバウンス**: 500ms（連続イベントの抑制）
- **キャッシュ無効化**: 変更検知時に該当キャッシュを無効化
- **WebSocket通知**: 変更内容を該当チャンネルにブロードキャスト

---

## 7. キャッシュサービス

### 7.1 機能概要

- **TTL（Time To Live）**: 設定30秒、インボックス60秒
- **自動クリーンアップ**: 5分間隔で期限切れエントリを削除
- **手動無効化**: FileWatcher連携での変更時無効化
- **統計情報**: キャッシュヒット率、エントリ数の取得

### 7.2 設定

```python
CacheService(
    config_ttl=30,      # チーム設定のTTL（秒）
    inbox_ttl=60,       # インボックスのTTL（秒）
    cleanup_interval=300  # クリーンアップ間隔（秒）
)
```

---

## 8. 停止判定ロジック

### 8.1 チーム停止判定

```python
def get_team_status(team_dir: Path, config: dict) -> str:
    """チームのステータスを判定。

    - members が存在する → ファイルの mtime を確認
    - 24時間超過 → 'stopped'
    - 24時間以内 → 'active'
    - members がない → 'inactive'
    """
    if not config.get("members"):
        return "inactive"

    config_path = team_dir / "config.json"
    if config_path.exists():
        mtime = os.path.getmtime(config_path)
        mtime_dt = datetime.fromtimestamp(mtime, tz=timezone.utc)
        now = datetime.now(timezone.utc)

        if (now - mtime_dt).total_seconds() > 24 * 60 * 60:
            return "stopped"

    return "active"
```

### 8.2 タスク停止判定

同様のロジックでタスクファイルの mtime を判定。

---

## 9. 設定管理

### 9.1 設定クラス

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

### 9.2 環境変数一覧

| 環境変数 | デフォルト値 | 説明 |
|----------|-------------|------|
| `DASHBOARD_HOST` | `127.0.0.1` | サーバー待ち受けアドレス |
| `DASHBOARD_PORT` | `8000` | サーバー待ち受けポート |
| `DASHBOARD_DEBUG` | `True` | デバッグモード |
| `DASHBOARD_CLAUDE_DIR` | `~/.claude` | Claudeデータディレクトリ |

---

## 10. テスト環境

### 10.1 テスト実行コマンド

```bash
# 全テスト実行
cd backend
pytest

# 詳細出力
pytest -v

# カバレッジ付き
pytest --cov=app
```

---

## 11. 起動方法

### 11.1 開発環境

```bash
# 依存関係インストール
cd backend
pip install -e ".[dev]"

# 開発サーバー起動
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 11.2 本番環境

```bash
# インストール
pip install .

# 起動
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

*作成日: 2026-02-16*
*最終更新日: 2026-02-21*
*バージョン: 1.1.0*
