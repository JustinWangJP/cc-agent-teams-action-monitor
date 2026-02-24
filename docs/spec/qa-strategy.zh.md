# QA 策略文档

*语言: [English](qa-strategy.en.md) | [日本語](qa-strategy.md) | [中文](qa-strategy.zh.md)*

## 1. 质量目标

| 指标 | 目标值 | 当前状态 |
|-----------|--------|----------|
| 测试覆盖率 (后端) | 80%以上 | 70%+ (pyproject.toml 要求) |
| 测试覆盖率 (前端) | 80%以上 | 准备中 |
| TypeScript strict mode 错误 | 0件 | 0件 (已达成) |
| Lint 错误 | 0件 | 未测量 |
| E2E 测试通过率 | 100% | 未实现 |

### 1.1 设计思想

#### 测试策略的基本方针

本系统通过 **HTTP轮询** 实现实时更新，因此不需要 WebSocket 测试。应优先考虑：

1. **轮询行为测试**: TanStack Query 的 `refetchInterval` 和 `staleTime` 的协作
2. **缓存失效测试**: 验证基于 FileWatcher 的缓存失效行为
3. **状态判定测试**: 验证基于会话日志 mtime 的判定逻辑

#### 需要测试的重要逻辑

| 逻辑 | 测试要点 | 优先级 |
|---------|---------|--------|
| 团队状态判定 | mtime ≤ 1小时 → active, mtime > 1小时 → stopped | 高 |
| 代理状态推断 | 从任务状态和活动时间推断状态 | 高 |
| 统一时间线 | inbox + 会话日志集成 | 高 |
| 团队删除 | 仅非 active 状态可删除 | 高 |
| 消息解析 | JSON-in-JSON 的准确解析 | 中 |

---

## 2. 测试环境

### 2.1 后端

```bash
cd backend
pip install -e ".[dev]"

# 运行测试
pytest

# 带覆盖率
pytest --cov=app --cov-report=html

# 特定测试
pytest tests/test_api_teams.py -v
```

### 2.2 前端

```bash
cd frontend
npm install

# 运行测试
npm run test

# 监视模式
npm run test:watch

# 覆盖率
npm run test:coverage

# UI
npm run test:ui
```

---

## 3. 测试实施状况

### 3.1 前端

| 组件/钩子 | 测试文件 | 状态 |
|----------------|---------|------|
| StatusBadge | `__tests__/StatusBadge.test.tsx` | ✅ 完成 |
| TeamCard | `__tests__/TeamCard.test.tsx` | ✅ 完成 |
| TaskCard | `__tests__/TaskCard.test.tsx` | ✅ 完成 |
| LoadingSpinner | `__tests__/LoadingSpinner.test.tsx` | ✅ 完成 |
| ActivityFeed | `__tests__/ActivityFeed.test.tsx` | ✅ 完成 |
| ThemeToggle | `__tests__/ThemeToggle.test.tsx` | ✅ 完成 |
| useTeams | `__tests__/useTeams.test.tsx` | ✅ 完成（包含轮询行为） |
| useTasks | `__tests__/useTasks.test.tsx` | ✅ 完成 |
| useInbox | `__tests__/useInbox.test.tsx` | ✅ 完成 |
| useUnifiedTimeline | `__tests__/useUnifiedTimeline.test.tsx` | 📝 计划中 |
| useAgentMessages | `__tests__/useAgentMessages.test.tsx` | 📝 计划中 |
| dashboardStore | `__tests__/dashboardStore.test.ts` | 📝 计划中 |

### 3.2 后端

| 模块 | 测试文件 | 状态 |
|-----------|---------|------|
| Teams API | `test_api_teams.py` | ✅ 基本完成 |
| Teams Delete API | `test_api_teams.py` | 📝 计划中 |
| Tasks API | `test_api_tasks.py` | ✅ 基本完成 |
| Timeline API | `test_api_timeline.py` | 📝 计划中 |
| Agents API | `test_api_agents.py` | 📝 计划中 |
| Models | `test_models.py` | 📝 计划中 |
| FileWatcher | `test_file_watcher.py` | 📝 计划中 |
| CacheService | `test_cache_service.py` | 📝 计划中 |
| TimelineService | `test_timeline_service.py` | 📝 计划中 |
| AgentStatusService | `test_agent_status_service.py` | 📝 计划中 |
| MessageParser | `test_message_parser.py` | 📝 计划中 |

---

## 4. 代码审查检查清单

### 4.1 通用

- [ ] 代码风格一致
- [ ] 实现了适当的错误处理
- [ ] 魔法数字已定义为常量
- [ ] 使用了适当的命名规范
- [ ] 删除了不必要的注释和代码

### 4.2 前端 (TypeScript/React)

- [ ] 没有 TypeScript strict mode 错误
- [ ] Props 有适当的类型定义
- [ ] useCallback/useMemo 使用得当
- [ ] 没有渲染性能问题
- [ ] 考虑了可访问性（ARIA）

### 4.3 后端 (Python/FastAPI)

- [ ] 类型提示使用得当
- [ ] 异步处理（async/await）使用正确
- [ ] Pydantic 模型验证适当
- [ ] 日志输出适当
- [ ] 考虑了安全性（输入验证、授权）

---

## 5. 质量门控

### 5.1 PR 合并条件

1. 所有测试通过
2. 覆盖率达到目标值以上
3. 没有 Lint 错误
4. 至少有一个审查者批准

### 5.2 发布条件

1. 所有 Critical/High 级别错误已修复
2. 所有 E2E 测试通过
3. 满足性能要求

---

## 6. 后续行动

1. [x] 安装测试库（Vitest, pytest）
2. [x] 实施现有代码的单元测试（基本组件）
3. [ ] 实施新服务的测试
   - [ ] TimelineService 测试
   - [ ] AgentStatusService 测试
   - [ ] MessageParser 测试
   - [ ] 团队删除 API 测试
4. [ ] 统一时间线相关测试
   - [ ] useUnifiedTimeline 钩子测试
   - [ ] Timeline API 测试
5. [ ] 实施 E2E 测试
6. [ ] 集成到 CI/CD 流水线

---

## 7. 测试类别优先级

### P0: 必需测试（发布阻断项）

| 类别 | 测试项目 | 理由 |
|---------|---------|------|
| 团队状态判定 | 基于 mtime 的判定逻辑 | 核心功能 |
| 团队删除 | 权限检查、文件删除 | 防止数据丢失 |
| 统一时间线 | 数据源集成 | 主要功能 |
| 代理状态推断 | 状态转换逻辑 | 主要功能 |

### P1: 重要测试

| 类别 | 测试项目 |
|---------|---------|
| HTTP 轮询 | refetchInterval 行为 |
| 缓存失效 | FileWatcher 集成 |
| 消息解析 | 所有消息类型 |
| 错误处理 | API 错误响应 |

### P2: 推荐测试

| 类别 | 测试项目 |
|---------|---------|
| UI 组件 | 显示、交互 |
| 主题切换 | 暗黑模式 |
| 性能 | 大数据量时的行为 |

---

*创建日期: 2026-02-16*
*最后更新: 2026-02-24*
*版本: 2.1.0*
