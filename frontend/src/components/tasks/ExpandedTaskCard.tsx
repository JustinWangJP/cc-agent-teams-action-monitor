/**
 * 拡張タスクカードコンポーネント。
 *
 * タスクの進捗、アクティブフォーム、関連ファイルを表示します。
 *
 * @module components/tasks/ExpandedTaskCard
 */

'use client';

import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { File, Folder, ArrowRight, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import type { TaskWithProgress } from '@/types/task';

/**
 * 拡張タスクカードのプロパティ。
 */
export interface ExpandedTaskCardProps {
  /** タスクデータ */
  task: TaskWithProgress;
  /** クリックハンドラー */
  onClick?: () => void;
  /** 担当者へのリンクを有効にするかどうか */
  enableOwnerLink?: boolean;
  /** タイムライン連携: タイムラインフィルタハンドラー */
  onTimelineFilter?: (taskId: string) => void;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * プログレスバーの色を取得するヘルパー関数。
 */
function getProgressColorClass(status: TaskWithProgress['status'], progress: number): string {
  if (status === 'completed') {
    return 'bg-green-500';
  }
  if (status === 'deleted') {
    return 'bg-red-500';
  }
  if (status === 'stopped') {
    return 'bg-gray-400';
  }
  if (progress >= 80) {
    return 'bg-green-500';
  }
  if (progress >= 50) {
    return 'bg-blue-500';
  }
  if (progress >= 25) {
    return 'bg-yellow-500';
  }
  return 'bg-slate-500';
}

/**
 * 拡張タスクカードコンポーネント。
 *
 * タスクの進捗、アクティブフォーム、関連ファイルを表示します。
 *
 * @example
 * ```tsx
 * <ExpandedTaskCard
 *   task={taskWithProgress}
 *   onClick={() => handleClick(task.id)}
 *   enableOwnerLink={true}
 * />
 * ```
 */
export const ExpandedTaskCard = memo<ExpandedTaskCardProps>(
  ({ task, onClick, enableOwnerLink = true, onTimelineFilter, className = '' }) => {
    const progressColorClass = getProgressColorClass(task.status, task.progress);

    // ステータスボーダー色
    const statusBorderColors: Record<TaskWithProgress['status'], string> = {
      pending: 'border-l-gray-400',
      in_progress: 'border-l-blue-500',
      completed: 'border-l-green-500',
      deleted: 'border-l-red-500',
      stopped: 'border-l-gray-500',
    };

    // ステータスラベル
    const statusLabels: Record<TaskWithProgress['status'], string> = {
      pending: '未着手',
      in_progress: '進行中',
      completed: '完了',
      deleted: '削除',
      stopped: '停止',
    };

    return (
      <div
        className={clsx(
          'bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 border-l-4 transition-all',
          statusBorderColors[task.status],
          onClick && 'cursor-pointer hover:shadow-lg',
          className
        )}
        onClick={onClick}
      >
        {/* ヘッダー: 件名とステータス */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                #{task.id}
              </span>
              <span className={clsx(
                'text-xs px-2 py-0.5 rounded',
                task.status === 'pending' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                task.status === 'in_progress' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                task.status === 'completed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                task.status === 'deleted' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                task.status === 'stopped' && 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
              )}>
                {statusLabels[task.status]}
              </span>
              {/* タイムライン連携ボタン */}
              {onTimelineFilter && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTimelineFilter(task.id);
                  }}
                  className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  title="タイムラインでこのタスクに関連するアクティビティを表示"
                >
                  🔗 タイムライン
                </button>
              )}
            </div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
              {task.subject}
            </h4>
          </div>
        </div>

        {/* タスク詳細（トグル） */}
        {task.description && (
          <details className="group/description mb-3">
            <summary className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none">
              <span>📝 詳細</span>
              <span className="group-open/description:rotate-90 transition-transform">▶</span>
            </summary>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap pl-2 border-l-2 border-slate-200 dark:border-slate-700">
              {task.description}
            </p>
          </details>
        )}

        {/* プログレスバー */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>進捗</span>
            <span>{task.progress}%</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={clsx('h-full transition-all duration-500', progressColorClass)}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>

        {/* アクティブフォーム（現在の作業内容） */}
        {task.activeForm && task.status === 'in_progress' && (
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-1">
              <span className="font-medium">🔄 進行中の作業</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {task.activeForm}
            </p>
          </div>
        )}

        {/* チーム名と担当者 */}
        <div className="flex items-center gap-2 mb-3">
          {task.teamName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <span>👥</span>
              <span>{task.teamName}</span>
            </span>
          )}
          {task.owner && (
            <span className={clsx(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
              enableOwnerLink && 'cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors',
              'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            )}>
              <span>👤</span>
              <span>{task.owner}</span>
            </span>
          )}
        </div>

        {/* メタ情報: 時刻、依存関係 */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
          <div className="flex items-center gap-4">
            {task.startedAt && (
              <span>開始: {formatDistanceToNow(new Date(task.startedAt), { addSuffix: true })}</span>
            )}
            {task.completedAt && (
              <span>完了: {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}</span>
            )}
          </div>
          {task.blockedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
              <Lock className="w-3 h-3" />
              Blocked by {task.blockedCount}
            </span>
          )}
        </div>

        {/* サブタスク状態（依存関係） */}
        {(task.blocks?.length ?? 0) > 0 || (task.blockedBy?.length ?? 0) > 0 ? (
          <details className="group/details mb-3">
            <summary className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none">
              <span>🔗 依存関係</span>
              <span className="group-open/details:rotate-90 transition-transform">▶</span>
            </summary>
            <div className="mt-2 space-y-2 text-xs">
              {/* blockedBy: このタスクをブロックしているタスク */}
              {task.blockedBy && task.blockedBy.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
                    <Lock className="w-3 h-3" />
                    <span className="font-medium">ブロック中 (以下のタスクの完了を待機)</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pl-4">
                    {task.blockedBy.map((taskId) => (
                      <span
                        key={taskId}
                        className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded"
                      >
                        #{taskId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* blocks: このタスクがブロックしているタスク */}
              {task.blocks && task.blocks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-medium">ブロックしている (このタスク完了後に開始)</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pl-4">
                    {task.blocks.map((taskId) => (
                      <span
                        key={taskId}
                        className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded"
                      >
                        #{taskId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        ) : null}

        {/* 関連ファイル */}
        {task.relatedFiles && task.relatedFiles.length > 0 && (
          <details className="group/details">
            <summary className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none">
              <span>📁 関連ファイル ({task.relatedFiles.length})</span>
              <span className="group-open/details:rotate-90 transition-transform">▶</span>
            </summary>
            <div className="mt-2 space-y-1 pl-2">
              {task.relatedFiles.slice(0, 10).map((filePath, index) => {
                const fileName = filePath.split('/').pop() || filePath;
                const isFile = fileName.includes('.');
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 truncate"
                    title={filePath}
                  >
                    {isFile ? (
                      <File className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <Folder className="w-3 h-3 flex-shrink-0" />
                    )}
                    <span className="truncate">{filePath}</span>
                  </div>
                );
              })}
              {task.relatedFiles.length > 10 && (
                <div className="text-xs text-slate-400 dark:text-slate-500 italic">
                  ... 他 {task.relatedFiles.length - 10} 件
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    );
  }
);

ExpandedTaskCard.displayName = 'ExpandedTaskCard';

/**
 * タスク進捗バーのみのシンプルなコンポーネント。
 */
export interface TaskProgressBarProps {
  /** 進捗（0-100） */
  progress: number;
  /** ステータス */
  status: TaskWithProgress['status'];
  /** サイズ */
  size?: 'sm' | 'md';
}

export const TaskProgressBar = memo<TaskProgressBarProps>(
  ({ progress, status, size = 'sm' }) => {
    const progressColorClass = getProgressColorClass(status, progress);
    const heightClass = size === 'sm' ? 'h-1' : 'h-2';

    return (
      <div className={clsx('w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden', heightClass)}>
        <div
          className={clsx('transition-all duration-500', progressColorClass, heightClass)}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    );
  }
);

TaskProgressBar.displayName = 'TaskProgressBar';

export default ExpandedTaskCard;
