# Agent Middleware

ミドルウェアを使用して、エージェント実行の前後にロジックを追加します。ミドルウェアはロギング、認証、レート制限、監査などのクロスカッティングな関心事を処理するのに役立ちます。

## ミドルウェアの種類

| ミドルウェア | デコレータ | コンテキスト | 用途 |
|-------------|-----------|-----------|------|
| Agent Middleware | `@agent_middleware` | `AgentRunContext` | エージェント呼び出し全体 |
| Function Middleware | `@function_middleware` | `FunctionInvocationContext` | 関数ツール呼び出し |
| Chat Middleware | `@chat_middleware` | `ChatContext` | チャットクライアント呼び出し |

## Agent Middleware

エージェント実行の前後に処理を追加します。

### 基本的な使用方法

```python
from agent_framework import agent_middleware, AgentRunContext, ChatAgent
from agent_framework.openai import OpenAIChatClient

@agent_middleware
async def logging_middleware(context: AgentRunContext, next):
    print(f"[BEFORE] Agent: {context.agent.name}")
    print(f"[BEFORE] Messages: {len(context.messages)}")

    # エージェントを実行
    await next(context)

    print(f"[AFTER] Result: {context.result.text[:100]}...")

# エージェントにミドルウェアを追加
agent = ChatAgent(
    chat_client=OpenAIChatClient(),
    name="assistant",
    middleware=logging_middleware
)

result = await agent.run("Hello!")
```

### クラスベースのミドルウェア

```python
from agent_framework import AgentMiddleware

class TimingMiddleware(AgentMiddleware):
    """エージェント実行時間を計測"""

    async def process(self, context: AgentRunContext, next):
        import time
        start_time = time.time()

        await next(context)

        elapsed = time.time() - start_time
        context.metadata["execution_time"] = elapsed
        print(f"Execution time: {elapsed:.2f}s")

# 使用
agent = ChatAgent(
    chat_client=client,
    middleware=TimingMiddleware()
)
```

### メタデータの共有

```python
@agent_middleware
async def context_middleware(context: AgentRunContext, next):
    # メタデータに情報を追加
    context.metadata["user_id"] = extract_user_id(context)
    context.metadata["request_id"] = generate_request_id()

    await next(context)

    # 後続のミドルウェアやエージェントがメタデータにアクセス可能
    log_request(context.metadata["request_id"], context.result)
```

### ミドルウェアの終了

```python
@agent_middleware
async def auth_middleware(context: AgentRunContext, next):
    # 認証チェック
    api_key = context.metadata.get("api_key")
    if not is_authorized(api_key):
        context.terminate = True  # パイプラインを終了
        # チェック後のミドルウェアは実行されない
        return

    await next(context)
```

## Function Middleware

関数ツールの呼び出し時に実行されます。

### 基本的な使用方法

```python
from agent_framework import function_middleware, FunctionInvocationContext

@function_middleware
async def function_logging_middleware(context: FunctionInvocationContext, next):
    print(f"Calling function: {context.function.name}")
    print(f"Arguments: {context.arguments}")

    await next(context)

    print(f"Result: {context.result}")

agent = ChatAgent(
    chat_client=client,
    middleware=function_logging_middleware
)
```

### 関数レート制限

```python
from collections import defaultdict
import asyncio

rate_limiter = defaultdict(asyncio.Semaphore)

@function_middleware
async def rate_limit_middleware(context: FunctionInvocationContext, next):
    func_name = context.function.name
    limiter = rate_limiter[func_name]

    async with limiter:
        await next(context)

# 使用
@ai_function
def expensive_api_call(query: str) -> str:
    return f"Result for {query}"

agent = ChatAgent(
    chat_client=client,
    tools=[expensive_api_call],
    middleware=rate_limit_middleware
)
```

## Chat Middleware

チャットクライアントの呼び出し時に実行されます。

### 基本的な使用方法

```python
from agent_framework import chat_middleware, ChatContext

@chat_middleware
async def chat_logging_middleware(context: ChatContext, next):
    print(f"Sending messages: {len(context.messages)}")

    await next(context)

    print(f"Received response: {context.result}")

agent = ChatAgent(
    chat_client=client,
    middleware=chat_logging_middleware
)
```

## 複数のミドルウェア

```python
# 複数のミドルウェアをリストで指定
agent = ChatAgent(
    chat_client=client,
    middleware=[
        auth_middleware,
        logging_middleware,
        timing_middleware,
        rate_limit_middleware
    ]
)

# 実行順序: auth → logging → timing → rate_limit → agent → rate_limit → timing → logging → auth
```

## Runレベルミドルウェア

特定の実行のみにミドルウェアを適用します。

```python
# エージェントレベルでミドルウェアを設定していない
agent = ChatAgent(chat_client=client)

# 特定の実行にのみミドルウェアを適用
result = await agent.run(
    "This is important!",
    middleware=[logging_middleware, timing_middleware]
)
```

## ミドルウェアパターン

### 1. 認証/認可

```python
@agent_middleware
async def authentication_middleware(context: AgentRunContext, next):
    token = context.kwargs.get("auth_token")
    if not validate_token(token):
        raise UnauthorizedError("Invalid token")

    context.metadata["user_id"] = get_user_id(token)
    await next(context)
```

### 2. 監査ログ

```python
@agent_middleware
async def audit_middleware(context: AgentRunContext, next):
    await next(context)

    # 実行後に監査ログを記録
    audit_log = {
        "agent": context.agent.name,
        "user_id": context.metadata.get("user_id"),
        "input": [m.content for m in context.messages],
        "output": context.result.text,
        "timestamp": datetime.utcnow().isoformat()
    }
    await write_audit_log(audit_log)
```

### 3. キャッシュ

```python
from functools import lru_cache
import hashlib

cache = {}

@agent_middleware
async def cache_middleware(context: AgentRunContext, next):
    # キャッシュキーを生成
    key = hashlib.md5(
        str(context.messages).encode()
    ).hexdigest()

    # キャッシュチェック
    if key in cache:
        context.result = cache[key]
        return

    await next(context)

    # 結果をキャッシュ
    cache[key] = context.result
```

### 4. リトライ

```python
@agent_middleware
async def retry_middleware(context: AgentRunContext, next):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            await next(context)
            return
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)  # 指数バックオフ
```

### 5. Purviewポリシー適用

```python
from agent_framework.microsoft import PurviewPolicyMiddleware
from azure.identity import DefaultAzureCredential

# Purviewポリシーを適用
purview_middleware = PurviewPolicyMiddleware(
    credential=DefaultAzureCredential()
)

agent = ChatAgent(
    chat_client=client,
    middleware=purview_middleware
)
```

## ベストプラクティス

1. **ミドルウェアの順序**: 認証→ログ→ビジネスロジック→監査の順序を推奨
2. **例外処理**: ミドルウェア内で例外を適切に処理
3. **パフォーマンス**: 重い処理は非同期で実行
4. **終了**: `context.terminate = True` でパイプラインを早めに終了

## 参照

- [公式ドキュメント: Agent Middleware](https://learn.microsoft.com/en-us/agent-framework/user-guide/agents/agent-middleware)
- [チュートリアル: Adding Middleware](https://learn.microsoft.com/en-us/agent-framework/tutorials/agents/middleware)
