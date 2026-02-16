"""
Teams API ルートの単体テスト。

T-API-001: チーム一覧取得（正常）
T-API-002: チーム一覧取得（データなし）
T-API-003: チーム詳細取得（正常）
T-API-004: チーム詳細取得（存在しない）
T-API-005: インボックス取得

@
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_teams_success(client: AsyncClient, mock_team_summary):
    """T-API-001: チーム一覧取得（正常）"""
    # 注: 実際のテストは ~/.claude/ ディレクトリのモックが必要
    response = await client.get("/api/teams")
    # 現状では空の配列が返される（モック環境）
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_list_teams_empty(client: AsyncClient):
    """T-API-002: チーム一覧取得（データなし）"""
    # モック環境では空の配列が返される
    response = await client.get("/api/teams")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_team_not_found(client: AsyncClient):
    """T-API-004: チーム詳細取得（存在しない）"""
    response = await client.get("/api/teams/nonexistent-team")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """ヘルスチェックエンドポイントのテスト"""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
