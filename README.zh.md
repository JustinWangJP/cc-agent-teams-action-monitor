# Agent Teams Dashboard

Claude Code Agent Teams 实时监控仪表板

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)

---

## 设计理念

### 为什么使用 HTTP 轮询？

本系统采用 **HTTP 轮询而非 WebSocket**。原因如下：

1. **简单的架构**：无需 WebSocket 连接管理，作为无状态 API 服务器运行
2. **缓存利用**：TanStack Query 的缓存功能（staleTime: 10秒）减少不必要的请求
3. **可扩展性**：轮询间隔（5秒-60秒）可由用户调整，控制服务器负载

### 团队状态判定逻辑

团队状态通过 **会话日志的 mtime** 判定：

| 状态 | 条件 | 可删除 |
|------|------|--------|
| `active` | 会话日志 mtime ≤ 1小时 | ❌ 否 |
| `stopped` | 会话日志 mtime > 1小时 | ✅ 是 |
| `unknown` | 无会话日志 | ❌ 否 |
| `inactive` | members 数组为空 | ❌ 否 |

### 数据源

| 数据 | 文件路径 |
|------|----------|
| 团队配置 | `~/.claude/teams/{team_name}/config.json` |
| 状态判定 | `~/.claude/projects/{project-hash}/{sessionId}.jsonl` |
| 收件箱 | `~/.claude/teams/{team_name}/inboxes/{agent_name}.json` |
| 任务 | `~/.claude/tasks/{team_name}/{task_id}.json` |

---

## 功能列表

| 功能 | 描述 |
|------|------|
| 团队列表显示 | 以卡片形式显示活跃的代理团队 |
| 团队详情显示 | 成员信息、状态、最后活动时间 |
| 团队状态判定 | 通过会话日志 mtime 自动判定（active/stopped/unknown/inactive） |
| 团队删除 | 仅可删除 stopped 状态的团队 |
| 任务列表显示 | 按状态显示任务（Pending/In Progress/Completed） |
| 任务详情显示 | 描述、负责人、依赖关系 |
| 统一时间线 | inbox + 会话日志的集成显示 |
| 代理状态推断 | 从任务状态和活动时间推断状态（working/idle/waiting/completed/error） |
| 活动动态 | 实时代理活动历史 |
| 自动更新 | HTTP 轮询自动数据更新（间隔可配置：5秒-60秒） |
| 深色模式 | 支持主题切换 |

---

## 环境要求

### 必需环境

| 软件 | 版本 | 检查命令 |
|------|------|----------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

### Claude Code 环境

- 已安装 Claude Code
- 使用 Agent Teams 功能
- `~/.claude/` 目录存在

---

## 安装步骤

### 步骤 1：克隆仓库

```bash
git clone <repository-url>
cd cc-agent-teams-action-monitor
```

### 步骤 2：后端设置

```bash
cd backend
pip install -e ".[dev]"

# 验证安装
python -c "from app.main import app; print('Backend setup completed!')"
```

### 步骤 3：前端设置

```bash
cd ../frontend
npm install

# 验证安装
npm run build
```

---

## 启动方法

### 启动后端

```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 启动前端

在另一个终端中：

```bash
cd frontend
npm run dev
```

### 访问

在浏览器中打开 http://localhost:5173/

---

## 界面说明

### 团队状态

| 徽章 | 状态 | 描述 |
|------|------|------|
| 🟢 active | 会话日志 mtime ≤ 1小时 | 团队活动中 |
| ⚫ stopped | 会话日志 mtime > 1小时 | 团队已停止（可删除） |
| ⚪ unknown | 无会话日志 | 状态未知 |
| ⚫ inactive | 无成员 | 成员不在 |

### 代理状态

| 显示 | 状态 | 描述 |
|------|------|------|
| 🔵 working | 有进行中的任务 | 工作中 |
| 💤 idle | 5分钟以上无活动 | 空闲 |
| ⏳ waiting | 有阻塞的任务 | 等待中 |
| ✅ completed | 所有任务完成 | 已完成 |
| ❌ error | 30分钟以上无活动 | 错误状态 |

### 轮询间隔调整

可从标题栏调整轮询间隔：
- 5秒 / 10秒 / 20秒 / 30秒（默认）/ 60秒
- staleTime: 10秒（缓存有效期）

---

## 操作方法

### 选择团队

1. 点击显示的团队卡片
2. 选中的团队会高亮显示
3. 再次点击取消选择

### 删除团队

1. 点击 stopped 状态团队卡片上的🗑️图标
2. 在确认对话框中点击"删除"
3. 团队配置、任务和会话日志将被删除

**注意**：active 状态的团队无法删除。

### 更改轮询间隔

1. 使用标题栏中的轮询间隔选择器
2. 从5秒到60秒中选择
3. 默认为30秒

### 查看任务

任务按状态以不同颜色显示：

| 状态 | 颜色 | 描述 |
|------|------|------|
| Pending | 灰色 | 未开始 |
| In Progress | 蓝色 | 进行中 |
| Completed | 绿色 | 已完成 |

---

## API 端点

### 健康检查

```http
GET /api/health
```

### 团队列表

```http
GET /api/teams
```

### 团队详情

```http
GET /api/teams/{team_name}
```

### 团队收件箱

```http
GET /api/teams/{team_name}/inboxes
```

### 删除团队

```http
DELETE /api/teams/{team_name}
```

**条件**：仅 stopped 状态的团队可删除

### 统一时间线

```http
GET /api/history?team_name={team_name}&limit=50&types=message,task_assignment
```

### 增量更新

```http
GET /api/updates?team_name={team_name}&since=2026-02-23T11:00:00Z
```

### 任务列表

```http
GET /api/tasks
```

---

## 开发

### 运行测试

```bash
# 后端测试
cd backend
pytest                    # 运行所有测试
pytest -v                 # 详细输出
pytest --cov=app          # 带覆盖率

# 前端测试
cd frontend
npm run test              # 运行测试
```

### 开发命令

```bash
# 后端（带热重载）
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 前端（带 HMR）
npm run dev

# 类型检查
npx tsc --noEmit

# 构建
npm run build
```

---

## 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `DASHBOARD_HOST` | `127.0.0.1` | 服务器监听地址 |
| `DASHBOARD_PORT` | `8000` | 服务器监听端口 |
| `DASHBOARD_DEBUG` | `True` | 调试模式 |
| `DASHBOARD_CLAUDE_DIR` | `~/.claude` | Claude 数据目录 |

---

## 架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                    前端 (React)                                      │
│  ┌───────────┐  ┌───────────┐  ┌────────────────────────────────┐  │
│  │ 组件      │  │  Hooks    │  │  类型                          │  │
│  │ - TeamCard│  │ - useTeams│  │  - Team, Task, Message         │  │
│  │ - TaskCard│  │ - useTasks│  │                                │  │
│  └───────────┘  └───────────┘  └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │ HTTP/REST              │ HTTP 轮询
         ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    后端 (FastAPI)                                    │
│  ┌───────────┐  ┌───────────┐  ┌────────────────────────────────┐  │
│  │API 路由   │  │ 缓存服务  │  │ 文件监控服务                    │  │
│  │ /api/teams│  │ - 30秒 TTL│  │ - 会话日志监控                  │  │
│  │ /api/tasks│  │           │  │ - 缓存失效处理                  │  │
│  └───────────┘  └───────────┘  └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼ 文件监控 (watchdog)
┌─────────────────────────────────────────────────────────────────────┐
│                  ~/.claude/ 目录                                     │
│  ├── teams/{team_name}/config.json      # 团队配置                  │
│  │   └── inboxes/{agent_name}.json      # 代理收件箱                │
│  ├── tasks/{team_name}/{task_id}.json   # 任务定义                  │
│  └── projects/{project-hash}/{sessionId}.jsonl  # 会话日志          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 团队不显示 | `~/.claude/teams/` 为空 | 在 Claude Code 中创建团队 |
| HTTP 连接错误 | 后端停止 | 重启后端 |
| 页面无法加载 | 前端未启动 | 运行 `npm run dev` |
| 实时更新不工作 | 端口被阻止 | 检查防火墙设置 |

---

## 许可证

MIT License

---

*创建日期: 2026-02-16*
*最后更新: 2026-02-23*
*版本: 2.0.0*
