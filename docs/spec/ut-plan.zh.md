# 单元测试计划与测试规范

**语言:** [English](./ut-plan.en.md) | [日本語](./ut-plan.md) | [中文](./ut-plan.zh.md)

## 1. 测试概述

### 1.1 测试目的

为保证 Agent Teams Dashboard 的质量，对后端和前端进行单元测试。

### 1.2 测试范围

| 类别 | 范围 |
|------|------|
| 后端 | API Routes, Services, Models |
| 前端 | Components, Hooks, Stores |

### 1.3 测试环境

| 环境 | 工具 |
|------|------|
| 后端 | pytest, pytest-asyncio, httpx |
| 前端 | Vitest, @testing-library/react |
| E2E | Puppeteer |

### 1.4 设计思想

#### 为什么要测试 HTTP 轮询

本系统通过 **HTTP 轮询** 实现实时更新，因此不需要 WebSocket 测试。取而代之的是：

- 验证轮询间隔行为
- 验证缓存 TTL 行为
- 验证 staleTime 和 refetchInterval 的协调

#### 状态判定逻辑测试

团队状态由 **会话日志 mtime** 判定，需要文件系统模拟：

```
会话日志 mtime ≤ 1 小时 → active
会话日志 mtime > 1 小时 → stopped
无会话日志 → unknown
无成员 → inactive
```

---

## 2. 测试环境搭建

### 2.1 后端

```bash
cd backend
pip install -e ".[dev]"
pytest --version
```

### 2.2 前端

```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

---

## 3. 后端测试计划

### 3.1 API Routes 测试

#### teams.py 测试用例

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-API-001 | list_teams_success | 获取团队列表（成功） | 200, 返回团队列表 | 高 |
| T-API-002 | list_teams_empty | 获取团队列表（无数据） | 200, 返回空数组 | 高 |
| T-API-003 | get_team_success | 获取团队详情（成功） | 200, 返回团队详情 | 高 |
| T-API-004 | get_team_not_found | 获取团队详情（不存在） | 404 | 高 |
| T-API-005 | get_team_inboxes | 获取收件箱 | 200, 消息列表 | 中 |
| T-API-006 | get_team_status_active | 团队状态 active 判定 | 会话日志 mtime ≤ 1 小时 | 高 |
| T-API-007 | get_team_status_stopped | 团队状态 stopped 判定 | 会话日志 mtime > 1 小时 | 高 |
| T-API-008 | get_team_status_unknown | 团队状态 unknown 判定 | 无会话日志 | 高 |
| T-API-009 | get_team_status_inactive | 团队状态 inactive 判定 | 无成员 | 高 |
| T-API-010 | delete_team_success | 删除团队（stopped 状态） | 200, 删除成功 | 高 |
| T-API-011 | delete_team_active_forbidden | 删除团队（active 状态） | 400, 禁止删除 | 高 |
| T-API-012 | delete_team_not_found | 删除团队（不存在） | 404 | 高 |

#### tasks.py 测试用例

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-API-013 | list_tasks_success | 获取任务列表（成功） | 200, 返回任务列表 | 高 |
| T-API-014 | list_tasks_empty | 获取任务列表（无数据） | 200, 返回空数组 | 高 |
| T-API-015 | list_team_tasks | 按团队获取任务 | 200, 任务列表 | 高 |
| T-API-016 | get_task_success | 获取任务详情（成功） | 200, 任务详情 | 高 |
| T-API-017 | get_task_not_found | 获取任务详情（不存在） | 404 | 高 |

#### timeline.py 测试用例（新增）

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-API-018 | get_history_success | 获取统一时间线 | 200, 时间线条目 | 高 |
| T-API-019 | get_history_with_team | 带团队筛选获取 | 已筛选结果 | 高 |
| T-API-020 | get_history_with_types | 带类型筛选获取 | 已筛选结果 | 高 |
| T-API-021 | get_history_pagination | 分页 | before_event_id 生效 | 中 |
| T-API-022 | get_updates_since | 获取增量更新 | 时间戳后的数据 | 高 |
| T-API-023 | get_file_changes | 获取文件变更列表 | 文件变更历史 | 高 |

#### agents.py 测试用例（新增）

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-API-024 | list_agents_success | 获取代理列表 | 200, 代理列表 | 高 |
| T-API-025 | list_agents_empty | 无代理 | 200, 空数组 | 中 |
| T-API-026 | get_agent_status_working | 代理状态 working | 有 in_progress 任务 | 高 |
| T-API-027 | get_agent_status_idle | 代理状态 idle | 5分钟以上无活动 | 高 |
| T-API-028 | get_agent_status_waiting | 代理状态 waiting | 有 blocked 任务 | 高 |
| T-API-029 | get_agent_status_completed | 代理状态 completed | 所有任务完成 | 高 |

### 3.2 Services 测试

#### file_watcher.py 测试用例

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-SVC-001 | start_watcher | 开始监听 | Observer 启动 | 高 |
| T-SVC-002 | stop_watcher | 停止监听 | Observer 停止 | 高 |
| T-SVC-003 | file_modified_config | 检测 config.json 变更 | 缓存失效 | 高 |
| T-SVC-004 | file_modified_inbox | 检测 inbox.json 变更 | 缓存失效 | 高 |
| T-SVC-005 | debounce | 防抖处理 | 500ms 延迟 | 中 |

#### cache_service.py 测试用例

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-SVC-006 | cache_get_set | 缓存获取/设置 | 正常运行 | 高 |
| T-SVC-007 | cache_expiry | TTL 过期 | 过期时返回 None | 高 |
| T-SVC-008 | cache_invalidate | 缓存失效 | 失效后重新获取 | 高 |
| T-SVC-009 | cache_cleanup | 自动清理 | 删除过期条目 | 中 |

#### timeline_service.py 测试用例（新增）

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-SVC-010 | get_unified_timeline | 获取统一时间线 | inbox + 会话日志集成 | 高 |
| T-SVC-011 | parse_session_log | 解析会话日志 | 正常解析 | 高 |
| T-SVC-012 | filter_by_time_range | 时间范围筛选 | 已筛选结果 | 高 |
| T-SVC-013 | filter_by_types | 类型筛选 | 已筛选结果 | 高 |
| T-SVC-014 | sort_by_timestamp | 时间戳排序 | 升序排列 | 高 |

#### agent_status_service.py 测试用例（新增）

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-SVC-015 | infer_status_idle | idle 状态推断 | 5分钟以上无活动 | 高 |
| T-SVC-016 | infer_status_working | working 状态推断 | 有 in_progress 任务 | 高 |
| T-SVC-017 | infer_status_waiting | waiting 状态推断 | 有 blocked 任务 | 高 |
| T-SVC-018 | infer_status_error | error 状态推断 | 30分钟以上无活动 | 高 |
| T-SVC-019 | infer_status_completed | completed 状态推断 | 所有任务完成 | 高 |
| T-SVC-020 | get_last_activity | 获取最后活动时间 | 正常获取 | 高 |

#### message_parser.py 测试用例（新增）

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-SVC-021 | parse_task_assignment | 解析任务分配 | parsedType='task_assignment' | 高 |
| T-SVC-022 | parse_idle_notification | 解析空闲通知 | parsedType='idle_notification' | 高 |
| T-SVC-023 | parse_shutdown_request | 解析关闭请求 | parsedType='shutdown_request' | 高 |
| T-SVC-024 | parse_plan_approval | 解析计划批准 | parsedType='plan_approval_request' | 高 |
| T-SVC-025 | parse_unknown | 解析未知类型 | parsedType='unknown' | 中 |

### 3.3 Models 测试

#### Pydantic 模型测试用例

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-MOD-001 | team_validation | Team 验证 | 正常创建 | 高 |
| T-MOD-002 | task_validation | Task 验证 | 正常创建 | 高 |
| T-MOD-003 | timeline_item_validation | TimelineItem 验证 | 正常创建 | 高 |
| T-MOD-004 | invalid_data | 无效数据 | ValidationError | 高 |

---

## 4. 前端测试计划

### 4.1 Components 测试

#### 通用组件

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-CMP-001 | LoadingSpinner_render | 加载显示 | 显示转圈 | 中 |
| T-CMP-002 | StatusBadge_active | active 状态 | 绿色徽章 | 高 |
| T-CMP-003 | StatusBadge_stopped | stopped 状态 | 深灰色徽章 | 高 |
| T-CMP-004 | ThemeToggle_click | 主题切换 | 主题改变 | 高 |
| T-CMP-005 | PollingIntervalSelector | 轮询间隔选择 | 间隔改变 | 中 |

#### 聊天相关组件（新增）

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-CMP-006 | ChatMessageBubble_render | 消息气泡显示 | 正常渲染 | 高 |
| T-CMP-007 | ChatMessageBubble_markdown | Markdown 显示 | 格式化显示 | 高 |
| T-CMP-008 | ChatMessageBubble_type_icon | 类型特定图标 | 适当图标 | 高 |
| T-CMP-009 | ChatMessageBubble_click | 点击事件 | 调用 onClick | 高 |
| T-CMP-010 | ChatHeader_search | 搜索功能 | 筛选生效 | 高 |
| T-CMP-011 | ChatHeader_filters | 筛选功能 | 应用筛选 | 高 |
| T-CMP-012 | ChatTimelinePanel_empty | 空状态显示 | 显示指南 | 中 |
| T-CMP-013 | BookmarkButton_toggle | 书签切换 | 保存/删除 | 中 |
| T-CMP-014 | AgentStatusIndicator_online | 在线状态 | 绿色显示 | 中 |
| T-CMP-015 | MessageDetailPanel_render | 详情面板显示 | 滑入 | 高 |

#### 仪表板组件

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-CMP-016 | TeamCard_render | 团队卡片显示 | 正常渲染 | 高 |
| T-CMP-017 | TeamCard_click | 点击事件 | 调用 onClick | 高 |
| T-CMP-018 | TeamCard_stopped | stopped 状态显示 | 适当显示 | 高 |
| T-CMP-019 | TaskCard_render | 任务卡片显示 | 正常渲染 | 高 |
| T-CMP-020 | ActivityFeed_render | 动态源显示 | 正常渲染 | 中 |

### 4.2 Hooks 测试

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-HK-001 | useTeams_fetch | 数据获取 | teams 更新 | 高 |
| T-HK-002 | useTeams_loading | 加载状态 | loading=true → false | 高 |
| T-HK-003 | useTeams_polling | 轮询行为 | 定期更新（refetchInterval） | 高 |
| T-HK-004 | useTeams_stale_time | staleTime 行为 | 10秒内使用缓存 | 高 |
| T-HK-005 | useTasks_fetch | 数据获取 | tasks 更新 | 高 |
| T-HK-006 | useTasks_polling | 轮询行为 | 定期更新 | 高 |
| T-HK-007 | useInbox_fetch | 收件箱获取 | 获取消息 | 高 |
| T-HK-008 | useUnifiedTimeline_fetch | 统一时间线获取 | 时间线条目 | 高 |
| T-HK-009 | useUnifiedTimeline_polling | 轮询行为 | 定期更新 | 高 |
| T-HK-010 | useAgentMessages_fetch | 代理特定消息获取 | 获取消息 | 高 |

### 4.3 Store 测试（新增）

| 测试ID | 测试名称 | 测试内容 | 预期结果 | 优先级 |
|--------|----------|----------|----------|--------|
| T-STR-001 | dashboardStore_selection | 选择状态管理 | 正常运行 | 高 |
| T-STR-002 | dashboardStore_filters | 筛选管理 | 正常运行 | 高 |
| T-STR-003 | dashboardStore_polling | 轮询控制 | 正常运行 | 高 |
| T-STR-004 | dashboardStore_theme | 主题管理 | 正常运行 | 中 |

---

## 5. 测试实现示例

### 5.1 后端 (pytest)

```python
# tests/test_api_teams.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_list_teams_success(client):
    """T-API-001: 获取团队列表（成功）"""
    response = await client.get("/api/teams")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_team_not_found(client):
    """T-API-004: 获取团队详情（不存在）"""
    response = await client.get("/api/teams/nonexistent")
    assert response.status_code == 404
```

### 5.2 前端 (Vitest)

```typescript
// src/components/chat/__tests__/ChatMessageBubble.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatMessageBubble } from '../ChatMessageBubble';
import type { ParsedMessage } from '@/types/message';

describe('ChatMessageBubble', () => {
  const mockMessage: ParsedMessage = {
    from: 'test-agent',
    text: 'Hello World',
    timestamp: '2026-02-21T12:00:00Z',
    read: true,
    parsedType: 'message',
  };

  it('T-CMP-006: 消息气泡显示', () => {
    render(<ChatMessageBubble message={mockMessage} />);
    expect(screen.getByText('test-agent')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('T-CMP-008: 类型特定图标 - message', () => {
    render(<ChatMessageBubble message={mockMessage} />);
    expect(screen.getByText('💬')).toBeInTheDocument();
  });
});
```

---

## 6. 测试执行命令

### 6.1 后端

```bash
cd backend

# 运行所有测试
pytest

# 详细输出
pytest -v

# 带覆盖率
pytest --cov=app --cov-report=html

# 特定测试
pytest tests/test_api_teams.py -v
```

### 6.2 前端

```bash
cd frontend

# 运行所有测试
npm run test

# 监听模式
npm run test:watch

# 带覆盖率
npm run test:coverage

# UI 模式
npm run test:ui
```

---

## 7. 覆盖率目标

| 类别 | 目标覆盖率 |
|------|-----------|
| 后端 API | 80%+ |
| 后端 Services | 70%+ |
| 后端 Models | 90%+ |
| 前端 Components | 70%+ |
| 前端 Hooks | 80%+ |
| 前端 Stores | 85%+ |

---

## 8. 测试执行计划

### 阶段1: 基础测试（1周）
- 后端 API Routes 测试
- Pydantic Models 测试
- 前端通用组件测试

### 阶段2: 功能测试（1周）
- File Watcher 测试
- Cache Service 测试
- Timeline Service 测试
- Agent Status Service 测试
- Message Parser 测试
- 聊天组件测试

### 阶段3: UI 测试（1周）
- 前端 Components 测试
- 前端 Hooks 测试（包括轮询行为）
- 前端 Stores 测试

### 阶段4: 集成测试（1周）
- E2E 测试扩展
- 性能测试（轮询负载）
- 跨浏览器测试

---

*创建日期: 2026-02-16*
*最后更新: 2026-02-24*
*版本: 2.1.0*
