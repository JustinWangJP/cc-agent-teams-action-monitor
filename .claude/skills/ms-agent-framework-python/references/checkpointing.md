# Checkpointing

ワークフローの状態を保存し、復元します。

## Enable Checkpointing

```python
from agent_framework import FileCheckpointStorage

checkpoint_storage = FileCheckpointStorage(storage_path="./checkpoints")

workflow = (
    WorkflowBuilder()
    .add_edge(executor1, executor2)
    .set_start_executor(executor1)
    .with_checkpointing(checkpoint_storage=checkpoint_storage)
    .build()
)
```

## Custom Executor State

```python
class CustomExecutor(Executor):
    def __init__(self, id: str) -> None:
        super().__init__(id=id)
        self._messages: list[str] = []

    @handler
    async def handle(self, message: str, ctx: WorkflowContext):
        self._messages.append(message)
        # 処理...

    async def on_checkpoint_save(self) -> dict[str, Any]:
        return {"messages": self._messages}

    async def on_checkpoint_restore(self, state: dict[str, Any]) -> None:
        self._messages = state.get("messages", [])
```

## Resume from Checkpoint

```python
# チェックポイントから復元
async for event in workflow.run_stream(
    checkpoint_id="checkpoint-id",
    checkpoint_storage=checkpoint_storage
):
    if isinstance(event, WorkflowOutputEvent):
        print(f"Output: {event.data}")
```

## List Checkpoints

```python
# 全チェックポイントをリスト
all_checkpoints = await checkpoint_storage.list_checkpoints()

# ワークフロー固有のチェックポイント
workflow_checkpoints = await checkpoint_storage.list_checkpoints(
    workflow_id="my-workflow"
)

# タイムスタンプでソート
sorted_checkpoints = sorted(all_checkpoints, key=lambda cp: cp.timestamp)
```
