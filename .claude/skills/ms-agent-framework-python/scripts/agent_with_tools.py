"""Agent with Tools Template - Microsoft Agent Framework (Python)

ツール付きエージェントの雛形です。
Function Tools、Agent as Tool、Code Interpreterの例を含みます。
"""

import asyncio
import os
from typing import Annotated

# ===================================================================
# Configuration
# ===================================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = "gpt-4o-mini"

# ===================================================================
# Function Tools
# ===================================================================

from agent_framework import ai_function
from agent_framework.openai import OpenAIChatClient


@ai_function
def get_weather(location: Annotated[str, "The city"]) -> str:
    """Get the current weather for a given location."""
    return f"The weather in {location} is sunny with 20°C."


@ai_function
def get_forecast(location: str, days: int) -> str:
    """Get weather forecast for a given location."""
    return f"Forecast for {location}: Sunny for {days} days."


# Class-based tools
class CalculatorTools:
    """Calculator tools"""

    @ai_function
    def add(self, a: float, b: float) -> float:
        """Add two numbers."""
        return a + b

    @ai_function
    def multiply(self, a: float, b: float) -> float:
        """Multiply two numbers."""
        return a * b


@ai_function(approval_mode="always_require")
def sensitive_operation(data: str) -> str:
    """Perform a sensitive operation requiring approval."""
    return f"Processed: {data}"


# ===================================================================
# Agent with Tools
# ===================================================================

async def main():
    # Create agent with function tools
    calc_tools = CalculatorTools()

    agent = OpenAIChatClient(
        api_key=OPENAI_API_KEY,
        model_id=OPENAI_MODEL
    ).create_agent(
        name="ToolsAgent",
        instructions="""You are a helpful assistant with access to various tools:
- get_weather: Get current weather
- get_forecast: Get weather forecast
- CalculatorTools: Perform calculations
- sensitive_operation: Requires approval""",
        tools=[
            get_weather,
            get_forecast,
            calc_tools.add,
            calc_tools.multiply,
            sensitive_operation
        ]
    )

    # Run agent
    result = await agent.run("What is the weather in Tokyo?")
    print(f"Agent: {result.text}")

    # Test with approval
    result2 = await agent.run("Execute sensitive operation with data=secret")

    if result2.user_input_requests:
        for req in result2.user_input_requests:
            print(f"Approval needed: {req.function_call.name}")
            print(f"Arguments: {req.function_call.arguments}")
            # In production, you would handle approval here


if __name__ == "__main__":
    asyncio.run(main())
