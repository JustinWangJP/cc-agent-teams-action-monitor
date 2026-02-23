---
name: ms-agent-framework-python
description: Microsoft Agent Framework（Python）でAIエージェントを構築する包括的なスキル。エージェント作成、チャットクライアント（OpenAI/Azure OpenAI/Azure AI Foundry）、ツール統合、MCP連携、グラフベースワークフロー、マルチエージェントオーケストレーション、状態管理とチェックポイント、Human-in-the-Loop、Observability（OpenTelemetry）、DevUIのすべてを網羅。Agent Frameworkを使用してAIエージェントを開発、デバッグ、デプロイする場合に使用する。
---

# Microsoft Agent Framework (Python)

Microsoft Agent Frameworkは、Semantic KernelとAutoGenの後継となるオープンソースのAIエージェント開発キットです。単一のエージェントから複雑なマルチエージェントワークフローまで構築可能です。

## Framework Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │  DevUI / AG-UI │  │  FastAPI Host │  │  Durable Functions  │  │
│  └───────────────┘  └───────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Orchestration Layer                           │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │   Workflows   │  │ Orchestration │  │  Multi-Agent Patterns│  │
│  │  (Graph-based)│  │  (Sequential, │  │  (Magentic, etc.)   │  │
│  │               │  │   Parallel,   │  │                     │  │
│  │               │  │   Handoff)    │  │                     │  │
│  └───────────────┘  └───────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                       Agent Layer                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ChatAgent                                                  │ │
│  │  ├── Function Tools (@ai_function)                         │ │
│  │  ├── Agent as Tool                                         │ │
│  │  ├── MCP Tools                                             │ │
│  │  ├── Code Interpreter                                      │ │
│  │  └── Human-in-the-Loop (Approvals)                         │ │
│  └────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Client Layer                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │ OpenAI Client │  │Azure OpenAI   │  │ Azure AI Foundry    │  │
│  │               │  │    Client     │  │      Client         │  │
│  └───────────────┘  └───────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                           │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │ Observability │  │ Checkpointing │  │   State Management  │  │
│  │(OpenTelemetry)│  │   (Storage)   │  │  (Thread, Shared)   │  │
│  └───────────────┘  └───────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
# 全パッケージをインストール（推奨）
pip install agent-framework --pre

# 個別パッケージ
pip install agent-framework-core --pre          # コアパッケージ
pip install agent-framework-openai --pre         # OpenAIクライアント
pip install agent-framework-azure --pre           # Azure OpenAI/AI Foundry
pip install agent-framework-devui --pre           # 開発者UI
pip install agent-framework-ag-ui --pre           # AG-UI統合

# Observability
pip install azure-monitor-opentelemetry           # Azure Monitor統合
```

**重要**: `--pre`フラグが必須です（プレリリース版）。

## Key Concepts

### エージェント vs ワークフローの違い

| 特徴 | AIエージェント | ワークフロー |
|------|--------------|--------------|
| 制御 | LLMが動的に決定 | 事前に定義された実行パス |
| 用途 | 動的な問題解決 | ビジネスプロセスの自動化 |
| 柔軟性 | 高いツール呼び出しの自由度 | 制御された実行フロー |
| 統合 | 複数のエージェントを含む可能性 | エージェントをコンポーネントとして使用 |

## Quick Start

### OpenAI Agent

```python
import asyncio
from agent_framework.openai import OpenAIChatClient

async def main():
    agent = OpenAIChatClient().create_agent(
        name="Assistant",
        instructions="You are a helpful assistant.",
    )
    result = await agent.run("Hello!")
    print(result.text)

asyncio.run(main())
```

### Azure OpenAI Agent

```python
import asyncio
from agent_framework.azure import AzureOpenAIChatClient
from azure.identity import AzureCliCredential

async def main():
    agent = AzureOpenAIChatClient(
        credential=AzureCliCredential()
    ).create_agent(
        instructions="You are a helpful assistant.",
        name="Assistant"
    )
    result = await agent.run("Hello!")
    print(result.text)

asyncio.run(main())
```

### Azure AI Foundry Agent

```python
import asyncio
from agent_framework.azure import AzureAIClient
from azure.identity.aio import AzureCliCredential

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIClient(async_credential=credential).create_agent(
            instructions="You are a helpful assistant."
        ) as agent,
    ):
        result = await agent.run("Hello!")
        print(result.text)

asyncio.run(main())
```

## Agent Types

| エージェントタイプ | クライアント | 用途 |
|-----------------|------------|------|
| OpenAI ChatCompletion | `OpenAIChatClient` | OpenAI ChatCompletion APIを使用 |
| Azure OpenAI ChatCompletion | `AzureOpenAIChatClient` | Azure OpenAIを使用 |
| Azure AI Foundry | `AzureAIClient` | Azure AI Foundryプロジェクトと統合 |

詳細: [Agent Types](references/agent_types.md)

## Core Capabilities

### 1. Function Tools

Python関数をエージェントから呼び出せるツールとして登録します。

```python
from typing import Annotated
from agent_framework import ai_function

@ai_function
def get_weather(location: Annotated[str, "The city"]) -> str:
    """Get the current weather."""
    return f"Weather in {location}: Sunny"

# エージェントにツールを提供
agent = OpenAIChatClient().create_agent(
    instructions="You are a weather assistant.",
    tools=get_weather
)
```

クラスベースのツール定義:
```python
class WeatherTools:
    @ai_function
    def get_weather(self, location: str) -> str:
        """Get the current weather."""
        return f"Weather in {location}: Sunny"

tools = WeatherTools()
agent = OpenAIChatClient().create_agent(
    instructions="You are a weather assistant.",
    tools=[tools.get_weather, tools.get_forecast]
)
```

詳細: [Function Tools](references/function_tools.md)

### 2. Agent as Tool

エージェントを別のエージェントのツールとして使用します。

```python
# 子エージェント
weather_agent = AzureOpenAIChatClient(credential=credential).create_agent(
    name="WeatherAgent",
    description="Answers weather questions.",
    instructions="You answer weather questions.",
    tools=get_weather
)

# メインエージェントに子エージェントをツールとして提供
main_agent = AzureOpenAIChatClient(credential=credential).create_agent(
    instructions="You are a helpful assistant.",
    tools=weather_agent.as_tool()
)
```

カスタマイズ:
```python
weather_tool = weather_agent.as_tool(
    name="WeatherLookup",
    description="Look up weather information",
    arg_name="query",
    arg_description="The weather query"
)
```

### 3. Streaming Responses

```python
agent = OpenAIChatClient().create_agent(
    instructions="You are a creative storyteller.",
)

async for chunk in agent.run_stream("Tell me a short story."):
    if chunk.text:
        print(chunk.text, end="", flush=True)
```

### 4. Human-in-the-Loop

関数実行前にユーザーの承認を要求します。

```python
@ai_function(approval_mode="always_require")
def sensitive_operation(data: str) -> str:
    """Perform sensitive operation."""
    return f"Processed: {data}"

agent = OpenAIChatClient().create_agent(
    instructions="You are a helpful assistant.",
    tools=[sensitive_operation]
)

result = await agent.run("Execute operation")

if result.user_input_requests:
    for req in result.user_input_requests:
        print(f"Approval needed: {req.function_call.name}")
        print(f"Arguments: {req.function_call.arguments}")
        # 承認処理
        response = req.create_response(approved=True)
        result = await agent.run(
            ChatMessage(content=response, role="user")
        )
```

**承認モード**:
- `"always_require"`: 常に承認を要求
- `"never_require"`: 承認なし（デフォルト）
- `"conditional"`: 条件付きで承認を要求

### 5. Code Interpreter

ホストされたPythonコード実行環境を有効にします。

```python
from agent_framework import HostedCodeInterpreterTool

agent = OpenAIChatClient().create_agent(
    instructions="You can write and execute Python code.",
    tools=HostedCodeInterpreterTool(),
)

result = await agent.run("Calculate factorial of 100.")
```

詳細: [Agent Features](references/agent_features.md)

## MCP Integration

Model Context Protocol（MCP）サーバーと統合します。

### AgentをMCPサーバーとして公開

```python
import anyio
from mcp.server.stdio import stdio_server

# エージェントを作成
agent = OpenAIChatClient().create_agent(
    name="MyAgent",
    instructions="You are a helpful assistant."
)

# MCPサーバーに変換
server = agent.as_mcp_server()

# MCPサーバーを実行
async def run():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    anyio.run(run())
```

### MCPツールをエージェントに統合

```python
# Agent 365 Toolingを使用してMCPツールを統合
from microsoft.agents.a365.tooling import McpToolServerConfigurationService
from microsoft.agents.a365.tooling.extensions.agentframework import mcp_tool_registration_service

# サービスを初期化
config_service = McpToolServerConfigurationService()
tool_service = mcp_tool_registration_service.McpToolRegistrationService()

# MCPツールをエージェントに登録
await tool_service.add_tool_servers_to_agent(
    agent=agent,
    agentic_app_id="your-app-id",
    auth=auth_context,
    context=conversation_context
)
```

詳細: [MCP Integration](references/mcp_integration.md)

## AG-UI Integration

AG-UIプロトコルを使用して、HTTP経由でエージェントを提供します。

### FastAPIサーバーの作成

```python
from fastapi import FastAPI
from agent_framework_ag_ui import add_agent_framework_fastapi_endpoint, AgentFrameworkAgent
from agent_framework.openai import OpenAIChatClient
from agent_framework import ChatAgent

app = FastAPI()

# エージェントを作成
agent = ChatAgent(
    chat_client=OpenAIChatClient(),
    name="Assistant",
    instructions="You are a helpful assistant."
)

# AG-UIエンドポイントを追加
add_agent_framework_fastapi_endpoint(app, agent, "/agent")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8888)
```

### Human-in-the-Loop with AG-UI

```python
from agent_framework_ag_ui import AgentFrameworkAgent

# HILを有効にしてラップ
ag_ui_agent = AgentFrameworkAgent(
    agent=agent,
    require_confirmation=True
)

add_agent_framework_fastapi_endpoint(app, ag_ui_agent, "/agent")
```

### AG-UIイベントタイプ

| イベントタイプ | 説明 |
|---------------|------|
| `RUN_STARTED` | エージェント実行開始 |
| `TEXT_MESSAGE_START` | テキストメッセージ開始 |
| `TEXT_MESSAGE_CONTENT` | ストリーミングテキスト（deltaフィールド付き） |
| `TEXT_MESSAGE_END` | テキストメッセージ終了 |
| `FUNCTION_APPROVAL_REQUEST` | 関数実行の承認要求 |
| `RUN_FINISHED` | 正常完了 |
| `RUN_ERROR` | エラー情報 |

## Workflows

グラフベースのワークフローで複数のエージェントと関数をオーケストレーションします。

### Basic Workflow

```python
from agent_framework import WorkflowBuilder, Executor

# Executorを定義
class Executor1(Executor):
    @handler
    async def handle(self, message: str, ctx: WorkflowContext):
        # 処理
        await ctx.emit_messages("output1")

class Executor2(Executor):
    @handler
    async def handle(self, message: str, ctx: WorkflowContext):
        # 処理
        await ctx.emit_messages("output2")

# ワークフローを構築
workflow = (
    WorkflowBuilder()
    .add_edge(executor1, executor2)
    .set_start_executor(executor1)
    .build()
)

# 実行
result = await workflow.run("input")
```

詳細: [Workflows](references/workflows.md)

### Checkpointing

ワークフローの状態を保存し、復元します。

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

# チェックポイントから復元
async for event in workflow.run_stream(
    checkpoint_id="checkpoint-id",
    checkpoint_storage=checkpoint_storage
):
    print(f"Resumed Event: {event}")
```

詳細: [Checkpointing](references/checkpointing.md)

### Shared States

Shared Statesは、ワークフロー内の複数のエグゼキューターが共通のデータにアクセス・変更できるようにする機能です。

### Shared Stateへの書き込みと読み込み

```python
from agent_framework import WorkflowBuilder, WorkflowContext, Executor, handler

class DataStoreExecutor(Executor):
    @handler
    async def handle(self, data: str, ctx: WorkflowContext):
        # 共有状態にデータを保存
        await ctx.set_shared_state("processed_data", data.upper())
        # 次のエグゼキューターにメッセージを送信
        await ctx.send_message("data_stored")

class DataConsumerExecutor(Executor):
    @handler
    async def handle(self, signal: str, ctx: WorkflowContext):
        # 共有状態からデータを取得
        data = await ctx.get_shared_state("processed_data")
        if data is None:
            raise ValueError("Shared state not found")
        print(f"Retrieved data: {data}")
        await ctx.send_message(len(data))

# ワークフローを構築
workflow = (
    WorkflowBuilder()
    .add_edge(store_executor, consumer_executor)
    .set_start_executor(store_executor)
    .build()
)

result = await workflow.run("hello world")
# store_executorが共有状態に "HELLO WORLD" を保存
# consumer_executorがそれを読み込んで長さを計算
```

### 複数操作のアトミック実行

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

### State Isolation

エグゼキューターインスタンスをWorkflowBuilderに直接渡すと、すべてのワークフローインスタンスで同じエグゼキューターが共有されます。これにより状態の混在が発生する可能性があります。

```python
# ❌ 状態が混在する可能性
executor_a = CustomExecutorA(id="a")
executor_b = CustomExecutorB(id="b")

workflow = (
    WorkflowBuilder()
    .add_edge(executor_a, executor_b)
    .set_start_executor(executor_a)
    .build()
)

# すべてのワークフローインスタンスが同じエグゼキューターを共有
workflow_a = workflow
workflow_b = workflow  # executor_a, executor_bを共有

# ✅ Factory Functionsで各インスタンスを独立化
def create_workflow():
    # 各ワークフローインスタンスで新しいエグゼキューターを作成
    executor_a = CustomExecutorA(id="a")
    executor_b = CustomExecutorB(id="b")

    return (
        WorkflowBuilder()
        .add_edge(executor_a, executor_b)
        .set_start_executor(executor_a)
        .build()
    )

# 各ワークフローインスタンスは独立したエグゼキューターを持つ
workflow_a = create_workflow()
workflow_b = create_workflow()  # 独立したエグゼキューター
```

### 予約されたキー

以下のキーはフレームワークによって予約されています:

| キー | 説明 |
|-----|------|
| `_executor_state` | エグゼキューター状態のチェックポイント用 |

**警告**: アンダースコアで始まるキーは使用しないでください。将来のフレームワーク更新で競合する可能性があります。

詳細: [Shared States](references/shared_states.md)

## Multi-Agent Orchestration

### Sequential Pattern

エージェントを順番に実行します。

```python
from agent_framework import SequentialBuilder

workflow = (
    SequentialBuilder()
    .add_agent(researcher_agent)
    .add_agent(writer_agent)
    .add_agent(editor_agent)
    .build()
)
```

### Parallel Pattern

エージェントを並列に実行し、結果を集約します。

```python
from agent_framework import ParallelBuilder

workflow = (
    ParallelBuilder()
    .add_agent(agent1)
    .add_agent(agent2)
    .add_agent(agent3)
    .build()
)
```

### Handoff Pattern

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

### Magentic Orchestration

Magentic-Oneに基づく柔軟なマルチエージェントパターンで、複雑なオープンエンドタスク向けに設計されています。

```python
from agent_framework import MagenticBuilder

workflow = (
    MagenticBuilder()
    .participants(
        researcher=researcher_agent,
        analyst=analyst_agent,
        writer=writer_agent
    )
    .with_standard_manager(
        agent=manager_agent,
        max_round_count=10,
        max_stall_count=2
    )
    .with_human_input_on_stall()  # ストール時に人間の介入を要求
    .build()
)
```

### Durable Agent Orchestration

Azure Durable Functionsを使用した決定論的なマルチエージェントオーケストレーション。

```python
# function_app.py
import azure.functions as func
from agent_framework import DurableTaskAgent

app = func.FunctionApp()

@app.function_route(
    route="orchestration/{instanceId}",
    trigger_type="orchestrationTrigger"
)
async def orchestrate_agents(context: DurableOrchestrationContext):
    # メインエージェントの実行
    main_agent = app.get_agent(context, "MainAgent")
    main_result = await context.call_agent(main_agent, "Analyze market trends")

    # 並列に翻訳エージェントを実行
    tasks = []
    for lang in ["ja", "es", "fr"]:
        translator = app.get_agent(context, "TranslatorAgent")
        tasks.append(context.call_agent(translator, main_result.text, target_lang=lang))

    translations = await context.task_all(tasks)

    # 結果を集約
    return {"original": main_result.text, "translations": translations}
```

詳細: [Orchestration](references/orchestration.md)

## State Management

### AgentThread

会話履歴を管理します。

```python
thread = agent.get_new_thread()

# スレッドを使用して実行
result = await agent.run("Hello", thread=thread)

# スレッドをシリアライズ
serialized = thread.serialize()

# 復元
restored_thread = await agent.deserialize_thread(serialized)
```

詳細: [State Management](references/state_management.md)

## Observability

OpenTelemetryベースのトレーシングを有効にします。

### 基本的な設定

```python
from agent_framework.observability import configure_otel_providers

# コンソール出力を有効化
configure_otel_providers(enable_console_exporters=True)

# OTLPエンドポイントにエクスポート
# export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
configure_otel_providers()
```

### Azure Monitor統合

```python
from agent_framework.observability import enable_instrumentation
from azure.monitor.opentelemetry import configure_azure_monitor

connection_string = "InstrumentationKey=your-key;..."
configure_azure_monitor(connection_string=connection_string)
enable_instrumentation()
```

### カスタムエクスポーター

```python
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

configure_otel_providers(
    exporters=[
        OTLPSpanExporter(endpoint="http://custom:4317"),
    ],
    views=[...],  # メトリクスビュー
    enable_sensitive_data=True  # 開発時のみ
)
```

### ワークフロースパン

| スパン名 | 説明 |
|---------|------|
| `workflow.build` | ワークフローのビルド |
| `workflow.run` | ワークフローの実行 |
| `message.send` | エグゼキューターへのメッセージ送信 |
| `executor.process` | エグゼキューターの処理 |
| `edge_group.process` | エッジグループの処理 |

詳細: [Observability](references/observability.md)

## DevUI

対話的なWeb UIでエージェントとワークフローをテスト・デバッグします。

### CLIによる起動

```bash
# インストール
pip install agent-framework-devui --pre

# ディレクトリ検出で起動
devui ./agents --tracing

# カスタムポート
devui ./entities --port 9000

# 自動リロード
devui ./entities --reload

# 認証有効化
devui ./agents --auth --auth-token "your-token"
```

### プログラム的な起動

```python
from agent_framework.devui import serve

serve(
    entities=[agent, workflow],
    tracing_enabled=True,
    port=8080,
    host="127.0.0.1"
)
```

### ディレクトリ構造（自動検出）

```
entities/
├── agent1/
│   ├── __init__.py  # exports `agent` or `workflow`
│   └── .env         # 環境変数
├── agent2/
│   ├── __init__.py
│   └── .env
└── workflow1/
    ├── __init__.py
    └── .env
```

### OpenAI Compatible API

DevUIはOpenAI SDK互換のAPIを提供します。

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="devui-key"
)

response = client.chat.completions.create(
    model="agent1",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

詳細: [DevUI](references/devui.md)

## Environment Variables

```bash
# OpenAI
export OPENAI_API_KEY="your-api-key"

# Azure OpenAI
export AZURE_OPENAI_ENDPOINT="https://<resource>.openai.azure.com"
export AZURE_OPENAI_CHAT_DEPLOYMENT_NAME="gpt-4o-mini"
export AZURE_OPENAI_API_KEY="your-api-key"  # または Azure CLI 認証

# Azure AI Foundry
export AZURE_AI_PROJECT_ENDPOINT="https://<project>.services.ai.azure.com/api/projects/<project-id>"
export AZURE_AI_MODEL_DEPLOYMENT_NAME="gpt-4o-mini"
export AZURE_AI_LOCATION="eastus"

# Observability
export ENABLE_INSTRUMENTATION=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export ENABLE_CONSOLE_EXPORTERS=true
export ENABLE_SENSITIVE_DATA=false  # 本番環境ではfalse

# DevUI
export DEVUI_AUTH_TOKEN="your-auth-token"  # 認証使用時
export OTLP_ENDPOINT="http://localhost:4317"  # トレースエクスポート

# AG-UI
export AGUI_SERVER_URL="http://localhost:8888/"
```

## Scripts

| スクリプト | 説明 |
|-----------|------|
| `scripts/basic_agent.py` | 基本的なエージェントの雛形 |
| `scripts/agent_with_tools.py` | ツール付きエージェントの雛形 |
| `scripts/mcp_server_agent.py` | MCPサーバー統合の雛形 |
| `scripts/workflow_example.py` | ワークフローの例 |
| `scripts/agui_server.py` | AG-UIサーバーの例 |
| `scripts/observability_example.py` | Observabilityの例 |

## Migration from Other Frameworks

### Semantic Kernel からの移行

```python
# Semantic Kernel
from semantic_kernel import Kernel
kernel = Kernel()

# Agent Framework
from agent_framework import ChatAgent
agent = ChatAgent(...)
```

詳細: [Migration Guide](https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-semantic-kernel)

### AutoGen からの移行

```python
# AutoGen
from autogen import AssistantAgent, UserProxyAgent

# Agent Framework
from agent_framework import ChatAgent, ai_function
```

詳細: [Migration Guide](https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen)

## Best Practices

### 1. エージェント設計
- 単一責任: 各エージェントは明確な目的を持つ
- ツールの選択: 必要なツールのみを提供
- インストラクション: 明確で具体的な指示を記述

### 2. ワークフロー設計
- タイプセーフティ: メッセージタイプを明確に定義
- エラーハンドリング: 適切な例外処理を実装
- チェックポイント: 長-runningワークフローで有効化

### 3. Observability
- 開発: コンソールエクスポーターを使用
- 本番: OTLPエクスポーターで外部システムに統合
- 機密データ: `enable_sensitive_data=False`を設定

### 4. セキュリティ
- `.env`ファイルを`.gitignore`に追加
- DevUIはlocalhostのみにバインド（開発）
- 本番環境で認証を有効化

## Multi-Turn Conversations & Threading

エージェントはステートレスで、呼び出し間で内部状態を維持しません。マルチターン会話を実現するには、会話状態を保持するオブジェクトを作成し、エージェント実行時に渡す必要があります。

### AgentThreadの作成

```python
# 新しいスレッドを作成
thread = agent.get_new_thread()

# スレッドを使用してエージェントを実行
result1 = await agent.run("Tell me a joke.", thread=thread)
print(result1.text)

# 同じスレッドで続行
result2 = await agent.run("Now add emojis.", thread=thread)
print(result2.text)
```

### スレッドの永続化と復元

```python
import json

# スレッドをシリアライズ
serialized = thread.serialize()

# 保存（例: データベースやファイル）
with open("thread.json", "w") as f:
    json.dump(serialized, f)

# 復元
with open("thread.json", "r") as f:
    loaded_data = json.load(f)

restored_thread = await agent.deserialize_thread(loaded_data)

# 復元したスレッドで続行
result = await agent.run("Continue our conversation.", thread=restored_thread)
```

### 複数の独立した会話

```python
# 複数のスレッドで独立した会話を管理
thread1 = agent.get_new_thread()
thread2 = agent.get_new_thread()

# 各スレッドは独立した会話履歴を維持
result1a = await agent.run("Hello", thread=thread1)
result2a = await agent.run("Hi there", thread=thread2)

result1b = await agent.run("How are you?", thread=thread1)  # thread1の履歴を維持
result2b = await agent.run("What's your name?", thread=thread2)  # thread2の履歴を維持
```

### カスタムメッセージストア

インメモリスレッドの場合、カスタムメッセージストア実装を提供できます:

```python
from agent_framework import IMessageStore

class CustomMessageStore(IMessageStore):
    async def get_messages(self, thread_id: str):
        # カスタム取得ロジック
        pass

    async def save_messages(self, thread_id: str, messages):
        # カスタム保存ロジック
        pass

# カスタムストアを使用してスレッドを作成
thread = await agent.create_thread(message_store=CustomMessageStore())
```

詳細: [Multi-Turn Conversations](references/multi_turn_conversations.md)

## Agent Middleware

ミドルウェアを使用して、エージェント実行の前後にロジックを追加します。

### 基本的なミドルウェア

```python
from agent_framework import agent_middleware, AgentRunContext

@agent_middleware
async def logging_middleware(context: AgentRunContext, next):
    print(f"Before: {context.agent.name}")
    print(f"Messages: {len(context.messages)}")

    # 実行を続行
    await next(context)

    print(f"After: {context.result}")

# エージェントにミドルウェアを追加
agent = ChatAgent(
    chat_client=client,
    name="assistant",
    middleware=logging_middleware
)
```

### ミドルウェアの種類

| ミドルウェア | デコレータ | コンテキスト |
|-------------|-----------|-----------|
| Agent Middleware | `@agent_middleware` | `AgentRunContext` |
| Function Middleware | `@function_middleware` | `FunctionInvocationContext` |
| Chat Middleware | `@chat_middleware` | `ChatContext` |

### クラスベースのミドルウェア

```python
from agent_framework import AgentMiddleware

class TimingMiddleware(AgentMiddleware):
    async def process(self, context: AgentRunContext, next):
        import time
        start_time = time.time()

        await next(context)

        elapsed = time.time() - start_time
        context.metadata["execution_time"] = elapsed
        print(f"Execution time: {elapsed:.2f}s")

agent = ChatAgent(
    chat_client=client,
    middleware=TimingMiddleware()
)
```

### ミドルウェアの終了

```python
@agent_middleware
async def auth_middleware(context: AgentRunContext, next):
    # 認証チェック
    if not is_authorized(context.metadata.get("api_key")):
        context.terminate = True  # パイプラインを終了
        return

    await next(context)
```

### Runレベルミドルウェア

```python
# 特定の実行のみにミドルウェアを適用
result = await agent.run(
    "This is important!",
    middleware=[logging_middleware, timing_middleware]
)
```

### 複数のミドルウェア

```python
agent = ChatAgent(
    chat_client=client,
    middleware=[
        logging_middleware,
        auth_middleware,
        timing_middleware
    ]
)
```

詳細: [Agent Middleware](references/agent_middleware.md)

## Custom Agent

`BaseAgent` クラスを継承してカスタムエージェントを作成します。

### 基本的なカスタムエージェント

```python
from agent_framework import BaseAgent, AgentRunResponse, AgentRunResponseUpdate
from agent_framework import ChatMessage, Role

class EchoAgent(BaseAgent):
    """ユーザー入力をエコーするシンプルなエージェント"""

    async def run(self, messages=None, *, thread=None, **kwargs):
        # 入力メッセージを処理
        input_text = messages[0].content if messages else ""

        # エコー応答を作成
        response = AgentRunResponse(
            messages=[
                ChatMessage(
                    role=Role.ASSISTANT,
                    content=f"Echo: {input_text}"
                )
            ],
            response_id="echo-response"
        )
        return response

    def run_stream(self, messages=None, *, thread=None, **kwargs):
        async def _stream():
            input_text = messages[0].content if messages else ""

            # ストリーミングエコー
            chunks = [f"Echo: ", input_text]
            for chunk in chunks:
                yield AgentRunResponseUpdate(text=chunk)

        return _stream()

# カスタムエージェントを使用
agent = EchoAgent(name="echo", description="Echoes user input")
result = await agent.run("Hello!")
print(result.text)  # "Echo: Hello!"
```

### ミドルウェアサポートの追加

```python
from agent_framework import use_agent_middleware

@use_agent_middleware
class CustomAgentWithMiddleware(BaseAgent):
    async def run(self, messages=None, *, thread=None, **kwargs):
        # 実装
        pass

    async def run_stream(self, messages=None, *, thread=None, **kwargs):
        # 実装
        pass
```

### エージェントをツールとして使用

カスタムエージェントもツールとして他のエージェントに組み込めます:

```python
# カスタムエージェント
research_agent = CustomResearchAgent(name="researcher")

# ツールに変換
research_tool = research_agent.as_tool(
    name="research",
    description="Perform research on a topic",
    arg_name="query"
)

# メインエージェントに統合
main_agent = ChatAgent(
    chat_client=client,
    tools=[research_tool]
)
```

詳細: [Custom Agents](references/custom_agents.md)

## Agent Development Best Practices

### エージェント設計原則

1. **単一責任の原則**: 各エージェントは1つの明確な目的を持つ
2. **明確なインストラクション**: 具体的で行動可能な指示を提供
3. **適切なツール選択**: 必要なツールのみを提供
4. **エラーハンドリング**: 優雅なエラー処理を実装

### スレッド管理

1. **スレッドのライフサイクル**: 適切な作成、永続化、削除
2. **並列安全性**: 複数のリクエストで同じスレッドを使用する場合の注意
3. **クロスエージェント互換性**: 異なるエージェントタイプ間でのスレッド互換性に注意

### ミドルウェアパターン

1. **ログ/トレーシング**: すべてのエージェント呼び出しを記録
2. **認証/認可**: APIキーやトークンを検証
3. **レート制限**: API呼び出しを調整
4. **キャッシュ**: 同じ入力に対する応答をキャッシュ
5. **監査/コンプライアンス**: ポリシー適用と監査ログ

### パフォーマンス

1. **ストリーミング**: 長時間実行されるタスクには `run_stream` を使用
2. **並列処理**: 複数のエージェントを並列に実行してレイテンシを削減
3. **接続プール**: クライアント接続を再利用
4. **バッチ処理**: 可能な場合はリクエストをバッチ

## References

- [公式ドキュメント](https://learn.microsoft.com/en-us/agent-framework/overview/agent-framework-overview)
- [GitHubリポジトリ](https://github.com/microsoft/agent-framework)
- [APIリファレンス](references/api_reference.md)
- [Python Samples](https://github.com/microsoft/agent-framework/tree/main/python/samples)
