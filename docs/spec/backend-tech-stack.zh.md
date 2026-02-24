# 后端技术栈文档

[日本語](backend-tech-stack.md) | [English](backend-tech-stack.en.md) | [中文](backend-tech-stack.zh.md)

## 1. 技术栈概览

### 1.1 语言与框架

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 编程语言 | Python | 3.11+ | 主要开发语言 |
| Web框架 | FastAPI | 0.109.0+ | REST API 服务器 |
| ASGI服务器 | Uvicorn | 0.27.0+ | 异步服务器执行 |
| 数据验证 | Pydantic | 2.5.0+ | 数据模型与验证 |
| 配置管理 | pydantic-settings | 2.1.0+ | 环境变量管理 |
| 文件监控 | watchdog | 4.0.0+ | 文件系统事件监控 |
| 构建工具 | hatchling | - | 包构建 |

### 1.2 开发依赖

| 技术 | 版本 | 用途 |
|------|------|------|
| pytest | 8.0.0+ | 测试框架 |
| pytest-asyncio | 0.23.0+ | 异步测试支持 |
| pytest-cov | 4.0.0+ | 覆盖率测量 |
| httpx | 0.26.0+ | HTTP 客户端（用于测试） |

---

## 2. 设计思想

### 2.1 为什么使用缓存 + HTTP 轮询？

**背景：**
由于 Claude Code 直接更新 `~/.claude/` 下的文件，无法使用外部的 Webhook 或 Push 通知。

**方案：**
1. **FileWatcherService** 检测文件变化并**使缓存失效**
2. 前端通过 **HTTP 轮询** 定期获取最新数据
3. **CacheService** 避免频繁的文件读取

**缓存策略：**
| 数据类型 | TTL | 理由 |
|---------|-----|------|
| 团队配置 | 30秒 | 更新频率低 |
| 收件箱 | 60秒 | 消息需要实时性但轮询足够 |

### 2.2 为什么使用会话日志的 mtime 判断状态？

**背景：**
之前使用 `config.json` 的 mtime 进行判断，但有时会在与团队活动无关的时机更新。

**改进：**
使用会话日志（`{sessionId}.jsonl`）的 mtime：
- 会话日志 = 代理的实际活动记录
- mtime = 团队的最后活动时间
- 以 **1小时** 为阈值判断 `active` / `stopped`

---

## 3. 项目结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 应用入口
│   ├── config.py            # 配置管理（Pydantic Settings）
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── teams.py     # 团队相关 API（列表、详情、删除、收件箱）
│   │       ├── tasks.py     # 任务相关 API
│   │       ├── messages.py  # 消息与时间线 API
│   │       ├── agents.py    # 代理列表 API
│   │       └── timeline.py  # 统一时间线 API
│   ├── models/
│   │   ├── __init__.py
│   │   ├── team.py          # Team/Member/TeamSummary 模型
│   │   ├── task.py          # Task/TaskSummary 模型
│   │   ├── message.py       # Message 模型
│   │   ├── timeline.py      # TimelineItem 模型
│   │   ├── agent.py         # Agent/AgentSummary 模型
│   │   ├── chat.py          # Chat 相关模型
│   │   └── model.py         # Model 配置模型
│   ├── services/
│   │   ├── __init__.py
│   │   ├── file_watcher.py  # 文件监控服务（缓存失效）
│   │   ├── cache_service.py # 内存缓存服务（带 TTL）
│   │   ├── timeline_service.py    # 收件箱 + 会话日志集成服务
│   │   ├── agent_status_service.py # 代理状态推断服务
│   │   └── message_parser.py      # 协议消息解析服务
│   └── utils/
│       └── __init__.py
├── tests/
│   ├── __init__.py
│   ├── test_api_teams.py
│   ├── test_api_tasks.py
│   ├── test_api_timeline.py
│   └── test_services/
└── pyproject.toml           # 项目配置与依赖
```

### 3.1 各模块职责

| 模块 | 职责 |
|------|------|
| `main.py` | FastAPI 应用创建、lifespan 管理（FileWatcher/CacheService） |
| `config.py` | 从环境变量加载配置的 Settings 类 |
| `api/routes/teams.py` | 团队列表、详情、收件箱、删除、状态判断 API |
| `api/routes/tasks.py` | 任务列表、详情、状态判断 API |
| `api/routes/messages.py` | 消息时间线 API |
| `api/routes/agents.py` | 代理列表 API |
| `api/routes/timeline.py` | 统一时间线、历史、差异更新 API |
| `services/file_watcher.py` | ~/.claude/ 监控、缓存失效 |
| `services/cache_service.py` | 基于 TTL 的内存缓存 |
| `services/timeline_service.py` | 收件箱 + 会话日志集成 |
| `services/agent_status_service.py` | 代理状态推断 |
| `services/message_parser.py` | 协议消息解析 |
| `models/` | Pydantic 数据模型定义 |

---

## 4. 服务详情

### 4.1 FileWatcherService

**角色：** 监控 `~/.claude/` 目录的变化

**主要目的：** **缓存失效 + 日志输出**（非实时推送）

**检测模式：**

| 模式 | 事件 | 操作 |
|------|------|------|
| `teams/*/config.json` | 团队配置变更 | 缓存失效 + 日志输出 |
| `teams/*/inboxes/*.json` | 收件箱更新 | 缓存失效 + 日志输出 |
| `tasks/*/*.json` | 任务状态变更 | 仅日志输出 |

**防抖：** 500ms（抑制连续事件）

```python
class FileWatcherService:
    def __init__(self, path: Path, debounce_ms: int = 500):
        self.path = path
        self.debounce_ms = debounce_ms
        self._observer: Optional[Observer] = None
```

### 4.2 CacheService

**角色：** 基于 TTL 的内存缓存

**配置：**

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `config_ttl` | 30秒 | 团队配置的 TTL |
| `inbox_ttl` | 60秒 | 收件箱的 TTL |
| `cleanup_interval` | 300秒 | 过期条目清理间隔 |

**主要方法：**

| 方法 | 说明 |
|------|------|
| `get_team_config(team_name)` | 获取团队配置（缓存或文件） |
| `get_team_inbox(team_name, agent_name)` | 获取收件箱 |
| `invalidate_team_config(team_name)` | 使团队配置缓存失效 |
| `invalidate_team_inbox(team_name, agent_name)` | 使收件箱缓存失效 |
| `get_stats()` | 获取缓存统计信息 |

### 4.3 TimelineService

**角色：** 收件箱 + 会话日志的集成

**输入数据源：**

| 来源 | 文件路径 | 内容 |
|------|----------|------|
| 收件箱 | `teams/{name}/inboxes/{agent}.json` | 代理间消息 |
| 会话 | `projects/{hash}/{sessionId}.jsonl` | 会话历史 |

**输出：** 按时间排序的统一时间线

**会话日志条目类型：**

| 类型 | 内容 |
|------|------|
| `user_message` | 用户输入 |
| `assistant_message` | 助手响应 |
| `thinking` | 思考过程 |
| `tool_use` | 工具调用 |
| `file_change` | 文件变更 |

### 4.4 AgentStatusService

**角色：** 代理状态推断

**判断逻辑：**

| 状态 | 条件 |
|------|------|
| `idle` | 5分钟以上无活动 |
| `working` | 有 in_progress 任务 |
| `waiting` | 有 blocked 任务 |
| `error` | 30分钟以上无活动 |
| `completed` | 所有任务完成 |

**使用数据：**
- 任务定义（owner, status, blockedBy）
- 收件箱（task_assignment, task_completed）
- 会话日志（最后活动时间）

### 4.5 MessageParser

**角色：** 协议消息的解析与分类

**支持的类型：**

| 类型 | 说明 |
|------|------|
| `message` | 普通消息 |
| `task_assignment` | 任务分配 |
| `task_completed` | 任务完成通知 |
| `idle_notification` | 空闲通知 |
| `shutdown_request` | 关闭请求 |
| `shutdown_response` | 关闭响应 |
| `plan_approval_request` | 计划批准请求 |
| `plan_approval_response` | 计划批准响应 |

---

## 5. API 设计

### 5.1 REST API 端点列表

#### 团队相关

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/teams` | GET | 获取团队列表（带状态） |
| `/api/teams/{team_name}` | GET | 获取团队详情 |
| `/api/teams/{team_name}` | DELETE | 删除团队 |
| `/api/teams/{team_name}/inboxes` | GET | 获取团队收件箱列表 |
| `/api/teams/{team_name}/inboxes/{agent}` | GET | 获取特定代理的收件箱 |

#### 任务相关

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/tasks` | GET | 获取任务列表 |
| `/api/tasks/team/{team_name}` | GET | 按团队获取任务 |
| `/api/tasks/{team}/{task_id}` | GET | 获取任务详情 |

#### 代理相关

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/agents` | GET | 获取代理列表 |

#### 时间线相关

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/teams/{team_name}/messages/timeline` | GET | 消息时间线 |
| `/api/timeline/{team_name}/history` | GET | 获取统一历史 |
| `/api/timeline/{team_name}/updates` | GET | 获取差异更新 |
| `/api/file-changes/{team}` | GET | 获取文件变更列表 |

### 5.2 团队删除 API 详情

```
DELETE /api/teams/{team_name}
```

**可删除状态：** `stopped`, `inactive`, `unknown`

**删除目标：**
1. `teams/{team_name}/` 目录
2. `tasks/{team_name}/` 目录
3. 仅会话文件（项目目录保留）

**成功响应：**
```json
{
  "message": "已删除团队 \"{team_name}\"",
  "deletedPaths": [
    "~/.claude/teams/my-team",
    "~/.claude/tasks/my-team",
    "~/.claude/projects/-Users-user-project/abc123.jsonl"
  ]
}
```

**错误响应：**
- `404 Not Found`：团队不存在
- `400 Bad Request`：状态为 `active`（不可删除）

---

## 6. 数据模型

### 6.1 团队相关模型

```python
class Member(BaseModel):
    """团队成员模型"""
    agentId: str
    name: str
    agentType: str
    model: str = "unknown"
    joinedAt: int = 0
    status: str = "idle"  # active, idle
    color: Optional[str] = None


class Team(BaseModel):
    """团队详情模型"""
    name: str
    description: Optional[str] = ""
    createdAt: int = 0
    leadAgentId: str
    leadSessionId: str = ""
    members: list[Member] = []


class TeamSummary(BaseModel):
    """团队列表摘要"""
    name: str
    description: Optional[str] = ""
    memberCount: int
    taskCount: int = 0
    status: str  # active, inactive, stopped, unknown
    leadAgentId: str
    createdAt: Optional[int] = None
```

### 6.2 任务相关模型

```python
class Task(BaseModel):
    """任务详情模型"""
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
    """任务列表摘要"""
    id: str
    subject: str
    status: str
    owner: Optional[str] = None
    team: Optional[str] = None
```

### 6.3 时间线相关模型

```python
class TimelineItem(BaseModel):
    """时间线条目（统一）"""
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

## 7. 状态判断逻辑

### 7.1 团队状态判断

**实现位置：** `api/routes/teams.py` - `get_team_status()`

**判断流程：**

```python
def get_team_status(config: dict) -> str:
    """判断团队状态。

    判断标准:
    - 无成员 → 'inactive'
    - 无会话日志 → 'unknown'
    - 会话日志 mtime > 1小时 → 'stopped'
    - 会话日志 mtime ≤ 1小时 → 'active'
    """
    if not config.get("members"):
        return "inactive"

    # 定位会话日志文件
    session_file = _find_session_file(settings.claude_dir, config)

    if not session_file:
        return "unknown"

    # 获取会话日志 mtime
    mtime = os.path.getmtime(session_file)
    mtime_dt = datetime.fromtimestamp(mtime, tz=timezone.utc)
    now = datetime.now(timezone.utc)

    # 检查是否超过1小时
    if (now - mtime_dt).total_seconds() > 60 * 60:
        return "stopped"

    return "active"
```

**会话日志定位逻辑：**

```python
def _find_session_file(claude_dir: Path, config: dict) -> Optional[Path]:
    """定位团队的会话日志文件。

    从 config.json 获取 leadSessionId 和 cwd 以查找会话日志。
    """
    members = config.get("members", [])
    if not members:
        return None

    # 使用第一个成员的 cwd
    cwd = members[0].get("cwd")
    if not cwd:
        return None

    # 转换为 project-hash
    project_hash = _cwd_to_project_hash(cwd)
    project_dir = claude_dir / "projects" / project_hash

    # 查找对应 leadSessionId 的文件
    lead_session_id = config.get("leadSessionId")
    if lead_session_id:
        session_file = project_dir / f"{lead_session_id}.jsonl"
        if session_file.exists():
            return session_file

    return None


def _cwd_to_project_hash(cwd: str) -> str:
    """从工作目录生成 project-hash。"""
    return "-" + cwd.lstrip("/").replace("/", "-")
```

### 7.2 任务停止判断

类似逻辑判断任务文件 mtime（阈值：24小时）

---

## 8. 配置管理

### 8.1 配置类

```python
class Settings(BaseSettings):
    """应用配置"""

    # 服务器配置
    host: str = "127.0.0.1"
    port: int = 8000
    debug: bool = True

    # Claude 目录路径
    claude_dir: Path = Path.home() / ".claude"
    teams_dir: Path = Path.home() / ".claude" / "teams"
    tasks_dir: Path = Path.home() / ".claude" / "tasks"

    # CORS 配置
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

    class Config:
        env_prefix = "DASHBOARD_"
```

### 8.2 环境变量列表

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `DASHBOARD_HOST` | `127.0.0.1` | 服务器监听地址 |
| `DASHBOARD_PORT` | `8000` | 服务器监听端口 |
| `DASHBOARD_DEBUG` | `True` | 调试模式 |
| `DASHBOARD_CLAUDE_DIR` | `~/.claude` | Claude 数据目录 |

---

## 9. 测试环境

### 9.1 测试执行命令

```bash
# 运行所有测试
cd backend
pytest

# 详细输出
pytest -v

# 带覆盖率（要求70%以上）
pytest --cov=app --cov-report=html

# 特定测试文件
pytest tests/test_api_teams.py -v

# 特定测试函数
pytest tests/test_api_teams.py::test_get_team -v
```

### 9.2 覆盖率要求

`pyproject.toml` 要求最低70%：

```toml
[tool.pytest.ini_options]
addopts = [
    "--cov-fail-under=70"
]
```

---

## 10. 启动方式

### 10.1 开发环境

```bash
# 安装依赖
cd backend
pip install -e ".[dev]"

# 启动开发服务器
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 10.2 生产环境

```bash
# 安装
pip install .

# 启动
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 11. 功能与数据源对照表

| 功能 | 读取文件 | 使用服务 |
|------|----------|----------|
| 团队列表 | `teams/{name}/config.json` | CacheService |
| 团队状态 | `projects/{hash}/{session}.jsonl` | (mtime 检查) |
| 收件箱 | `teams/{name}/inboxes/{agent}.json` | CacheService |
| 任务 | `tasks/{name}/{id}.json` | (直接读取) |
| 统一时间线 | 以上所有 + 会话日志 | TimelineService |
| 代理状态 | 任务 + 收件箱 + 会话 | AgentStatusService |

---

*创建日期: 2026-02-16*
*最后更新日期: 2026-02-24*
*版本: 2.1.0*
