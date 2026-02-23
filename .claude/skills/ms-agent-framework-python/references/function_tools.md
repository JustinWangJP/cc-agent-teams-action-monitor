# Function Tools

Python関数をエージェントから呼び出せるツールとして登録します。

## Basic Function Tool

```python
from typing import Annotated
from agent_framework import ai_function

@ai_function
def get_weather(location: Annotated[str, "The city"]) -> str:
    """Get the current weather."""
    return f"Weather in {location}: Sunny"

agent = OpenAIChatClient().create_agent(
    instructions="You are a weather assistant.",
    tools=get_weather
)
```

## Class-Based Tools

```python
class WeatherTools:
    @ai_function
    def get_weather(self, location: str) -> str:
        """Get the current weather."""
        return f"Weather in {location}: Sunny"

    @ai_function
    def get_forecast(self, location: str, days: int) -> str:
        """Get weather forecast."""
        return f"Forecast for {location}: Sunny for {days} days"

tools = WeatherTools()
agent = OpenAIChatClient().create_agent(
    instructions="You are a weather assistant.",
    tools=[tools.get_weather, tools.get_forecast]
)
```

## Human Approval Required

```python
@ai_function(approval_mode="always_require")
def sensitive_operation(data: str) -> str:
    """Perform sensitive operation."""
    return f"Processed: {data}"

agent = OpenAIChatClient().create_agent(
    instructions="You are a helpful assistant.",
    tools=[sensitive_operation]
)

result = await agent.run("Execute operation")

if result.user_input_requests:
    for req in result.user_input_requests:
        print(f"Approval needed: {req.function_call.name}")
        print(f"Arguments: {req.function_call.arguments}")
```

## Agent as Tool

```python
# 子エージェントを作成
weather_agent = AzureOpenAIChatClient(credential=credential).create_agent(
    name="WeatherAgent",
    description="Answers weather questions.",
    instructions="You answer weather questions.",
    tools=get_weather
)

# メインエージェントに子エージェントをツールとして提供
main_agent = AzureOpenAIChatClient(credential=credential).create_agent(
    instructions="You are a helpful assistant.",
    tools=weather_agent.as_tool()
)

# カスタマイズ
weather_tool = weather_agent.as_tool(
    name="WeatherLookup",
    description="Look up weather information",
    arg_name="query",
    arg_description="The weather query"
)
```
