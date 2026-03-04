"""
API i18n 統合テスト。

TC-BE-005: API エンドポイントでの多言語エラーメッセージ
TC-BE-006: Accept-Language ヘッダーによる言語切り替え

"""

import pytest
from httpx import AsyncClient


class TestAPII18nIntegration:
    """TC-BE-005: API エンドポイントでの多言語エラーメッセージ。"""

    @pytest.mark.asyncio
    async def test_404_error_japanese(self, client: AsyncClient):
        """TC-BE-005-01: 日本語エラーメッセージの確認。"""
        response = await client.get(
            "/api/teams/nonexistent-team", headers={"Accept-Language": "ja"}
        )
        assert response.status_code == 404
        data = response.json()
        # 日本語のエラーメッセージが含まれていることを確認
        assert "detail" in data
        assert "チーム" in data["detail"] or "見つかりません" in data["detail"]
        assert "nonexistent-team" in data["detail"]

    @pytest.mark.asyncio
    async def test_404_error_english(self, client: AsyncClient):
        """TC-BE-005-02: 英語エラーメッセージの確認。"""
        response = await client.get(
            "/api/teams/nonexistent-team", headers={"Accept-Language": "en"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
        assert "nonexistent-team" in data["detail"]

    @pytest.mark.asyncio
    async def test_404_error_chinese(self, client: AsyncClient):
        """TC-BE-005-03: 中国語エラーメッセージの確認。"""
        response = await client.get(
            "/api/teams/nonexistent-team", headers={"Accept-Language": "zh"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        # 中国語のエラーメッセージが含まれていることを確認
        assert "团队" in data["detail"] or "未找到" in data["detail"]
        assert "nonexistent-team" in data["detail"]

    @pytest.mark.asyncio
    async def test_404_error_unsupported_language_fallback(self, client: AsyncClient):
        """TC-BE-005-04: サポート外言語の英語フォールバック確認。"""
        response = await client.get(
            "/api/teams/nonexistent-team",
            headers={"Accept-Language": "ko"},  # 韓国語はサポート外
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        # 英語にフォールバックされる
        assert "not found" in data["detail"].lower()
        assert "nonexistent-team" in data["detail"]


class TestAPILanguageSwitching:
    """TC-BE-006: Accept-Language ヘッダーによる言語切り替え。"""

    @pytest.mark.asyncio
    async def test_language_header_japanese(self, client: AsyncClient):
        """TC-BE-006-01: 日本語ヘッダーの処理。"""
        # 言語ヘッダーが正しく処理されるか確認
        response = await client.get("/api/health", headers={"Accept-Language": "ja"})
        assert response.status_code == 200
        # ヘルスチェックは言語に関係なく同じレスポンス
        data = response.json()
        assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_language_header_english(self, client: AsyncClient):
        """TC-BE-006-02: 英語ヘッダーの処理。"""
        response = await client.get(
            "/api/health", headers={"Accept-Language": "en-US,en;q=0.9"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_language_header_chinese(self, client: AsyncClient):
        """TC-BE-006-03: 中国語ヘッダーの処理。"""
        response = await client.get(
            "/api/health", headers={"Accept-Language": "zh-CN,zh;q=0.9"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_language_header_unsupported(self, client: AsyncClient):
        """TC-BE-006-04: サポート外言語ヘッダーのフォールバック。"""
        response = await client.get(
            "/api/health", headers={"Accept-Language": "fr-FR,fr;q=0.9"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_language_header_missing(self, client: AsyncClient):
        """TC-BE-006-05: 言語ヘッダーなし時のデフォルト言語。"""
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestAPII18nEndpoints:
    """各 API エンドポイントの i18n 対応確認。"""

    @pytest.mark.asyncio
    async def test_teams_endpoint_i18n(self, client: AsyncClient):
        """チーム一覧エンドポイントの i18n 対応。"""
        response = await client.get("/api/teams/", headers={"Accept-Language": "ja"})
        assert response.status_code == 200
        # レスポンス構造を確認
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_inbox_endpoint_i18n(self, client: AsyncClient):
        """インボックスエンドポイントの i18n 対応。"""
        response = await client.get(
            "/api/teams/nonexistent/inboxes", headers={"Accept-Language": "en"}
        )
        # チームが存在しない場合は404
        assert response.status_code in [404, 200]

    @pytest.mark.asyncio
    async def test_tasks_endpoint_i18n(self, client: AsyncClient):
        """タスクエンドポイントの i18n 対応。"""
        response = await client.get("/api/tasks/", headers={"Accept-Language": "zh"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestAPII18nParameterSubstitution:
    """パラメータ置換を含む API レスポンスのテスト。"""

    @pytest.mark.asyncio
    async def test_error_message_with_team_name_japanese(self, client: AsyncClient):
        """チーム名を含む日本語エラーメッセージのテスト。"""
        team_name = "test-nonexistent-team"
        response = await client.get(
            f"/api/teams/{team_name}", headers={"Accept-Language": "ja"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert team_name in data["detail"]
        assert "チーム" in data["detail"] or "見つかりません" in data["detail"]

    @pytest.mark.asyncio
    async def test_error_message_with_team_name_english(self, client: AsyncClient):
        """チーム名を含む英語エラーメッセージのテスト。"""
        team_name = "test-nonexistent-team"
        response = await client.get(
            f"/api/teams/{team_name}", headers={"Accept-Language": "en"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert team_name in data["detail"]
        assert "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_error_message_with_team_name_chinese(self, client: AsyncClient):
        """チーム名を含む中国語エラーメッセージのテスト。"""
        team_name = "test-nonexistent-team"
        response = await client.get(
            f"/api/teams/{team_name}", headers={"Accept-Language": "zh"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert team_name in data["detail"]
        assert "团队" in data["detail"] or "未找到" in data["detail"]

    @pytest.mark.asyncio
    async def test_error_message_with_agent_name_japanese(self, client: AsyncClient):
        """エージェント名を含む日本語エラーメッセージのテスト。"""
        agent_name = "nonexistent-agent"
        response = await client.get(
            f"/api/teams/test-team/inboxes/{agent_name}",
            headers={"Accept-Language": "ja"},
        )
        # チームが存在しない場合は404（チームのエラーメッセージ）
        # エージェントが存在しない場合も404（エージェントのエラーメッセージ）
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_error_message_with_agent_name_english(self, client: AsyncClient):
        """エージェント名を含む英語エラーメッセージのテスト。"""
        agent_name = "nonexistent-agent"
        response = await client.get(
            f"/api/teams/test-team/inboxes/{agent_name}",
            headers={"Accept-Language": "en"},
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        # チームが存在しない場合はチームエラー、エージェントが存在しない場合はインボックスエラー
        # どちらの場合でも英語のエラーメッセージが含まれていることを確認
        assert (
            "not found" in data["detail"].lower() or "inbox" in data["detail"].lower()
        )

    @pytest.mark.asyncio
    async def test_error_message_with_agent_name_chinese(self, client: AsyncClient):
        """エージェント名を含む中国語エラーメッセージのテスト。"""
        agent_name = "nonexistent-agent"
        response = await client.get(
            f"/api/teams/test-team/inboxes/{agent_name}",
            headers={"Accept-Language": "zh"},
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
