"""Agent Teams Dashboard バックエンドの設定モジュール。

環境変数からサーバー設定、Claude ディレクトリパス、CORS 設定を読み込み、
Pydantic Settings を使用して型安全な設定管理を提供します。

"""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定を管理するクラス。

    サーバーのホスト・ポート、Claude ディレクトリパス、CORS 許可オリジンを定義します。
    環境変数プレフィックス 'DASHBOARD_' で上書き可能です。


    """

    # Server settings
    host: str = "127.0.0.1"
    port: int = 8000
    debug: bool = True

    # Claude directory paths
    claude_dir: Path = Path.home() / ".claude"
    teams_dir: Path = Path.home() / ".claude" / "teams"
    tasks_dir: Path = Path.home() / ".claude" / "tasks"

    # CORS settings
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "*"]

    model_config = {"env_prefix": "DASHBOARD_"}


settings = Settings()
