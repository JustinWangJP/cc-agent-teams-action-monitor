# MCP Integration

Model Context Protocol（MCP）サーバーと統合します。

## Agent as MCP Server

エージェントをMCPサーバーとして公開します。

```python
import anyio
from mcp.server.stdio import stdio_server
from agent_framework.openai import OpenAIChatClient

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

## MCP Tools

MCPサーバーのツールをエージェントに統合します。

```python
from azure.ai.agents import MCPTool

# MCPツールを作成
mcp_tool = MCPTool(
    endpoint="http://localhost:8000/mcp",
    tool_id="weather-tool"
)

agent = AzureAIClient(async_credential=credential).create_agent(
    instructions="You are a helpful assistant.",
    tools=[mcp_tool]
)
```

## MCP Resources

MCPサーバーのリソースにアクセスします。

```python
# MCPサーバーからリソースを取得
# （詳細は公式ドキュメントを参照）
```
