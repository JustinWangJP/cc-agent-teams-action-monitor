"""Agent Teams Dashboard の FastAPI アプリケーションエントリーポイント。

FastAPI アプリケーションの作成、CORS ミドルウェア設定、ルーター登録、
ライフサイクル管理（FileWatcher の開始/停止）を行います。

"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import teams, tasks, websocket
from app.services.file_watcher import FileWatcherService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクルを管理する非同期コンテキストマネージャー。

    起動時に FileWatcher サービスを開始し、アプリケーション状態に保存します。
    終了時に FileWatcher を停止し、リソースを解放します。


    """
    # Startup: Start file watcher
    watcher = FileWatcherService()
    await watcher.start()
    app.state.watcher = watcher

    yield

    # Shutdown: Stop file watcher
    await watcher.stop()


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

# Include routers
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])


@app.get("/api/health")
async def health_check():
    """サーバーのヘルスチェック用エンドポイント。

    サーバーが正常に動作しているか確認するため、ステータスとバージョンを返します。
    ロードバランサーや監視システムからのヘルスチェックに使用します。


    """
    return {"status": "healthy", "version": "0.1.0"}
