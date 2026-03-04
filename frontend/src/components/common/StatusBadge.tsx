/**
 * ステータスを視覚的に表示するバッジコンポーネント。
 *
 * ステータスに応じた色の円形インジケーターとテキストを表示します。
 * active、idle、pending、in_progress、completed、stopped、unknown などに対応します。
 * ホバー時にツールチップでステータスの意味を表示します。
 *
 * @param props.status - ステータス文字列
 * @param props.size - バッジサイズ（'sm' | 'md'）
 * @param props.showTooltip - ツールチップを表示するかどうか（デフォルト true）
 * @returns ステータスバッジ要素
 *
 */
import { useTranslation } from 'react-i18next';

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

/**
 * 各ステータスの色
 */
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  idle: 'bg-gray-400',
  pending: 'bg-yellow-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  deleted: 'bg-red-500',
  stopped: 'bg-gray-500',
  inactive: 'bg-gray-400',
  unknown: 'bg-yellow-500',
};

export function StatusBadge({ status, size = 'sm', showTooltip = true }: StatusBadgeProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  const color = STATUS_COLORS[status] || 'bg-gray-400';
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  // ステータスの説明テキストを翻訳から取得
  const getDescription = (status: string): string => {
    const tooltipKey = `team_card.status.${status}_tooltip` as const;
    const statusKey = `team_card.status.${status}` as const;
    return t(tooltipKey, { defaultValue: t(statusKey, { defaultValue: status }) });
  };

  const description = getDescription(status);

  // ステータス表示テキストを翻訳から取得
  const getStatusText = (status: string): string => {
    const key = `team_card.status.${status}` as const;
    return t(key, { defaultValue: status.replace('_', ' ') });
  };

  const badgeContent = (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${sizeClasses} rounded-full ${color}`} />
      <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
        {getStatusText(status)}
      </span>
    </span>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <span
      className="relative group cursor-help"
      title={description}
    >
      {badgeContent}
      {/* ツールチップ */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
        {description}
        {/* 矢印 */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
      </span>
    </span>
  );
}
