"""構造化メッセージパーサー.

エージェント間で送信される構造化メッセージ（JSON-in-JSON）をパースし、
タイプ別に詳細情報を抽出します。

対応するメッセージタイプ:
- task_assignment: タスク割り当て
- task_completed: タスク完了
- idle_notification: アイドル通知
- shutdown_request: シャットダウン要求
- shutdown_response: シャットダウン応答
- plan_approval_request: プラン承認要求
- plan_approval_response: プラン承認応答
- file_change: ファイル変更通知
- error: エラー通知

"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


# メッセージタイプ定義
class MessageType:
    """構造化メッセージタイプの定数定義クラス。

    エージェント間通信で使用されるメッセージタイプの文字列定数を提供します。
    タスク管理、シャットダウン、プラン承認などのプロトコルメッセージを定義します。

    """

    TASK_ASSIGNMENT = "task_assignment"
    TASK_COMPLETED = "task_completed"
    IDLE_NOTIFICATION = "idle_notification"
    SHUTDOWN_REQUEST = "shutdown_request"
    SHUTDOWN_RESPONSE = "shutdown_response"
    PLAN_APPROVAL_REQUEST = "plan_approval_request"
    PLAN_APPROVAL_RESPONSE = "plan_approval_response"
    FILE_CHANGE = "file_change"
    ERROR = "error"


# 有効なメッセージタイプセット
VALID_MESSAGE_TYPES = {
    MessageType.TASK_ASSIGNMENT,
    MessageType.TASK_COMPLETED,
    MessageType.IDLE_NOTIFICATION,
    MessageType.SHUTDOWN_REQUEST,
    MessageType.SHUTDOWN_RESPONSE,
    MessageType.PLAN_APPROVAL_REQUEST,
    MessageType.PLAN_APPROVAL_RESPONSE,
    MessageType.FILE_CHANGE,
    MessageType.ERROR,
}


class ParsedMessage:
    """パースされた構造化メッセージ.

    Attributes:
        raw: 生のJSONデータ
        type: メッセージタイプ
        summary: 要約文字列
        extra: タイプ別の追加情報
    """

    def __init__(
        self,
        raw: dict[str, Any],
        msg_type: str,
        summary: str,
        **extra: Any,
    ):
        """パースメッセージを初期化します.

        Args:
            raw: 生のJSONデータ
            msg_type: メッセージタイプ
            summary: 要約文字列
            **extra: タイプ別の追加情報
        """
        self.raw = raw
        self.type = msg_type
        self.summary = summary
        self.extra = extra

    def to_dict(self) -> dict[str, Any]:
        """辞書形式に変換します.

        Returns:
            パース結果を含む辞書
        """
        result = {
            "type": self.type,
            "summary": self.summary,
            **self.extra,  # extra フィールドを含める（優先）
            **self.raw,  # 元データを含める（重複時はextraが優先）
        }
        return result


class MessageParser:
    """構造化メッセージをパースするパーサークラス。

    JSON-in-JSON 形式のエージェント間メッセージを解析し、タイプ別に適切な
    ParsedMessage オブジェクトに変換します。タスク割り当て、シャットダウン要求、
    プラン承認など、各種プロトコルメッセージの解析をサポートします。

    """

    def parse(self, text: str) -> Optional[ParsedMessage]:
        """テキストから構造化メッセージをパースします.

        Args:
            text: メッセージテキスト

        Returns:
            パースされたメッセージ（失敗時は None）

        """
        if not text or not isinstance(text, str):
            return None

        text = text.strip()

        # JSON テキストの抽出を試行（```json ブロック内など）
        json_start = text.find("{")
        json_end = text.rfind("}")

        if json_start == -1 or json_end == -1 or json_start >= json_end:
            return None

        try:
            json_str = text[json_start : json_end + 1]
            data = json.loads(json_str)

            msg_type = data.get("type")
            if not msg_type:
                return None

            if msg_type not in VALID_MESSAGE_TYPES:
                logger.debug(f"Unknown message type: {msg_type}")
                return None

            # タイプ別のパース処理
            if msg_type == MessageType.TASK_ASSIGNMENT:
                return self._parse_task_assignment(data)
            elif msg_type == MessageType.TASK_COMPLETED:
                return self._parse_task_completed(data)
            elif msg_type == MessageType.IDLE_NOTIFICATION:
                return self._parse_idle_notification(data)
            elif msg_type == MessageType.SHUTDOWN_REQUEST:
                return self._parse_shutdown_request(data)
            elif msg_type == MessageType.SHUTDOWN_RESPONSE:
                return self._parse_shutdown_response(data)
            elif msg_type == MessageType.PLAN_APPROVAL_REQUEST:
                return self._parse_plan_approval_request(data)
            elif msg_type == MessageType.PLAN_APPROVAL_RESPONSE:
                return self._parse_plan_approval_response(data)
            elif msg_type == MessageType.FILE_CHANGE:
                return self._parse_file_change(data)
            elif msg_type == MessageType.ERROR:
                return self._parse_error(data)

            return None

        except (json.JSONDecodeError, ValueError) as e:
            logger.debug(f"Failed to parse structured message: {e}")
            return None

    def _parse_task_assignment(self, data: dict) -> ParsedMessage:
        """タスク割り当てメッセージをパースします.

        Args:
            data: JSON データ

        Returns:
            パースされたメッセージ

        """
        task_id = data.get("taskId", "")
        subject = data.get("subject", "")
        description = data.get("description", "")

        if task_id and subject:
            summary = f"タスク #{task_id}: {subject}"
        elif task_id:
            summary = f"タスク #{task_id} 割り当て"
        else:
            summary = "タスク割り当て"

        return ParsedMessage(
            raw=data,
            msg_type=MessageType.TASK_ASSIGNMENT,
            summary=summary,
            taskId=task_id,
            subject=subject,
            description=description,
        )

    def _parse_task_completed(self, data: dict) -> ParsedMessage:
        """タスク完了メッセージをパースします.

        Args:
            data: JSON データ

        Returns:
            パースされたメッセージ

        """
        task_id = data.get("taskId", "")
        result = data.get("result", "")

        if task_id:
            summary = f"タスク #{task_id} 完了"
        else:
            summary = "タスク完了"

        return ParsedMessage(
            raw=data,
            msg_type=MessageType.TASK_COMPLETED,
            summary=summary,
            taskId=task_id,
            result=result,
        )

    def _parse_idle_notification(self, data: dict) -> ParsedMessage:
        """アイドル通知メッセージをパースします.

        Args:
            data: JSON データ

        Returns:
            パースされたメッセージ

        """
        idle_reason = data.get("idleReason", "")
        summary_text = data.get("summary", "アイドル中")

        if idle_reason:
            summary = f"アイドル通知: {idle_reason}"
        else:
            summary = summary_text

        return ParsedMessage(
            raw=data,
            msg_type=MessageType.IDLE_NOTIFICATION,
            summary=summary,
            idleReason=idle_reason,
        )

    def _parse_shutdown_request(self, data: dict) -> ParsedMessage:
        """シャットダウン要求メッセージをパースします.

        Args:
            data: JSON データ

        Returns:
            パースされたメッセージ

        """
        reason = data.get("reason", "")

        if reason:
            summary = f"シャットダウン要求: {reason}"
        else:
            summary = "シャットダウン要求"

        return ParsedMessage(
            raw=data,
            msg_type=MessageType.SHUTDOWN_REQUEST,
            summary=summary,
            reason=reason,
        )

    def _parse_shutdown_response(self, data: dict) -> ParsedMessage:
        """シャットダウン応答メッセージをパースします.

        Args:
            data: JSON データ

        Returns:
            パースされたメッセージ

        """
        approve = data.get("approve", True)
        prompt_text = data.get("content", "")

        if approve is False:
            summary = "シャットダウン拒否"
        else:
            summary = "シャットダウン応答"

        return ParsedMessage(
            raw=data,
            msg_type=MessageType.SHUTDOWN_RESPONSE,
            summary=summary,
            approve=approve,
            promptText=prompt_text,
        )

    def _parse_plan_approval_request(self, data: dict) -> ParsedMessage:
        """プラン承認要求メッセージをパースします.

        Args:
            data: JSON データ

        Returns:
            パースされたメッセージ

        """
        summary = "プラン承認要求"
        plan_text = data.get("plan", "")

        return ParsedMessage(
            raw=data,
            msg_type=MessageType.PLAN_APPROVAL_REQUEST,
            summary=summary,
            plan=plan_text,
        )

    def _parse_plan_approval_response(self, data: dict) -> ParsedMessage:
        """プラン承認応答メッセージをパースします.

        Args:
            data: JSON データ

        Returns:
            パースされたメッセージ

        """
        approve = data.get("approve", True)
        feedback = data.get("feedback", "")

        if approve is False:
            summary = "プラン却下"
        else:
            summary = "プラン承認"

        return ParsedMessage(
            raw=data,
            msg_type=MessageType.PLAN_APPROVAL_RESPONSE,
            summary=summary,
            approve=approve,
            feedback=feedback,
        )

    def _parse_file_change(self, data: dict) -> ParsedMessage:
        """ファイル変更メッセージをパースします.

        Args:
            data: JSON データ

        Returns:
            パースされたメッセージ

        """
        files = data.get("files", [])
        operation = data.get("operation", "")  # created, modified, deleted

        file_count = len(files) if isinstance(files, list) else 0

        if file_count == 1:
            file_path = files[0] if files else ""
            summary = f"ファイル{operation}: {file_path}"
        elif file_count > 1:
            summary = f"{file_count}ファイル{operation}"
        else:
            summary = f"ファイル{operation}"

        return ParsedMessage(
            raw=data,
            msg_type=MessageType.FILE_CHANGE,
            summary=summary,
            files=files,
            operation=operation,
            fileCount=file_count,
        )

    def _parse_error(self, data: dict) -> ParsedMessage:
        """エラーメッセージをパースします.

        Args:
            data: JSON データ

        Returns:
            パースされたメッセージ

        """
        error_type = data.get("errorType", "")
        error_message = data.get("errorMessage", "")
        context = data.get("context", {})

        if error_type:
            summary = f"エラー: {error_type}"
        elif error_message:
            summary = f"エラー: {error_message[:50]}..."
        else:
            summary = "エラー発生"

        return ParsedMessage(
            raw=data,
            msg_type=MessageType.ERROR,
            summary=summary,
            errorType=error_type,
            errorMessage=error_message,
            context=context,
        )


# グローバルインスタンス
_parser = MessageParser()


def parse_structured_message(text: str) -> Optional[dict]:
    """構造化メッセージをパースして辞書形式で返します.

    これは TimelineService との互換性のためのヘルパー関数です.

    Args:
        text: メッセージテキスト

    Returns:
        パースされた辞書データ（失敗時は None）

    """
    parsed = _parser.parse(text)
    if parsed:
        return parsed.to_dict()
    return None
