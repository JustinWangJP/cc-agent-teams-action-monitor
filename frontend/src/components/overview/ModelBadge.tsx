/**
 * AIモデルを視覚的に表現するバッジコンポーネント。
 *
 * モデル別に定義された色とアイコンで、AIモデルを一意に識別可能にします。
 * チームカードやメンバー情報などで使用されます。
 *
 * @module components/overview/ModelBadge
 */

import { getModelConfig } from '@/config/models';
import type { ModelConfig } from '@/types/model';

/**
 * Hex カラーコードを RGBA に変換するユーティリティ関数。
 *
 * @param hex - Hex カラーコード（例: #8B5CF6）
 * @param alpha - 不透明度（0.0 ~ 1.0）
 * @returns RGBA カラーコード
 */
function hexToRgba(hex: string, alpha: number): string {
  // Hash を削除
  const cleanHex = hex.replace('#', '');

  // RGB 値を抽出
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * ModelBadge コンポーネントのプロパティ。
 */
interface ModelBadgeProps {
  /** モデルIDまたはモデル設定 */
  model: string | ModelConfig;
  /** バッジサイズ（省略時は 'sm'） */
  size?: 'sm' | 'md';
  /** カウント数を表示する場合の数値 */
  count?: number;
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * AIモデルを視覚的に表現するバッジコンポーネント。
 *
 * モデル別の色とアイコン絵文字を表示します。オプションで使用数を表示可能です。
 *
 * @param props - コンポーネントプロパティ
 * @returns モデルバッジ要素
 *
 * @example
 * ```tsx
 * <ModelBadge model="claude-opus-4-6" />
 * // 出力: 🟣 Opus 4.6
 *
 * <ModelBadge model="claude-opus-4-6" count={5} />
 * // 出力: 🟣 Opus 4.6 × 5
 *
 * <ModelBadge model={{ id: 'claude-opus-4-6', color: '#8B5CF6', icon: '🟣', label: 'Opus 4.6', provider: 'anthropic' }} />
 * // 出力: 🟣 Opus 4.6
 * ```
 */
export function ModelBadge({ model, size = 'sm', count, className = '' }: ModelBadgeProps) {
  const config = typeof model === 'string' ? getModelConfig(model) : model;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  };

  const iconSize = {
    sm: 'text-sm',
    md: 'text-base',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${sizeClasses[size]}
        ${className}
      `}
      style={{
        backgroundColor: hexToRgba(config.color, 0.2),
        color: config.color,
        border: `1px solid ${hexToRgba(config.color, 0.4)}`,
      }}
      title={config.label}
    >
      <span className={iconSize[size]}>{config.icon}</span>
      <span className="font-medium">{config.label}</span>
      {count !== undefined && count > 0 && (
        <span className="opacity-80">× {count}</span>
      )}
    </span>
  );
}

/**
 * 複数のモデルバッジをグループ表示するコンポーネントのプロパティ。
 */
interface ModelBadgeGroupProps {
  /** モデルIDまたはモデル設定の配列 */
  models: Array<string | ModelConfig>;
  /** バッジサイズ（省略時は 'sm'） */
  size?: 'sm' | 'md';
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * 複数のモデルバッジをグループ表示するコンポーネント。
 *
 * チームで使用されている複数のモデルを一覧表示する際に使用します。
 *
 * @param props - コンポーネントプロパティ
 * @returns モデルバッジグループ要素
 *
 * @example
 * ```tsx
 * <ModelBadgeGroup models={['claude-opus-4-6', 'kimi-k2.5']} />
 * // 出力: 🟣 Opus 4.6  🟡 Kimi K2.5
 * ```
 */
export function ModelBadgeGroup({ models, size = 'sm', className = '' }: ModelBadgeGroupProps) {
  if (models.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {models.map((model, index) => (
        <ModelBadge key={index} model={model} size={size} />
      ))}
    </div>
  );
}
