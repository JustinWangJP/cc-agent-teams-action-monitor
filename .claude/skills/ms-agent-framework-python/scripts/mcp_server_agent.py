"""MCP Server Agent Template - Microsoft Agent Framework (Python)

エージェントをMCPサーバーとして公開する雛形です。
"""

import asyncio
import os

# ===================================================================
# Configuration
# ===================================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = "gpt-4o-mini"

# ===================================================================
# Agent Creation
# ===================================================================

from agent_framework import ai_function
from agent_framework.openai import OpenAIChatClient


@ai_function
def get_time() -> str:
    """Get the current time."""
    from datetime import datetime
    return datetime.now().isoformat()


@ai_function
def calculate(expression: str) -> str:
    """Calculate a mathematical expression."""
    try:
        result = eval(expression)
        return f"Result: {result}"
    except Exception as e:
        return f"Error: {e}"


async def create_agent():
    """Create agent with tools"""
    agent = OpenAIChatClient(
        api_key=OPENAI_API_KEY,
        model_id=OPENAI_MODEL
    ).create_agent(
        name="MCPAgent",
        instructions="You are a helpful assistant with time and calculation tools.",
        tools=[get_time, calculate]
    )
    return agent


# ===================================================================
# MCP Server
# ===================================================================

import anyio
from mcp.server.stdio import stdio_server


async def run_mcp_server():
    """Run agent as MCP server"""
    # Create agent
    agent = await create_agent()

    # Convert to MCP server
    server = agent.as_mcp_server()

    # Run MCP server
    async def handle_stdin():
        async with stdio_server() as (read_stream, write_stream):
            await server.run(
                read_stream,
                write_stream,
                server.create_initialization_options()
            )

    await handle_stdin()


# ===================================================================
# Main
# ===================================================================

if __name__ == "__main__":
    # Run as MCP server
    anyio.run(run_mcp_server())
