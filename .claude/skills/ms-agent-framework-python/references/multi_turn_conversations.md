# Multi-Turn Conversations & Threading

エージェントはステートレスで、呼び出し間で内部状態を維持しません。マルチターン会話を実現するには、`AgentThread` を使用して会話状態を管理する必要があります。

## AgentThreadとは

`AgentThread` はエージェントとの会話スレッドを表す抽象化です。以下の状態を保持します:

- 会話履歴（チャットメッセージ）
- エージェントが複数回のインタラクション間で保持する必要がある状態

### スレッドの種類

| スレッドタイプ | 説明 | 使用例 |
|--------------|------|--------|
| インメモリ | メッセージがメモリ内に保存される | ChatCompletion API |
| サービス管理 | メッセージがサービス側に保存される | Azure AI Agents, OpenAI Responses |

## 基本的な使用方法

### 新しいスレッドの作成

```python
from agent_framework import ChatAgent
from agent_framework.openai import OpenAIChatClient

agent = ChatAgent(
    chat_client=OpenAIChatClient(),
    name="assistant"
)

# 新しいスレッドを作成
thread = agent.get_new_thread()
```

### スレッドを使用した会話

```python
import asyncio

async def multi_turn_conversation():
    # スレッドを作成
    thread = agent.get_new_thread()

    # 最初のメッセージ
    result1 = await agent.run("Tell me a joke about a pirate.", thread=thread)
    print(f"Response 1: {result1.text}")

    # 同じスレッドで続行
    result2 = await agent.run("Now add some emojis to the joke.", thread=thread)
    print(f"Response 2: {result2.text}")

    # 前のコンテキストを保持
    result3 = await agent.run("Tell it in the voice of a pirate's parrot.", thread=thread)
    print(f"Response 3: {result3.text}")

asyncio.run(multi_turn_conversation())
```

## スレッドの永続化と復元

### シリアライズと保存

```python
import json

# スレッドをシリアライズ
serialized = thread.serialize()

# ファイルに保存
with open("thread_state.json", "w") as f:
    json.dump(serialized, f)
```

### 復元と再開

```python
# ファイルから読み込み
with open("thread_state.json", "r") as f:
    loaded_data = json.load(f)

# スレッドを復元
restored_thread = await agent.deserialize_thread(loaded_data)

# 会話を再開
result = await agent.run("Continue our conversation.", thread=restored_thread)
```

## 複数の独立した会話

```python
# 複数のスレッドを作成
thread1 = agent.get_new_thread()
thread2 = agent.get_new_thread()

# 各スレッドは独立した会話履歴を維持
async with asyncio.TaskGroup() as tg:
    # 並列に実行することも可能
    result1a = await agent.run("Hello, I'm User A", thread=thread1)
    result2a = await agent.run("Hi, I'm User B", thread=thread2)

# 各スレッドで続行
result1b = await agent.run("Remember my name?", thread=thread1)
result2b = await agent.run("What's my name?", thread=thread2)

# result1b は User A を覚えている
# result2b は User B を覚えている
```

## カスタムメッセージストア

インメモリスレッドの場合、カスタムメッセージストアを実装できます:

```python
from agent_framework import IMessageStore, ChatMessage

class DatabaseMessageStore(IMessageStore):
    """データベースを使用したメッセージストア"""

    def __init__(self, db_connection):
        self.db = db_connection

    async def get_messages(self, thread_id: str) -> list[ChatMessage]:
        # データベースからメッセージを取得
        rows = await self.db.execute(
            "SELECT role, content FROM messages WHERE thread_id = ? ORDER BY created_at",
            (thread_id,)
        )
        return [
            ChatMessage(role=row["role"], content=row["content"])
            for row in rows
        ]

    async def save_messages(self, thread_id: str, messages: list[ChatMessage]):
        # データベースにメッセージを保存
        for msg in messages:
            await self.db.execute(
                "INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?)",
                (thread_id, msg.role, msg.content)
            )

# カスタムストアを使用
message_store = DatabaseMessageStore(db_connection)
thread = await agent.create_thread(message_store=message_store)
```

## スレッドのライフサイクル管理

### 一時的なスレッド

```python
# スレッドを指定しない場合、一時的なスレッドが作成される
result = await agent.run("One-time message")
# スレッドはこの実行の間のみ存在
```

### 永続的なスレッドの削除

```python
# Azure AI Agents や OpenAI Responses の場合、
# サービス側に作成されたスレッドを削除する必要がある

async def cleanup_thread(thread):
    # サービス固有の削除処理
    await thread.delete()
```

## ベストプラクティス

### 1. 適切なスレッドタイプの選択

- **短期間のセッション**: インメモリスレッド
- **長期間の保存**: サービス管理スレッド
- **カスタム永続化**: カスタムメッセージストア

### 2. 並列安全性

```python
import asyncio

lock = asyncio.Lock()

async def safe_agent_call(thread, message):
    async with lock:
        return await agent.run(message, thread=thread)

# 複数のコルーチンから同じスレッドを使用する場合、
# 適切な同期を行う
```

### 3. スレッド互換性

異なるエージェントタイプ間でスレッドを共有する場合は注意が必要です:

```python
# OpenAI Responses Agent のスレッドは
# Azure AI Agent では動作しない可能性があります

openai_thread = openai_agent.get_new_thread()
# 以下は安全ではありません
# azure_agent.run("Hello", thread=openai_thread)  # エラーの可能性
```

## 参照

- [公式ドキュメント: Multi-Turn Conversations](https://learn.microsoft.com/en-us/agent-framework/user-guide/agents/multi-turn-conversation)
- [チュートリアル: Persisted Conversations](https://learn.microsoft.com/en-us/agent-framework/tutorials/agents/persisted-conversation)
