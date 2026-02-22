"""TimelineService のユニットテスト."""
import json
import tempfile
from pathlib import Path

import pytest

from app.services.timeline_service import TimelineService


class TestTimelineService:
    """TimelineService クラスのテストスイート."""

    def test_cwd_to_project_hash(self):
        """cwd から project-hash への変換をテストします."""
        service = TimelineService()

        # 基本的な変換
        cwd = "/Users/test/project"
        result = service._cwd_to_project_hash(cwd)
        assert result == "-Users-test-project"

        # 複雑なパス
        cwd = "/Users/aegeanwang/Coding/workspaces/python/working/cc-agent-teams-action-monitor"
        result = service._cwd_to_project_hash(cwd)
        expected = "-Users-aegeanwang-Coding-workspaces-python-working-cc-agent-teams-action-monitor"
        assert result == expected

    @pytest.mark.asyncio
    async def test_find_session_file(self, tmp_path):
        """セッションファイルの特定をテストします."""
        # テスト用ディレクトリ構造を作成
        teams_dir = tmp_path / "teams"
        teams_dir.mkdir()
        projects_dir = tmp_path / "projects"
        projects_dir.mkdir()

        team_name = "test-team"
        team_dir = teams_dir / team_name
        team_dir.mkdir()

        # config.json を作成
        lead_session_id = "test-session-123"
        cwd = "/Users/test/project"
        project_hash = "-" + cwd.lstrip("/").replace("/", "-")

        config = {
            "leadSessionId": lead_session_id,
            "members": [{"cwd": cwd}]
        }
        config_file = team_dir / "config.json"
        config_file.write_text(json.dumps(config))

        # セッションファイルを作成
        session_file = projects_dir / project_hash / f"{lead_session_id}.jsonl"
        session_file.parent.mkdir(parents=True, exist_ok=True)
        session_file.write_text('{"type": "user", "content": "test"}')

        # テスト実行
        service = TimelineService(claude_dir=tmp_path)
        result = service._find_session_file(team_name)

        assert result is not None
        assert result == session_file

    @pytest.mark.asyncio
    async def test_find_session_file_not_found(self, tmp_path):
        """セッションファイルが見つからない場合をテストします."""
        teams_dir = tmp_path / "teams"
        teams_dir.mkdir()

        team_name = "test-team"
        team_dir = teams_dir / team_name
        team_dir.mkdir()

        # config.json を作成（セッションファイルは作成しない）
        config = {
            "leadSessionId": "non-existent-session",
            "members": [{"cwd": "/Users/test/project"}]
        }
        config_file = team_dir / "config.json"
        config_file.write_text(json.dumps(config))

        # テスト実行
        service = TimelineService(claude_dir=tmp_path)
        result = service._find_session_file(team_name)

        assert result is None

    @pytest.mark.asyncio
    async def test_load_inbox_messages(self, tmp_path):
        """inbox メッセージの読み込みをテストします."""
        # テスト用ディレクトリを作成
        teams_dir = tmp_path / "teams"
        teams_dir.mkdir()

        team_name = "test-team"
        team_dir = teams_dir / team_name
        inbox_dir = team_dir / "inboxes"
        inbox_dir.mkdir(parents=True)

        # inbox ファイルを作成
        inbox_data = {
            "messages": [
                {
                    "content": "Test message",
                    "from": "sender",
                    "timestamp": "2026-02-21T10:00:00Z",
                    "read": True
                }
            ]
        }

        inbox_file = inbox_dir / "recipient.json"
        inbox_file.write_text(json.dumps(inbox_data))

        # テスト実行
        service = TimelineService(claude_dir=tmp_path)
        messages = await service.load_inbox_messages(team_name)

        assert len(messages) == 1
        assert messages[0]["content"] == "Test message"
        assert messages[0]["from_"] == "sender"
        assert messages[0]["to"] == "recipient"
        assert messages[0]["source"] == "inbox"

    @pytest.mark.asyncio
    async def test_load_inbox_messages_array_format(self, tmp_path):
        """inbox メッセージの配列形式読み込みをテストします."""
        # テスト用ディレクトリを作成
        teams_dir = tmp_path / "teams"
        teams_dir.mkdir()

        team_name = "test-team"
        team_dir = teams_dir / team_name
        inbox_dir = team_dir / "inboxes"
        inbox_dir.mkdir(parents=True)

        # inbox ファイルを配列形式で作成（実際の Claude Code 形式）
        inbox_data = [
            {
                "content": "Array format message",
                "from": "sender",
                "timestamp": "2026-02-21T10:00:00Z",
                "read": True
            },
            {
                "content": "Second message",
                "from": "sender2",
                "timestamp": "2026-02-21T10:01:00Z",
                "read": False
            }
        ]

        inbox_file = inbox_dir / "recipient.json"
        inbox_file.write_text(json.dumps(inbox_data))

        # テスト実行
        service = TimelineService(claude_dir=tmp_path)
        messages = await service.load_inbox_messages(team_name)

        assert len(messages) == 2
        assert messages[0]["content"] == "Array format message"
        assert messages[0]["from_"] == "sender"
        assert messages[0]["to"] == "recipient"
        assert messages[0]["source"] == "inbox"
        assert messages[1]["content"] == "Second message"

    @pytest.mark.asyncio
    async def test_load_session_entries(self, tmp_path):
        """セッションログの読み込みをテストします."""
        # テスト用ディレクトリ構造を作成
        teams_dir = tmp_path / "teams"
        teams_dir.mkdir()
        projects_dir = tmp_path / "projects"
        projects_dir.mkdir()

        team_name = "test-team"
        team_dir = teams_dir / team_name
        team_dir.mkdir()

        # config.json を作成
        lead_session_id = "test-session-123"
        cwd = "/Users/test/project"
        project_hash = "-" + cwd.lstrip("/").replace("/", "-")

        config = {
            "leadSessionId": lead_session_id,
            "members": [{"cwd": cwd}]
        }
        config_file = team_dir / "config.json"
        config_file.write_text(json.dumps(config))

        # セッションファイルを作成
        session_file = projects_dir / project_hash / f"{lead_session_id}.jsonl"
        session_file.parent.mkdir(parents=True, exist_ok=True)

        # JSONL 形式で書き込み
        # message オブジェクト付きの正しい形式
        entries = [
            '{"type": "user", "role": "user", "message": {"role": "user", "content": "Hello"}, "timestamp": "2026-02-21T10:00:00Z"}',
            '{"type": "thinking", "thinking": "Let me think", "timestamp": "2026-02-21T10:00:01Z"}',
            '{"type": "tool_use", "name": "read", "input": {"file": "test.py"}, "timestamp": "2026-02-21T10:00:02Z"}',
        ]
        session_file.write_text("\n".join(entries))

        # テスト実行
        service = TimelineService(claude_dir=tmp_path)
        result = await service.load_session_entries(team_name)

        # tool_use はスキップされるため 2 件になる
        assert len(result) == 2
        assert result[0]["parsed_type"] == "user_message"
        assert result[1]["parsed_type"] == "thinking"

    @pytest.mark.asyncio
    async def test_map_inbox_message_with_structured_data(self):
        """構造化メッセージのマッピングをテストします."""
        service = TimelineService()

        msg = {
            "content": '{"type": "task_assignment", "taskId": "1", "subject": "Test task"}',
            "from": "team-lead",
            "timestamp": "2026-02-21T10:00:00Z",
            "read": False
        }

        result = service._map_inbox_message(msg, "backend-developer")

        assert result is not None
        assert result["parsed_type"] == "task_assignment"
        assert result["summary"] == "タスク #1: Test task"
        assert result["color"] == "#3b82f6"

    @pytest.mark.asyncio
    async def test_map_session_entry_user(self):
        """ユーザーエントリのマッピングをテストします."""
        service = TimelineService()

        entry = {
            "type": "user",
            "role": "user",
            "message": {"role": "user", "content": "Hello"},
            "timestamp": "2026-02-21T10:00:00Z"
        }

        result = service._map_session_entry(entry)

        assert result is not None
        assert result["parsed_type"] == "user_message"
        assert result["content"] == "Hello"
        assert result["color"] == "#3b82f6"
        assert result["source"] == "session"

    @pytest.mark.asyncio
    async def test_map_session_entry_thinking(self):
        """思考エントリのマッピングをテストします."""
        service = TimelineService()

        entry = {
            "type": "thinking",
            "thinking": "Let me analyze this...",
            "timestamp": "2026-02-21T10:00:00Z"
        }

        result = service._map_session_entry(entry)

        assert result is not None
        assert result["parsed_type"] == "thinking"
        assert result["content"] == "思考中..."
        assert result["details"]["thinking"] == "Let me analyze this..."
        assert result["color"] == "#9ca3af"

    @pytest.mark.asyncio
    async def test_map_session_entry_tool_use(self):
        """ツール使用エントリはスキップされることをテストします."""
        service = TimelineService()

        entry = {
            "type": "tool_use",
            "name": "read_file",
            "input": {"path": "/path/to/file.py"},
            "timestamp": "2026-02-21T10:00:00Z"
        }

        result = service._map_session_entry(entry)

        # tool_use はスキップされる
        assert result is None

    def test_parse_structured_message_valid(self):
        """有効な構造化メッセージのパースをテストします."""
        service = TimelineService()

        # タスク割り当て
        text = '{"type": "task_assignment", "taskId": "1"}'
        result = service._parse_structured_message(text)

        assert result is not None
        assert result["type"] == "task_assignment"
        assert result["summary"] == "タスク #1 割り当て"

        # タスク完了（taskId 付き）
        text = '{"type": "task_completed", "taskId": "1"}'
        result = service._parse_structured_message(text)

        assert result is not None
        assert result["type"] == "task_completed"
        assert result["summary"] == "タスク #1 完了"

    def test_parse_structured_message_invalid(self):
        """無効な構造化メッセージのパースをテストします."""
        service = TimelineService()

        # 不正な JSON
        text = "Not a JSON"
        result = service._parse_structured_message(text)
        assert result is None

        # 無効なタイプ
        text = '{"type": "invalid_type"}'
        result = service._parse_structured_message(text)
        assert result is None

        # タイプなし
        text = '{"data": "value"}'
        result = service._parse_structured_message(text)
        assert result is None

    def test_parse_structured_message_task_assignment_with_subject(self):
        """タスク割り当ての subject を含むパースをテストします."""
        service = TimelineService()

        text = '{"type": "task_assignment", "taskId": "5", "subject": "API実装"}'
        result = service._parse_structured_message(text)

        assert result is not None
        assert result["type"] == "task_assignment"
        assert result["taskId"] == "5"
        assert result["summary"] == "タスク #5: API実装"

    def test_parse_structured_message_task_completed_with_id(self):
        """タスク完了の taskId を含むパースをテストします."""
        service = TimelineService()

        text = '{"type": "task_completed", "taskId": "5"}'
        result = service._parse_structured_message(text)

        assert result is not None
        assert result["type"] == "task_completed"
        assert result["summary"] == "タスク #5 完了"

    def test_parse_structured_message_idle_notification_with_reason(self):
        """アイドル通知の理由を含むパースをテストします."""
        service = TimelineService()

        text = '{"type": "idle_notification", "idleReason": "入力待機中"}'
        result = service._parse_structured_message(text)

        assert result is not None
        assert result["type"] == "idle_notification"
        assert result["summary"] == "アイドル通知: 入力待機中"

    def test_parse_structured_message_shutdown_request_with_reason(self):
        """シャットダウン要求の理由を含むパースをテストします."""
        service = TimelineService()

        text = '{"type": "shutdown_request", "reason": "タスク完了"}'
        result = service._parse_structured_message(text)

        assert result is not None
        assert result["type"] == "shutdown_request"
        assert result["summary"] == "シャットダウン要求: タスク完了"

    def test_parse_structured_message_shutdown_response_rejected(self):
        """シャットダウン拒否のパースをテストします."""
        service = TimelineService()

        text = '{"type": "shutdown_response", "approve": false}'
        result = service._parse_structured_message(text)

        assert result is not None
        assert result["type"] == "shutdown_response"
        assert result["summary"] == "シャットダウン拒否"

    def test_parse_structured_message_plan_approval_response_rejected(self):
        """プラン却下のパースをテストします."""
        service = TimelineService()

        text = '{"type": "plan_approval_response", "approve": false}'
        result = service._parse_structured_message(text)

        assert result is not None
        assert result["type"] == "plan_approval_response"
        assert result["summary"] == "プラン却下"

    @pytest.mark.skip(reason="UAT 要件：file-history-snapshot はスキップされるため")
    @pytest.mark.asyncio
    async def test_map_session_entry_file_history_snapshot_single(self):
        """ファイル変更履歴（単一ファイル）のマッピングをテストします."""
        service = TimelineService()

        entry = {
            "type": "file-history-snapshot",
            "role": "assistant",
            "message": {"role": "assistant", "model": "claude-opus-4-6"},
            "fileChanges": {
                "/path/to/file.py": {
                    "operation": "modified",
                    "version": 5
                }
            },
            "timestamp": "2026-02-21T10:00:00Z"
        }

        result = service._map_session_entry(entry)

        assert result is not None
        assert result["parsed_type"] == "file_change"
        assert result["content"] == "ファイル変更: /path/to/file.py"
        assert result["color"] == "#0891b2"
        assert result["source"] == "session"
        assert len(result["details"]["files"]) == 1
        assert result["details"]["files"][0]["path"] == "/path/to/file.py"
        assert result["details"]["files"][0]["operation"] == "modified"
        assert result["details"]["files"][0]["version"] == 5

    @pytest.mark.skip(reason="UAT 要件：file-history-snapshot はスキップされるため")
    @pytest.mark.asyncio
    async def test_map_session_entry_file_history_snapshot_multiple(self):
        """ファイル変更履歴（複数ファイル）のマッピングをテストします."""
        service = TimelineService()

        entry = {
            "type": "file-history-snapshot",
            "role": "assistant",
            "message": {"role": "assistant", "model": "claude-opus-4-6"},
            "fileChanges": {
                "/path/to/file1.py": {
                    "operation": "created",
                    "version": 1
                },
                "/path/to/file2.py": {
                    "operation": "read",
                    "version": 2
                },
                "/path/to/file3.py": {
                    "operation": "deleted",
                    "version": 3
                }
            },
            "timestamp": "2026-02-21T10:00:00Z"
        }

        result = service._map_session_entry(entry)

        assert result is not None
        assert result["parsed_type"] == "file_change"
        assert result["content"] == "3 ファイル変更"
        assert result["color"] == "#0891b2"
        assert len(result["details"]["files"]) == 3

        # ファイル情報の検証
        files = result["details"]["files"]
        assert files[0]["path"] == "/path/to/file1.py"
        assert files[0]["operation"] == "created"
        assert files[1]["path"] == "/path/to/file2.py"
        assert files[1]["operation"] == "read"
        assert files[2]["path"] == "/path/to/file3.py"
        assert files[2]["operation"] == "deleted"

    @pytest.mark.skip(reason="UAT 要件：file-history-snapshot はスキップされるため")
    @pytest.mark.asyncio
    async def test_map_session_entry_file_history_snapshot_empty(self):
        """空のファイル変更履歴のマッピングをテストします."""
        service = TimelineService()

        entry = {
            "type": "file-history-snapshot",
            "role": "assistant",
            "message": {"role": "assistant", "model": "claude-opus-4-6"},
            "fileChanges": {},
            "timestamp": "2026-02-21T10:00:00Z"
        }

        result = service._map_session_entry(entry)

        assert result is not None
        assert result["parsed_type"] == "file_change"
        assert result["content"] == "0 ファイル変更"
        assert len(result["details"]["files"]) == 0

    @pytest.mark.asyncio
    async def test_load_session_entries_with_file_history(self, tmp_path):
        """ファイル変更履歴を含むセッションログの読み込みをテストします."""
        # テスト用ディレクトリ構造を作成
        teams_dir = tmp_path / "teams"
        teams_dir.mkdir()
        projects_dir = tmp_path / "projects"
        projects_dir.mkdir()

        team_name = "test-team"
        team_dir = teams_dir / team_name
        team_dir.mkdir()

        # config.json を作成
        lead_session_id = "test-session-123"
        cwd = "/Users/test/project"
        project_hash = "-" + cwd.lstrip("/").replace("/", "-")

        config = {
            "leadSessionId": lead_session_id,
            "members": [{"cwd": cwd}]
        }
        config_file = team_dir / "config.json"
        config_file.write_text(json.dumps(config))

        # セッションファイルを作成
        session_file = projects_dir / project_hash / f"{lead_session_id}.jsonl"
        session_file.parent.mkdir(parents=True, exist_ok=True)

        # JSONL 形式で書き込み（file-history-snapshot を含む）
        # message オブジェクト付きの正しい形式
        entries = [
            '{"type": "user", "role": "user", "message": {"role": "user", "content": "Hello"}, "timestamp": "2026-02-21T10:00:00Z"}',
            '{"type": "file-history-snapshot", "role": "assistant", "message": {"role": "assistant", "model": "claude-opus-4-6"}, "fileChanges": {"/path/to/file.py": {"operation": "modified", "version": 1}}, "timestamp": "2026-02-21T10:00:01Z"}',
            '{"type": "thinking", "thinking": "Let me think", "timestamp": "2026-02-21T10:00:02Z"}',
        ]
        session_file.write_text("\n".join(entries))

        # テスト実行
        service = TimelineService(claude_dir=tmp_path)
        result = await service.load_session_entries(team_name)

        # file-history-snapshot はスキップされるため 2 件になる
        assert len(result) == 2
        assert result[0]["parsed_type"] == "user_message"
        assert result[1]["parsed_type"] == "thinking"

    @pytest.mark.skip(reason="UAT 要件：file_change タイプは削除されるため")
    @pytest.mark.asyncio
    async def test_map_inbox_message_file_change(self):
        """ファイル変更構造化メッセージのマッピングをテストします."""
        service = TimelineService()

        msg = {
            "content": '{"type": "file_change", "files": ["/path/to/file.py"], "operation": "modified"}',
            "from": "agent",
            "timestamp": "2026-02-21T10:00:00Z",
            "read": True
        }

        result = service._map_inbox_message(msg, "recipient")

        assert result is not None
        assert result["parsed_type"] == "file_change"
        assert result["summary"] == "ファイルmodified: /path/to/file.py"
        assert result["color"] == "#0891b2"

    @pytest.mark.asyncio
    async def test_map_inbox_message_error(self):
        """エラー構造化メッセージのマッピングをテストします."""
        service = TimelineService()

        msg = {
            "content": '{"type": "error", "errorType": "ValidationError", "errorMessage": "Invalid input"}',
            "from": "agent",
            "timestamp": "2026-02-21T10:00:00Z",
            "read": True
        }

        result = service._map_inbox_message(msg, "recipient")

        assert result is not None
        assert result["parsed_type"] == "error"
        assert result["summary"] == "エラー: ValidationError"
        assert result["color"] == "#dc2626"

    @pytest.mark.asyncio
    async def test_map_inbox_message_file_change_multiple(self):
        """複数ファイル変更構造化メッセージのマッピングをテストします."""
        service = TimelineService()

        msg = {
            "content": '{"type": "file_change", "files": ["/a.py", "/b.py"], "operation": "created"}',
            "from": "agent",
            "timestamp": "2026-02-21T10:00:00Z",
            "read": True
        }

        result = service._map_inbox_message(msg, "recipient")

        assert result is not None
        assert result["parsed_type"] == "file_change"
        assert result["summary"] == "2ファイルcreated"
        assert result["parsed_data"]["fileCount"] == 2

    @pytest.mark.asyncio
    async def test_load_session_entries_since(self, tmp_path):
        """since パラメータによる差分読み込みをテストします."""
        # テスト用ディレクトリ構造を作成
        teams_dir = tmp_path / "teams"
        teams_dir.mkdir()
        projects_dir = tmp_path / "projects"
        projects_dir.mkdir()

        team_name = "test-team"
        team_dir = teams_dir / team_name
        team_dir.mkdir()

        # config.json を作成
        lead_session_id = "test-session-123"
        cwd = "/Users/test/project"
        project_hash = "-" + cwd.lstrip("/").replace("/", "-")

        config = {
            "leadSessionId": lead_session_id,
            "members": [{"cwd": cwd}]
        }
        config_file = team_dir / "config.json"
        config_file.write_text(json.dumps(config))

        # セッションファイルを作成（複数のタイムスタンプを含む）
        session_file = projects_dir / project_hash / f"{lead_session_id}.jsonl"
        session_file.parent.mkdir(parents=True, exist_ok=True)

        # message オブジェクト付きの正しい形式
        entries = [
            '{"type": "user", "role": "user", "message": {"role": "user", "content": "First"}, "timestamp": "2026-02-21T10:00:00Z"}',
            '{"type": "user", "role": "user", "message": {"role": "user", "content": "Second"}, "timestamp": "2026-02-21T10:00:05Z"}',
            '{"type": "user", "role": "user", "message": {"role": "user", "content": "Third"}, "timestamp": "2026-02-21T10:00:10Z"}',
        ]
        session_file.write_text("\n".join(entries))

        service = TimelineService(claude_dir=tmp_path)

        # since なし：全エントリを取得
        all_entries = await service.load_session_entries_since(team_name)
        assert len(all_entries) == 3

        # since 指定：指定時刻以降のエントリのみを取得
        since_entries = await service.load_session_entries_since(
            team_name,
            since="2026-02-21T10:00:05Z"
        )
        assert len(since_entries) == 1
        assert since_entries[0]["content"] == "Third"

        # 境界値テスト：ちょうど同じタイムスタンプは含まれない
        boundary_entries = await service.load_session_entries_since(
            team_name,
            since="2026-02-21T10:00:10Z"
        )
        assert len(boundary_entries) == 0
