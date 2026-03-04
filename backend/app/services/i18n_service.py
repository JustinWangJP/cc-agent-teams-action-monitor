"""I18n サービスモジュール。

このモジュールは、国際化（i18n）対応のための翻訳サービスを提供します。
サポート言語は日本語（ja）、英語（en）、中国語（zh）で、
JSON 形式の翻訳ファイルから翻訳を読み込みます。

Example:
    >>> from app.services.i18n_service import i18n
    >>> i18n.t("api.errors.team_not_found", lang="ja", team="example")
    "チーム「example」が見つかりません"
    >>> i18n.t("api.errors.team_not_found", lang="en", team="example")
    "Team 'example' not found"
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from threading import Lock
from typing import Any

logger = logging.getLogger(__name__)


class I18nService:
    """国際化（i18n）サービス。

    シングルトンパターンで実装されており、アプリケーション全体で
    唯一のインスタンスが共有されます。

    Attributes:
        SUPPORTED_LANGUAGES: サポートする言語コードのリスト
        DEFAULT_LANGUAGE: デフォルト言語コード

    """

    _instance: I18nService | None = None
    _lock = Lock()
    _translations: dict[str, dict[str, dict[str, str]]] = {}

    SUPPORTED_LANGUAGES = ["ja", "en", "zh"]
    DEFAULT_LANGUAGE = "en"

    def __new__(cls) -> I18nService:
        """シングルトンインスタンスを返します。

        初回呼び出し時に翻訳ファイルを読み込みます。

        Returns:
            I18nService の唯一のインスタンス

        """
        if cls._instance is None:
            with cls._lock:
                # ダブルチェックロッキングパターン
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._load_translations()
        return cls._instance

    def _load_translations(self) -> None:
        """翻訳ファイルを読み込みます。

        `backend/locales/{lang}/*.json` からすべての翻訳ファイルを
        読み込み、メモリにキャッシュします。

        """
        # app/services/i18n_service.py から backend/locales/ へのパス
        # i18n_service.py の親は services、その親は app、その親は backend
        locales_dir = Path(__file__).parent.parent.parent / "locales"

        for lang in self.SUPPORTED_LANGUAGES:
            self._translations[lang] = {}
            lang_dir = locales_dir / lang

            if not lang_dir.exists():
                logger.warning(f"Translation directory not found: {lang_dir}")
                continue

            for json_file in lang_dir.glob("*.json"):
                namespace = json_file.stem
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        self._translations[lang][namespace] = json.load(f)
                except (json.JSONDecodeError, OSError) as e:
                    # 翻訳ファイルの読み込みエラーはログに記録し、続行
                    logger.warning(
                        f"Failed to load translation file {json_file}: {e}",
                        extra={"file": str(json_file), "error": str(e)},
                    )
                    self._translations[lang][namespace] = {}

    def _get_translation(self, namespace: str, key: str, lang: str) -> str | None:
        """指定された言語で翻訳を取得します。

        Args:
            namespace: 翻訳の名前空間（api, logs 等）
            key: 翻訳キー（ドット区切りでネスト可能、例: "errors.team_not_found"）
            lang: 言語コード

        Returns:
            翻訳された文字列、見つからない場合は None

        """
        # 名前空間から開始
        current = self._translations.get(lang, {}).get(namespace, {})

        # ドットで区切られたキーを再帰的に探索
        key_parts = key.split(".")
        for part in key_parts:
            if isinstance(current, dict):
                current = current.get(part)
            else:
                return None
            if current is None:
                return None

        return current if isinstance(current, str) else None

    def t(self, key: str, lang: str = DEFAULT_LANGUAGE, **params: Any) -> str:
        """翻訳を取得します。

        指定されたキーで翻訳を取得し、必要に応じてパラメータを埋め込みます。
        翻訳が見つからない場合は、以下のフォールバック処理を行います：
        1. 指定言語で見つからない → 英語にフォールバック
        2. 英語でも見つからない → キー文字列をそのまま返す

        Args:
            key: 翻訳キー（例: "api.errors.team_not_found"）
            lang: 言語コード（デフォルト: "en"）
            **params: 翻訳文字列内のプレースホルダーを置換するパラメータ

        Returns:
            翻訳された文字列

        Examples:
            >>> i18n.t("api.errors.team_not_found", lang="ja", team="example")
            "チーム「example」が見つかりません"
            >>> i18n.t("logs.cache.hit", lang="en", team="my-team")
            "Cache hit: team 'my-team' config"

        """
        # 言語フォールバック処理
        if lang not in self.SUPPORTED_LANGUAGES:
            lang = self.DEFAULT_LANGUAGE

        # キーのパース（namespace.key 形式）
        parts = key.split(".", 1)
        if len(parts) == 1:
            namespace, msg_key = "common", parts[0]
        else:
            namespace, msg_key = parts

        # 指定言語で翻訳を取得
        translation = self._get_translation(namespace, msg_key, lang)

        # 英語にフォールバック
        if translation is None and lang != self.DEFAULT_LANGUAGE:
            translation = self._get_translation(
                namespace, msg_key, self.DEFAULT_LANGUAGE
            )

        # キー文字列を返す（最終フォールバック）
        if translation is None:
            return key

        # パラメータ置換（Python format 構文）
        if params:
            try:
                translation = translation.format(**params)
            except (KeyError, ValueError) as e:
                # パラメータの置換に失敗した場合は警告ログを出力し、元の文字列を返す
                logger.warning(
                    f"Failed to replace parameters in translation: key={key}, error={e}",
                    extra={"key": key, "params": params, "error": str(e)},
                )

        return translation

    def reload_translations(self) -> None:
        """翻訳ファイルを再読み込みします。

        開発環境などで翻訳ファイルを変更した場合に使用します。

        """
        self._load_translations()

    def get_supported_languages(self) -> list[str]:
        """サポートする言語コードのリストを返します。

        Returns:
            言語コードのリスト

        """
        return self.SUPPORTED_LANGUAGES.copy()

    def is_language_supported(self, lang: str) -> bool:
        """指定された言語がサポートされているか判定します。

        Args:
            lang: 言語コード

        Returns:
            サポートされている場合は True

        """
        return lang in self.SUPPORTED_LANGUAGES


# グローバルインスタンス
i18n = I18nService()
