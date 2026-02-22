/**
 * タスク監視パネルコンポーネント。
 *
 * 選択されたTeamのタスクリストを表示します。
 * 進捗バー、activeForm表示、依存関係表示を含みます。
 *
 * @module components/tasks/TaskMonitorPanel
 */

'use client';

import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { ExpandedTaskCard } from './ExpandedTaskCard';
import { useTeamTasks } from '@/hooks/useTasks';
import { TaskWithProgress } from '@/types/task';
import { clsx } from 'clsx';

/**
 * タスク監視パネルのプロパティ。
 */
export interface TaskMonitorPanelProps {
  /** チーム名 */
  teamName: string;
  /** タイムラインフィルタハンドラー（オプション） */
  onTimelineFilter?: (taskId: string) => void;
}

/**
 * Task を TaskWithProgress に変換するヘルパー関数。
 */
function convertToTaskWithProgress(task: {
  id: string;
  subject: string;
  description?: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deleted' | 'stopped';
  owner?: string;
  blocks?: string[];
  blockedBy?: string[];
  teamName?: string;
  startedAt?: string;
  completedAt?: string;
}): TaskWithProgress {
  return {
    id: task.id,
    subject: task.subject,
    status: task.status,
    owner: task.owner,
    blockedCount: task.blockedBy?.length ?? 0,
    teamName: task.teamName,
    activeForm: task.activeForm,
    progress: task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0,
    relatedFiles: [],
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    blocks: task.blocks,
    blockedBy: task.blockedBy,
  };
}

/**
 * タスク監視パネルコンポーネント。
 *
 * 選択されたTeamのタスクリストを表示します。
 * 進捗状況、アクティブフォーム、依存関係を確認できます。
 *
 * @example
 * ```tsx
 * <TaskMonitorPanel
 *   teamName="dashboard-dev"
 *   onTimelineFilter={(taskId) => console.log('Filter by task:', taskId)}
 * />
 * ```
 */
export const TaskMonitorPanel: React.FC<TaskMonitorPanelProps> = ({
  teamName,
  onTimelineFilter,
}) => {
  const { tasks, loading, error, refetch } = useTeamTasks(teamName);

  // TaskWithProgress に変換
  const tasksWithProgress = useMemo(() => {
    return tasks.map(convertToTaskWithProgress);
  }, [tasks]);

  // ステータス別にグループ化
  const { pendingTasks, inProgressTasks, completedTasks, otherTasks } = useMemo(() => {
    const pending: TaskWithProgress[] = [];
    const inProgress: TaskWithProgress[] = [];
    const completed: TaskWithProgress[] = [];
    const other: TaskWithProgress[] = [];

    tasksWithProgress.forEach((task) => {
      switch (task.status) {
        case 'pending':
          pending.push(task);
          break;
        case 'in_progress':
          inProgress.push(task);
          break;
        case 'completed':
          completed.push(task);
          break;
        default:
          other.push(task);
          break;
      }
    });

    return { pendingTasks: pending, inProgressTasks: inProgress, completedTasks: completed, otherTasks: other };
  }, [tasksWithProgress]);

  // 統計情報
  const stats = useMemo(() => {
    return {
      total: tasksWithProgress.length,
      pending: pendingTasks.length,
      inProgress: inProgressTasks.length,
      completed: completedTasks.length,
      other: otherTasks.length,
    };
  }, [tasksWithProgress, pendingTasks.length, inProgressTasks.length, completedTasks.length, otherTasks.length]);

  if (!teamName) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400">チームを選択してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            タスク監視
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {teamName} のタスク状況
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={loading}
          className={clsx(
            'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
            'text-slate-700 dark:text-slate-300',
            'bg-white dark:bg-slate-800',
            'border border-slate-300 dark:border-slate-700',
            'hover:bg-slate-50 dark:hover:bg-slate-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            loading && 'opacity-50 cursor-not-allowed',
          )}
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          更新
        </button>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-4 gap-2 p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{stats.total}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">全タスク</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-lg font-semibold text-amber-900 dark:text-amber-100">{stats.pending}</div>
            <div className="text-xs text-amber-700 dark:text-amber-300">未着手</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
          <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">{stats.inProgress}</div>
            <div className="text-xs text-blue-700 dark:text-blue-300">進行中</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          <div>
            <div className="text-lg font-semibold text-green-900 dark:text-green-100">{stats.completed}</div>
            <div className="text-xs text-green-700 dark:text-green-300">完了</div>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 mx-4 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* タスクリスト */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 進行中のタスク */}
        {inProgressTasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              進行中 ({inProgressTasks.length})
            </h3>
            <div className="space-y-2">
              {inProgressTasks.map((task) => (
                <ExpandedTaskCard
                  key={task.id}
                  task={task}
                  onTimelineFilter={onTimelineFilter}
                />
              ))}
            </div>
          </div>
        )}

        {/* 未着手のタスク */}
        {pendingTasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              未着手 ({pendingTasks.length})
            </h3>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <ExpandedTaskCard
                  key={task.id}
                  task={task}
                  onTimelineFilter={onTimelineFilter}
                />
              ))}
            </div>
          </div>
        )}

        {/* 完了したタスク */}
        {completedTasks.length > 0 && (
          <details className="group/completed">
            <summary className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 select-none">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              完了 ({completedTasks.length})
              <span className="group-open/completed:rotate-90 transition-transform">▶</span>
            </summary>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <ExpandedTaskCard
                  key={task.id}
                  task={task}
                  onTimelineFilter={onTimelineFilter}
                />
              ))}
            </div>
          </details>
        )}

        {/* その他のタスク */}
        {otherTasks.length > 0 && (
          <details className="group/other">
            <summary className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 select-none">
              <AlertCircle className="w-4 h-4 text-gray-500" />
              その他 ({otherTasks.length})
              <span className="group-open/other:rotate-90 transition-transform">▶</span>
            </summary>
            <div className="space-y-2">
              {otherTasks.map((task) => (
                <ExpandedTaskCard
                  key={task.id}
                  task={task}
                  onTimelineFilter={onTimelineFilter}
                />
              ))}
            </div>
          </details>
        )}

        {/* タスクがない場合 */}
        {tasksWithProgress.length === 0 && !loading && !error && (
          <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400">タスクがありません</p>
            </div>
          </div>
        )}

        {/* ローディング */}
        {loading && tasksWithProgress.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskMonitorPanel;
