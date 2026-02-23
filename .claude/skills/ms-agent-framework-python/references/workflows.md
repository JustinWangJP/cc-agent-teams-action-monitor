# Workflows

グラフベースのワークフローで複数のエージェントと関数をオーケストレーションします。

## Basic Workflow

```python
from agent_framework import WorkflowBuilder, Executor, handler, WorkflowContext

class Executor1(Executor):
    @handler
    async def handle(self, message: str, ctx: WorkflowContext):
        # 処理
        result = f"Processed: {message}"
        await ctx.emit_messages(result)

class Executor2(Executor):
    @handler
    async def handle(self, message: str, ctx: WorkflowContext):
        # 処理
        result = f"Final: {message}"
        await ctx.emit_messages(result)

# ワークフローを構築
workflow = (
    WorkflowBuilder(max_iterations=5)
    .add_edge(executor1, executor2)
    .set_start_executor(executor1)
    .build()
)

# 実行
result = await workflow.run("input")
print(result.get_outputs())
```

## Streaming Workflow

```python
async for event in workflow.run_stream("input"):
    if isinstance(event, WorkflowOutputEvent):
        print(f"Output: {event.data}")
```

## Workflow as Agent

```python
# ワークフローをエージェントとして使用
workflow_agent = workflow.as_agent(
    id="workflow-agent",
    name="Workflow Agent"
)

result = await workflow_agent.run("input")
```

## Handoff Pattern

```python
from agent_framework import HandoffBuilder

workflow = (
    HandoffBuilder()
    .set_coordinator(coordinator_agent)
    .add_handoff(coordinator_agent, specialist_agent)
    .enable_return_to_previous()
    .build()
)
```

## Orchestration Patterns

| パターン | 説明 | 用途 |
|---------|------|------|
| Sequential | エージェントを順番に実行 | マルチステップ処理 |
| Parallel | エージェントを並列実行 | 独立タスクの同時処理 |
| Handoff | 動的に制御を渡す | スペシャリストの切り替え |
