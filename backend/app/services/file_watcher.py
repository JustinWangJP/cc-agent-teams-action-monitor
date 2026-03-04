"""~/.claude/ ディレクトリを監視するファイル監視サービス。

watchdog ライブラリを使用して Claude ディレクトリ内の JSON ファイル変更を検知し、
ログ出力とキャッシュ無効化を行います。

"""

import asyncio
import logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from app.config import settings
from app.services.cache_service import get_cache

logger = logging.getLogger(__name__)


class ClaudeFileHandler(FileSystemEventHandler):
    """~/.claude/ ディレクトリ内のファイルイベントを処理するハンドラー。

    JSON ファイルの変更・作成イベントを検知し、ログ出力を行います。
    デバウンス処理により連続イベントを抑制します。


    """

    def __init__(self):
        """ファイルイベントハンドラーを初期化します。

        デバウンスタスクを管理するための辞書を初期化します。
        各ファイルパスに対して最大1つの保留中タスクを保持します。


        """
        self._debounce_tasks: dict[str, asyncio.Task] = {}

    def on_modified(self, event):
        """ファイル変更イベントを処理します。

        JSON ファイルの変更を検知し、ログ出力を予約します。
        ディレクトリの変更は無視します。

        """
        if not event.is_directory and event.src_path.endswith(".json"):
            self._schedule_log(event.src_path, "modified")

    def on_created(self, event):
        """ファイル作成イベントを処理します。

        JSON ファイルの作成を検知し、ログ出力を予約します。
        ディレクトリの作成は無視します。

        """
        if not event.is_directory and event.src_path.endswith(".json"):
            self._schedule_log(event.src_path, "created")

    def _schedule_log(self, path: str, event_type: str):
        """デバウンス付きでログ出力をスケジュールします。

        500ms のデバウンスを適用し、同一パスの連続イベントを抑制します。
        既存のタスクがある場合はキャンセルして新しく作成します。

        """
        # Cancel existing task if any
        if path in self._debounce_tasks:
            self._debounce_tasks[path].cancel()

        # Create new task with debounce
        async def log_after_debounce():
            """デバウンス後にファイル変更をログ出力する内部関数。

            500ms 待機した後、実際のログ出力とキャッシュ無効化を実行します。
            待機中に同一パスの新しいイベントが発生した場合はキャンセルされます。


            """
            await asyncio.sleep(0.5)  # 500ms debounce
            await self._log_file_change(path, event_type)

        try:
            loop = asyncio.get_event_loop()
            self._debounce_tasks[path] = loop.create_task(log_after_debounce())
        except RuntimeError:
            pass  # No event loop running

    async def _log_file_change(self, path: str, event_type: str):
        """ファイル変更をログ出力し、キャッシュを無効化します。

        パスを解析して変更の種類を判定し、ログに出力します。
        また、キャッシュサービスが有効な場合は該当するキャッシュを無効化します。

        """
        path_obj = Path(path)

        try:
            # Determine the type of change
            if "/teams/" in path and "config.json" in path:
                team_name = path_obj.parent.name
                logger.info(f"Team config updated: {team_name} ({event_type})")
                # キャッシュ無効化
                try:
                    cache = get_cache()
                    cache.invalidate_team_config(team_name)
                except RuntimeError:
                    # キャッシュサービスが初期化されていない場合は無視
                    pass
            elif "/teams/" in path and "/inboxes/" in path:
                # Path structure: ~/.claude/teams/{team_name}/inboxes/{agent_name}.json
                parts = path_obj.parts
                try:
                    teams_idx = parts.index("teams")
                    team_name = parts[teams_idx + 1]
                    agent_name = path_obj.stem
                    logger.info(
                        f"Inbox updated: team={team_name}, agent={agent_name} ({event_type})"
                    )
                    # キャッシュ無効化
                    try:
                        cache = get_cache()
                        cache.invalidate_team_inbox(team_name, agent_name)
                    except RuntimeError:
                        # キャッシュサービスが初期化されていない場合は無視
                        pass
                except (ValueError, IndexError):
                    logger.info(f"Inbox file changed: {path} ({event_type})")
            elif "/tasks/" in path and path.endswith(".json"):
                # Path structure: ~/.claude/tasks/{team_name}/{task_id}.json
                parts = path_obj.parts
                try:
                    tasks_idx = parts.index("tasks")
                    team_name = parts[tasks_idx + 1]
                    task_id = path_obj.stem
                    if task_id != ".lock":
                        logger.info(
                            f"Task updated: team={team_name}, task={task_id} ({event_type})"
                        )
                except (ValueError, IndexError):
                    logger.info(f"Task file changed: {path} ({event_type})")
        except Exception as e:
            logger.error(f"Error handling file change: {e}")


class FileWatcherService:
    """~/.claude/ ディレクトリの変更を監視するサービスクラス。

    watchdog.Observer を使用して Claude ディレクトリを再帰的に監視し、
    ファイル変更を検知した際にログ出力を行います。

    """

    def __init__(self):
        """ファイル監視サービスを初期化します。

        watchdog.Observer インスタンスを作成しますが、
        実際の監視は start() メソッドで開始されます。


        """
        self.observer = Observer()

    async def start(self):
        """ファイル監視を開始します。

        ClaudeFileHandler を作成し、~/.claude/ ディレクトリに対して再帰的な監視を設定します。
        アプリケーション起動時に lifespan から呼び出されます。

        """
        handler = ClaudeFileHandler()
        self.observer.schedule(handler, str(settings.claude_dir), recursive=True)
        self.observer.start()
        logger.info(f"File watcher started on {settings.claude_dir}")

    async def stop(self):
        """ファイル監視を停止します。

        Observer を停止し、監視スレッドの終了を待機します。
        アプリケーション終了時に lifespan から呼び出されます。

        """
        self.observer.stop()
        self.observer.join()
        logger.info("File watcher stopped")
