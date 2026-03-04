"""
I18nService の単体テスト。

TC-BE-001: 翻訳取得の基本機能
TC-BE-002: パラメータ置換機能
TC-BE-003: フォールバック処理（指定言語 → 英語 → キー文字列）

"""
import pytest
from pathlib import Path
import tempfile
import json

from app.services.i18n_service import I18nService, i18n


class TestI18nServiceBasic:
    """TC-BE-001: 翻訳取得の基本機能。"""

    def test_singleton_pattern(self):
        """TC-BE-001-01: シングルトンパターンの動作確認。"""
        instance1 = I18nService()
        instance2 = I18nService()
        assert instance1 is instance2

    def test_supported_languages(self):
        """TC-BE-001-02: サポート言語リストの確認。"""
        assert i18n.SUPPORTED_LANGUAGES == ["ja", "en", "zh"]
        assert i18n.DEFAULT_LANGUAGE == "en"

    def test_is_language_supported(self):
        """TC-BE-001-03: 言語サポート判定の確認。"""
        assert i18n.is_language_supported("ja") is True
        assert i18n.is_language_supported("en") is True
        assert i18n.is_language_supported("zh") is True
        assert i18n.is_language_supported("fr") is False
        assert i18n.is_language_supported("") is False

    def test_get_supported_languages(self):
        """TC-BE-001-04: サポート言語リスト取得の確認。"""
        languages = i18n.get_supported_languages()
        assert languages == ["ja", "en", "zh"]
        # リストのコピーを返すので変更しても元に影響しない
        languages.append("fr")
        assert "fr" not in i18n.get_supported_languages()


class TestI18nServiceTranslation:
    """翻訳取得のテスト。"""

    def test_translation_japanese(self):
        """TC-BE-001-05: 日本語翻訳の取得。"""
        result = i18n.t("api.errors.team_not_found", lang="ja", team="test-team")
        assert result == "チーム「test-team」が見つかりません"

    def test_translation_english(self):
        """TC-BE-001-06: 英語翻訳の取得。"""
        result = i18n.t("api.errors.team_not_found", lang="en", team="test-team")
        assert result == "Team 'test-team' not found"

    def test_translation_chinese(self):
        """TC-BE-001-07: 中国語翻訳の取得。"""
        result = i18n.t("api.errors.team_not_found", lang="zh", team="test-team")
        assert result == "未找到团队 'test-team'"

    def test_translation_with_namespace(self):
        """TC-BE-001-08: 名前空間付きキーの翻訳取得。"""
        result = i18n.t("logs.cache.hit", lang="ja", team="example")
        assert "キャッシュヒット" in result
        assert "example" in result

    def test_translation_default_namespace(self):
        """TC-BE-001-09: 名前空間なしキーの処理（common名前空間）。"""
        # common 名前空間に存在しないキーの場合はキー文字列が返る
        result = i18n.t("nonexistent_key", lang="en")
        assert result == "nonexistent_key"


class TestI18nServiceParameters:
    """TC-BE-002: パラメータ置換機能。"""

    def test_single_parameter_replacement(self):
        """TC-BE-002-01: 単一パラメータの置換。"""
        result = i18n.t("api.errors.team_not_found", lang="ja", team="my-team")
        assert "my-team" in result
        assert "チーム" in result

    def test_multiple_parameters(self):
        """TC-BE-002-02: 複数パラメータの置換。"""
        result = i18n.t(
            "logs.cache.started",
            lang="en",
            config_ttl=30,
            inbox_ttl=60
        )
        assert "30" in result
        assert "60" in result

    def test_parameter_without_value(self):
        """TC-BE-002-03: パラメータ未指定時の処理。"""
        # パラメータが必要だが提供されていない場合
        result = i18n.t("api.errors.team_not_found", lang="ja")
        # 置換が失敗すると元の文字列が返る（KeyError をキャッチ）
        assert "team_not_found" in result or "{team}" in result or "チーム" in result

    def test_parameter_with_special_characters(self):
        """TC-BE-002-04: 特殊文字を含むパラメータの置換。"""
        result = i18n.t(
            "api.errors.invalid_timestamp",
            lang="en",
            timestamp="2025-01-15T10:30:00Z"
        )
        assert "2025-01-15T10:30:00Z" in result
        assert "Invalid" in result


class TestI18nServiceFallback:
    """TC-BE-003: フォールバック処理。"""

    def test_fallback_to_english(self):
        """TC-BE-003-01: 指定言語の翻訳がない場合の英語フォールバック。"""
        # 存在しないキーを指定
        result = i18n.t("api.nonexistent.key", lang="ja")
        # 英語にも存在しないのでキー文字列が返る
        assert result == "api.nonexistent.key"

    def test_fallback_unsupported_language(self):
        """TC-BE-003-02: サポート外言語の英語フォールバック。"""
        result = i18n.t("api.errors.team_not_found", lang="fr", team="test")
        # フランス語はサポートされていないので英語にフォールバック
        assert result == "Team 'test' not found"

    def test_fallback_to_key_string(self):
        """TC-BE-003-03: 最終フォールバック（キー文字列）。"""
        result = i18n.t("completely.nonexistent.key", lang="en")
        assert result == "completely.nonexistent.key"

    def test_fallback_with_invalid_lang(self):
        """TC-BE-003-04: 不正な言語コードのフォールバック。"""
        result = i18n.t("api.errors.team_not_found", lang="", team="test")
        assert result == "Team 'test' not found"

        result = i18n.t("api.errors.team_not_found", lang="invalid", team="test")
        assert result == "Team 'test' not found"


class TestI18nServiceReload:
    """翻訳再読み込みのテスト。"""

    def test_reload_translations(self):
        """翻訳ファイルの再読み込み機能。"""
        # 再読み込みがエラーなく完了することを確認
        i18n.reload_translations()
        # 再読み込み後も翻訳が正常に動作することを確認
        result = i18n.t("api.errors.team_not_found", lang="en", team="test")
        assert result == "Team 'test' not found"


class TestI18nServiceEdgeCases:
    """エッジケースのテスト。"""

    def test_empty_key(self):
        """空文字列キーの処理。"""
        result = i18n.t("", lang="en")
        assert result == ""

    def test_none_parameters(self):
        """None パラメータの扱い。"""
        result = i18n.t("api.errors.team_not_found", lang="en", team=None)
        # None が文字列 "None" に変換されることを確認
        assert "None" in result or "not found" in result

    def test_nested_namespace_key(self):
        """深いネスト構造のキー処理。"""
        # 深い階層のキー
        result = i18n.t("api.errors.team_not_found", lang="ja", team="test")
        assert "チーム" in result

    def test_translation_with_special_format_chars(self):
        """フォーマット文字を含む翻訳の処理。"""
        # {{}} 形式のプレースホルダーを含む翻訳
        result = i18n.t(
            "logs.cache.invalidate_inbox",
            lang="en",
            team="test-team",
            agent="test-agent"
        )
        assert "test-team" in result or "test-agent" in result
