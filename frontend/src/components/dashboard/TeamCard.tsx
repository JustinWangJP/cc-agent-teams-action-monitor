import { TeamSummary } from '@/types/team';
import { StatusBadge } from '@/components/common/StatusBadge';

/**
 * チーム情報をカード形式で表示するコンポーネント。
 *
 * チーム名、説明、メンバー数、ステータスを表示します。クリック時に
 * コールバック関数を実行でき、チーム詳細表示等に使用します。
 *
 * @param props.team - チームサマリーデータ
 * @param props.onClick - クリック時のコールバック関数（任意）
 * @returns チームカード要素
 *
 * @
 */
interface TeamCardProps {
  team: TeamSummary;
  onClick?: () => void;
}

export function TeamCard({ team, onClick }: TeamCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-primary-500"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {team.name}
        </h3>
        <StatusBadge status={team.status} />
      </div>

      {team.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {team.description}
        </p>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>{team.memberCount} members</span>
        </div>
        <span className="text-xs text-gray-400 truncate max-w-[100px]">
          {team.leadAgentId.split('@')[0]}
        </span>
      </div>
    </div>
  );
}
