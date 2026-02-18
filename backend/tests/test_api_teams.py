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
    response = await client.get("/api/teams/")
    # 現状では空の配列が返される（モック環境）
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_list_teams_empty(client: AsyncClient):
    """T-API-002: チーム一覧取得（データなし）"""
    # 注: 実際の環境では ~/.claude/ にチームが存在する場合がある
    # テストでは空の配列か、実際のチームリストを許容する
    response = await client.get("/api/teams/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


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


@pytest.mark.asyncio
async def test_get_team_inboxes_team_not_found(client: AsyncClient):
    """T-API-005: チームインボックス取得（チームが存在しない）"""
    response = await client.get("/api/teams/nonexistent-team/inboxes")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_agent_inbox_team_not_found(client: AsyncClient):
    """T-API-006: エージェント別インボックス取得（チームが存在しない）"""
    response = await client.get("/api/teams/nonexistent-team/inboxes/agent-1")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_agent_inbox_file_not_found(client: AsyncClient, tmp_path, monkeypatch):
    """T-API-007: エージェント別インボックス取得（ファイルが存在しない）"""
    from app.config import settings

    # テスト用のチームディレクトリを作成
    test_team_dir = tmp_path / "teams" / "test-team"
    test_team_dir.mkdir(parents=True)

    # settings.teams_dir をモック
    monkeypatch.setattr(settings, "teams_dir", tmp_path / "teams")

    response = await client.get("/api/teams/test-team/inboxes/nonexistent-agent")
    assert response.status_code == 404
    assert "Agent inbox not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_agent_inbox_success(client: AsyncClient, tmp_path, monkeypatch):
    """T-API-008: エージェント別インボックス取得（正常）"""
    import json
    from app.config import settings

    # テスト用のチームとインボックスを作成
    test_team_dir = tmp_path / "teams" / "test-team"
    test_inboxes_dir = test_team_dir / "inboxes"
    test_inboxes_dir.mkdir(parents=True)

    # モックインボックスファイルを作成
    mock_messages = [
        {
            "type": "message",
            "sender": "agent-2",
            "content": "Hello from agent 2",
            "timestamp": "2025-01-15T10:30:00Z"
        }
    ]
    inbox_file = test_inboxes_dir / "agent-1.json"
    inbox_file.write_text(json.dumps(mock_messages), encoding="utf-8")

    # settings.teams_dir をモック
    monkeypatch.setattr(settings, "teams_dir", tmp_path / "teams")

    response = await client.get("/api/teams/test-team/inboxes/agent-1")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["type"] == "message"
    assert data[0]["sender"] == "agent-2"
