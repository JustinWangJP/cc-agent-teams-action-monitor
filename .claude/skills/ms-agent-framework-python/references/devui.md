# DevUI

対話的なWeb UIでエージェントとワークフローをテスト・デバッグします。

## Installation

```bash
pip install agent-framework-devui --pre
```

## Usage

### Command Line

```bash
# ディレクトリからエージェントを自動検出
devui ./agents --tracing

# 特定のエージェントを指定
devui agent.py --tracing
```

### Programmatic

```python
from agent_framework.devui import serve

serve(
    entities=[agent, workflow],
    tracing_enabled=True
)
```

## Features

1. **Web Interface**: 対話的なUI
2. **Tracing**: OpenTelemetryトレースの表示
3. **OpenAI-Compatible API**: OpenAI SDKで操作可能
4. **Sample Gallery**: サンプル例の閲覧

## Access

```bash
# DevUI起動後にブラウザでアクセス
http://localhost:8000
```

## Debug Panel

トレース情報を確認:
- スパン階層
- タイミング情報
- イベントログ

## OpenAI API

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="dummy"
)

response = client.chat.completions.create(
    model="my-agent",
    messages=[{"role": "user", "content": "Hello"}]
)
```
