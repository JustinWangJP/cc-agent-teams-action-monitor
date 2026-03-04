"""
LanguageMiddleware の単体テスト。

TC-BE-004: Accept-Language ヘッダー解析と request.state.language 設定

"""

import pytest
from fastapi import Request, Response
from starlette.responses import PlainTextResponse

from app.middleware.language import LanguageMiddleware
from app.main import app


class TestLanguageMiddleware:
    """TC-BE-004: LanguageMiddleware の機能テスト。"""

    @pytest.mark.asyncio
    async def test_middleware_sets_language_japanese(self):
        """TC-BE-004-01: 日本語リクエストの言語設定。"""
        middleware = LanguageMiddleware(app)

        # モックリクエストの作成
        async def call_next(request: Request) -> Response:
            # request.state.language が設定されていることを確認
            assert hasattr(request.state, "language")
            assert request.state.language == "ja"
            return PlainTextResponse("OK")

        request = Request(
            {
                "type": "http",
                "headers": [(b"accept-language", b"ja,en-US;q=0.9,en;q=0.8")],
                "method": "GET",
                "path": "/api/teams",
            }
        )

        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_sets_language_english(self):
        """TC-BE-004-02: 英語リクエストの言語設定。"""
        middleware = LanguageMiddleware(app)

        async def call_next(request: Request) -> Response:
            assert request.state.language == "en"
            return PlainTextResponse("OK")

        request = Request(
            {
                "type": "http",
                "headers": [(b"accept-language", b"en-US,en;q=0.9")],
                "method": "GET",
                "path": "/api/teams",
            }
        )

        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_sets_language_chinese(self):
        """TC-BE-004-03: 中国語リクエストの言語設定。"""
        middleware = LanguageMiddleware(app)

        async def call_next(request: Request) -> Response:
            assert request.state.language == "zh"
            return PlainTextResponse("OK")

        request = Request(
            {
                "type": "http",
                "headers": [(b"accept-language", b"zh-CN,zh;q=0.9")],
                "method": "GET",
                "path": "/api/teams",
            }
        )

        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_fallback_to_default(self):
        """TC-BE-004-04: サポート外言語のデフォルトフォールバック。"""
        middleware = LanguageMiddleware(app)

        async def call_next(request: Request) -> Response:
            # ドイツ語はサポートされていないのでデフォルトの英語になる
            assert request.state.language == "en"
            return PlainTextResponse("OK")

        request = Request(
            {
                "type": "http",
                "headers": [(b"accept-language", b"de-DE,de;q=0.9")],
                "method": "GET",
                "path": "/api/teams",
            }
        )

        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_no_accept_language_header(self):
        """TC-BE-004-05: Accept-Language ヘッダーなし時のデフォルト設定。"""
        middleware = LanguageMiddleware(app)

        async def call_next(request: Request) -> Response:
            # ヘッダーがない場合はデフォルト言語
            assert request.state.language == "en"
            return PlainTextResponse("OK")

        request = Request(
            {
                "type": "http",
                "headers": [],
                "method": "GET",
                "path": "/api/teams",
            }
        )

        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_empty_accept_language(self):
        """TC-BE-004-06: 空の Accept-Language ヘッダーの処理。"""
        middleware = LanguageMiddleware(app)

        async def call_next(request: Request) -> Response:
            assert request.state.language == "en"
            return PlainTextResponse("OK")

        request = Request(
            {
                "type": "http",
                "headers": [(b"accept-language", b"")],
                "method": "GET",
                "path": "/api/teams",
            }
        )

        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_language_with_quality_values(self):
        """TC-BE-004-07: 品質値（q値）を含むヘッダーの解析。

        注: 現在の実装は品質値を無視し、最初の言語タグを選択します。
        Accept-Language: ja;q=0.8,en;q=0.9 → "ja" を選択
        """
        middleware = LanguageMiddleware(app)

        async def call_next(request: Request) -> Response:
            # 品質値を無視して最初の言語タグが選択される
            # (q値を考慮する場合は en が選択されますが、
            #  現在の実装はシンプルさを優先し最初のタグを使用します)
            assert request.state.language == "ja"
            return PlainTextResponse("OK")

        request = Request(
            {
                "type": "http",
                "headers": [(b"accept-language", b"ja;q=0.8,en;q=0.9")],
                "method": "GET",
                "path": "/api/teams",
            }
        )

        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_lowercase_region_code(self):
        """TC-BE-004-08: 小文字リージョンコードの処理。"""
        middleware = LanguageMiddleware(app)

        async def call_next(request: Request) -> Response:
            # 小文字のリージョンコードでも正しく解析される
            assert request.state.language == "en"
            return PlainTextResponse("OK")

        request = Request(
            {
                "type": "http",
                "headers": [(b"accept-language", b"en-us")],
                "method": "GET",
                "path": "/api/teams",
            }
        )

        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 200


class TestLanguageMiddlewareEdgeCases:
    """LanguageMiddleware のエッジケーステスト。"""

    @pytest.mark.asyncio
    async def test_middleware_invalid_language_format(self):
        """不正な形式の言語タグの処理。"""
        middleware = LanguageMiddleware(app)

        async def call_next(request: Request) -> Response:
            # 不正な形式はデフォルト言語にフォールバック
            assert request.state.language == "en"
            return PlainTextResponse("OK")

        request = Request(
            {
                "type": "http",
                "headers": [(b"accept-language", b"toolonglanguagecode-abcde")],
                "method": "GET",
                "path": "/api/teams",
            }
        )

        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_whitespace_handling(self):
        """空白を含むヘッダーの処理。"""
        middleware = LanguageMiddleware(app)

        async def call_next(request: Request) -> Response:
            assert request.state.language == "ja"
            return PlainTextResponse("OK")

        request = Request(
            {
                "type": "http",
                "headers": [(b"accept-language", b"  ja  ,  en  ;q=0.9  ")],
                "method": "GET",
                "path": "/api/teams",
            }
        )

        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_request_preservation(self):
        """ミドルウェアによるリクエスト状態の保持確認。"""
        middleware = LanguageMiddleware(app)

        original_path = "/api/test"
        original_method = "POST"

        async def call_next(request: Request) -> Response:
            # 元のリクエスト情報が保持されていることを確認
            assert request.url.path == original_path
            assert request.method == original_method
            assert hasattr(request.state, "language")
            return PlainTextResponse("OK")

        request = Request(
            {
                "type": "http",
                "headers": [(b"accept-language", b"ja")],
                "method": original_method,
                "path": original_path,
            }
        )

        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 200
