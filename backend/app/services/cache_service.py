"""データキャッシュサービス。

ファイルシステムアクセスを削減するためのメモリキャッシュを提供します。
TTL（Time To Live）による自動有効期限切れと、手動無効化をサポートします。

"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


class CacheEntry:
    """キャッシュエントリ。

    値と有効期限を保持します。

    Attributes:
        value: キャッシュされた値
        expires_at: 有効期限切れ時刻
    """

    def __init__(self, value: Any, ttl_seconds: int):
        """キャッシュエントリを初期化します。

        指定された値とTTLから有効期限を計算して保存します。

        Args:
            value: キャッシュする値
            ttl_seconds: 有効期限（秒）


        """
        self.value = value
        self.expires_at = datetime.now() + timedelta(seconds=ttl_seconds)

    def is_expired(self) -> bool:
        """キャッシュエントリの有効期限が切れているかどうかを判定します。

        現在時刻と有効期限を比較して、期限切れの場合はTrueを返します。

        Returns:
            期限切れの場合はTrue、有効な場合はFalse


        """
        return datetime.now() > self.expires_at


class TeamCache:
    """チーム単位のキャッシュ。

    チーム設定とインボックスデータをキャッシュします。

    Attributes:
        team_name: チーム名
        config: チーム設定キャッシュエントリ
        inboxes: インボックス辞書 {agent_name: CacheEntry}
    """

    def __init__(self, team_name: str, config_ttl: int = 30, inbox_ttl: int = 60):
        """チームキャッシュを初期化します。

        指定されたチーム名でキャッシュを作成し、設定用とインボックス用の
        TTLを個別に設定可能です。

        Args:
            team_name: キャッシュ対象のチーム名
            config_ttl: チーム設定のTTL（秒）。デフォルト30秒
            inbox_ttl: インボックスのTTL（秒）。デフォルト60秒


        """
        self.team_name = team_name
        self.config_ttl = config_ttl
        self.inbox_ttl = inbox_ttl
        self.config: Optional[CacheEntry] = None
        self.inboxes: dict[str, CacheEntry] = {}


class CacheService:
    """データキャッシュサービス。

    チーム設定、インボックスデータのメモリキャッシュを管理します。
    TTLによる自動有効期限切れと、ファイル変更通知による無効化をサポートします。

    使用例:
        ```python
        cache = CacheService()

        # チーム設定を取得（キャッシュがあればキャッシュを返す）
        config = await cache.get_team_config("my-team")

        # インボックスを取得
        inboxes = await cache.get_team_inboxes("my-team")

        # キャッシュを無効化
        cache.invalidate_team_config("my-team")
        cache.invalidate_team_inbox("my-team", "agent-name")
        ```
    """

    def __init__(
        self,
        config_ttl: int = 30,
        inbox_ttl: int = 60,
        cleanup_interval: int = 300,
    ):
        """キャッシュサービスを初期化します。

        Args:
            config_ttl: チーム設定のTTL（秒）。デフォルト30秒
            inbox_ttl: インボックスのTTL（秒）。デフォルト60秒
            cleanup_interval: 期限切れキャッシュのクリーンアップ間隔（秒）。デフォルト5分
        """
        self.config_ttl = config_ttl
        self.inbox_ttl = inbox_ttl
        self.cleanup_interval = cleanup_interval
        self._teams: dict[str, TeamCache] = {}
        self._cleanup_task: Optional[asyncio.Task] = None

    async def start(self):
        """キャッシュサービスを開始します。

        定期的なクリーンアップタスクを開始します。
        アプリケーション起動時に呼び出してください。

        """
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info(
            f"CacheService started (config_ttl={self.config_ttl}s, "
            f"inbox_ttl={self.inbox_ttl}s, cleanup_interval={self.cleanup_interval}s)"
        )

    async def stop(self):
        """キャッシュサービスを停止します。

        クリーンアップタスクを停止し、全キャッシュをクリアします。
        アプリケーション終了時に呼び出してください。

        """
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        self._teams.clear()
        logger.info("CacheService stopped")

    async def _cleanup_loop(self):
        """定期的に期限切れキャッシュをクリーンアップする非同期ループ。

        cleanup_interval 間隔で _cleanup_expired を呼び出し、
        メモリ使用量を最適化します。キャンセルされるまで継続します。


        """
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")

    def _cleanup_expired(self):
        """期限切れのキャッシュエントリを削除してメモリを解放します。

        全チームの設定キャッシュとインボックスキャッシュを走査し、
        is_expired() が True を返すエントリを削除します。
        また、空になったチームキャッシュも削除します。


        """
        now = datetime.now()
        removed_count = 0

        teams_to_remove = []
        for team_name, team_cache in self._teams.items():
            # 期限切れの設定を削除
            if team_cache.config and team_cache.config.is_expired():
                team_cache.config = None
                removed_count += 1

            # 期限切れのインボックスを削除
            inboxes_to_remove = []
            for agent_name, entry in team_cache.inboxes.items():
                if entry.is_expired():
                    inboxes_to_remove.append(agent_name)
                    removed_count += 1

            for agent_name in inboxes_to_remove:
                del team_cache.inboxes[agent_name]

            # 空のチームキャッシュを削除
            if team_cache.config is None and not team_cache.inboxes:
                teams_to_remove.append(team_name)

        for team_name in teams_to_remove:
            del self._teams[team_name]

        if removed_count > 0:
            logger.debug(f"Cleaned up {removed_count} expired cache entries")

    def _get_or_create_team_cache(self, team_name: str) -> TeamCache:
        """チームキャッシュを取得、存在しない場合は新規作成します。

        指定されたチーム名の TeamCache インスタンスを内部辞書から検索し、
        見つからない場合は新しく作成して登録します。

        Args:
            team_name: 取得または作成するチーム名

        Returns:
            指定されたチームの TeamCache インスタンス


        """
        if team_name not in self._teams:
            self._teams[team_name] = TeamCache(
                team_name=team_name,
                config_ttl=self.config_ttl,
                inbox_ttl=self.inbox_ttl,
            )
        return self._teams[team_name]

    async def get_team_config(self, team_dir: Path, team_name: str) -> Optional[dict]:
        """チーム設定を取得します。

        キャッシュが有効な場合はキャッシュを返し、それ以外はファイルから読み込みます。

        Args:
            team_dir: チームディレクトリのパス
            team_name: チーム名

        Returns:
            チーム設定辞書、ファイルが存在しない場合はNone
        """
        team_cache = self._get_or_create_team_cache(team_name)

        # キャッシュヒット
        if team_cache.config and not team_cache.config.is_expired():
            logger.debug(f"Cache hit: config for team '{team_name}'")
            return team_cache.config.value

        # キャッシュミス - ファイルから読み込み
        config_file = team_dir / "config.json"
        if not config_file.exists():
            return None

        try:
            with open(config_file, "r", encoding="utf-8") as f:
                config_data = json.load(f)

            # キャッシュに保存
            team_cache.config = CacheEntry(config_data, self.config_ttl)
            logger.debug(f"Cache miss: loaded config for team '{team_name}'")
            return config_data

        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Failed to read config file {config_file}: {e}")
            return None

    async def get_team_inboxes(self, team_dir: Path, team_name: str) -> dict[str, list]:
        """チームの全インボックスを取得します。

        キャッシュが有効な場合はキャッシュを返し、それ以外はファイルから読み込みます。

        Args:
            team_dir: チームディレクトリのパス
            team_name: チーム名

        Returns:
            エージェント名をキー、メッセージリストを値とする辞書
        """
        team_cache = self._get_or_create_team_cache(team_name)
        inboxes_dir = team_dir / "inboxes"

        if not inboxes_dir.exists():
            return {}

        # キャッシュから有効なエントリを収集
        cached_inboxes = {}
        missing_agents = []

        for inbox_file in inboxes_dir.glob("*.json"):
            agent_name = inbox_file.stem

            if agent_name in team_cache.inboxes:
                entry = team_cache.inboxes[agent_name]
                if not entry.is_expired():
                    cached_inboxes[agent_name] = entry.value
                else:
                    # 期限切れ - 再読み込みが必要
                    missing_agents.append((agent_name, inbox_file))
                    del team_cache.inboxes[agent_name]
            else:
                # キャッシュ未登録
                missing_agents.append((agent_name, inbox_file))

        # 期限切れ/未キャッシュのファイルを読み込み
        for agent_name, inbox_file in missing_agents:
            try:
                with open(inbox_file, "r", encoding="utf-8") as f:
                    messages = json.load(f)
                    if isinstance(messages, list):
                        team_cache.inboxes[agent_name] = CacheEntry(
                            messages, self.inbox_ttl
                        )
                        cached_inboxes[agent_name] = messages
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Failed to read inbox file {inbox_file}: {e}")

        return cached_inboxes

    def invalidate_team_config(self, team_name: str):
        """チーム設定キャッシュを無効化します。

        FileWatcherService で config.json 変更検知時に呼び出されます。

        Args:
            team_name: チーム名
        """
        if team_name in self._teams and self._teams[team_name].config:
            self._teams[team_name].config = None
            logger.debug(f"Invalidated config cache for team '{team_name}'")

    def invalidate_team_inbox(self, team_name: str, agent_name: str):
        """インボックスキャッシュを無効化します。

        FileWatcherService でインボックスファイル変更検知時に呼び出されます。

        Args:
            team_name: チーム名
            agent_name: エージェント名
        """
        if (
            team_name in self._teams
            and agent_name in self._teams[team_name].inboxes
        ):
            del self._teams[team_name].inboxes[agent_name]
            logger.debug(
                f"Invalidated inbox cache for team '{team_name}', agent '{agent_name}'"
            )

    def invalidate_team(self, team_name: str):
        """チームの全キャッシュを無効化します。

        Args:
            team_name: チーム名
        """
        if team_name in self._teams:
            del self._teams[team_name]
            logger.debug(f"Invalidated all cache for team '{team_name}'")

    def get_stats(self) -> dict[str, Any]:
        """キャッシュ統計情報を取得します。

        モニタリングやデバッグに使用します。

        Returns:
            キャッシュ統計辞書
        """
        team_count = len(self._teams)
        config_count = sum(
            1 for tc in self._teams.values() if tc.config is not None
        )
        inbox_count = sum(len(tc.inboxes) for tc in self._teams.values())

        return {
            "teams": team_count,
            "cached_configs": config_count,
            "cached_inboxes": inbox_count,
            "config_ttl": self.config_ttl,
            "inbox_ttl": self.inbox_ttl,
        }


# グローバルキャッシュインスタンス
_cache_service: Optional[CacheService] = None


def get_cache() -> CacheService:
    """グローバルキャッシュサービスインスタンスを取得します。

    アプリケーション全体で共有されるシングルトンインスタンスを返します。

    Returns:
        CacheService インスタンス

    Raises:
        RuntimeError: キャッシュサービスが初期化されていない場合
    """
    if _cache_service is None:
        raise RuntimeError("CacheService not initialized. Call start_cache_service first.")
    return _cache_service


async def start_cache_service(
    config_ttl: int = 30,
    inbox_ttl: int = 60,
    cleanup_interval: int = 300,
) -> CacheService:
    """キャッシュサービスを開始します。

    アプリケーションの lifespan から呼び出してください。

    Args:
        config_ttl: チーム設定のTTL（秒）
        inbox_ttl: インボックスのTTL（秒）
        cleanup_interval: クリーンアップ間隔（秒）

    Returns:
        CacheService インスタンス
    """
    global _cache_service
    _cache_service = CacheService(
        config_ttl=config_ttl,
        inbox_ttl=inbox_ttl,
        cleanup_interval=cleanup_interval,
    )
    await _cache_service.start()
    return _cache_service


async def stop_cache_service():
    """キャッシュサービスを停止します。

    アプリケーションの lifespan から呼び出してください。

    """
    global _cache_service
    if _cache_service:
        await _cache_service.stop()
        _cache_service = None
