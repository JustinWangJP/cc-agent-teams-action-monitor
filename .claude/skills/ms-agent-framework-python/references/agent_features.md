# Agent Features

エージェントの追加機能。

## Streaming Responses

```python
async for chunk in agent.run_stream("Tell me a story."):
    if chunk.text:
        print(chunk.text, end="", flush=True)
```

## Code Interpreter

```python
from agent_framework import HostedCodeInterpreterTool

agent = OpenAIChatClient().create_agent(
    instructions="You can write and execute Python code.",
    tools=HostedCodeInterpreterTool(),
)
```

## File Search

Azure AI Foundryでファイル検索を有効にします。

```python
# Azure AI FoundryでFile Searchを使用
# （詳細は公式ドキュメントを参照）
```

## Bing Grounding

Bing検索を統合します。

```python
# Bing Grounding Tool
# （詳細は公式ドキュメントを参照）
```

## Context Providers

エージェントに追加コンテキストを提供します。

```python
# コンテキストプロバイダーの使用
# （詳細は公式ドキュメントを参照）
```

## Middleware

エージェントのアクションをインターセプトします。

```python
# ミドルウェアの使用
# （詳細は公式ドキュメントを参照）
```
