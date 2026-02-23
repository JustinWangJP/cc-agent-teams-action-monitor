# Microsoft Agent Framework Python Skill

Microsoft Agent Framework（Python）でAIエージェントを構築するための包括的なClaude Code スキルです。

## 概要

このスキルは、Microsoft Agent Framework を使用してAIエージェントを開発、デバッグ、デプロイする際に必要な知識とコード例を提供します。単一のエージェントから複雑なマルチエージェントワークフローまで、あらゆるユースケースをカバーしています。

## 特徴

- **エージェント作成**: OpenAI、Azure OpenAI、Azure AI Foundry クライアント対応
- **ツール統合**: `@ai_function` デコレータによる簡単なツール定義
- **MCP 連携**: Model Context Protocol サーバーとして公開・統合
- **グラフベースワークフロー**: Sequential、Parallel、Handoff、Magentic パターン
- **状態管理**: AgentThread によるマルチターン会話、Shared States
- **チェックポイント**: ワークフローの状態保存と復元
- **Human-in-the-Loop**: 関数実行前のユーザー承認
- **Observability**: OpenTelemetry ベースのトレーシング
- **DevUI**: 対話的なWeb UI でエージェントをテスト

## ディレクトリ構造

```
ms-agent-framework-python/
├── SKILL.md                    # スキル本体（メインドキュメント）
├── README.md                   # このファイル
├── references/                 # 詳細リファレンス
│   ├── agent_features.md       # エージェント機能詳細
│   ├── agent_middleware.md     # ミドルウェア
│   ├── agent_types.md          # エージェントタイプ
│   ├── api_reference.md        # API リファレンス
│   ├── checkpointing.md        # チェックポイント機能
│   ├── custom_agents.md        # カスタムエージェント
│   ├── devui.md                # DevUI 詳細
│   ├── function_tools.md       # 関数ツール
│   ├── mcp_integration.md      # MCP 統合
│   ├── multi_turn_conversations.md  # マルチターン会話
│   ├── observability.md        # Observability
│   ├── orchestration.md        # オーケストレーション
│   ├── shared_states.md        # 共有状態
│   ├── state_management.md     # 状態管理
│   └── workflows.md            # ワークフロー
└── scripts/                    # サンプルコード
    ├── basic_agent.py          # 基本的なエージェント
    ├── agent_with_tools.py     # ツール付きエージェント
    ├── mcp_server_agent.py     # MCP サーバーエージェント
    └── workflow_example.py     # ワークフロー例
```

## 使用方法

このスキルは、Claude Code で Microsoft Agent Framework を使用する際に自動的に参照されます。以下のようなタスクで活用されます：

- AIエージェントの作成と設定
- ツール（Function Tools）の実装
- マルチエージェントオーケストレーションの設計
- MCP サーバーとしてのエージェント公開
- DevUI でのエージェントテスト

## クイックスタート

### 基本的なエージェント

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

### ツール付きエージェント

```python
from agent_framework import ai_function

@ai_function
def get_weather(location: str) -> str:
    """Get the current weather."""
    return f"Weather in {location}: Sunny"

agent = OpenAIChatClient().create_agent(
    instructions="You are a weather assistant.",
    tools=get_weather
)
```

### DevUI でのテスト

```bash
# インストール
pip install agent-framework-devui --pre

# 起動
devui ./entities --tracing --reload
```

## インストール

```bash
# 全パッケージをインストール（推奨）
pip install agent-framework --pre

# 個別パッケージ
pip install agent-framework-core --pre          # コア
pip install agent-framework-openai --pre        # OpenAI
pip install agent-framework-azure --pre         # Azure
pip install agent-framework-devui --pre         # DevUI
```

**重要**: `--pre` フラグが必須です（プレリリース版）。

## 環境変数

```bash
# OpenAI
export OPENAI_API_KEY="your-api-key"

# Azure OpenAI
export AZURE_OPENAI_ENDPOINT="https://<resource>.openai.azure.com"
export AZURE_OPENAI_CHAT_DEPLOYMENT_NAME="gpt-4o-mini"

# Observability
export ENABLE_INSTRUMENTATION=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

## 関連リンク

- [公式ドキュメント](https://learn.microsoft.com/en-us/agent-framework/overview/agent-framework-overview)
- [GitHubリポジトリ](https://github.com/microsoft/agent-framework)
- [Python Samples](https://github.com/microsoft/agent-framework/tree/main/python/samples)

## ライセンス

このスキルは MIT ライセンスの下で提供されています。Microsoft Agent Framework 自体は MIT ライセンスです。
