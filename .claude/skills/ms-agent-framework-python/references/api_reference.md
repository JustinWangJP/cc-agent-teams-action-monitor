# API Reference

主要なクラス、関数、デコレーターのリファレンスです。

## Core Classes

### ChatAgent

```python
from agent_framework import ChatAgent

agent = ChatAgent(
    chat_client=client,
    name="assistant",
    instructions="You are a helpful assistant.",
    tools=[...],
    temperature=0.7,
    max_tokens=500
)
```

**Methods:**
- `run(message, thread=None)` - エージェントを実行
- `run_stream(message, thread=None)` - ストリーミング実行
- `get_new_thread()` - 新規スレッドを作成
- `as_tool()` - ツールに変換
- `as_mcp_server()` - MCPサーバーに変換

## Chat Clients

### OpenAIChatClient

```python
from agent_framework.openai import OpenAIChatClient

client = OpenAIChatClient(
    api_key="...",
    model_id="gpt-4o-mini"
)
```

### AzureOpenAIChatClient

```python
from agent_framework.azure import AzureOpenAIChatClient
from azure.identity import AzureCliCredential

client = AzureOpenAIChatClient(
    endpoint="https://...",
    credential=AzureCliCredential(),
    model_id="gpt-4o-mini"
)
```

### AzureAIClient

```python
from agent_framework.azure import AzureAIClient
from azure.identity.aio import AzureCliCredential

client = AzureAIClient(
    async_credential=AzureCliCredential(),
    endpoint="https://..."
)
```

## Decorators

### @ai_function

関数をAIツールとして登録します。

```python
from agent_framework import ai_function

@ai_function
def my_function(arg: str) -> str:
    """Function description."""
    return f"Result: {arg}"

# With approval
@ai_function(approval_mode="always_require")
def sensitive_function(data: str) -> str:
    """Sensitive operation."""
    return f"Processed: {data}"
```

## Workflow Classes

### Executor

```python
from agent_framework import Executor, handler

class MyExecutor(Executor):
    @handler
    async def handle(self, message: str, ctx: WorkflowContext):
        await ctx.emit_messages("output")
```

### WorkflowBuilder

```python
from agent_framework import WorkflowBuilder

workflow = (
    WorkflowBuilder(max_iterations=10)
    .add_edge(executor1, executor2)
    .set_start_executor(executor1)
    .with_checkpointing(checkpoint_storage)
    .build()
)
```

## Observability

### configure_otel_providers

```python
from agent_framework.observability import configure_otel_providers

configure_otel_providers(enable_console_exporters=True)
```

## Environment Variables

| 変数名 | 説明 |
|--------|------|
| `OPENAI_API_KEY` | OpenAI APIキー |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAIエンドポイント |
| `AZURE_OPENAI_CHAT_DEPLOYMENT_NAME` | デプロイ名 |
| `AZURE_AI_PROJECT_ENDPOINT` | Azure AI Foundryプロジェクトエンドポイント |
| `AZURE_AI_MODEL_DEPLOYMENT_NAME` | モデルデプロイ名 |
| `ENABLE_INSTRUMENTATION` | 計装を有効化 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLPエンドポイント |

## Official Documentation

- [Overview](https://learn.microsoft.com/en-us/agent-framework/overview/agent-framework-overview)
- [Quick Start](https://learn.microsoft.com/en-us/agent-framework/tutorials/quick-start)
- [User Guide](https://learn.microsoft.com/en-us/agent-framework/user-guide/overview)
- [GitHub](https://github.com/microsoft/agent-framework)
