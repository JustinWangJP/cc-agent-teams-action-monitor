/**
 * チーム情報をカード形式で表示するコンポーネント（モデル可視化対応版）。
 *
 * チーム名、説明、メンバー数、モデル構成、ステータスを表示します。
 * ModelBadge を使用してチームで使用されているAIモデルを視覚的に表現します。
 *
 * @module components/overview/TeamCard
 */

import { Team } from '@/types/team';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ModelBadge } from './ModelBadge';
import { computeTeamModels } from '@/utils/teamModels';

/**
 * TeamCard コンポーネントのプロパティ。
 */
interface TeamCardProps {
  /** チームデータ */
  team: Team;
  /** クリック時のコールバック関数（任意） */
  onClick?: () => void;
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * チーム情報をカード形式で表示するコンポーネント。
 *
 * モデルバッジを表示し、チームで使用されているAIモデルを一目で把握できます。
 *
 * @param props - コンポーネントプロパティ
 * @returns チームカード要素
 *
 * @example
 * ```tsx
 * <TeamCard
 *   team={teamData}
 *   onClick={() => handleTeamClick(teamData.name)}
 * />
 * ```
 */
export function TeamCard({ team, onClick, className = '' }: TeamCardProps) {
  const teamModels = computeTeamModels(team.members);

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-l-4 border-primary-500 dark:border-primary-400 p-4 ${className}`}
      onClick={onClick}
    >
      {/* チーム名とステータス */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
          {team.name}
        </h3>
        <StatusBadge status={team.members.length > 0 ? 'active' : 'inactive'} />
      </div>

      {/* チーム説明 */}
      {team.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {team.description}
        </p>
      )}

      {/* モデルバッジセクション */}
      {teamModels.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {teamModels.map((modelUsage) => (
            <ModelBadge
              key={modelUsage.config.id}
              model={modelUsage.config}
              count={modelUsage.count}
              size="sm"
            />
          ))}
        </div>
      )}

      {/* メタ情報セクション */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
        {/* メンバー数 */}
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>{team.members.length} members</span>
        </div>

        {/* リードエージェント */}
        <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[100px]">
          {team.leadAgentId.split('@')[0]}
        </span>
      </div>
    </div>
  );
}
