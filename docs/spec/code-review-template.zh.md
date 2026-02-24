# 代码审查模板

**目标版本**: 2.1.0
**最后更新**: 2026-02-24

---

语言: [日本語](code-review-template.md) | [English](code-review-template.en.md) | [中文](code-review-template.zh.md)

## 设计思想（审查时的重点）

请在理解本项目主要设计原则的基础上进行审查。

### 实时更新的实现方式

- 采用 **HTTP 轮询**（非 WebSocket）
- 轮询间隔: 5-60秒（默认30秒）
- 由 TanStack Query 的 `refetchInterval` 和 `staleTime` 控制

### 团队状态判定

根据会话日志的 mtime 判定：
- `active`: mtime ≤ 1小时
- `stopped`: mtime > 1小时
- `unknown`: 无会话日志
- `inactive`: 无成员

### 数据源

| 数据 | 路径 |
|------|------|
| 团队配置 | `~/.claude/teams/{team_name}/config.json` |
| 状态判定 | `~/.claude/projects/{project-hash}/{sessionId}.jsonl` |
| 收件箱 | `~/.claude/teams/{team_name}/inboxes/{agent_name}.json` |
| 任务 | `~/.claude/tasks/{team_name}/{task_id}.json` |

---

## 审查对象

- **PR/提交**: #{编号}
- **作者**: @username
- **审查者**: @qa-lead
- **审查日期**: YYYY-MM-DD

---

## 概要

| 项目 | 评估 |
|------|------|
| 整体评估 | [批准 / 要求变更 / 评论] |
| 测试覆盖率 | XX% (目标: 80%) |
| Lint 错误 | 0件 / X件 |
| TypeScript 错误 | 0件 / X件 |

---

## 检查清单结果

### 功能

- [ ] 满足需求
- [ ] 考虑了边界情况
- [ ] 错误处理适当

### 代码质量

- [ ] 可读性高
- [ ] 无重复
- [ ] 适当的抽象

### 测试

- [ ] 单元测试充分
- [ ] 测试可读性好
- [ ] 测试独立

### 项目特定

- [ ] 不包含 WebSocket 引用（使用 HTTP 轮询）
- [ ] 团队状态判定基于 mtime 实现
- [ ] 文件路径正确引用 `~/.claude/` 下的路径
- [ ] 轮询相关的 hooks 正确设置了 `staleTime` 和 `refetchInterval`

### 文档

- [ ] 注释适当
- [ ] 变更日志已更新

---

## 详细反馈

### 优点

- 实现的点1
- 实现的点2

### 改进建议

1. **文件**: `path/to/file.ts:XX`
   - 内容
   - 建议: 具体改进方案

2. **文件**: `path/to/file.py:XX`
   - 内容
   - 建议: 具体改进方案

### 必须修正

1. **文件**: `path/to/file.ts:XX`
   - 问题: 说明
   - 修正: 具体修正方法

---

## 结论

[批准] / [要求变更]

### 附加评论

自由填写栏
