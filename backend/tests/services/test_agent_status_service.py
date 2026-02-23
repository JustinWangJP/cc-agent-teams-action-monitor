"""AgentStatusService のユニットテスト."""
import pytest
from datetime import datetime, timezone

from app.services.agent_status_service import AgentStatusService


class TestAgentStatusService:
    """AgentStatusService クラスのテストスイート."""

    @pytest.mark.asyncio
    async def test_infer_agent_status_idle(self):
        """アイドル状態の推論をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        messages = [
            {
                "to": agent_name,
                "parsed_type": "idle_notification",
                "parsed_data": {"type": "idle_notification"},
                "timestamp": now
            }
        ]
        tasks = []

        result = await service.infer_agent_status(agent_name, messages, tasks)

        assert result["status"] == "idle"
        assert result["progress"] == 0
        assert result["agentId"] == agent_name

    @pytest.mark.asyncio
    async def test_infer_agent_status_with_task_assignment(self):
        """タスク割り当てメッセージによる状態推論をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        messages = [
            {
                "to": agent_name,
                "parsed_type": "task_assignment",
                "parsed_data": {"type": "task_assignment", "taskId": "5", "subject": "API 実装"},
                "timestamp": now
            }
        ]
        tasks = []

        result = await service.infer_agent_status(agent_name, messages, tasks)

        # task_assignment メッセージがあり、タスクリストにないので idle
        assert result["status"] == "idle"
        assert result["currentTaskId"] == "5"
        assert result["currentTaskSubject"] == "API 実装"

    @pytest.mark.asyncio
    async def test_infer_agent_status_working(self):
        """作業中状態の推論をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        messages = []
        tasks = [
            {
                "id": "5",
                "owner": agent_name,
                "status": "in_progress",
                "subject": "API 実装"
            }
        ]

        result = await service.infer_agent_status(agent_name, messages, tasks)

        assert result["status"] == "working"
        assert result["currentTaskId"] == "5"
        # currentTaskSubject は in_progress タスクからは取得できない（実装制限）
        assert result["currentTaskSubject"] is None
        assert result["progress"] == 50

    @pytest.mark.asyncio
    async def test_infer_agent_status_completed(self):
        """完了状態の推論をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        messages = []
        tasks = [
            {
                "id": "5",
                "owner": agent_name,
                "status": "completed",
                "subject": "API 実装"
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
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        messages = []
        tasks = [
            {"id": "1", "owner": agent_name, "status": "completed"},
            {"id": "2", "owner": agent_name, "status": "completed"},
            {"id": "3", "owner": agent_name, "status": "in_progress"},
            {"id": "4", "owner": agent_name, "status": "pending"},
        ]

        result = await service.infer_agent_status(agent_name, messages, tasks)

        # 2 完了 + 1 進行中 (0.5 換算) / 4 担当 = 62.5% → 62%
        assert result["progress"] == 62
        assert len(result["assignedTasks"]) == 4
        assert result["status"] == "working"  # in_progress があるので working

    @pytest.mark.asyncio
    async def test_infer_agent_status_waiting(self):
        """待ち状態の推論をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        messages = []
        tasks = [
            {
                "id": "5",
                "owner": agent_name,
                "status": "in_progress",
                "blockedBy": ["4"],  # タスク 4 が完了するのを待っている
                "subject": "API 実装"
            },
            {"id": "4", "owner": "other-agent", "status": "pending"},
        ]

        result = await service.infer_agent_status(agent_name, messages, tasks)

        assert result["status"] == "waiting"
        assert result["currentTaskId"] == "5"

    def test_get_status_color(self):
        """ステータス色の取得をテストします."""
        service = AgentStatusService()

        assert service._get_status_color("idle") == "#f59e0b"
        assert service._get_status_color("working") == "#3b82f6"
        assert service._get_status_color("waiting") == "#8b5cf6"
        assert service._get_status_color("completed") == "#22c55e"
        assert service._get_status_color("error") == "#ef4444"
        assert service._get_status_color("unknown") == "#6b7280"

    def test_get_status_icon(self):
        """ステータスアイコンの取得をテストします."""
        service = AgentStatusService()

        assert service._get_status_icon("idle") == "💤"
        assert service._get_status_icon("working") == "🔵"
        assert service._get_status_icon("waiting") == "⏳"
        assert service._get_status_icon("completed") == "✅"
        assert service._get_status_icon("error") == "❌"
        assert service._get_status_icon("unknown") == "❓"

    def test_get_status_label(self):
        """ステータスラベルの取得をテストします."""
        service = AgentStatusService()

        assert service.get_status_label("idle") == "待機中"
        assert service.get_status_label("working") == "作業中"
        assert service.get_status_label("waiting") == "待ち状態"
        assert service.get_status_label("completed") == "完了"
        assert service.get_status_label("error") == "エラー"

    @pytest.mark.asyncio
    async def test_infer_agent_status_error_long_inactivity(self):
        """TC-007-04: 長時間無活動によるエラー状態推論をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        # 30分以上前のタイムスタンプ（ERROR_THRESHOLD_SECONDS = 30 * 60）
        old_time = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        messages = [
            {
                "to": agent_name,
                "timestamp": old_time.isoformat().replace("+00:00", "Z")
            }
        ]
        tasks = []

        result = await service.infer_agent_status(agent_name, messages, tasks)

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_extract_session_info_with_model(self):
        """TC-007-10: セッションログからのモデル名抽出をテストします."""
        service = AgentStatusService()

        agent_name = "backend-developer"
        session_entries = [
            {
                "parsed_type": "assistant_message",
                "details": {
                    "model": "claude-opus-4-6"
                }
            },
            {
                "parsed_type": "tool_use",
                "details": {
                    "files": [
                        {"path": "/path/to/file1.py"},
                        {"path": "/path/to/file2.ts"}
                    ]
                }
            }
        ]

        result = await service._extract_session_info(agent_name, session_entries)

        assert result["model"] == "claude-opus-4-6"
        assert len(result["touched_files"]) == 2
        assert "/path/to/file1.py" in result["touched_files"]
        assert "/path/to/file2.ts" in result["touched_files"]
