# Multi-Agent Orchestration

複数のエージェントをオーケストレーションします。

## Sequential Pattern

エージェントを順番に実行します。

```python
# センチネルを使用して順序を制御
# （詳細は公式ドキュメントのサンプルを参照）
```

## Parallel Pattern

エージェントを並列実行し、結果を集約します。

```python
# タスクリストを作成して並列実行
tasks = [
    agent1.run("Task 1"),
    agent2.run("Task 2"),
    agent3.run("Task 3")
]

results = await asyncio.gather(*tasks)
```

## Handoff Pattern

エージェント間で動的に制御を渡します。

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

### Key Concepts

- **Dynamic Routing**: エージェントが次のエージェントを決定
- **Context Preservation**: 全会話履歴を保持
- **Request/Response Cycle**: ユーザー入力を要求して継続

## Durables

Azure Durable Functionsによる耐久性のあるオーケストレーション。

```python
# Durable Functions Orchestratorでエージェントを使用
# （詳細は公式ドキュメントを参照）
```
