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
│   │       └── websocket.py # WebSocketエンドポイント
│   ├── models/
│   │   ├── __init__.py
│   │   ├── team.py          # Team/Memberモデル
│   │   ├── task.py          # Taskモデル
│   │   └── message.py       # Messageモデル
│   ├── services/
│   │   ├── __init__.py
│   │   └── file_watcher.py  # ファイル監視サービス
│   └── utils/
│       └── __init__.py
├── tests/
│   └── __init__.py
└── pyproject.toml           # プロジェクト設定・依存関係
```

### 2.1 各モジュールの役割

| モジュール | 役割 |
|-----------|------|
| `main.py` | FastAPIアプリケーションの作成、ミドルウェア設定、ルーター登録 |
| `config.py` | 環境変数から設定を読み込むSettingsクラス |
| `api/routes/teams.py` | チーム一覧・詳細・インボックス取得API |
| `api/routes/tasks.py` | タスク一覧・詳細取得API |
| `api/routes/websocket.py` | WebSocket接続管理・ブロードキャスト |
| `services/file_watcher.py` | ~/.claude/ディレクトリ監視サービス |
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
    "leadAgentId": "team-lead"
  }
]
```

#### チーム詳細取得

```
GET /api/teams/{team_name}
```

**パスパラメータ**
- `team_name`: チーム名

**レスポンス** (`Team`)
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

**エラーレスポンス**
- `404`: チームが見つからない

#### チームインボックス取得

```
GET /api/teams/{team_name}/inboxes
```

**レスポンス**
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
    "blockedCount": 0,
    "teamName": "my-team"
  }
]
```

#### チーム別タスク取得

```
GET /api/tasks/team/{team_name}
```

**レスポンス** (`Task[]`)

#### 特定タスク取得

```
GET /api/tasks/{task_id}?team_name={team_name}
```

**クエリパラメータ**
- `team_name` (optional): チーム名（指定しない場合は全チームから検索）

**レスポンス** (`Task`)
```json
{
  "id": "task-1",
  "subject": "Implement feature",
  "description": "Detailed description",
  "activeForm": "Implementing feature",
  "status": "in_progress",
  "owner": "agent-1",
  "blocks": ["task-2"],
  "blockedBy": [],
  "metadata": {}
}
```

### 3.2 エラーレスポンス形式

```json
{
  "detail": "Error message"
}
```

---

## 4. データモデル

### 4.1 Team関連モデル

```python
# backend/app/models/team.py

class Member(BaseModel):
    """チームメンバーモデル"""
    agentId: str
    name: str
    agentType: str
    model: str = "unknown"
    joinedAt: int = 0
    tmuxPaneId: Optional[str] = ""
    cwd: str = ""
    subscriptions: list[str] = []
    color: Optional[str] = None
    status: str = "idle"  # active, idle
    lastActivity: Optional[datetime] = None


class Team(BaseModel):
    """チーム詳細モデル"""
    name: str
    description: Optional[str] = ""
    createdAt: int = 0
    leadAgentId: str
    leadSessionId: Optional[str] = ""
    members: list[Member] = []
    lastActivity: Optional[datetime] = None


class TeamSummary(BaseModel):
    """チーム一覧用サマリー"""
    name: str
    description: Optional[str] = ""
    memberCount: int
    status: str  # active, inactive
    lastActivity: Optional[datetime] = None
    leadAgentId: str
```

### 4.2 Task関連モデル

```python
# backend/app/models/task.py

class Task(BaseModel):
    """タスク詳細モデル"""
    id: str
    subject: str
    description: Optional[str] = ""
    activeForm: str = ""
    status: str  # pending, in_progress, completed, deleted
    owner: Optional[str] = None
    blocks: list[str] = []
    blockedBy: list[str] = []
    metadata: dict = {}


class TaskSummary(BaseModel):
    """タスク一覧用サマリー"""
    id: str
    subject: str
    status: str
    owner: Optional[str] = None
    blockedCount: int
    teamName: Optional[str] = None


class TaskUpdate(BaseModel):
    """タスク更新イベント"""
    taskId: str
    teamName: str
    status: str
    previousStatus: Optional[str] = None
    timestamp: datetime
```

### 4.3 Message関連モデル

```python
# backend/app/models/message.py

class InboxMessage(BaseModel):
    """インボックスメッセージ"""
    from_: str = Field(alias="from")
    text: str
    summary: Optional[str] = None
    timestamp: str
    color: Optional[str] = None
    read: bool = False


class ProtocolMessage(BaseModel):
    """プロトコルメッセージ"""
    type: str
    from_: Optional[str] = Field(None, alias="from")
    timestamp: Optional[str] = None
    requestId: Optional[str] = None
    idleReason: Optional[str] = None
    reason: Optional[str] = None


class ActivityEvent(BaseModel):
    """アクティビティイベント"""
    id: str
    type: str  # message, task_update, member_join, member_leave
    teamName: str
    agentName: str
    content: str
    timestamp: datetime
    metadata: dict[str, Any] = {}
```

---

## 5. WebSocket実装

### 5.1 接続管理

```python
# backend/app/api/routes/websocket.py

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

### 5.2 エンドポイント

```python
@router.websocket("/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    """WebSocketエンドポイント"""
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, channel)
```

### 5.3 チャンネル設計

| チャンネル | 用途 | メッセージタイプ |
|-----------|------|-----------------|
| `dashboard` | ダッシュボード更新 | `team_update`, `inbox_update` |
| `tasks` | タスク更新 | `task_update` |

### 5.4 メッセージ形式

```python
# チーム更新
await manager.broadcast_team_update(team_name, {
    "event": "modified",
    "config": team_config
})

# インボックス更新
await manager.broadcast("dashboard", {
    "type": "inbox_update",
    "team": team_name,
    "agent": agent_name,
    "event": "modified",
    "messages": messages
})

# タスク更新
await manager.broadcast_task_update(team_name, task_id, {
    "event": "modified",
    "task": task_data
})
```

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

```python
class ClaudeFileHandler(FileSystemEventHandler):
    """ファイルイベントハンドラ"""

    def on_modified(self, event):
        """ファイル変更イベント"""
        if event.src_path.endswith(".json"):
            self._schedule_broadcast(event.src_path, "modified")

    def on_created(self, event):
        """ファイル作成イベント"""
        if event.src_path.endswith(".json"):
            self._schedule_broadcast(event.src_path, "created")

    def _schedule_broadcast(self, path: str, event_type: str):
        """デバウンス付きブロードキャスト予約"""
        # 500msのデバウンス処理
        await asyncio.sleep(0.5)
        await self._handle_file_change(path, event_type)
```

### 6.3 デバウンス処理

- **間隔**: 500ms
- **目的**: 過剰なイベント発火の抑制
- **実装**: asyncio.sleep と タスクキャンセル

---

## 7. 設定管理

### 7.1 設定クラス

```python
# backend/app/config.py

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

### 7.2 環境変数一覧

| 環境変数 | デフォルト値 | 説明 |
|----------|-------------|------|
| `DASHBOARD_HOST` | `127.0.0.1` | サーバー待ち受けアドレス |
| `DASHBOARD_PORT` | `8000` | サーバー待ち受けポート |
| `DASHBOARD_DEBUG` | `True` | デバッグモード |
| `DASHBOARD_CLAUDE_DIR` | `~/.claude` | Claudeデータディレクトリ |
| `DASHBOARD_TEAMS_DIR` | `~/.claude/teams` | チーム設定ディレクトリ |
| `DASHBOARD_TASKS_DIR` | `~/.claude/tasks` | タスクディレクトリ |

---

## 8. テスト環境

### 8.1 テストフレームワーク

- **pytest**: メインテストフレームワーク
- **pytest-asyncio**: 非同期テストサポート
- **httpx**: FastAPIテストクライアント

### 8.2 テスト実行コマンド

```bash
# 全テスト実行
cd backend
pytest

# 詳細出力
pytest -v

# カバレッジ付き
pytest --cov=app

# 非同期テスト
pytest -v --asyncio-mode=auto
```

### 8.3 テスト構成例

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
```

---

## 9. 起動方法

### 9.1 開発環境

```bash
# 依存関係インストール
cd backend
pip install -e ".[dev]"

# 開発サーバー起動
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 9.2 本番環境

```bash
# インストール
pip install .

# 起動
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

*作成日: 2026-02-16*
*バージョン: 1.0.0*
