import { TaskSummary } from '@/types/task';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useTranslation } from 'react-i18next';

/**
 * タスク情報をカード形式で表示するコンポーネント。
 *
 * タスク件名、ステータス、ID、チーム名、依存タスク数、担当者を表示します。
 * ステータスに応じて左ボーダーの色が変化します。
 *
 * @param props.task - タスクサマリーデータ
 * @returns タスクカード要素
 *
*/
interface TaskCardProps {
  task: TaskSummary;
}

export function TaskCard({ task }: TaskCardProps) {
  const { t } = useTranslation(['tasks', 'common']);
  const statusColors: Record<string, string> = {
    pending: 'border-l-gray-400',
    in_progress: 'border-l-blue-500',
    completed: 'border-l-green-500',
    deleted: 'border-l-red-500',
    stopped: 'border-l-gray-500',
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${statusColors[task.status] || 'border-l-gray-400'}`}>
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-medium text-gray-900 text-sm flex-1 pr-2">{task.subject}</h4>
        <StatusBadge status={task.status} size="sm" />
      </div>

      {/* チーム名と担当者を目立たせる */}
      <div className="flex items-center gap-2 mb-2">
        {task.teamName && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {task.teamName}
          </span>
        )}
        {task.owner && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            {task.owner}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="font-mono">#{task.id}</span>
        {task.blockedCount > 0 && (
          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {t('task_card.blocked_by')}: {task.blockedCount}
          </span>
        )}
      </div>
    </div>
  );
}
