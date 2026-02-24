# Agent Teams Dashboard

Claude Code Agent Teams 实时监控仪表板

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)

---

## 语言 / Languages

- [日本語](README.md) (默认)
- [English](README.en.md)
- [中文](README.zh.md)

---

## 概述

Agent Teams Dashboard 是一个用于实时监控和管理 Claude Code Agent Teams 功能的 Web 应用程序。它监控 `~/.claude/` 目录，并可视化团队配置、任务进度和代理间的消息传递。

### 主要特性

- **实时更新**: 通过 HTTP 轮询自动更新数据（5秒〜60秒间隔）
- **团队监控**: 显示活跃的代理团队及状态指示器
- **任务管理**: 按状态可视化任务（看板风格）
- **统一时间线**: 集成显示代理消息 + 会话日志
- **深色模式**: 支持主题切换

---

## 快速开始

### 前提条件

| 软件 | 版本 | 检查命令 |
|------|------|----------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd cc-agent-teams-action-monitor

# 后端
cd backend
pip install -e ".[dev]"

# 前端
cd ../frontend
npm install
```

### 启动方法

**终端 1（后端）:**
```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**终端 2（前端）:**
```bash
cd frontend
npm run dev
```

**访问:** http://localhost:5173/

---

## 设计思想

### 为什么使用 HTTP 轮询？

本系统采用 **HTTP 轮询而非 WebSocket**：

1. **简单架构**: 无需 WebSocket 连接管理
2. **利用缓存**: TanStack Query 的缓存功能（staleTime: 10秒）减少不必要的请求
3. **可扩展性**: 用户可调整轮询间隔

### 团队状态判定

团队状态通过 **会话日志的 mtime** 判定：

| 状态 | 条件 | 可删除 |
|------|------|--------|
| `active` | 会话日志 mtime ≤ 1小时 | ❌ 否 |
| `stopped` | 会话日志 mtime > 1小时 | ✅ 是 |
| `unknown` | 无会话日志 | ❌ 否 |
| `inactive` | members 数组为空 | ❌ 否 |

> 详细请参考 [docs/spec/system-design.md](docs/spec/system-design.md) §2.2

---

## 📚 文档参考

详细信息请参考 `docs/spec/` 内的各文档：

| 文档 | 内容 |
|------|------|
| [architecture.md](docs/spec/architecture.md) | 架构设计、组件构成、数据流 |
| [system-design.md](docs/spec/system-design.md) | 系统设计、API规格、数据模型 |
| [frontend-tech-stack.md](docs/spec/frontend-tech-stack.md) | 前端技术栈详情 |
| [backend-tech-stack.md](docs/spec/backend-tech-stack.md) | 后端技术栈详情 |
| [feature-specification.md](docs/spec/feature-specification.md) | 功能规格详情 |
| [user-guide.md](docs/spec/user-guide.md) | 用户指南详情 |
| [ut-plan.md](docs/spec/ut-plan.md) | 单元测试计划 |
| [qa-strategy.md](docs/spec/qa-strategy.md) | QA策略 |

---

## 技术栈

### 后端

| 类别 | 技术 |
|------|------|
| 语言 | Python 3.11+ |
| 框架 | FastAPI 0.109+ |
| 数据验证 | Pydantic 2.5+ |
| 文件监控 | watchdog 4.0+ |

### 前端

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript 5.3+ |
| 框架 | React 18 |
| 打包工具 | Vite 5+ |
| CSS | Tailwind CSS 3.4+ |
| 状态管理 | Zustand 5.0.2+ |
| 数据获取 | TanStack Query 5.90.21+ |

> 详细版本信息请参考 [docs/spec/frontend-tech-stack.md](docs/spec/frontend-tech-stack.md) 和 [docs/spec/backend-tech-stack.md](docs/spec/backend-tech-stack.md)

---

## API 概述

### 主要端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/teams` | GET | 团队列表（含状态） |
| `/api/teams/{name}` | GET | 团队详情 |
| `/api/teams/{name}` | DELETE | 删除团队（仅 stopped） |
| `/api/tasks` | GET | 任务列表 |
| `/api/history` | GET | 统一时间线 |
| `/api/updates` | GET | 增量更新 |

> 完整 API 规格请参考 [docs/spec/system-design.md](docs/spec/system-design.md) §6

---

## 开发命令

### 后端

```bash
cd backend

# 启动开发服务器
uvicorn app.main:app --reload

# 运行测试
pytest                    # 所有测试
pytest --cov=app          # 带覆盖率
pytest tests/test_api_teams.py -v  # 单独测试
```

### 前端

```bash
cd frontend

# 启动开发服务器
npm run dev

# 类型检查
npx tsc --noEmit

# 运行测试
npm run test
npm run test:coverage     # 带覆盖率

# 生产构建
npm run build
```

---

## 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 团队不显示 | `~/.claude/teams/` 为空 | 在 Claude Code 中创建团队 |
| HTTP 连接错误 | 后端停止 | 重启后端 |
| 页面无法加载 | 前端未启动 | 运行 `npm run dev` |
| 实时更新不工作 | 端口被阻止 | 检查防火墙设置 |

> 详细请参考 [docs/spec/user-guide.md](docs/spec/user-guide.md) §故障排除

---

## 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `DASHBOARD_HOST` | `127.0.0.1` | 服务器监听地址 |
| `DASHBOARD_PORT` | `8000` | 服务器监听端口 |
| `DASHBOARD_DEBUG` | `True` | 调试模式 |
| `DASHBOARD_CLAUDE_DIR` | `~/.claude` | Claude 数据目录 |

---

## 许可证

MIT License

---

*最后更新: 2026-02-24*
*版本: 2.1.0*
