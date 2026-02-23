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
export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

/**
 * 各ステータスの説明テキスト
 */
const STATUS_DESCRIPTIONS: Record<string, string> = {
  active: 'セッションログが1時間以内に更新されています（活動中）',
  inactive: 'チームにメンバーが存在しません',
  stopped: 'セッションログが1時間以上更新されていません（停止中）',
  unknown: 'セッションログが見つかりません（状態不明）',
  idle: 'アイドル状態',
  pending: '保留中',
  in_progress: '進行中',
  completed: '完了',
  deleted: '削除済み',
};

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
  const color = STATUS_COLORS[status] || 'bg-gray-400';
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  const description = STATUS_DESCRIPTIONS[status] || '不明なステータス';

  const badgeContent = (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${sizeClasses} rounded-full ${color}`} />
      <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
        {status.replace('_', ' ')}
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
