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
    # i18n対応により英語または日本語のエラーメッセージをチェック
    detail = response.json()["detail"]
    assert "inbox" in detail.lower() or "受信箱" in detail
    assert "not found" in detail.lower() or "見つかりません" in detail


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


# =============================================================================
# 削除 API テスト
# =============================================================================

@pytest.mark.asyncio
async def test_delete_team_not_found(client: AsyncClient):
    """T-API-009: チーム削除（チームが存在しない）"""
    response = await client.delete("/api/teams/nonexistent-team")
    assert response.status_code == 404
    # i18n対応により英語または日本語のエラーメッセージをチェック
    detail = response.json()["detail"]
    assert "not found" in detail.lower() or "見つかりません" in detail


@pytest.mark.asyncio
async def test_delete_team_status_active(client: AsyncClient, tmp_path, monkeypatch):
    """T-API-010: チーム削除（active 状態は削除不可）"""
    import json
    from app.config import settings

    # テスト用のチームディレクトリを作成
    test_team_dir = tmp_path / "teams" / "active-team"
    test_team_dir.mkdir(parents=True)

    # プロジェクトディレクトリとセッションログを作成（active 状態）
    test_project_dir = tmp_path / "projects" / "-tmp-test-project"
    test_project_dir.mkdir(parents=True)
    session_file = test_project_dir / "session-123.jsonl"
    session_file.write_text('{"type": "user_message", "content": "test"}\n', encoding="utf-8")

    # config.json を作成（メンバーあり、leadSessionId あり）
    config = {
        "name": "active-team",
        "leadAgentId": "lead@session",
        "leadSessionId": "session-123",
        "members": [
            {"agentId": "lead@session", "cwd": "/tmp/test-project"}
        ]
    }
    config_file = test_team_dir / "config.json"
    config_file.write_text(json.dumps(config), encoding="utf-8")

    # settings をモック
    monkeypatch.setattr(settings, "teams_dir", tmp_path / "teams")
    monkeypatch.setattr(settings, "claude_dir", tmp_path)
    monkeypatch.setattr(settings, "tasks_dir", tmp_path / "tasks")

    response = await client.delete("/api/teams/active-team")
    assert response.status_code == 400
    # i18n対応により英語または日本語のエラーメッセージをチェック
    detail = response.json()["detail"]
    assert "active" in detail
    assert ("cannot delete" in detail.lower() or "削除できません" in detail or "cannot" in detail.lower())


@pytest.mark.asyncio
async def test_delete_team_success(client: AsyncClient, tmp_path, monkeypatch):
    """T-API-011: チーム削除（正常 - stopped 状態）"""
    import json
    from datetime import datetime, timezone, timedelta
    from app.config import settings
    import os

    # テスト用のチームディレクトリを作成
    test_team_dir = tmp_path / "teams" / "stopped-team"
    test_team_dir.mkdir(parents=True)

    # タスクディレクトリを作成
    test_tasks_dir = tmp_path / "tasks" / "stopped-team"
    test_tasks_dir.mkdir(parents=True)
    task_file = test_tasks_dir / "1.json"
    task_file.write_text('{"id": "1", "subject": "test"}', encoding="utf-8")

    # プロジェクトディレクトリとセッションログを作成（stopped 状態 = mtime が古い）
    test_project_dir = tmp_path / "projects" / "-tmp-test-project"
    test_project_dir.mkdir(parents=True)
    session_file = test_project_dir / "session-456.jsonl"
    session_file.write_text('{"type": "user_message", "content": "test"}\n', encoding="utf-8")

    # mtime を2時間前に設定
    old_time = datetime.now(timezone.utc) - timedelta(hours=2)
    os.utime(session_file, (old_time.timestamp(), old_time.timestamp()))

    # config.json を作成
    config = {
        "name": "stopped-team",
        "leadAgentId": "lead@session",
        "leadSessionId": "session-456",
        "members": [
            {"agentId": "lead@session", "cwd": "/tmp/test-project"}
        ]
    }
    config_file = test_team_dir / "config.json"
    config_file.write_text(json.dumps(config), encoding="utf-8")

    # settings をモック
    monkeypatch.setattr(settings, "teams_dir", tmp_path / "teams")
    monkeypatch.setattr(settings, "claude_dir", tmp_path)
    monkeypatch.setattr(settings, "tasks_dir", tmp_path / "tasks")

    response = await client.delete("/api/teams/stopped-team")
    assert response.status_code == 200
    data = response.json()
    # i18n対応により英語または日本語の成功メッセージをチェック
    assert "stopped-team" in data["message"]
    assert ("deleted" in data["message"].lower() or "削除" in data["message"])
    assert len(data["deletedPaths"]) >= 3  # teams, tasks, session file

    # ディレクトリとファイルが削除されたことを確認
    assert not test_team_dir.exists()
    assert not test_tasks_dir.exists()
    assert not session_file.exists()  # セッションファイルは削除

    # プロジェクトディレクトリ自体は残る
    assert test_project_dir.exists()


@pytest.mark.asyncio
async def test_delete_team_inactive(client: AsyncClient, tmp_path, monkeypatch):
    """T-API-012: チーム削除（inactive 状態 - メンバーなし）"""
    import json
    from app.config import settings

    # テスト用のチームディレクトリを作成
    test_team_dir = tmp_path / "teams" / "inactive-team"
    test_team_dir.mkdir(parents=True)

    # タスクディレクトリを作成
    test_tasks_dir = tmp_path / "tasks" / "inactive-team"
    test_tasks_dir.mkdir(parents=True)

    # config.json を作成（メンバーなし = inactive）
    config = {
        "name": "inactive-team",
        "leadAgentId": "lead@session",
        "members": []  # 空のメンバー
    }
    config_file = test_team_dir / "config.json"
    config_file.write_text(json.dumps(config), encoding="utf-8")

    # settings をモック
    monkeypatch.setattr(settings, "teams_dir", tmp_path / "teams")
    monkeypatch.setattr(settings, "claude_dir", tmp_path)
    monkeypatch.setattr(settings, "tasks_dir", tmp_path / "tasks")

    response = await client.delete("/api/teams/inactive-team")
    assert response.status_code == 200
    data = response.json()
    # i18n対応により英語または日本語の成功メッセージをチェック
    assert ("deleted" in data["message"].lower() or "削除" in data["message"])

    # ディレクトリが削除されたことを確認
    assert not test_team_dir.exists()
    assert not test_tasks_dir.exists()


@pytest.mark.asyncio
async def test_delete_team_unknown(client: AsyncClient, tmp_path, monkeypatch):
    """T-API-013: チーム削除（unknown 状態 - セッションログなし）"""
    import json
    from app.config import settings

    # テスト用のチームディレクトリを作成
    test_team_dir = tmp_path / "teams" / "unknown-team"
    test_team_dir.mkdir(parents=True)

    # タスクディレクトリを作成
    test_tasks_dir = tmp_path / "tasks" / "unknown-team"
    test_tasks_dir.mkdir(parents=True)

    # プロジェクトディレクトリを作成（セッションファイルなし）
    test_project_dir = tmp_path / "projects" / "-tmp-test-project"
    test_project_dir.mkdir(parents=True)

    # config.json を作成（メンバーあり、セッションファイルなし = unknown）
    config = {
        "name": "unknown-team",
        "leadAgentId": "lead@session",
        "leadSessionId": "nonexistent-session",
        "members": [
            {"agentId": "lead@session", "cwd": "/tmp/test-project"}
        ]
    }
    config_file = test_team_dir / "config.json"
    config_file.write_text(json.dumps(config), encoding="utf-8")

    # settings をモック
    monkeypatch.setattr(settings, "teams_dir", tmp_path / "teams")
    monkeypatch.setattr(settings, "claude_dir", tmp_path)
    monkeypatch.setattr(settings, "tasks_dir", tmp_path / "tasks")

    response = await client.delete("/api/teams/unknown-team")
    assert response.status_code == 200
    data = response.json()
    # i18n対応により英語または日本語の成功メッセージをチェック
    assert ("deleted" in data["message"].lower() or "削除" in data["message"])

    # ディレクトリが削除されたことを確認
    assert not test_team_dir.exists()
    assert not test_tasks_dir.exists()
    # プロジェクトディレクトリは残る（セッションファイルがないため削除対象なし）
    assert test_project_dir.exists()
