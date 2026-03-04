/**
 * タスク監視パネルコンポーネント。
 *
 * 選択されたTeamのタスクリストを表示します。
 * 進捗バー、activeForm表示、依存関係表示を含みます。
 * 折りたたみ可能で、最小化時は統計アイコンのみ表示します。
 *
 * @module components/tasks/TaskMonitorPanel
 */

'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, LayoutList, ChevronLeft, PauseCircle } from 'lucide-react';
import { ExpandedTaskCard } from './ExpandedTaskCard';
import { useTeamTasks } from '@/hooks/useTasks';
import { TaskWithProgress } from '@/types/task';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

/**
 * タスク監視パネルのプロパティ。
 */
export interface TaskMonitorPanelProps {
  /** チーム名 */
  teamName: string;
  /** タイムラインフィルタハンドラー（オプション） */
  onTimelineFilter?: (taskId: string) => void;
  /** パネルが折りたたまれているか */
  isCollapsed?: boolean;
  /** 折りたたみ切り替えハンドラー */
  onToggle?: () => void;
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
    description: task.description,
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
 * Portalを使用したツールチップコンポーネント。
 * overflowコンテナにクリップされずに表示されます。
 */
interface PortalTooltipProps {
  content: string;
  children: React.ReactNode;
  position: 'left';
}

const PortalTooltip: React.FC<PortalTooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.left - 8,
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible]);

  const tooltipContent = isVisible ? (
    <div
      className="fixed transform -translate-y-1/2 -translate-x-full px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none z-[9999]"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {content}
      <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-4 border-transparent border-l-gray-900 dark:border-l-gray-700" />
    </div>
  ) : null;

  return (
    <span
      ref={triggerRef}
      className="cursor-help"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {typeof window !== 'undefined' && createPortal(tooltipContent, document.body)}
    </span>
  );
};

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
 *   isCollapsed={false}
 *   onToggle={() => setCollapsed(!collapsed)}
 * />
 * ```
 */
export const TaskMonitorPanel: React.FC<TaskMonitorPanelProps> = ({
  teamName,
  onTimelineFilter,
  isCollapsed = false,
  onToggle,
}) => {
  const { t } = useTranslation('tasks');
  const { tasks, loading, error } = useTeamTasks(teamName);

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

  // チーム未選択時の表示
  if (!teamName) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400">{t('monitor.select_team')}</p>
        </div>
      </div>
    );
  }

  // 最小化表示（48px幅の縦列）
  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 shadow-lg">
        {/* 展開ボタン（上部） */}
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-center p-2 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
          aria-label={t('monitor.expand_panel')}
          title={t('monitor.expand_panel')}
        >
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400 rotate-180" />
        </button>

        {/* 統計アイコン縦列 */}
        <div className="flex-1 flex flex-col items-center py-4 space-y-4 overflow-y-auto px-1">
          {/* 全タスク */}
          <PortalTooltip content={t('monitor.tooltips.total')} position="left">
            <div className="flex flex-col items-center justify-center">
              <LayoutList className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                {stats.total}
              </span>
            </div>
          </PortalTooltip>

          {/* 未着手 */}
          <PortalTooltip content={t('monitor.tooltips.pending')} position="left">
            <div className="flex flex-col items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-100 mt-1">
                {stats.pending}
              </span>
            </div>
          </PortalTooltip>

          {/* 進行中 */}
          <PortalTooltip content={t('monitor.tooltips.in_progress')} position="left">
            <div className="flex flex-col items-center justify-center">
              <RefreshCw className={clsx(
                'w-5 h-5 text-blue-600 dark:text-blue-400',
                loading && 'animate-spin'
              )} />
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-100 mt-1">
                {stats.inProgress}
              </span>
            </div>
          </PortalTooltip>

          {/* 待機中（ブロックされているタスク） */}
          {stats.other > 0 && (
            <PortalTooltip content={t('monitor.tooltips.other')} position="left">
              <div className="flex flex-col items-center justify-center">
                <PauseCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  {stats.other}
                </span>
              </div>
            </PortalTooltip>
          )}

          {/* 完了 */}
          <PortalTooltip content={t('monitor.tooltips.completed')} position="left">
            <div className="flex flex-col items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold text-green-900 dark:text-green-100 mt-1">
                {stats.completed}
              </span>
            </div>
          </PortalTooltip>
        </div>

        {/* ローディング表示（最小化時） */}
        {loading && (
          <div className="flex items-center justify-center p-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // 展開表示（300px幅）
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 shadow-lg">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('monitor.title')}
          </h2>
        </div>
        <div className="flex items-center gap-2">

          {/* 折りたたみボタン */}
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className={clsx(
                'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                'text-slate-600 dark:text-slate-400',
                'hover:bg-slate-100 dark:hover:bg-slate-800',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              )}
              aria-label={t('monitor.collapse_panel')}
              title={t('monitor.collapse_panel')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 統計情報（2列レイアウト） */}
      <div className="grid grid-cols-2 gap-2 p-4 border-b border-slate-200 dark:border-slate-700">
        <span className="relative group cursor-help">
          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded min-h-[60px]">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <LayoutList className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{stats.total}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{t('monitor.stats.total')}</div>
            </div>
          </div>
          {/* ツールチップ */}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
            {t('monitor.tooltips.total')}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </span>
        </span>
        <span className="relative group cursor-help">
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded min-h-[60px]">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="text-lg font-semibold text-amber-900 dark:text-amber-100">{stats.pending}</div>
              <div className="text-xs text-amber-700 dark:text-amber-300">{t('monitor.stats.pending')}</div>
            </div>
          </div>
          {/* ツールチップ */}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
            {t('monitor.tooltips.pending')}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </span>
        </span>
        <span className="relative group cursor-help">
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded min-h-[60px]">
            <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">{stats.inProgress}</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">{t('monitor.stats.in_progress')}</div>
            </div>
          </div>
          {/* ツールチップ */}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
            {t('monitor.tooltips.in_progress')}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </span>
        </span>
        <span className="relative group cursor-help">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded min-h-[60px]">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <div>
              <div className="text-lg font-semibold text-green-900 dark:text-green-100">{stats.completed}</div>
              <div className="text-xs text-green-700 dark:text-green-300">{t('monitor.stats.completed')}</div>
            </div>
          </div>
          {/* ツールチップ */}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
            {t('monitor.tooltips.completed')}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </span>
        </span>
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
      <div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4">
        {/* 進行中のタスク */}
        {inProgressTasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              {t('monitor.sections.in_progress')} ({inProgressTasks.length})
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
              {t('monitor.sections.pending')} ({pendingTasks.length})
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
              {t('monitor.sections.completed')} ({completedTasks.length})
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
              {t('monitor.sections.other')} ({otherTasks.length})
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
              <p className="text-slate-500 dark:text-slate-400">{t('monitor.no_tasks')}</p>
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
