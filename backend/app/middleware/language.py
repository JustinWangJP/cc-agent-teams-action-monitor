"""言語ミドルウェアモジュール。

このモジュールは、HTTP リクエストの Accept-Language ヘッダーを解析し、
適切な言語を `request.state.language` に設定するミドルウェアを提供します。

Example:
    >>> app.add_middleware(LanguageMiddleware)
    >>> # リクエストハンドラー内で:
    >>> lang = request.state.language  # 'ja', 'en', または 'zh'
"""
from __future__ import annotations

from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.services.i18n_service import i18n


class LanguageMiddleware(BaseHTTPMiddleware):
    """言語判定ミドルウェア。

    HTTP リクエストの Accept-Language ヘッダーを解析し、
    サポートされている言語（ja/en/zh）にマッチするか判定します。
    マッチしない場合はデフォルト言語（en）を使用します。

    判定された言語コードは `request.state.language` に設定され、
    リクエストハンドラーからアクセスできます。

    Example:
        ```python
        from fastapi import Request
        from app.services.i18n_service import i18n

        @app.get("/api/teams")
        async def get_teams(request: Request):
            lang = request.state.language
            # ...
            return {"message": i18n.t("api.errors.team_not_found", lang=lang)}
        ```

    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Response],
    ) -> Response:
        """リクエストを処理し、言語を設定します。

        Args:
            request: 受信した HTTP リクエスト
            call_next: 次のミドルウェアまたはルートハンドラー

        Returns:
            HTTP レスポンス

        """
        # Accept-Language ヘッダーから言語を抽出
        accept_language = request.headers.get(
            "Accept-Language", i18n.DEFAULT_LANGUAGE
        )

        # Accept-Language ヘッダーのパース
        # 形式: "ja,en-US;q=0.9,en;q=0.8" または "ja"
        lang = self._parse_accept_language(accept_language)

        # サポートされていない言語の場合はデフォルトにフォールバック
        if not i18n.is_language_supported(lang):
            lang = i18n.DEFAULT_LANGUAGE

        # リクエスト状態に言語を設定
        request.state.language = lang

        return await call_next(request)

    def _parse_accept_language(self, accept_language: str) -> str:
        """Accept-Language ヘッダーをパースし、最適な言語コードを返します。

        Args:
            accept_language: Accept-Language ヘッダーの値

        Returns:
            言語コード（2文字の ISO 639-1 コード）

        Examples:
            >>> _parse_accept_language("ja,en-US;q=0.9,en;q=0.8")
            "ja"
            >>> _parse_accept_language("zh-CN")
            "zh"
            >>> _parse_accept_language("en-US;q=0.9")
            "en"

        """
        if not accept_language:
            return i18n.DEFAULT_LANGUAGE

        # 最初の言語タグを取得（カンマ区切り）
        first_lang = accept_language.split(",")[0].strip()

        # 品質値（;q=）を除去
        # 形式: "ja;q=0.8" -> "ja", "en-US" -> "en-US"
        first_lang = first_lang.split(";")[0].strip()

        # 言語タグから言語コードを抽出（例: "ja-JP" -> "ja", "zh-CN" -> "zh"）
        lang_code = first_lang.split("-")[0].lower()

        # 不正な形式の場合はデフォルトを返す
        if not lang_code or len(lang_code) > 5:
            return i18n.DEFAULT_LANGUAGE

        return lang_code
