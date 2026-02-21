/**
 * 拡張エージェントカードコンポーネント。
 *
 * エージェントの詳細情報（状態、進捗、タスク、ファイル）を表示します。
 *
 * @module components/agent/ExpandedAgentCard
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import { memo } from 'react';
import { File, Folder } from 'lucide-react';
import { clsx } from 'clsx';
import type { AgentStatus, AgentStatusType } from '@/types/agent';
import { getAgentStatusConfig, getProgressColorClass } from '@/types/agent';

/**
 * 拡張エージェントカードのプロパティ。
 */
export interface ExpandedAgentCardProps {
  /** エージェント状態データ */
  agent: AgentStatus;
  /** クリックハンドラー */
  onClick?: () => void;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 拡張エージェントカードコンポーネント。
 *
 * エージェントの状態、進捗、現在のタスク、関連ファイルを表示します。
 *
 * @example
 * ```tsx
 * <ExpandedAgentCard
 *   agent={agentStatus}
 *   onClick={() => handleClick(agentStatus.agentId)}
 * />
 * ```
 */
export const ExpandedAgentCard = memo<ExpandedAgentCardProps>(
  ({ agent, onClick, className = '' }) => {
    const statusConfig = getAgentStatusConfig(agent.status);
    const progressColorClass = getProgressColorClass(agent.progress, agent.status);

    // 進捗計算
    const progress = agent.assignedTasks.length > 0
      ? Math.round((agent.completedTasks.length / agent.assignedTasks.length) * 100)
      : agent.progress;

    // タスク情報の表示
    const taskInfo = agent.currentTaskSubject
      ? agent.currentTaskSubject
      : agent.currentTaskId
        ? `Task #${agent.currentTaskId}`
        : 'タスクなし';

    return (
      <div
        className={clsx(
          'bg-white dark:bg-slate-800 rounded-lg shadow-md border-l-4 transition-all',
          statusConfig.borderClass,
          onClick && 'cursor-pointer hover:shadow-lg',
          className
        )}
        onClick={onClick}
      >
        <div className="p-4">
          {/* ヘッダー: エージェント名とステータス */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* アバター（初期文字） */}
              <div
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2',
                  statusConfig.bgClass,
                  statusConfig.textClass,
                  statusConfig.borderClass
                )}
              >
                {agent.name.slice(0, 2).toUpperCase()}
              </div>

              {/* エージェント名と状態 */}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {agent.name}
                  </h3>
                  <span className="text-lg">{statusConfig.icon}</span>
                </div>
                <div className={clsx('text-xs', statusConfig.textClass)}>
                  {statusConfig.label}
                </div>
              </div>
            </div>

            {/* モデル情報 */}
            {agent.model && (
              <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
                {agent.model}
              </div>
            )}
          </div>

          {/* プログレスバー */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>進捗</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={clsx('h-full transition-all duration-500', progressColorClass)}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 現在のタスク */}
          <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-900/30 rounded">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>📋 現在のタスク</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 truncate" title={taskInfo}>
              {taskInfo}
            </p>
            {/* activeForm: 進行中の作業内容 */}
            {agent.activeForm && (
              <div className="mt-2 flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400">
                <span className="flex-shrink-0">🔄</span>
                <span className="italic">{agent.activeForm}</span>
              </div>
            )}
          </div>

          {/* タスク統計 */}
          <div className="mb-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <span>📋</span>
              <span>担当: {agent.assignedTasks.length}件</span>
            </div>
            <div className="flex items-center gap-1">
              <span>✅</span>
              <span>完了: {agent.completedTasks.length}件</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🕒</span>
              <span>{formatDistanceToNow(new Date(agent.lastActivityAt), { addSuffix: true })}</span>
            </div>
          </div>

          {/* 関連ファイル */}
          {agent.touchedFiles.length > 0 && (
            <div>
              <details className="group/details">
                <summary className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none">
                  <span>📁 関連ファイル ({agent.touchedFiles.length})</span>
                  <span className="group-open/details:rotate-90 transition-transform">▶</span>
                </summary>
                <div className="mt-2 space-y-1 pl-2">
                  {agent.touchedFiles.slice(0, 10).map((filePath, index) => {
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
                  {agent.touchedFiles.length > 10 && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 italic">
                      ... 他 {agent.touchedFiles.length - 10} 件
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ExpandedAgentCard.displayName = 'ExpandedAgentCard';

/**
 * エージェント状態インジケーターコンポーネント。
 *
 * 小さなステータスインジケーターを表示します。
 */
export interface AgentStatusIndicatorProps {
  /** エージェント状態 */
  status: AgentStatusType;
  /** 進捗（0-100） */
  progress?: number;
  /** サイズ */
  size?: 'sm' | 'md' | 'lg';
}

export const AgentStatusIndicator = memo<AgentStatusIndicatorProps>(
  ({ status, progress = 0, size = 'sm' }) => {
    const statusConfig = getAgentStatusConfig(status);
    const progressColorClass = getProgressColorClass(progress, status);

    const sizeClasses = {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4',
    };

    return (
      <div className="relative inline-flex items-center" title={`${statusConfig.label} (${progress}%)`}>
        {/* ステータスインジケーター - progressColorClassを使用 */}
        <div
          className={clsx(
            'rounded-full',
            sizeClasses[size],
            progressColorClass
          )}
        />
        {/* 作業中の場合はパルスアニメーション */}
        {status === 'working' && (
          <div
            className={clsx(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              sizeClasses[size],
              'bg-blue-400'
            )}
          />
        )}
      </div>
    );
  }
);

AgentStatusIndicator.displayName = 'AgentStatusIndicator';

export default ExpandedAgentCard;
