/**
 * AIモデル設定定義。
 *
 * Claude Code Agent Teams で使用される各AIモデルの視覚的表現（色、アイコン、ラベル）を定義します。
 * ModelBadge コンポーネントで使用されます。
 *
 * @module config/models
 */

import type { ModelConfig, ModelConfigs } from '@/types/model';

/**
 * AIモデルの設定定義。
 *
 * 各モデルID に対して、表示色、アイコン絵文字、ラベル、プロバイダ情報を定義します。
 */
export const MODEL_CONFIGS: ModelConfigs = {
  // Anthropic Claudeシリーズ
  'claude-opus-4-6': {
    id: 'claude-opus-4-6',
    color: '#8B5CF6', // violet-500
    icon: '🟣',
    label: 'Opus 4.6',
    provider: 'anthropic',
  },
  'claude-sonnet-4-5': {
    id: 'claude-sonnet-4-5',
    color: '#3B82F6', // blue-500
    icon: '🔵',
    label: 'Sonnet 4.5',
    provider: 'anthropic',
  },
  'claude-haiku-4-5': {
    id: 'claude-haiku-4-5',
    color: '#10B981', // green-500
    icon: '🟢',
    label: 'Haiku 4.5',
    provider: 'anthropic',
  },
  'claude-opus-4-5': {
    id: 'claude-opus-4-5',
    color: '#8B5CF6', // violet-500
    icon: '🟣',
    label: 'Opus 4.5',
    provider: 'anthropic',
  },
  'claude-sonnet-4-5-20250929': {
    id: 'claude-sonnet-4-5-20250929',
    color: '#3B82F6', // blue-500
    icon: '🔵',
    label: 'Sonnet 4.5',
    provider: 'anthropic',
  },
  'claude-haiku-4-5-20251001': {
    id: 'claude-haiku-4-5-20251001',
    color: '#10B981', // green-500
    icon: '🟢',
    label: 'Haiku 4.5',
    provider: 'anthropic',
  },

  // Moonshot AI (Kimi)
  'kimi-k2.5': {
    id: 'kimi-k2.5',
    color: '#F59E0B', // amber-500
    icon: '🟡',
    label: 'Kimi K2.5',
    provider: 'moonshot',
  },
  'kimi-k2': {
    id: 'kimi-k2',
    color: '#F59E0B', // amber-500
    icon: '🟡',
    label: 'Kimi K2',
    provider: 'moonshot',
  },

  // Zhipu AI (GLM)
  'glm-5': {
    id: 'glm-5',
    color: '#EF4444', // red-500
    icon: '🔴',
    label: 'GLM-5',
    provider: 'zhipu',
  },
  'glm-4': {
    id: 'glm-4',
    color: '#F87171', // red-400
    icon: '🔴',
    label: 'GLM-4',
    provider: 'zhipu',
  },

  // デフォルト（未知のモデル）
  'default': {
    id: 'unknown',
    color: '#6B7280', // gray-500
    icon: '⚪',
    label: 'Unknown',
    provider: 'other',
  },
};

/**
 * モデルIDからモデル設定を取得するユーティリティ関数。
 *
 * @param modelId - モデルID
 * @returns モデル設定（存在しない場合はデフォルト設定）
 */
export function getModelConfig(modelId: string): ModelConfig {
  return MODEL_CONFIGS[modelId] || MODEL_CONFIGS['default'];
}

/**
 * モデルプロバイダ別のモデルIDリストを取得するユーティリティ関数。
 *
 * @param provider - プロバイダ名
 * @returns モデルID配列
 */
export function getModelIdsByProvider(provider: string): string[] {
  return Object.values(MODEL_CONFIGS)
    .filter(config => config.provider === provider)
    .map(config => config.id);
}
