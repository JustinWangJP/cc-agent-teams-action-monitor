import { TeamSummary } from '@/types/team';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ModelBadge } from '@/components/overview/ModelBadge';
import type { ModelUsage } from '@/types/model';

/**
 * チーム情報をカード形式で表示するコンポーネント。
 *
 * チーム名、説明、メンバー数、ステータスを表示します。クリック時に
 * コールバック関数を実行でき、チーム詳細表示等に使用します。
 *
 * @param props.team - チームサマリーデータ
 * @param props.onClick - クリック時のコールバック関数（任意）
 * @param props.models - モデル使用状況（任意）
 * @param props.showModels - モデルバッジを表示するかどうか（任意、デフォルトfalse）
 * @returns チームカード要素
 *
*/
interface TeamCardProps {
  team: TeamSummary;
  onClick?: () => void;
  models?: ModelUsage[];
  showModels?: boolean;
  className?: string;
}

export function TeamCard({
  team,
  onClick,
  models,
  showModels = false,
  className = ''
}: TeamCardProps) {
  // 停止状態のスタイル判定
  const isStopped = team.status === 'stopped';
  const borderClass = isStopped
    ? 'border-gray-400 dark:border-gray-600 opacity-70'
    : 'border-primary-500 dark:border-primary-400';

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer border-l-4 ${borderClass} ${className}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
          {team.name}
        </h3>
        <StatusBadge status={team.status} />
      </div>

      {team.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {team.description}
        </p>
      )}

      {/* モデルバッジセクション（オプション） */}
      {showModels && models && models.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {models.map((modelUsage) => (
            <ModelBadge
              key={modelUsage.config.id}
              model={modelUsage.config}
              count={modelUsage.count}
              size="sm"
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>{team.memberCount} members</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>{team.taskCount} tasks</span>
          </div>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[100px]">
          {team.leadAgentId.split('@')[0]}
        </span>
      </div>
    </div>
  );
}
