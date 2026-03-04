"""Agent Teams Dashboard の FastAPI アプリケーションエントリーポイント。

FastAPI アプリケーションの作成、CORS ミドルウェア設定、ルーター登録、
ライフサイクル管理（FileWatcher、CacheService の開始/停止）を行います。

"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import teams, tasks, messages, agents, timeline
from app.services.file_watcher import FileWatcherService
from app.services.cache_service import start_cache_service, stop_cache_service
from app.services.i18n_service import i18n
from app.middleware.language import LanguageMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクルを管理する非同期コンテキストマネージャー。

    起動時に FileWatcher、CacheService を開始し、アプリケーション状態に保存します。
    終了時に各サービスを停止し、リソースを解放します。


    """
    # Startup: Start services
    # I18n サービスの初期化（シングルトンインスタンス作成）
    _ = i18n  # インスタンス化を確実に行う

    watcher = FileWatcherService()
    await watcher.start()
    app.state.watcher = watcher

    # キャッシュサービスを開始
    cache = await start_cache_service(
        config_ttl=30,  # チーム設定キャッシュ: 30秒
        inbox_ttl=60,  # インボックスキャッシュ: 60秒
        cleanup_interval=300,  # クリーンアップ: 5分
    )
    app.state.cache = cache

    yield

    # Shutdown: Stop services
    await watcher.stop()
    await stop_cache_service()


app = FastAPI(
    title="Agent Teams Dashboard API",
    description="Real-time monitoring API for Claude Code Agent Teams",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Language middleware (Accept-Language ヘッダー解析)
app.add_middleware(LanguageMiddleware)

# Include routers
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(messages.router, prefix="/api", tags=["messages"])
app.include_router(agents.router, prefix="/api/teams", tags=["agents"])
app.include_router(timeline.router, tags=["timeline"])


@app.get("/api/health")
async def health_check():
    """サーバーのヘルスチェック用エンドポイント。

    サーバーが正常に動作しているか確認するため、ステータスとバージョンを返します。
    ロードバランサーや監視システムからのヘルスチェックに使用します。


    """
    return {"status": "healthy", "version": "0.1.0"}
