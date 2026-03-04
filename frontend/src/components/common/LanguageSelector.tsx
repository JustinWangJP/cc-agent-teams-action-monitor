import { useTranslation } from 'react-i18next';

/**
 * 言語選択肢の定義
 */
const LANGUAGES = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
] as const;

/**
 * 言語コードの型
 */
type LanguageCode = typeof LANGUAGES[number]['code'];

/**
 * LanguageSelector コンポーネント
 *
 * 言語切り替え用のセレクターを表示します。
 * 選択した言語は localStorage に永続化されます。
 *
 * @returns 言語選択セレクター要素
 */
export function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value as LanguageCode;
    i18n.changeLanguage(newLanguage);
  };

  return (
    <select
      value={i18n.language}
      onChange={handleLanguageChange}
      aria-label={t('a11y.language_selector')}
      className="px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors cursor-pointer"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
