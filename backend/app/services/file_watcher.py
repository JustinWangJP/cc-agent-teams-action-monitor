"""~/.claude/ ディレクトリを監視するファイル監視サービス。

watchdog ライブラリを使用して Claude ディレクトリ内の JSON ファイル変更を検知し、
WebSocket 経由でフロントエンドにリアルタイム更新を通知します。

"""
import asyncio
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileModifiedEvent, FileCreatedEvent
import json

from app.config import settings
from app.api.routes.websocket import get_manager


class ClaudeFileHandler(FileSystemEventHandler):
    """~/.claude/ ディレクトリ内のファイルイベントを処理するハンドラー。

    JSON ファイルの変更・作成イベントを検知し、デバウンス処理を経て WebSocket で更新を通知します。
    チーム設定、インボックス、タスクの変更をそれぞれ適切なチャンネルに配信します。


    """

    def __init__(self, manager):
        self.manager = manager
        self._debounce_tasks: dict[str, asyncio.Task] = {}

    def on_modified(self, event):
        """ファイル変更イベントを処理します。

        JSON ファイルの変更を検知し、デバウンス付きでブロードキャストを予約します。
        ディレクトリの変更は無視します。


        """
        if not event.is_directory and event.src_path.endswith(".json"):
            self._schedule_broadcast(event.src_path, "modified")

    def on_created(self, event):
        """ファイル作成イベントを処理します。

        JSON ファイルの作成を検知し、デバウンス付きでブロードキャストを予約します。
        ディレクトリの作成は無視します。


        """
        if not event.is_directory and event.src_path.endswith(".json"):
            self._schedule_broadcast(event.src_path, "created")

    def _schedule_broadcast(self, path: str, event_type: str):
        """デバウンス付きでブロードキャストをスケジュールします。

        500ms のデバウンスを適用し、同一パスの連続イベントを抑制します。
        既存のタスクがある場合はキャンセルして新しく作成します。


        """
        # Cancel existing task if any
        if path in self._debounce_tasks:
            self._debounce_tasks[path].cancel()

        # Create new task with debounce
        async def broadcast_after_debounce():
            await asyncio.sleep(0.5)  # 500ms debounce
            await self._handle_file_change(path, event_type)

        try:
            loop = asyncio.get_event_loop()
            self._debounce_tasks[path] = loop.create_task(broadcast_after_debounce())
        except RuntimeError:
            pass  # No event loop running

    async def _handle_file_change(self, path: str, event_type: str):
        """ファイル変更を処理し、適切なチャンネルに更新をブロードキャストします。

        パスを解析して変更の種類を判定し、チーム設定、インボックス、タスクの
        いずれかの更新として WebSocket に通知します。


        """
        path_obj = Path(path)

        try:
            # Determine the type of change
            if "/teams/" in path and "config.json" in path:
                await self._broadcast_team_config(path_obj, event_type)
            elif "/teams/" in path and "/inboxes/" in path:
                await self._broadcast_inbox_update(path_obj, event_type)
            elif "/tasks/" in path and path.endswith(".json"):
                await self._broadcast_task_update(path_obj, event_type)
        except Exception as e:
            print(f"Error handling file change: {e}")

    async def _broadcast_team_config(self, path: Path, event_type: str):
        """チーム設定の更新を dashboard チャンネルにブロードキャストします。

        config.json の内容を読み込み、チーム名と共に team_update タイプの
        メッセージとして送信します。


        """
        team_name = path.parent.name
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            await self.manager.broadcast_team_update(team_name, {
                "event": event_type,
                "config": data
            })
        except (json.JSONDecodeError, FileNotFoundError):
            pass

    async def _broadcast_inbox_update(self, path: Path, event_type: str):
        """インボックスメッセージの更新を dashboard チャンネルにブロードキャストします。

        エージェント別インボックスファイルの内容を読み込み、チーム名、エージェント名、
        メッセージリストと共に inbox_update タイプとして送信します。


        """
        # Path structure: ~/.claude/teams/{team_name}/inboxes/{agent_name}.json
        parts = path.parts
        try:
            teams_idx = parts.index("teams")
            team_name = parts[teams_idx + 1]
            agent_name = path.stem

            with open(path, "r", encoding="utf-8") as f:
                messages = json.load(f)

            await self.manager.broadcast("dashboard", {
                "type": "inbox_update",
                "team": team_name,
                "agent": agent_name,
                "event": event_type,
                "messages": messages
            })
        except (ValueError, json.JSONDecodeError, FileNotFoundError):
            pass

    async def _broadcast_task_update(self, path: Path, event_type: str):
        """タスクの更新を tasks チャンネルにブロードキャストします。

        タスクファイルの内容を読み込み、チーム名、タスクID、タスクデータと共に
        task_update タイプとして送信します。.lock ファイルは無視します。


        """
        # Path structure: ~/.claude/tasks/{team_name}/{task_id}.json
        parts = path.parts
        try:
            tasks_idx = parts.index("tasks")
            team_name = parts[tasks_idx + 1]
            task_id = path.stem

            if task_id == ".lock":
                return

            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            await self.manager.broadcast_task_update(team_name, task_id, {
                "event": event_type,
                "task": data
            })
        except (ValueError, json.JSONDecodeError, FileNotFoundError):
            pass


class FileWatcherService:
    """~/.claude/ ディレクトリの変更を監視するサービスクラス。

    watchdog.Observer を使用して Claude ディレクトリを再帰的に監視し、
    ファイル変更を検知した際に WebSocket 経由で通知を行います。


    """

    def __init__(self):
        self.observer = Observer()
        self.manager = get_manager()

    async def start(self):
        """ファイル監視を開始します。

        ClaudeFileHandler を作成し、~/.claude/ ディレクトリに対して再帰的な監視を設定します。
        アプリケーション起動時に lifespan から呼び出されます。


        """
        handler = ClaudeFileHandler(self.manager)
        self.observer.schedule(handler, str(settings.claude_dir), recursive=True)
        self.observer.start()
        print(f"File watcher started on {settings.claude_dir}")

    async def stop(self):
        """ファイル監視を停止します。

        Observer を停止し、監視スレッドの終了を待機します。
        アプリケーション終了時に lifespan から呼び出されます。


        """
        self.observer.stop()
        self.observer.join()
        print("File watcher stopped")
