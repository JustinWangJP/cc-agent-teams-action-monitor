# State Management

エージェントの状態と会話履歴を管理します。

## AgentThread

```python
# 新規スレッドを作成
thread = agent.get_new_thread()

# スレッドを使用して実行
result = await agent.run("Hello", thread=thread)
result = await agent.run("How are you?", thread=thread)

# スレッドをシリアライズ
serialized = thread.serialize()

# 復元
restored_thread = await agent.deserialize_thread(serialized)
```

## Service Managed Threads

```python
# Azure AI Foundryで管理されるスレッド
thread = agent.get_new_thread(
    service_thread_id="service-thread-id"
)
```

## Message Store

```python
# ローカルメッセージストアを使用
# （詳細は公式ドキュメントを参照）
```
