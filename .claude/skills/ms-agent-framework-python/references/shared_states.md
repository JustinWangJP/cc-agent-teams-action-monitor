# Shared States

Shared Statesはワークフロー内の複数のエグゼキューターが共通のデータにアクセス・変更できるようにする機能です。

## 概要

Shared Statesは以下のシナリオで役立ちます:
- メッセージパッシングが非効率的な場合のデータ共有
- 複数のエグゼキューターが同じデータを参照する場合
- グローバルな設定やコンテキストを管理する場合

## 基本的な使用方法

### Shared Stateへの書き込み

```python
from agent_framework import Executor, WorkflowContext, handler

class DataStoreExecutor(Executor):
    @handler
    async def handle(self, data: str, ctx: WorkflowContext):
        # 共有状態にデータを保存
        await ctx.set_shared_state("processed_data", data.upper())

        # 他のエグゼキューターに通知
        await ctx.send_message("data_stored")
```

### Shared Stateからの読み込み

```python
class DataConsumerExecutor(Executor):
    @handler
    async def handle(self, signal: str, ctx: WorkflowContext):
        # 共有状態からデータを取得
        data = await ctx.get_shared_state("processed_data")

        if data is None:
            raise ValueError("Shared state not found")

        print(f"Retrieved data: {data}")
        await ctx.send_message(len(data))
```

## ワークフローでの使用

```python
from agent_framework import WorkflowBuilder

# エグゼキューターを作成
store_executor = DataStoreExecutor(id="store")
consumer_executor = DataConsumerExecutor(id="consumer")

# ワークフローを構築
builder = WorkflowBuilder()
builder.add_edge(store_executor, consumer_executor)
builder.set_start_executor(store_executor)

workflow = builder.build()

# 実行
result = await workflow.run("hello world")
# store_executorが共有状態に "HELLO WORLD" を保存
# consumer_executorがそれを読み込んで長さを計算
```

## 複数の操作をロック

```python
class ComplexExecutor(Executor):
    @handler
    async def handle(self, key: str, value: str, ctx: WorkflowContext):
        # hold()コンテキストでロックを保持
        async with ctx.hold_shared_state():
            # 複数の操作をアトミックに実行
            current = await ctx.get_shared_state(key)
            updated = f"{current}{value}" if current else value
            await ctx.set_shared_state(key, updated)
```

## Thread Safety

Shared Statesはスレッドセーフです:
- すべての操作は自動的にロックされます
- `hold()` コンテキストマネージャーで複数操作をアトミックに実行可能

## 予約されたキー

以下のキーはフレームワークによって予約されています:

| キー | 説明 |
|-----|------|
| `_executor_state` | エグゼキューター状態のチェックポイント用 |

**警告**: アンダースコアで始まるキーは使用しないでください。将来のフレームワーク更新で競合する可能性があります。

## State Isolation

エグゼキューターインスタンスをWorkflowBuilderに直接渡すと、すべてのワークフローインスタンスで同じエグゼキューターが共有されます。これは状態の混在を引き起こす可能性があります。

### 推奨されるパターン（Factory Functions）

```python
# ❌ スレッドセーフではない例
executor_a = CustomExecutorA(id="a")
executor_b = CustomExecutorB(id="b")

builder = WorkflowBuilder()
builder.add_edge(executor_a, executor_b)
builder.set_start_executor(executor_b)

# すべてのワークフローインスタンスが同じエグゼキューターを共有
workflow_a = builder.build()
workflow_b = builder.build()  # executor_a, executor_bを共有

# ✅ スレッドセーフな例（Factory Functions）
def create_workflow():
    # 各ワークフローインスタンスで新しいエグゼキューターを作成
    executor_a = CustomExecutorA(id="a")
    executor_b = CustomExecutorB(id="b")

    builder = WorkflowBuilder()
    builder.add_edge(executor_a, executor_b)
    builder.set_start_executor(executor_b)

    return builder.build()

# 各ワークフローインスタンスは独立したエグゼキューターを持つ
workflow_a = create_workflow()
workflow_b = create_workflow()  # 独立したエグゼキューター
```

### Agent State Isolation

エージェントスレッドもまた、ワークフロー実行間で保持されます。各タスクで独立した状態を確保するには:

```python
# ❌ 状態が混在する可能性
agent = ChatAgent(...)
workflow = WorkflowBuilder().add_agent(agent).build()

# 同じワークフローインスタンスを再利用
result1 = await workflow.run("Task 1")
result2 = await workflow.run("Task 2")  # Task 1の状態が残っている可能性

# ✅ 各タスクで新しいワークフローインスタンスを作成
def create_workflow_for_task(agent):
    return WorkflowBuilder().add_agent(agent).build()

# 各タスクで新しいインスタンス
workflow1 = create_workflow_for_task(agent)
workflow2 = create_workflow_for_task(agent)

result1 = await workflow1.run("Task 1")
result2 = await workflow2.run("Task 2")  # 独立した状態
```

## ベストプラクティス

1. **Factory Functions**: ワークフロー構築にはファクトリー関数を使用
2. **不変の状態**: エグゼキューターインスタンスは不変に設計
3. **キー命名**: 説明的なキー名を使用、プレフィックスで名前空間を整理
4. **ロック使用**: 複数操作には `hold()` コンテキストを使用
5. **Noneチェック**: 共有状態の読み込み時にNoneをチェック

## 参照

- [公式ドキュメント: Shared States](https://learn.microsoft.com/en-us/agent-framework/user-guide/workflows/shared-states)
- [State Isolation](https://learn.microsoft.com/en-us/agent-framework/user-guide/workflows/state-isolation)
- [SharedState API](https://learn.microsoft.com/en-us/python/api/agent-framework-core/agent_framework.sharedstate)
