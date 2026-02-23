# Observability

OpenTelemetryベースのトレーシングを有効にします。

## Enable Observability

```python
from agent_framework.observability import configure_otel_providers

# コンソール出力を有効化
configure_otel_providers(enable_console_exporters=True)

# OTLPエンドポイントにエクスポート
# export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
configure_otel_providers()

# 環境変数での設定
# export ENABLE_INSTRUMENTATION=true
configure_otel_providers()
```

## Spans

| Span Name | 説明 |
|-----------|------|
| `agent.run` | エージェント実行 |
| `workflow.run` | ワークフロー実行 |
| `llm.call` | LLM呼び出し |
| `tool.call` | ツール呼び出し |

## Exporters

### Console Exporter

ローカル開発用。

```python
configure_otel_providers(enable_console_exporters=True)
```

### OTLP Exporter

外部ツールにエクスポート。

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

サポートするツール:
- Jaeger
- Zipkin
- Azure Monitor
- Datadog

## Tracing Functions

```python
from agent_framework.observability import trace_function

@trace_function
def my_function(arg: str) -> str:
    return f"Processed: {arg}"
```
