"""Workflow Example - Microsoft Agent Framework (Python)

グラフベースワークフローの雛形です。
Executor、エッジ、チェックポイントの例を含みます。
"""

import asyncio
from typing import Any

# ===================================================================
# Configuration
# ===================================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = "gpt-4o-mini"

# ===================================================================
# Executors
# ===================================================================

from agent_framework import Executor, handler, WorkflowContext, WorkflowBuilder
from agent_framework.openai import OpenAIChatClient


class DataIngestionExecutor(Executor):
    """データ取り込みExecutor"""

    @handler
    async def handle(self, message: str, ctx: WorkflowContext):
        print(f"[DataIngestion] Processing: {message}")
        # データ取り込み処理
        result = f"Ingested: {message}"
        await ctx.emit_messages(result)


class AnalysisExecutor(Executor):
    """分析Executor"""

    def __init__(self, id: str = "analysis") -> None:
        super().__init__(id=id)
        self.agent = None

    async def initialize_agent(self):
        """Initialize LLM agent for analysis"""
        self.agent = OpenAIChatClient(
            api_key=OPENAI_API_KEY,
            model_id=OPENAI_MODEL
        ).create_agent(
            name="AnalysisAgent",
            instructions="You are a data analyst. Provide brief insights."
        )

    @handler
    async def handle(self, message: str, ctx: WorkflowContext):
        print(f"[Analysis] Analyzing: {message}")

        if self.agent is None:
            await self.initialize_agent()

        # LLMで分析
        result = await self.agent.run(f"Analyze this data: {message}")
        await ctx.emit_messages(f"Analysis: {result.text}")


class ReportExecutor(Executor):
    """レポート生成Executor"""

    @handler
    async def handle(self, message: str, ctx: WorkflowContext):
        print(f"[Report] Generating report for: {message}")
        # レポート生成処理
        result = f"Report generated for: {message}"
        await ctx.emit_messages(result)


# ===================================================================
# Workflow Creation
# ===================================================================

def create_workflow() -> Any:
    """Create workflow with executors and edges"""
    # Create executors
    ingestion = DataIngestionExecutor(id="ingestion")
    analysis = AnalysisExecutor(id="analysis")
    report = ReportExecutor(id="report")

    # Build workflow
    workflow = (
        WorkflowBuilder(max_iterations=10)
        .add_edge(ingestion, analysis)
        .add_edge(analysis, report)
        .set_start_executor(ingestion)
        .build()
    )

    return workflow


# ===================================================================
# Workflow with Checkpointing
# ===================================================================

def create_workflow_with_checkpointing():
    """Create workflow with checkpointing enabled"""
    from agent_framework import FileCheckpointStorage

    checkpoint_storage = FileCheckpointStorage(storage_path="./checkpoints")

    workflow = (
        WorkflowBuilder(max_iterations=10)
        .add_edge(ingestion, analysis)
        .add_edge(analysis, report)
        .set_start_executor(ingestion)
        .with_checkpointing(checkpoint_storage=checkpoint_storage)
        .build()
    )

    return workflow, checkpoint_storage


# ===================================================================
# Main
# ===================================================================

async def main_basic():
    """Basic workflow example"""
    workflow = create_workflow()

    # Run workflow
    result = await workflow.run("Sample data")
    print(f"Workflow outputs: {result.get_outputs()}")


async def main_streaming():
    """Streaming workflow example"""
    workflow = create_workflow()

    # Run workflow with streaming
    async for event in workflow.run_stream("Sample data"):
        if isinstance(event, WorkflowOutputEvent):
            print(f"Event output: {event.data}")


async def main_checkpointing():
    """Checkpointing example"""
    workflow, storage = create_workflow_with_checkpointing()

    # Run workflow
    result = await workflow.run("Sample data")

    # List checkpoints
    checkpoints = await storage.list_checkpoints()
    print(f"Checkpoints created: {len(checkpoints)}")

    # Resume from checkpoint
    if checkpoints:
        async for event in workflow.run_stream(
            checkpoint_id=checkpoints[0].checkpoint_id,
            checkpoint_storage=storage
        ):
            if isinstance(event, WorkflowOutputEvent):
                print(f"Resumed output: {event.data}")


if __name__ == "__main__":
    # Run examples
    print("=== Basic Workflow ===")
    asyncio.run(main_basic())

    print("\n=== Streaming Workflow ===")
    asyncio.run(main_streaming())

    print("\n=== Checkpointing Workflow ===")
    asyncio.run(main_checkpointing())
