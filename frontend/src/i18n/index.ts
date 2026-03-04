import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 日本語翻訳
import jaCommon from '@/locales/ja/common.json';
import jaHeader from '@/locales/ja/header.json';
import jaDashboard from '@/locales/ja/dashboard.json';
import jaTeamDetail from '@/locales/ja/teamDetail.json';
import jaTimeline from '@/locales/ja/timeline.json';
import jaTasks from '@/locales/ja/tasks.json';
import jaErrors from '@/locales/ja/errors.json';
import jaModels from '@/locales/ja/models.json';
import jaA11y from '@/locales/ja/a11y.json';

// 英語翻訳
import enCommon from '@/locales/en/common.json';
import enHeader from '@/locales/en/header.json';
import enDashboard from '@/locales/en/dashboard.json';
import enTeamDetail from '@/locales/en/teamDetail.json';
import enTimeline from '@/locales/en/timeline.json';
import enTasks from '@/locales/en/tasks.json';
import enErrors from '@/locales/en/errors.json';
import enModels from '@/locales/en/models.json';
import enA11y from '@/locales/en/a11y.json';

// 中国語翻訳
import zhCommon from '@/locales/zh/common.json';
import zhHeader from '@/locales/zh/header.json';
import zhDashboard from '@/locales/zh/dashboard.json';
import zhTeamDetail from '@/locales/zh/teamDetail.json';
import zhTimeline from '@/locales/zh/timeline.json';
import zhTasks from '@/locales/zh/tasks.json';
import zhErrors from '@/locales/zh/errors.json';
import zhModels from '@/locales/zh/models.json';
import zhA11y from '@/locales/zh/a11y.json';

/**
 * i18nインスタンスの初期化
 */
export const initI18n = async (): Promise<void> => {
  // すでに初期化されている場合は何もしない
  if (i18n.isInitialized) {
    return Promise.resolve();
  }

  // 検出された言語またはデフォルト言語を決定
  const detectedLanguage =
    localStorage.getItem('language') ||
    navigator.language.split('-')[0] ||
    'en';

  // サポートされている言語に制限
  const supportedLngs = ['ja', 'en', 'zh'];
  const lng = supportedLngs.includes(detectedLanguage) ? detectedLanguage : 'en';

  await i18n.use(LanguageDetector).use(initReactI18next).init({
    resources: {
      ja: {
        common: jaCommon,
        header: jaHeader,
        dashboard: jaDashboard,
        teamDetail: jaTeamDetail,
        timeline: jaTimeline,
        tasks: jaTasks,
        errors: jaErrors,
        models: jaModels,
        a11y: jaA11y,
      },
      en: {
        common: enCommon,
        header: enHeader,
        dashboard: enDashboard,
        teamDetail: enTeamDetail,
        timeline: enTimeline,
        tasks: enTasks,
        errors: enErrors,
        models: enModels,
        a11y: enA11y,
      },
      zh: {
        common: zhCommon,
        header: zhHeader,
        dashboard: zhDashboard,
        teamDetail: zhTeamDetail,
        timeline: zhTimeline,
        tasks: zhTasks,
        errors: zhErrors,
        models: zhModels,
        a11y: zhA11y,
      },
    },
    fallbackLng: 'en',
    supportedLngs,
    ns: ['common', 'header', 'dashboard', 'teamDetail', 'timeline', 'tasks', 'errors', 'models', 'a11y'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // ReactはXSSを防ぐためエスケープ不要
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
    lng, // 初期言語を設定
  });

  // HTMLのlang属性を設定
  document.documentElement.lang = lng;

  return Promise.resolve();
};

// 言語変更時のHTML lang属性更新を監視
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
