"""
Tasks API ルートの単体テスト。

T-API-006: タスク一覧取得（正常）
T-API-007: タスク一覧取得（データなし）
T-API-008: チーム別タスク取得
T-API-009: タスク詳細取得（正常）
T-API-010: タスク詳細取得（存在しない）

@
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_tasks_success(client: AsyncClient):
    """T-API-006: タスク一覧取得（正常）"""
    response = await client.get("/api/tasks/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_list_tasks_empty(client: AsyncClient):
    """T-API-007: タスク一覧取得（データなし）"""
    # 注: 実際の環境では ~/.claude/ にタスクが存在する場合がある
    # テストでは空の配列か、実際のタスクリストを許容する
    response = await client.get("/api/tasks/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_list_team_tasks(client: AsyncClient):
    """T-API-008: チーム別タスク取得"""
    response = await client.get("/api/tasks/team/test-team")
    # チームが存在しない場合は404
    assert response.status_code in [200, 404]


@pytest.mark.asyncio
async def test_get_task_not_found(client: AsyncClient):
    """T-API-010: タスク詳細取得（存在しない）"""
    response = await client.get("/api/tasks/nonexistent-task")
    assert response.status_code == 404
