#!/usr/bin/env node

/**
 * 翻訳キー整合性チェックスクリプト
 *
 * 3言語（ja, en, zh）すべての翻訳キーが揃っているかを検証する
 * Usage: node scripts/verify-translations.js
 */

const fs = require('fs');
const path = require('path');

// 設定
const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const SUPPORTED_LANGUAGES = ['ja', 'en', 'zh'];
const NAMESPACES = {
  frontend: ['common', 'header', 'dashboard', 'teamDetail', 'timeline', 'tasks', 'errors', 'models', 'a11y'],
  backend: ['api', 'logs'],
};

// 結果
let hasErrors = false;
const errors = [];

/**
 * ネストされたオブジェクトからすべてのキーを取得
 * @param {object} obj - 対象オブジェクト
 * @param {string} prefix - キーのプレフィックス
 * @returns {string[]} キーの配列
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * JSONファイルを読み込む
 * @param {string} filePath - ファイルパス
 * @returns {object|null} パースされたJSONまたはnull
 */
function loadJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // BOMを除去
    const contentWithoutBom = content.replace(/^\uFEFF/, '');
    return JSON.parse(contentWithoutBom);
  } catch (error) {
    errors.push({
      type: 'json_parse_error',
      file: filePath,
      message: error.message,
    });
    hasErrors = true;
    return null;
  }
}

/**
 * 指定されたロケールディレクトリの翻訳キーをチェック
 * @param {string} baseDir - ベースディレクトリ（frontend または backend）
 * @param {string[]} namespaces - 名前空間の配列
 */
function checkTranslationKeys(baseDir, namespaces) {
  const keysByLang = {};

  // 各言語のキーを収集
  for (const lang of SUPPORTED_LANGUAGES) {
    keysByLang[lang] = {};

    for (const ns of namespaces) {
      const filePath = path.join(baseDir, lang, `${ns}.json`);

      if (!fs.existsSync(filePath)) {
        errors.push({
          type: 'file_not_found',
          file: filePath,
          message: `翻訳ファイルが見つかりません: ${filePath}`,
        });
        hasErrors = true;
        continue;
      }

      const content = loadJsonFile(filePath);
      if (content) {
        keysByLang[lang][ns] = new Set(getAllKeys(content));
      }
    }
  }

  // キーの整合性をチェック
  for (const ns of namespaces) {
    const allKeys = new Set();

    // すべての言語のキーを収集
    for (const lang of SUPPORTED_LANGUAGES) {
      if (keysByLang[lang][ns]) {
        keysByLang[lang][ns].forEach(key => allKeys.add(key));
      }
    }

    // 各言語にすべてのキーが存在するかチェック
    for (const lang of SUPPORTED_LANGUAGES) {
      if (!keysByLang[lang][ns]) continue;

      for (const key of allKeys) {
        if (!keysByLang[lang][ns].has(key)) {
          errors.push({
            type: 'missing_key',
            namespace: ns,
            language: lang,
            key: key,
            message: `キー "${key}" が ${lang}/${ns}.json に存在しません`,
          });
          hasErrors = true;
        }
      }
    }
  }
}

/**
 * メイン処理
 */
function main() {
  console.log('🔍 翻訳キー整合性チェックを開始...\n');

  // フロントエンドのチェック
  const frontendDir = path.join(__dirname, '..', 'frontend', 'src', 'locales');
  if (fs.existsSync(frontendDir)) {
    console.log('📁 フロントエンド翻訳ファイルをチェック中...');
    checkTranslationKeys(frontendDir, NAMESPACES.frontend);
  } else {
    console.log('⚠️  フロントエンド翻訳ディレクトリが見つかりません:', frontendDir);
  }

  // バックエンドのチェック
  const backendDir = path.join(__dirname, '..', 'backend', 'locales');
  if (fs.existsSync(backendDir)) {
    console.log('📁 バックエンド翻訳ファイルをチェック中...');
    checkTranslationKeys(backendDir, NAMESPACES.backend);
  } else {
    console.log('⚠️  バックエンド翻訳ディレクトリが見つかりません:', backendDir);
  }

  // 結果を出力
  if (hasErrors) {
    console.log('\n❌ エラーが見つかりました:\n');
    for (const error of errors) {
      console.log(`  - [${error.type}] ${error.message}`);
    }
    console.log(`\n合計 ${errors.length} 件のエラー`);
    process.exit(1);
  } else {
    console.log('\n✅ すべての翻訳キーが整合しています！');
    process.exit(0);
  }
}

// 実行
main();
