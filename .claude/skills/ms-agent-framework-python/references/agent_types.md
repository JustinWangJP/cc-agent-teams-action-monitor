# Agent Types

Microsoft Agent Frameworkは複数のエージェントタイプをサポートしています。

## OpenAI ChatCompletion Agent

OpenAI ChatCompletion APIを使用した基本的なエージェントです。

### Configuration

```bash
export OPENAI_API_KEY="your-api-key"
```

### Usage

```python
from agent_framework import ChatAgent
from agent_framework.openai import OpenAIChatClient

# Environment variables
agent = ChatAgent(
    chat_client=OpenAIChatClient(),
    name="Assistant",
    instructions="You are a helpful assistant."
)

# Explicit configuration
agent = ChatAgent(
    chat_client=OpenAIChatClient(
        api_key="your-api-key",
        model_id="gpt-4o-mini"
    ),
    name="Assistant",
    instructions="You are a helpful assistant."
)

# Running the agent
result = await agent.run("Hello!")
print(result.text)

# Streaming
async for chunk in agent.run_stream("Tell me a story."):
    if chunk.text:
        print(chunk.text, end="", flush=True)
```

## Azure OpenAI ChatCompletion Agent

Azure OpenAI ChatCompletionサービスを使用したエージェントです。

### Configuration

```bash
export AZURE_OPENAI_ENDPOINT="https://<resource>.openai.azure.com"
export AZURE_OPENAI_CHAT_DEPLOYMENT_NAME="gpt-4o-mini"
export AZURE_OPENAI_API_VERSION="2024-10-21"  # Optional
```

### Usage

```python
from agent_framework import ChatAgent
from agent_framework.azure import AzureOpenAIChatClient
from azure.identity import AzureCliCredential

# Environment variables with Azure CLI authentication
agent = ChatAgent(
    chat_client=AzureOpenAIChatClient(
        credential=AzureCliCredential()
    ),
    name="Assistant",
    instructions="You are a helpful assistant."
)

# Explicit configuration
agent = ChatAgent(
    chat_client=AzureOpenAIChatClient(
        endpoint="https://<resource>.openai.azure.com",
        credential=AzureCliCredential(),
        model_id="gpt-4o-mini",
        api_version="2024-10-21"
    ),
    name="Assistant",
    instructions="You are a helpful assistant."
)
```

## Azure AI Foundry Agent

Azure AI Foundryプロジェクトと統合されたエージェントです。サービス側で会話履歴を管理します。

### Configuration

```bash
export AZURE_AI_PROJECT_ENDPOINT="https://<project>.services.ai.azure.com/api/projects/<project-id>"
export AZURE_AI_MODEL_DEPLOYMENT_NAME="gpt-4o-mini"
export AZURE_AI_LOCATION="eastus"  # Optional
```

### Usage

```python
from agent_framework import ChatAgent
from agent_framework.azure import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

# Using async context manager for proper resource cleanup
async with AzureCliCredential() as credential:
    agent = ChatAgent(
        chat_client=AzureAIAgentClient(
            async_credential=credential,
            project_url="https://<project>.services.ai.azure.com/api/projects/<project-id>",
            model_deployment_name="gpt-4o-mini"
        ),
        name="Assistant",
        instructions="You are a helpful assistant."
    )

    result = await agent.run("Hello!")
    print(result.text)
```

## Durable Agent

Azure Durable Functionsを使用したサーバレス、耐久性のあるエージェントです。

### Configuration

```bash
pip install agent-framework-azurefunctions --pre
```

### Usage

```python
# function_app.py
import azure.functions as func
from agent_framework import DurableTaskAgent

app = func.FunctionApp()

@app.function_route(
    route="agents/{agentName}/run",
    trigger_type="orchestrationTrigger"
)
async def durable_agent(context: DurableOrchestrationContext):
    # エージェントを取得
    agent = app.get_agent(context, "MyDurableAgent")

    # 実行
    result = await context.call_agent(agent, "Hello!")

    return result.text

# HTTPトリガーで起動
@app.function_route(
    route="agents/{agentName}/run",
    trigger_type="httpTrigger",
    auth_level=func.AuthLevel.ANONYMOUS
)
async def http_start(req: func.HttpRequest) -> func.HttpResponse:
    agent_name = req.route_params.get("agentName")
    message = await req.get_body()

    client = func.DurableOrchestrationClient(req)
    instance_id = await client.start_new(
        "durable_agent",
        None,
        {"agent_name": agent_name, "message": message.decode()}
    )

    return func.HttpResponse(
        f"Started agent with ID: {instance_id}",
        status_code=202
    )
```

## OpenAI Responses Agent (OpenAI Assistants API)

OpenAI Assistants API（Responses API）を使用したエージェントです。

### Configuration

```bash
export OPENAI_API_KEY="your-api-key"
```

### Usage

```python
from agent_framework import ChatAgent
from agent_framework.openai import OpenAIResponsesClient

agent = ChatAgent(
    chat_client=OpenAIResponsesClient(
        api_key="your-api-key",
        model_id="gpt-4o-mini"
    ),
    name="Assistant",
    instructions="You are a helpful assistant."
)

# Responses APIはサービス側で状態を管理
thread = agent.get_new_thread()
result1 = await agent.run("Hello", thread=thread)
result2 = await agent.run("How are you?", thread=thread)
```

## Custom Agent

独自のロジックを持つカスタムエージェントを作成できます。

詳細: [Custom Agents](custom_agents.md)

### Basic Custom Agent

```python
from agent_framework import BaseAgent, AgentRunResponse
from agent_framework import ChatMessage, Role

class EchoAgent(BaseAgent):
    async def run(self, messages=None, *, thread=None, **kwargs):
        input_text = messages[0].content if messages else ""
        return AgentRunResponse(
            messages=[
                ChatMessage(
                    role=Role.ASSISTANT,
                    content=f"Echo: {input_text}"
                )
            ]
        )

agent = EchoAgent(name="echo")
result = await agent.run("Hello!")
print(result.text)  # "Echo: Hello!"
```

## Comparison

| 特徴 | OpenAI | Azure OpenAI | Azure AI Foundry | Durable Agent |
|------|--------|--------------|------------------|---------------|
| 認証 | API Key | Azure CLI/API Key | Azure CLI | Azure CLI |
| 環境変数 | `OPENAI_API_KEY` | `AZURE_OPENAI_ENDPOINT` | `AZURE_AI_PROJECT_ENDPOINT` | Azure Functions |
| 用途 | OpenAI直接利用 | Azure OpenAI | Azure AI Foundryプロジェクト | サーバレスワークフロー |
| スレッド管理 | インメモリ | インメモリ | サービス側 | サービス側 |
| ツール | Function Tools, Code Interpreter | + File Search | + Vector Store, Bing Grounding | すべてのツール |
| チェックポイント | - | - | - | 自動チェックポイント |

## Agent Selection Guide

### OpenAI ChatCompletion
- OpenAI APIを直接使用したい場合
- シンプルなチャットボット
- 開発・プロトタイピング

### Azure OpenAI
- Azureでホストされたモデルを使用する場合
- エンタープライズセキュリティ要件
- ファイル検索が必要

### Azure AI Foundry
- Azure AIサービスと統合する場合
- ベクトル検索、Bing groundingが必要
- サービス側で会話履歴を管理したい場合

### Durable Agent
- 長時間実行されるワークフロー
- マルチエージェントオーケストレーション
- サーバレスアーキテクチャ
- 人間の承認が必要なプロセス

## 参照

- [公式ドキュメント: Agent Types](https://learn.microsoft.com/en-us/agent-framework/user-guide/agents/agent-types)
- [Chat Client Agents](https://learn.microsoft.com/en-us/agent-framework/user-guide/agents/agent-types/chat-client-agent)
- [Durable Agents](https://learn.microsoft.com/en-us/agent-framework/user-guide/agents/agent-types/durable-agent)
