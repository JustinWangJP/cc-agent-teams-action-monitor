"""MessageParser のユニットテスト."""

from app.services.message_parser import (
    MessageParser,
    MessageType,
    parse_structured_message,
)


class TestMessageParser:
    """MessageParser クラスのテストスイート."""

    def test_parse_task_assignment(self):
        """タスク割り当てメッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "task_assignment", "taskId": "1", "subject": "API実装"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.TASK_ASSIGNMENT
        assert result.summary == "タスク #1: API実装"
        assert result.extra["taskId"] == "1"
        assert result.extra["subject"] == "API実装"

    def test_parse_task_assignment_without_subject(self):
        """サブジェクトなしのタスク割り当てメッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "task_assignment", "taskId": "5"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.TASK_ASSIGNMENT
        assert result.summary == "タスク #5 割り当て"
        assert result.extra["taskId"] == "5"

    def test_parse_task_completed(self):
        """タスク完了メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "task_completed", "taskId": "1", "result": "success"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.TASK_COMPLETED
        assert result.summary == "タスク #1 完了"
        assert result.extra["taskId"] == "1"
        assert result.extra["result"] == "success"

    def test_parse_idle_notification_with_reason(self):
        """理由付きアイドル通知メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "idle_notification", "idleReason": "入力待機中"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.IDLE_NOTIFICATION
        assert result.summary == "アイドル通知: 入力待機中"
        assert result.extra["idleReason"] == "入力待機中"

    def test_parse_idle_notification_without_reason(self):
        """理由なしのアイドル通知メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "idle_notification", "summary": "待機中"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.IDLE_NOTIFICATION
        assert result.summary == "待機中"

    def test_parse_shutdown_request_with_reason(self):
        """理由付きシャットダウン要求メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "shutdown_request", "reason": "タスク完了"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.SHUTDOWN_REQUEST
        assert result.summary == "シャットダウン要求: タスク完了"
        assert result.extra["reason"] == "タスク完了"

    def test_parse_shutdown_request_without_reason(self):
        """理由なしのシャットダウン要求メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "shutdown_request"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.SHUTDOWN_REQUEST
        assert result.summary == "シャットダウン要求"

    def test_parse_shutdown_response_approved(self):
        """シャットダウン承認メッセージのパースをテストします."""
        parser = MessageParser()
        text = (
            '{"type": "shutdown_response", "approve": true, "content": "了解しました"}'
        )

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.SHUTDOWN_RESPONSE
        assert result.summary == "シャットダウン応答"
        assert result.extra["approve"] is True
        assert result.extra["promptText"] == "了解しました"

    def test_parse_shutdown_response_rejected(self):
        """シャットダウン拒否メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "shutdown_response", "approve": false}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.SHUTDOWN_RESPONSE
        assert result.summary == "シャットダウン拒否"
        assert result.extra["approve"] is False

    def test_parse_plan_approval_request(self):
        """プラン承認要求メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "plan_approval_request", "plan": "実装計画..."}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.PLAN_APPROVAL_REQUEST
        assert result.summary == "プラン承認要求"
        assert result.extra["plan"] == "実装計画..."

    def test_parse_plan_approval_response_approved(self):
        """プラン承認メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "plan_approval_response", "approve": true}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.PLAN_APPROVAL_RESPONSE
        assert result.summary == "プラン承認"
        assert result.extra["approve"] is True

    def test_parse_plan_approval_response_rejected(self):
        """プラン却下メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "plan_approval_response", "approve": false, "feedback": "修正が必要"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.PLAN_APPROVAL_RESPONSE
        assert result.summary == "プラン却下"
        assert result.extra["approve"] is False
        assert result.extra["feedback"] == "修正が必要"

    def test_parse_file_change_single(self):
        """単一ファイル変更メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "file_change", "files": ["/path/to/file.py"], "operation": "modified"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.FILE_CHANGE
        assert result.summary == "ファイルmodified: /path/to/file.py"
        assert result.extra["files"] == ["/path/to/file.py"]
        assert result.extra["operation"] == "modified"
        assert result.extra["fileCount"] == 1

    def test_parse_file_change_multiple(self):
        """複数ファイル変更メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "file_change", "files": ["/path/a.py", "/path/b.py"], "operation": "created"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.FILE_CHANGE
        assert result.summary == "2ファイルcreated"
        assert result.extra["files"] == ["/path/a.py", "/path/b.py"]
        assert result.extra["operation"] == "created"
        assert result.extra["fileCount"] == 2

    def test_parse_file_change_empty(self):
        """空ファイル変更メッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "file_change", "files": [], "operation": "deleted"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.FILE_CHANGE
        assert result.summary == "ファイルdeleted"
        assert result.extra["files"] == []
        assert result.extra["fileCount"] == 0

    def test_parse_error_with_type(self):
        """エラータイプ付きエラーメッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "error", "errorType": "ValidationError", "errorMessage": "Invalid input"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.ERROR
        assert result.summary == "エラー: ValidationError"
        assert result.extra["errorType"] == "ValidationError"
        assert result.extra["errorMessage"] == "Invalid input"

    def test_parse_error_with_message_only(self):
        """エラーメッセージのみのエラーパースをテストします."""
        parser = MessageParser()
        text = '{"type": "error", "errorMessage": "Something went wrong"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.ERROR
        assert result.summary == "エラー: Something went wrong..."
        assert result.extra["errorMessage"] == "Something went wrong"

    def test_parse_error_with_context(self):
        """コンテキスト付きエラーメッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "error", "errorType": "RuntimeError", "context": {"file": "app.py", "line": 42}}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.ERROR
        assert result.extra["context"] == {"file": "app.py", "line": 42}

    def test_parse_error_minimal(self):
        """最小限のエラーメッセージのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "error"}'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.ERROR
        assert result.summary == "エラー発生"

    def test_parse_invalid_json(self):
        """不正なJSONのパースをテストします."""
        parser = MessageParser()
        text = "Not a JSON at all"

        result = parser.parse(text)

        assert result is None

    def test_parse_unknown_type(self):
        """不明なタイプのパースをテストします."""
        parser = MessageParser()
        text = '{"type": "unknown_type"}'

        result = parser.parse(text)

        assert result is None

    def test_parse_missing_type(self):
        """タイプなしのパースをテストします."""
        parser = MessageParser()
        text = '{"data": "value"}'

        result = parser.parse(text)

        assert result is None

    def test_parse_empty_string(self):
        """空文字列のパースをテストします."""
        parser = MessageParser()
        result = parser.parse("")
        assert result is None

    def test_parse_none(self):
        """Noneのパースをテストします."""
        parser = MessageParser()
        result = parser.parse(None)
        assert result is None

    def test_parse_with_json_code_block(self):
        """```jsonコードブロック内のメッセージパースをテストします."""
        parser = MessageParser()
        text = '```json\n{"type": "task_assignment", "taskId": "1"}\n```'

        result = parser.parse(text)

        assert result is not None
        assert result.type == MessageType.TASK_ASSIGNMENT

    def test_parsed_message_to_dict(self):
        """ParsedMessageのto_dictメソッドをテストします."""
        parser = MessageParser()
        text = '{"type": "task_assignment", "taskId": "1", "subject": "Test"}'

        result = parser.parse(text)
        result_dict = result.to_dict()

        assert result_dict["type"] == "task_assignment"
        assert result_dict["summary"] == "タスク #1: Test"
        assert result_dict["taskId"] == "1"
        assert result_dict["subject"] == "Test"


class TestParseStructuredMessageHelper:
    """parse_structured_message ヘルパー関数のテスト."""

    def test_parse_returns_dict(self):
        """ヘルパー関数が辞書を返すことをテストします."""
        text = '{"type": "task_assignment", "taskId": "1"}'
        result = parse_structured_message(text)

        assert isinstance(result, dict)
        assert result["type"] == "task_assignment"
        assert result["summary"] == "タスク #1 割り当て"

    def test_parse_returns_none_on_invalid(self):
        """ヘルパー関数が不正な入力でNoneを返すことをテストします."""
        result = parse_structured_message("not json")
        assert result is None
