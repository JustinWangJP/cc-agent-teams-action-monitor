"""エージェント状態推論サービス.

inbox メッセージとタスクからエージェントの状態を推論します。
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

# 状態定義
AGENT_STATUS = {
    "idle": "待機中",
    "working": "作業中",
    "waiting": "待ち状態",
    "error": "エラー",
    "completed": "完了",
}

# アクティビティ判定の閾値（秒）
IDLE_THRESHOLD_SECONDS = 5 * 60  # 5分
ERROR_THRESHOLD_SECONDS = 30 * 60  # 30分


class AgentStatusService:
    """エージェント状態推論サービス.

    inbox メッセージ、タスク定義、セッションログからエージェントの現在の状態を推論します。

    状態遷移:
        idle → working → waiting → working → completed
                 ↓
                error

    """

    def __init__(self, claude_dir: Optional[Path] = None):
        """エージェント状態推論サービスを初期化します。

        Args:
            claude_dir: Claude ディレクトリのパス。省略時は設定値を使用。

        """
        self.claude_dir = claude_dir or settings.claude_dir

    async def infer_agent_status(
        self,
        agent_name: str,
        messages: list[dict],
        tasks: list[dict],
        session_entries: Optional[list[dict]] = None
    ) -> dict:
        """エージェントの状態を推論します。

        Args:
            agent_name: エージェント名
            messages: inbox メッセージリスト
            tasks: タスクリスト
            session_entries: セッションログエントリリスト（オプション）

        Returns:
            エージェント状態情報の辞書

        """
        # 現在時刻（UTC）
        now = datetime.now(timezone.utc)

        # タスク情報を収集
        task_info = self._collect_task_info(agent_name, tasks)

        # メッセージ情報を収集
        message_info = self._collect_message_info(agent_name, messages)

        # 状態を推論
        status = self._infer_status(
            agent_name,
            task_info,
            message_info,
            now
        )

        # 現在のタスクを推定
        current_task = self._estimate_current_task(
            agent_name,
            task_info,
            message_info
        )

        # プログレスを計算
        progress = self._calculate_progress(
            task_info,
            status
        )

        # セッションログから追加情報を抽出
        session_info = await self._extract_session_info(
            agent_name,
            session_entries or []
        )

        # 最終活動時刻
        last_activity_at = message_info.get("last_activity_at")
        if not last_activity_at:
            last_activity_at = now.isoformat().replace("+00:00", "Z")

        # 色を取得
        color = self._get_status_color(status)

        return {
            "agentId": agent_name,
            "name": agent_name,
            "status": status,
            "progress": progress,
            "model": session_info.get("model", "unknown"),
            "color": color,
            "lastActivityAt": last_activity_at,
            "currentTaskId": current_task.get("id"),
            "currentTaskSubject": current_task.get("subject"),
            "assignedTasks": task_info.get("assigned", []),
            "completedTasks": task_info.get("completed", []),
            "touchedFiles": session_info.get("touched_files", []),
        }

    def _collect_task_info(self, agent_name: str, tasks: list[dict]) -> dict:
        """エージェントに関連するタスク情報を収集します。

        Args:
            agent_name: エージェント名
            tasks: タスクリスト

        Returns:
            タスク情報の辞書

        """
        assigned = []
        completed = []
        in_progress = []
        pending = []
        blocked = []

        for task in tasks:
            owner = task.get("owner")
            if owner != agent_name:
                continue

            task_id = task.get("id")
            if not task_id:
                continue

            task_id_str = str(task_id)
            status_val = task.get("status")

            assigned.append(task_id_str)

            if status_val == "completed":
                completed.append(task_id_str)
            elif status_val == "in_progress":
                in_progress.append(task_id_str)
            elif status_val == "pending":
                pending.append(task_id_str)
            elif status_val == "deleted":
                # 削除されたタスクは完了として扱う
                completed.append(task_id_str)

            # blockedBy 情報を収集
            blocked_by = task.get("blockedBy", [])
            if blocked_by:
                blocked.append({
                    "id": task_id_str,
                    "blocked_by": blocked_by
                })

        return {
            "assigned": assigned,
            "completed": completed,
            "in_progress": in_progress,
            "pending": pending,
            "blocked": blocked,
        }

    def _collect_message_info(self, agent_name: str, messages: list[dict]) -> dict:
        """エージェントに関連するメッセージ情報を収集します。

        Args:
            agent_name: エージェント名
            messages: メッセージリスト

        Returns:
            メッセージ情報の辞書

        """
        latest_message = None
        latest_timestamp = None

        for msg in messages:
            # 送信者または受信者が対象エージェントのメッセージを対象
            if msg.get("to") != agent_name and msg.get("from_") != agent_name:
                continue

            timestamp_str = msg.get("timestamp", "")
            if not timestamp_str:
                continue

            # 最新のメッセージを記録
            if latest_timestamp is None or timestamp_str > latest_timestamp:
                latest_message = msg
                latest_timestamp = timestamp_str

        result = {
            "latest_message": latest_message,
            "last_activity_at": latest_timestamp,
        }

        if latest_message:
            parsed_type = latest_message.get("parsed_type")
            parsed_data = latest_message.get("parsed_data")
            result["parsed_type"] = parsed_type
            result["parsed_data"] = parsed_data

        return result

    def _infer_status(
        self,
        agent_name: str,
        task_info: dict,
        message_info: dict,
        now: datetime
    ) -> str:
        """エージェントの状態を推論します。

        Args:
            agent_name: エージェント名
            task_info: タスク情報
            message_info: メッセージ情報
            now: 現在時刻

        Returns:
            推論された状態文字列

        """
        # 1. メッセージから明示的な状態を判定
        parsed_type = message_info.get("parsed_type")

        if parsed_type == "idle_notification":
            return "idle"

        # 2. タスク状態から判定
        in_progress = task_info.get("in_progress", [])
        blocked = task_info.get("blocked", [])
        assigned = task_info.get("assigned", [])
        completed = task_info.get("completed", [])

        # in_progress タスクがあれば working
        if in_progress:
            # blocked に含まれている場合は waiting
            for blocked_info in blocked:
                if blocked_info.get("id") in in_progress:
                    return "waiting"
            return "working"

        # 全タスク完了
        if assigned and len(completed) == len(assigned):
            return "completed"

        # 3. 最終活動時刻から判定
        last_activity_str = message_info.get("last_activity_at")
        if last_activity_str:
            try:
                # ISO 8601 形式をパース
                if last_activity_str.endswith("Z"):
                    last_activity_str = last_activity_str[:-1] + "+00:00"
                last_activity = datetime.fromisoformat(last_activity_str)
                # タイムゾーン情報がない場合はUTCと仮定
                if last_activity.tzinfo is None:
                    last_activity = last_activity.replace(tzinfo=timezone.utc)

                time_diff = (now - last_activity).total_seconds()

                # 長時間無活動は error 状態
                if time_diff > ERROR_THRESHOLD_SECONDS:
                    return "error"

                # 中時間無活動は idle 状態
                if time_diff > IDLE_THRESHOLD_SECONDS:
                    return "idle"
            except (ValueError, AttributeError):
                logger.warning(f"Failed to parse timestamp: {last_activity_str}")

        # 4. デフォルト状態
        # タスクがある場合は idle（次のタスク待ち）
        if assigned:
            return "idle"

        # タスクがない場合は idle
        return "idle"

    def _estimate_current_task(
        self,
        agent_name: str,
        task_info: dict,
        message_info: dict
    ) -> dict:
        """現在のタスクを推定します。

        Args:
            agent_name: エージェント名
            task_info: タスク情報
            message_info: メッセージ情報

        Returns:
            現在のタスク情報 {"id": str, "subject": str}

        """
        # 1. メッセージからタスク情報を取得
        parsed_data = message_info.get("parsed_data")
        parsed_type = message_info.get("parsed_type")

        if parsed_type == "task_assignment" and parsed_data:
            task_id = parsed_data.get("taskId")
            subject = parsed_data.get("subject")
            if task_id:
                return {"id": str(task_id), "subject": subject}

        # 2. in_progress タスクを取得
        in_progress = task_info.get("in_progress", [])
        if in_progress:
            return {"id": in_progress[0], "subject": None}  # TODO: subjectをtasksから取得

        # 3. pending タスクを取得
        pending = task_info.get("pending", [])
        if pending:
            return {"id": pending[0], "subject": None}

        return {"id": None, "subject": None}

    def _calculate_progress(self, task_info: dict, status: str) -> int:
        """タスク進捗を計算します。

        Args:
            task_info: タスク情報
            status: 現在の状態

        Returns:
            進捗率（0-100）

        """
        assigned = task_info.get("assigned", [])
        completed = task_info.get("completed", [])
        in_progress = task_info.get("in_progress", [])

        if not assigned:
            # タスクがない場合はステータスに応じたプログレス
            progress_map = {
                "working": 50,
                "waiting": 40,
                "idle": 0,
                "error": 0,
                "completed": 100,
            }
            return progress_map.get(status, 0)

        # 基本計算: 完了タスク数 / 担当タスク数
        # 進行中タスクは 0.5 としてカウント
        completed_count = len(completed)
        in_progress_count = len(in_progress)
        total_count = len(assigned)

        if total_count == 0:
            return 0

        progress = int(((completed_count + in_progress_count * 0.5) / total_count) * 100)

        # 状態による補正
        if status == "waiting":
            # 待ち状態は進行中のタスクがあるので、少し進めておく
            progress = min(progress + 10, 90)
        elif status == "error":
            # エラー状態は進捗を減らす（実際の進捗より低く見せる）
            progress = max(progress - 10, 0)

        return min(max(progress, 0), 100)

    async def _extract_session_info(
        self,
        agent_name: str,
        session_entries: list[dict]
    ) -> dict:
        """セッションログから追加情報を抽出します。

        Args:
            agent_name: エージェント名
            session_entries: セッションログエントリリスト

        Returns:
            セッション情報 {"model": str, "touched_files": list}

        """
        model = "unknown"
        touched_files = []

        for entry in session_entries:
            entry_type = entry.get("parsed_type")

            # モデル名の抽出（assistant メッセージ）
            if entry_type == "assistant_message" and model == "unknown":
                details = entry.get("details", {})
                if "model" in details:
                    model = details["model"]

            # ファイル操作の抽出
            if entry_type in ("tool_use", "file_change"):
                details = entry.get("details", {})
                files = details.get("files", [])
                if isinstance(files, list):
                    for file_info in files:
                        file_path = file_info.get("path", "") if isinstance(file_info, dict) else str(file_info)
                        if file_path and file_path not in touched_files:
                            touched_files.append(file_path)

        return {
            "model": model,
            "touched_files": touched_files,
        }

    def _get_status_color(self, status: str) -> str:
        """ステータスに応じた色を返します。

        Args:
            status: ステータス文字列

        Returns:
            カラーコード（16進数）

        """
        color_map = {
            "idle": "#f59e0b",      # 黄色（オレンジ）
            "working": "#3b82f6",   # 青色
            "waiting": "#8b5cf6",   # 紫色（ブロック中）
            "error": "#ef4444",     # 赤色
            "completed": "#22c55e", # 緑色
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
            "working": "🔵",
            "waiting": "⏳",
            "error": "❌",
            "completed": "✅",
        }
        return icon_map.get(status, "❓")

    def get_status_label(self, status: str) -> str:
        """ステータスに応じた日本語ラベルを返します。

        Args:
            status: ステータス文字列

        Returns:
            日本語ラベル

        """
        return AGENT_STATUS.get(status, "不明")
