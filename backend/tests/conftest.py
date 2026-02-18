"""
Pytest 共通フィクスチャと設定。

FastAPI テストクライアント、モックデータ、テスト用ディレクトリを提供します。

@
"""
import pytest
import pytest_asyncio
import asyncio
from pathlib import Path
from typing import AsyncGenerator, Generator
from httpx import AsyncClient, ASGITransport
from app.main import app

# pytest-asyncio のモードを auto に設定
pytestmark = pytest.mark.asyncio


# テスト用 fixtures ディレクトリ
TEST_FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """FastAPI 非同期テストクライアント。

    全てのAPIエンドポイントテストで使用します。
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """イベントループフィクスチャ。

    非同期テストで必要なイベントループを提供します。
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ===== モックデータ =====

@pytest.fixture
def mock_team_data() -> dict:
    """モックチームデータ。"""
    return {
        "name": "test-team",
        "description": "Test team for unit testing",
        "createdAt": 1705300200000,
        "leadAgentId": "claude-sonnet-4@anthropic",
        "leadSessionId": "session-123",
        "members": [
            {
                "agentId": "agent-1@anthropic",
                "name": "Agent 1",
                "agentType": "tool-caller",
                "model": "claude-sonnet-4-20250514",
                "joinedAt": 1705300200000,
                "cwd": "/home/user/project",
                "subscriptions": ["tasks", "dashboard"],
                "color": "#FF5733",
                "status": "active"
            }
        ],
        "lastActivity": "2025-01-15T10:30:00Z"
    }


@pytest.fixture
def mock_team_summary() -> dict:
    """モックチームサマリーデータ。"""
    return {
        "name": "test-team",
        "description": "Test team",
        "memberCount": 3,
        "status": "active",
        "lastActivity": "2025-01-15T10:30:00Z",
        "leadAgentId": "claude-sonnet-4@anthropic"
    }


@pytest.fixture
def mock_task_data() -> dict:
    """モックタスクデータ。"""
    return {
        "id": "1",
        "subject": "Test Task",
        "description": "Task description",
        "activeForm": "Testing",
        "status": "in_progress",
        "owner": "agent-1",
        "blocks": ["2", "3"],
        "blockedBy": [],
        "metadata": {"priority": "high"},
        "teamName": "test-team"
    }


@pytest.fixture
def mock_task_summary() -> dict:
    """モックタスクサマリーデータ。"""
    return {
        "id": "1",
        "subject": "Test Task",
        "status": "in_progress",
        "owner": "agent-1",
        "blockedCount": 0,
        "teamName": "test-team"
    }


@pytest.fixture
def mock_inbox_messages() -> list:
    """モックインボックスメッセージ。"""
    return [
        {
            "type": "message",
            "sender": "agent-2",
            "content": "Hello from agent 2",
            "timestamp": "2025-01-15T10:30:00Z"
        },
        {
            "type": "broadcast",
            "sender": "team-lead",
            "content": "Team meeting at 2pm",
            "timestamp": "2025-01-15T09:00:00Z"
        }
    ]
