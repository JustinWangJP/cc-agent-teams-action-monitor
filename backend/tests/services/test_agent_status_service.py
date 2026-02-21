"""AgentStatusService のユニットテスト."""
import pytest

from app.services.agent_status_service import AgentStatusService


class TestAgentStatusService:
    """AgentStatusService クラスのテストスイート."""

    @pytest.mark.asyncio
    async def test_infer_agent_status_idle(self):
        """アイドル状態の推論をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        messages = [
            {
                "to": agent_name,
                "parsed_type": "idle_notification",
                "parsed_data": {"type": "idle_notification"},
                "timestamp": "2026-02-21T10:00:00Z"
            }
        ]
        tasks = []

        result = await service.infer_agent_status(agent_name, messages, tasks)

        assert result["status"] == "idle"
        assert result["progress"] == 0
        assert result["agentId"] == agent_name

    @pytest.mark.asyncio
    async def test_infer_agent_status_active(self):
        """アクティブ状態の推論をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        messages = [
            {
                "to": agent_name,
                "parsed_type": "task_assignment",
                "parsed_data": {"type": "task_assignment", "taskId": "5", "subject": "API実装"},
                "timestamp": "2026-02-21T10:00:00Z"
            }
        ]
        tasks = []

        result = await service.infer_agent_status(agent_name, messages, tasks)

        assert result["status"] == "active"
        assert result["currentTaskId"] == "5"
        assert result["currentTaskSubject"] == "API実装"
        assert result["progress"] == 25

    @pytest.mark.asyncio
    async def test_infer_agent_status_working(self):
        """作業中状態の推論をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        messages = []
        tasks = [
            {
                "id": "5",
                "owner": agent_name,
                "status": "in_progress",
                "subject": "API実装"
            }
        ]

        result = await service.infer_agent_status(agent_name, messages, tasks)

        assert result["status"] == "working"
        assert result["currentTaskId"] == "5"
        assert result["currentTaskSubject"] == "API実装"
        assert result["progress"] == 50

    @pytest.mark.asyncio
    async def test_infer_agent_status_completed(self):
        """完了状態の推論をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        messages = []
        tasks = [
            {
                "id": "5",
                "owner": agent_name,
                "status": "completed",
                "subject": "API実装"
            }
        ]

        result = await service.infer_agent_status(agent_name, messages, tasks)

        assert result["status"] == "completed"
        assert result["progress"] == 100
        assert "5" in result["completedTasks"]

    @pytest.mark.asyncio
    async def test_infer_agent_status_progress_calculation(self):
        """プログレス計算をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        messages = []
        tasks = [
            {"id": "1", "owner": agent_name, "status": "completed"},
            {"id": "2", "owner": agent_name, "status": "completed"},
            {"id": "3", "owner": agent_name, "status": "in_progress"},
            {"id": "4", "owner": agent_name, "status": "pending"},
        ]

        result = await service.infer_agent_status(agent_name, messages, tasks)

        # 2完了 + 1進行中(0.5換算) / 4担当 = 62.5% → 62%
        assert result["progress"] == 62
        assert len(result["assignedTasks"]) == 4
        assert result["status"] == "working"  # in_progress があるので working

    def test_get_status_color(self):
        """ステータス色の取得をテストします."""
        service = AgentStatusService()

        assert service._get_status_color("idle") == "#f59e0b"
        assert service._get_status_color("active") == "#10b981"
        assert service._get_status_color("working") == "#3b82f6"
        assert service._get_status_color("completed") == "#22c55e"
        assert service._get_status_color("error") == "#ef4444"
        assert service._get_status_color("unknown") == "#6b7280"

    def test_get_status_icon(self):
        """ステータスアイコンの取得をテストします."""
        service = AgentStatusService()

        assert service._get_status_icon("idle") == "💤"
        assert service._get_status_icon("active") == "🟢"
        assert service._get_status_icon("working") == "🔵"
        assert service._get_status_icon("completed") == "✅"
        assert service._get_status_icon("error") == "❌"
        assert service._get_status_icon("unknown") == "❓"
