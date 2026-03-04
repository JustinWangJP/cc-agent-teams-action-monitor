"""
Network API ルートの単体テスト。

T-API-101: ネットワークデータ取得（正常）
T-API-102: ネットワークデータ取得（チーム不存在）
T-API-103: ネットワークデータ取得（空データ）
T-API-104: ネットワークデータ取得（時間フィルタ）

注意: /api/teams/{team}/messages/network エンドポイントは未実装のため、
これらのテストは一時的にスキップされています。
"""
import pytest
from httpx import AsyncClient


@pytest.mark.skip(reason="Network API endpoint not implemented yet")
@pytest.mark.asyncio
async def test_get_network_team_not_found(client: AsyncClient):
    """T-API-102: ネットワークデータ取得（チーム不存在）"""
    response = await client.get("/api/teams/nonexistent-team/messages/network")
    assert response.status_code == 404


@pytest.mark.skip(reason="Network API endpoint not implemented yet")
@pytest.mark.asyncio
async def test_get_network_empty_data(client: AsyncClient, tmp_path):
    """T-API-103: ネットワークデータ取得（空データ）"""
    # 空のチームディレクトリ構造を作成
    from app.config import settings
    from pathlib import Path

    # テスト用の空チームを作成
    test_team_dir = settings.teams_dir / "test-empty-team"
    test_team_dir.mkdir(parents=True, exist_ok=True)

    # config.json を作成
    import json
    config_data = {
        "name": "test-empty-team",
        "description": "Test team with no messages",
        "members": [
            {"name": "agent-1", "model": "claude-opus-4-6"}
        ],
        "leadAgentId": "agent-1",
    }
    with open(test_team_dir / "config.json", "w") as f:
        json.dump(config_data, f)

    # インボックスディレクトリを作成（空）
    inboxes_dir = test_team_dir / "inboxes"
    inboxes_dir.mkdir(exist_ok=True)

    try:
        response = await client.get("/api/teams/test-empty-team/messages/network")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data
        assert "teamName" in data
        assert "meta" in data
        # メンバーはいるがメッセージがないため、ノードは存在するがエッジはない
        assert len(data["nodes"]) == 1  # agent-1
        assert len(data["edges"]) == 0
        assert data["meta"]["totalMessages"] == 0
    finally:
        # クリーンアップ
        import shutil
        if test_team_dir.exists():
            shutil.rmtree(test_team_dir)


@pytest.mark.skip(reason="Network API endpoint not implemented yet")
@pytest.mark.asyncio
async def test_get_network_with_messages(client: AsyncClient, tmp_path):
    """T-API-101: ネットワークデータ取得（正常）"""
    from app.config import settings
    from pathlib import Path
    import json
    import shutil

    # テスト用チームを作成
    test_team_dir = settings.teams_dir / "test-network-team"
    if test_team_dir.exists():
        shutil.rmtree(test_team_dir)
    test_team_dir.mkdir(parents=True, exist_ok=True)

    # config.json を作成
    config_data = {
        "name": "test-network-team",
        "description": "Test team for network graph",
        "members": [
            {"name": "agent-1", "model": "claude-opus-4-6"},
            {"name": "agent-2", "model": "claude-sonnet-4-5"},
            {"name": "agent-3", "model": "claude-haiku-4-5"},
        ],
        "leadAgentId": "agent-1",
    }
    with open(test_team_dir / "config.json", "w") as f:
        json.dump(config_data, f)

    # インボックスディレクトリを作成
    inboxes_dir = test_team_dir / "inboxes"
    inboxes_dir.mkdir(exist_ok=True)

    # テストメッセージを作成
    # agent-2 のインボックス（agent-1 からのメッセージ）
    messages_agent2 = [
        {
            "from": "agent-1",
            "text": "Hello from agent-1",
            "timestamp": "2026-02-16T10:00:00Z",
            "read": False,
        },
        {
            "from": "agent-1",
            "text": '{"type": "message", "content": "Protocol message"}',
            "timestamp": "2026-02-16T10:05:00Z",
            "read": False,
        },
    ]
    with open(inboxes_dir / "agent-2.json", "w") as f:
        json.dump(messages_agent2, f)

    # agent-3 のインボックス（agent-1 と agent-2 からのメッセージ）
    messages_agent3 = [
        {
            "from": "agent-1",
            "text": "Hello from agent-1 to agent-3",
            "timestamp": "2026-02-16T10:10:00Z",
            "read": False,
        },
        {
            "from": "agent-2",
            "text": "Hello from agent-2 to agent-3",
            "timestamp": "2026-02-16T10:15:00Z",
            "read": False,
        },
    ]
    with open(inboxes_dir / "agent-3.json", "w") as f:
        json.dump(messages_agent3, f)

    try:
        response = await client.get("/api/teams/test-network-team/messages/network")
        assert response.status_code == 200
        data = response.json()

        # 構造を検証
        assert "nodes" in data
        assert "edges" in data
        assert "teamName" in data
        assert "meta" in data

        # ノードを検証
        assert len(data["nodes"]) == 3
        node_ids = {n["id"] for n in data["nodes"]}
        assert node_ids == {"agent-1", "agent-2", "agent-3"}

        # エッジを検証（agent-1 -> agent-2, agent-1 -> agent-3, agent-2 -> agent-3）
        assert len(data["edges"]) == 3
        edge_pairs = {(e["source"], e["target"]) for e in data["edges"]}
        assert ("agent-1", "agent-2") in edge_pairs
        assert ("agent-1", "agent-3") in edge_pairs
        assert ("agent-2", "agent-3") in edge_pairs

        # メタデータを検証
        assert data["meta"]["totalMessages"] == 4
        assert data["meta"]["timeRange"]["min"] == "2026-02-16T10:00:00Z"
        assert data["meta"]["timeRange"]["max"] == "2026-02-16T10:15:00Z"

        # ノードのプロパティを検証
        agent1_node = next(n for n in data["nodes"] if n["id"] == "agent-1")
        assert agent1_node["model"] == "claude-opus-4-6"
        assert agent1_node["modelColor"] == "#8B5CF6"
        assert agent1_node["modelIcon"] == "💎"
        assert agent1_node["sentCount"] == 3  # agent-2 に2件、agent-3 に1件
        assert agent1_node["receivedCount"] == 0
        assert agent1_node["messageCount"] == 3

        # エッジのプロパティを検証
        edge_1_2 = next(e for e in data["edges"] if e["source"] == "agent-1" and e["target"] == "agent-2")
        assert edge_1_2["count"] == 2
        assert edge_1_2["dominantType"] == "message"

    finally:
        # クリーンアップ
        if test_team_dir.exists():
            shutil.rmtree(test_team_dir)


@pytest.mark.skip(reason="Network API endpoint not implemented yet")
@pytest.mark.asyncio
async def test_get_network_with_time_filter(client: AsyncClient, tmp_path):
    """T-API-104: ネットワークデータ取得（時間フィルタ）"""
    from app.config import settings
    from pathlib import Path
    import json
    import shutil

    # テスト用チームを作成
    test_team_dir = settings.teams_dir / "test-time-filter-team"
    if test_team_dir.exists():
        shutil.rmtree(test_team_dir)
    test_team_dir.mkdir(parents=True, exist_ok=True)

    # config.json を作成
    config_data = {
        "name": "test-time-filter-team",
        "members": [
            {"name": "agent-1", "model": "claude-opus-4-6"},
            {"name": "agent-2", "model": "claude-sonnet-4-5"},
        ],
        "leadAgentId": "agent-1",
    }
    with open(test_team_dir / "config.json", "w") as f:
        json.dump(config_data, f)

    # インボックスディレクトリを作成
    inboxes_dir = test_team_dir / "inboxes"
    inboxes_dir.mkdir(exist_ok=True)

    # 異なる時間のメッセージを作成
    messages = [
        {
            "from": "agent-1",
            "text": "Message 1",
            "timestamp": "2026-02-16T09:00:00Z",
            "read": False,
        },
        {
            "from": "agent-1",
            "text": "Message 2",
            "timestamp": "2026-02-16T10:00:00Z",
            "read": False,
        },
        {
            "from": "agent-1",
            "text": "Message 3",
            "timestamp": "2026-02-16T11:00:00Z",
            "read": False,
        },
    ]
    with open(inboxes_dir / "agent-2.json", "w") as f:
        json.dump(messages, f)

    try:
        # 時間フィルタなし
        response_all = await client.get("/api/teams/test-time-filter-team/messages/network")
        assert response_all.status_code == 200
        data_all = response_all.json()
        assert data_all["meta"]["totalMessages"] == 3

        # 時間フィルタあり（10:00〜11:00）
        response_filtered = await client.get(
            "/api/teams/test-time-filter-team/messages/network?start_time=2026-02-16T10:00:00Z&end_time=2026-02-16T11:00:00Z"
        )
        assert response_filtered.status_code == 200
        data_filtered = response_filtered.json()
        # 10:00 と 11:00 のメッセージ（範囲に含まれる、境界値を含む）
        assert data_filtered["meta"]["totalMessages"] == 2

    finally:
        # クリーンアップ
        if test_team_dir.exists():
            shutil.rmtree(test_team_dir)
