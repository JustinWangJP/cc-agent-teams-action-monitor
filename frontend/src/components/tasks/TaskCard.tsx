import { TaskSummary } from '@/types/task';
import { StatusBadge } from '@/components/common/StatusBadge';

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
  const statusColors: Record<string, string> = {
    pending: 'border-l-gray-400',
    in_progress: 'border-l-blue-500',
    completed: 'border-l-green-500',
    deleted: 'border-l-red-500',
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${statusColors[task.status] || 'border-l-gray-400'}`}>
      <div className="flex justify-between items-start">
        <h4 className="font-medium text-gray-900 text-sm">{task.subject}</h4>
        <StatusBadge status={task.status} size="sm" />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>#{task.id}</span>
        {task.teamName && (
          <span className="text-primary-600">{task.teamName}</span>
        )}
      </div>
      {task.blockedCount > 0 && (
        <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Blocked by {task.blockedCount}
        </div>
      )}
      {task.owner && (
        <div className="mt-2 text-xs text-gray-500">
          Owner: {task.owner}
        </div>
      )}
    </div>
  );
}
