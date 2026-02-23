"""Basic Agent Template - Microsoft Agent Framework (Python)

基本的なエージェントの雛形です。
OpenAI、Azure OpenAI、Azure AI Foundryのいずれかを使用します。
"""

import asyncio
import os
from typing import Literal

# ===================================================================
# Configuration
# ===================================================================

AGENT_TYPE: Literal["openai", "azure-openai", "azure-ai"] = "openai"

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = "gpt-4o-mini"

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME", "gpt-4o-mini")

# Azure AI Foundry Configuration
AZURE_AI_ENDPOINT = os.getenv("AZURE_AI_PROJECT_ENDPOINT")
AZURE_AI_DEPLOYMENT = os.getenv("AZURE_AI_MODEL_DEPLOYMENT_NAME", "gpt-4o-mini")

# ===================================================================
# Agent Creation
# ===================================================================

async def create_openai_agent():
    """Create OpenAI agent"""
    from agent_framework.openai import OpenAIChatClient

    agent = OpenAIChatClient(
        api_key=OPENAI_API_KEY,
        model_id=OPENAI_MODEL
    ).create_agent(
        name="BasicAgent",
        instructions="You are a helpful assistant."
    )
    return agent


async def create_azure_openai_agent():
    """Create Azure OpenAI agent"""
    from agent_framework.azure import AzureOpenAIChatClient
    from azure.identity import AzureCliCredential

    agent = AzureOpenAIChatClient(
        endpoint=AZURE_OPENAI_ENDPOINT,
        credential=AzureCliCredential(),
        model_id=AZURE_OPENAI_DEPLOYMENT
    ).create_agent(
        name="BasicAgent",
        instructions="You are a helpful assistant."
    )
    return agent


async def create_azure_ai_agent():
    """Create Azure AI Foundry agent"""
    from agent_framework.azure import AzureAIClient
    from azure.identity.aio import AzureCliCredential

    credential = AzureCliCredential()
    client = AzureAIClient(
        async_credential=credential,
        endpoint=AZURE_AI_ENDPOINT
    )
    agent = await client.create_agent(
        name="BasicAgent",
        instructions="You are a helpful assistant.",
        model_id=AZURE_AI_DEPLOYMENT
    )
    return agent


# ===================================================================
# Main
# ===================================================================

async def main():
    # Create agent based on type
    if AGENT_TYPE == "openai":
        agent = await create_openai_agent()
    elif AGENT_TYPE == "azure-openai":
        agent = await create_azure_openai_agent()
    elif AGENT_TYPE == "azure-ai":
        agent = await create_azure_ai_agent()
    else:
        raise ValueError(f"Unknown agent type: {AGENT_TYPE}")

    # Run agent
    result = await agent.run("Hello! Please introduce yourself.")
    print(f"Agent: {result.text}")


if __name__ == "__main__":
    asyncio.run(main())
