# Custom Agents

Microsoft Agent Frameworkでは、`BaseAgent` クラスを継承してカスタムエージェントを作成できます。これにより、完全な制御で独自のエージェント動作を実装できます。

## AgentProtocol

すべてのエージェントは `AgentProtocol` プロトコルを実装する必要があります:

```python
class AgentProtocol(Protocol):
    async def run(self, messages=None, *, thread=None, **kwargs) -> AgentRunResponse:
        """エージェントを実行し、結果を返す"""
        ...

    async def run_stream(self, messages=None, *, thread=None, **kwargs) -> AsyncIterable[AgentRunResponseUpdate]:
        """エージェントをストリーミング実行"""
        ...

    def get_new_thread(self) -> AgentThread:
        """新しいスレッドを作成"""
        ...

    async def deserialize_thread(self, data) -> AgentThread:
        """シリアライズされたスレッドを復元"""
        ...
```

## BaseAgentの使用

`BaseAgent` を継承すると、共通機能が提供され、実装が簡素化されます:

```python
from agent_framework import BaseAgent, AgentRunResponse, AgentRunResponseUpdate
from agent_framework import ChatMessage, Role, AgentThread
from typing import AsyncIterable

class CustomAgent(BaseAgent):
    """カスタムエージェントの基本クラス"""

    async def run(
        self,
        messages=None,
        *,
        thread=None,
        **kwargs
    ) -> AgentRunResponse:
        # 非ストリーミング実装
        pass

    async def run_stream(
        self,
        messages=None,
        *,
        thread=None,
        **kwargs
    ) -> AsyncIterable[AgentRunResponseUpdate]:
        # ストリーミング実装
        pass
```

## シンプルなエコーエージェント

```python
class EchoAgent(BaseAgent):
    """ユーザー入力をエコーするシンプルなエージェント"""

    async def run(self, messages=None, *, thread=None, **kwargs):
        # 入力メッセージを処理
        input_text = messages[0].content if messages else ""

        # エコー応答を作成
        return AgentRunResponse(
            messages=[
                ChatMessage(
                    role=Role.ASSISTANT,
                    content=f"Echo: {input_text}"
                )
            ],
            response_id=f"echo-{id(self)}"
        )

    async def run_stream(self, messages=None, *, thread=None, **kwargs):
        input_text = messages[0].content if messages else ""

        # ストリーミングエコー
        yield AgentRunResponseUpdate(text="Echo: ")
        yield AgentRunResponseUpdate(text=input_text)

# 使用
agent = EchoAgent(name="echo", description="Echoes user input")
result = await agent.run("Hello, World!")
print(result.text)  # "Echo: Hello, World!"
```

## ミドルウェアサポートの追加

カスタムエージェントにミドルウェア機能を追加します:

```python
from agent_framework import use_agent_middleware

@use_agent_middleware
class CustomAgentWithMiddleware(BaseAgent):
    """ミドルウェアをサポートするカスタムエージェント"""

    async def run(self, messages=None, *, thread=None, **kwargs):
        # 実装
        pass

    async def run_stream(self, messages=None, *, thread=None, **kwargs):
        # 実装
        pass

# ミドルウェアを使用
agent = CustomAgentWithMiddleware(
    name="custom",
    middleware=logging_middleware
)
```

## AIサービス統合カスタムエージェント

外部のAIサービスを統合する例:

```python
import httpx
from agent_framework import BaseAgent, AgentRunResponse, ChatMessage, Role

class CustomLLMAgent(BaseAgent):
    """カスタムLLM APIを使用するエージェント"""

    def __init__(self, api_endpoint: str, **kwargs):
        super().__init__(**kwargs)
        self.api_endpoint = api_endpoint
        self.client = httpx.AsyncClient()

    async def run(self, messages=None, *, thread=None, **kwargs):
        # メッセージをAPI形式に変換
        api_messages = [
            {"role": m.role.value, "content": m.content}
            for m in messages
        ]

        # API呼び出し
        response = await self.client.post(
            self.api_endpoint + "/chat",
            json={"messages": api_messages}
        )

        data = response.json()
        assistant_message = data["choices"][0]["message"]

        return AgentRunResponse(
            messages=[
                ChatMessage(
                    role=Role.ASSISTANT,
                    content=assistant_message["content"]
                )
            ],
            response_id=data["id"]
        )

    async def close(self):
        """リソースをクリーンアップ"""
        await self.client.aclose()

# 使用
agent = CustomLLMAgent(
    name="custom-llm",
    api_endpoint="https://api.example.com/v1",
    description="Uses custom LLM API"
)

result = await agent.run("Hello!")
```

## スレッド管理

カスタムスレッドタイプを実装:

```python
from agent_framework import AgentThread

class CustomThread(AgentThread):
    """カスタムスレッド実装"""

    def __init__(self, thread_id: str, storage):
        self.thread_id = thread_id
        self.storage = storage
        self._messages = []

    async def add_message(self, message):
        self._messages.append(message)
        await self.storage.save(self.thread_id, self._messages)

    async def get_messages(self):
        return await self.storage.load(self.thread_id)

    def serialize(self):
        return {
            "thread_id": self.thread_id,
            "messages": [m.dict() for m in self._messages]
        }

class CustomAgentWithThread(BaseAgent):
    """カスタムスレッドを使用するエージェント"""

    def get_new_thread(self) -> CustomThread:
        thread_id = generate_thread_id()
        return CustomThread(thread_id, self.storage)

    async def deserialize_thread(self, data):
        return CustomThread(data["thread_id"], self.storage)
```

## コンテキストプロバイダーの統合

```python
from agent_framework import BaseAgent, ContextProvider

class CustomAgentWithContext(BaseAgent):
    """コンテキストプロバイダーを使用するエージェント"""

    def __init__(self, context_providers=None, **kwargs):
        super().__init__(
            context_providers=context_providers or [],
            **kwargs
        )

    async def run(self, messages=None, *, thread=None, **kwargs):
        # コンテキストを収集
        context = {}
        for provider in self.context_providers:
            context.update(await provider.get_context())

        # インストラクションにコンテキストを注入
        enhanced_instructions = f"""
        Context: {context}
        Instructions: {self.instructions}
        """

        # エンハンスされたインストラクションで実行
        ...
```

## エージェントをツールとして使用

カスタムエージェントも他のエージェントのツールとして使用できます:

```python
# カスタムエージェント
research_agent = CustomResearchAgent(
    name="researcher",
    api_key="..."
)

# ツールに変換
research_tool = research_agent.as_tool(
    name="research",
    description="Perform research on a topic",
    arg_name="query",
    arg_description="The research query"
)

# メインエージェントに統合
main_agent = ChatAgent(
    chat_client=client,
    tools=[research_tool]
)

# ツールとして呼び出し
result = await main_agent.run("Research recent AI trends")
```

## カスタムエージェントのベストプラクティス

1. **非同期設計**: すべてのI/O操作を非同期で実行
2. **エラーハンドリング**: 適切な例外処理を実装
3. **リソース管理**: `async with` コンテキストをサポート
4. **型安全性**: 適切な型ヒントを使用
5. **スレッド管理**: 適切なスレッドライフサイクル管理

## 参照

- [公式ドキュメント: Custom Agents](https://learn.microsoft.com/en-us/agent-framework/user-guide/agents/agent-types/custom-agent)
- [APIリファレンス: BaseAgent](https://learn.microsoft.com/en-us/python/api/agent-framework-core/agent_framework.baseagent)
