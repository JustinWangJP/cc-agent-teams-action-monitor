"""
FileWatcherService の単体テスト。

ファイル監視サービスの開始・停止、ハンドラーの動作をテストします。

@
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from watchdog.events import FileModifiedEvent, FileCreatedEvent

from app.services.file_watcher import FileWatcherService, ClaudeFileHandler


@pytest.fixture
def file_watcher():
    """FileWatcherService インスタンス"""
    return FileWatcherService()


@pytest.mark.asyncio
async def test_file_watcher_start(file_watcher, tmp_path, monkeypatch):
    """ファイル監視サービスの開始テスト"""
    from app.config import settings

    # テスト用ディレクトリを設定
    test_claude_dir = tmp_path / ".claude"
    test_claude_dir.mkdir(parents=True)

    monkeypatch.setattr(settings, "claude_dir", test_claude_dir)

    # Observer のモック
    with patch("app.services.file_watcher.Observer") as mock_observer_class:
        mock_observer = Mock()
        mock_observer_class.return_value = mock_observer

        watcher = FileWatcherService()
        await watcher.start()

        # schedule と start が呼ばれることを確認
        mock_observer.schedule.assert_called_once()
        mock_observer.start.assert_called_once()


@pytest.mark.asyncio
async def test_file_watcher_stop(file_watcher):
    """ファイル監視サービスの停止テスト"""
    # Observer のモック
    with patch("app.services.file_watcher.Observer") as mock_observer_class:
        mock_observer = Mock()
        mock_observer_class.return_value = mock_observer

        watcher = FileWatcherService()
        # 手動で observer を設定（start を呼ばずにテストするため）
        watcher.observer = mock_observer

        await watcher.stop()

        # stop と join が呼ばれることを確認
        mock_observer.stop.assert_called_once()
        mock_observer.join.assert_called_once()


def test_file_handler_on_modified():
    """ファイル変更イベントの処理テスト"""
    handler = ClaudeFileHandler()

    # JSON ファイルの変更イベント
    event = FileModifiedEvent("/path/to/test.json")
    with patch.object(handler, "_schedule_log") as mock_schedule:
        handler.on_modified(event)
        mock_schedule.assert_called_once_with("/path/to/test.json", "modified")


def test_file_handler_on_modified_directory():
    """ディレクトリ変更イベントは無視されるテスト"""
    handler = ClaudeFileHandler()

    # ディレクトリの変更イベント
    event = FileModifiedEvent("/path/to/directory/")
    event.is_directory = True

    with patch.object(handler, "_schedule_log") as mock_schedule:
        handler.on_modified(event)
        mock_schedule.assert_not_called()


def test_file_handler_on_created():
    """ファイル作成イベントの処理テスト"""
    handler = ClaudeFileHandler()

    # JSON ファイルの作成イベント
    event = FileCreatedEvent("/path/to/test.json")
    with patch.object(handler, "_schedule_log") as mock_schedule:
        handler.on_created(event)
        mock_schedule.assert_called_once_with("/path/to/test.json", "created")


def test_file_handler_on_created_non_json():
    """非JSONファイルは無視されるテスト"""
    handler = ClaudeFileHandler()

    # 非JSON ファイルの作成イベント
    event = FileCreatedEvent("/path/to/test.txt")
    with patch.object(handler, "_schedule_log") as mock_schedule:
        handler.on_created(event)
        mock_schedule.assert_not_called()


@pytest.mark.asyncio
async def test_log_file_change_team_config(tmp_path, caplog):
    """チーム設定変更のログ出力テスト"""
    handler = ClaudeFileHandler()

    # テスト用の config.json を作成
    team_dir = tmp_path / "teams" / "test-team"
    team_dir.mkdir(parents=True)
    config_file = team_dir / "config.json"
    config_file.write_text('{"name": "test-team"}')

    with caplog.at_level("INFO"):
        await handler._log_file_change(str(config_file), "modified")

        # ログメッセージを確認
        assert any("Team config updated" in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_log_file_change_inbox(tmp_path, caplog):
    """インボックス変更のログ出力テスト"""
    handler = ClaudeFileHandler()

    # テスト用のインボックスファイルを作成
    team_dir = tmp_path / "teams" / "test-team" / "inboxes"
    team_dir.mkdir(parents=True)
    inbox_file = team_dir / "agent-1.json"
    inbox_file.write_text("[]")

    with caplog.at_level("INFO"):
        await handler._log_file_change(str(inbox_file), "modified")

        # ログメッセージを確認
        assert any("Inbox updated" in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_log_file_change_task(tmp_path, caplog):
    """タスク変更のログ出力テスト"""
    handler = ClaudeFileHandler()

    # テスト用のタスクファイルを作成
    tasks_dir = tmp_path / "tasks" / "test-team"
    tasks_dir.mkdir(parents=True)
    task_file = tasks_dir / "task-1.json"
    task_file.write_text('{"id": "task-1"}')

    with caplog.at_level("INFO"):
        await handler._log_file_change(str(task_file), "created")

        # ログメッセージを確認
        assert any("Task updated" in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_log_file_change_lock_file_ignored(tmp_path, caplog):
    """.lock ファイルは無視されるテスト"""
    handler = ClaudeFileHandler()

    # テスト用の .lock ファイルを作成
    tasks_dir = tmp_path / "tasks" / "test-team"
    tasks_dir.mkdir(parents=True)
    lock_file = tasks_dir / ".lock"
    lock_file.write_text("")

    with caplog.at_level("INFO"):
        await handler._log_file_change(str(lock_file), "created")

        # ログメッセージに出力されないことを確認
        assert not any("Task updated" in record.message for record in caplog.records)


@pytest.mark.asyncio
async def test_schedule_log_debounce():
    """デバウンス機能のテスト"""
    handler = ClaudeFileHandler()

    # 同じパスで複数回スケジュール
    with patch("app.services.file_watcher.asyncio.get_event_loop") as mock_loop:
        mock_loop_instance = Mock()
        mock_loop.return_value = mock_loop_instance
        mock_task = AsyncMock()
        mock_loop_instance.create_task.return_value = mock_task

        # 1回目
        handler._schedule_log("/path/to/test.json", "modified")
        first_task = handler._debounce_tasks.get("/path/to/test.json")

        # 2回目（同じパス）
        handler._schedule_log("/path/to/test.json", "modified")
        second_task = handler._debounce_tasks.get("/path/to/test.json")

        # タスクが作成されていることを確認
        assert first_task is not None
        assert second_task is not None
        # タスクがキャンセルされていることを確認（2回目で1回目がキャンセルされる）
