"""エージェント状態推論サービス.

inbox メッセージとタスクからエージェントの状態を推論します。
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class AgentStatusService:
    """エージェント状態推論サービス.

    inbox メッセージとタスク定義からエージェントの現在の状態を推論します。

    """

    async def infer_agent_status(
        self,
        agent_name: str,
        messages: list[dict],
        tasks: list[dict]
    ) -> dict:
        """エージェントの状態を推論します。

        Args:
            agent_name: エージェント名
            messages: inbox メッセージリスト
            tasks: タスクリスト

        Returns:
            エージェント状態情報の辞書

        """
        # 現在時刻（UTC）
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # 初期状態
        status = "idle"
        current_task_id = None
        current_task_subject = None
        last_activity_at = None
        assigned_tasks = []
        completed_tasks = []

        # メッセージから最新の状態を抽出
        latest_message = None
        for msg in messages:
            if msg.get("to") == agent_name or msg.get("from_") == agent_name:
                if latest_message is None or msg.get("timestamp", "") > (latest_message.get("timestamp", "") if latest_message else ""):
                    latest_message = msg

        if latest_message:
            last_activity_at = latest_message.get("timestamp")

        # 構造化メッセージから状態を判定
        if latest_message:
            parsed_data = latest_message.get("parsed_data")
            parsed_type = latest_message.get("parsed_type")

            if parsed_type == "idle_notification":
                status = "idle"

            elif parsed_type == "task_assignment":
                status = "active"
                task_id = parsed_data.get("taskId") if parsed_data else None
                subject = parsed_data.get("subject") if parsed_data else None
                if task_id:
                    current_task_id = task_id
                    current_task_subject = subject

            elif parsed_type == "task_completed":
                status = "active"
                task_id = parsed_data.get("taskId") if parsed_data else None
                if task_id:
                    completed_tasks.append(task_id)

        # タスク状態から判定
        for task in tasks:
            owner = task.get("owner")
            if owner == agent_name:
                task_id = task.get("id")
                status_val = task.get("status")

                if task_id:
                    task_id_str = str(task_id)
                    assigned_tasks.append(task_id_str)

                if status_val == "in_progress":
                    status = "working"
                    current_task_id = str(task_id) if task_id else None
                    current_task_subject = task.get("subject")

                elif status_val == "completed":
                    if task_id and str(task_id) not in completed_tasks:
                        completed_tasks.append(str(task_id))

        # 全タスク完了チェック
        if assigned_tasks and len(completed_tasks) == len(assigned_tasks):
            status = "completed"

        # プログレス計算
        if assigned_tasks:
            # 基本は完了タスク数 / 担当タスク数
            # ただし、in_progress がある場合は進行中として加算
            in_progress_count = sum(
                1 for t in tasks
                if t.get("owner") == agent_name and t.get("status") == "in_progress"
            )
            # 完了タスク + (進行中タスク * 0.5) / 担当タスク数
            if in_progress_count > 0:
                progress = int(((len(completed_tasks) + in_progress_count * 0.5) / len(assigned_tasks)) * 100)
            else:
                progress = int((len(completed_tasks) / len(assigned_tasks)) * 100)
        else:
            # タスクがない場合はステータスに応じたプログレス
            if status == "working":
                progress = 50  # 作業中は 50%
            elif status == "active":
                progress = 25  # アクティブは 25%
            elif status == "completed":
                progress = 100
            else:
                progress = 0  # アイドルは 0%

        # 最終活動時刻が未設定の場合
        if not last_activity_at:
            last_activity_at = now

        return {
            "agentId": agent_name,
            "name": agent_name,
            "status": status,
            "progress": progress,
            "model": "unknown",  # TODO: config から取得
            "color": "#3b82f6",  # デフォルト色
            "lastActivityAt": last_activity_at,
            "currentTaskId": current_task_id,
            "currentTaskSubject": current_task_subject,
            "assignedTasks": assigned_tasks,
            "completedTasks": completed_tasks,
            "touchedFiles": [],  # TODO: セッションログから抽出
        }

    def _get_status_color(self, status: str) -> str:
        """ステータスに応じた色を返します。

        Args:
            status: ステータス文字列

        Returns:
            カラーコード（16進数）

        """
        color_map = {
            "idle": "#f59e0b",      # 黄色
            "active": "#10b981",    # 緑色
            "working": "#3b82f6",   # 青色
            "completed": "#22c55e", # 深い緑色
            "error": "#ef4444",     # 赤色
        }
        return color_map.get(status, "#6b7280")  # デフォルトは灰色

    def _get_status_icon(self, status: str) -> str:
        """ステータスに応じたアイコンを返します。

        Args:
            status: ステータス文字列

        Returns:
            アイコン絵文字

        """
        icon_map = {
            "idle": "💤",
            "active": "🟢",
            "working": "🔵",
            "completed": "✅",
            "error": "❌",
        }
        return icon_map.get(status, "❓")
