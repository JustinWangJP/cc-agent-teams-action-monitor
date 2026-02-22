/**
 * ステータスを視覚的に表示するバッジコンポーネント。
 *
 * ステータスに応じた色の円形インジケーターとテキストを表示します。
 * active、idle、pending、in_progress、completed などに対応します。
 *
 * @param props.status - ステータス文字列
 * @param props.size - バッジサイズ（'sm' | 'md'）
 * @returns ステータスバッジ要素
 *
*/
export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    idle: 'bg-gray-400',
    pending: 'bg-yellow-500',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    deleted: 'bg-red-500',
    stopped: 'bg-gray-500',
    inactive: 'bg-gray-400',
  };

  const color = statusColors[status] || 'bg-gray-400';
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${sizeClasses} rounded-full ${color}`} />
      <span className="text-xs text-gray-600 capitalize">{status.replace('_', ' ')}</span>
    </span>
  );
}
