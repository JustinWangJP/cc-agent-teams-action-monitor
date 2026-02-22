/**
 * タイムラインとタスク監視の分割レイアウトコンポーネント。
 *
 * Desktop: 左右2カラム (50%-50%)
 * Mobile: 上下配置
 *
 * @module components/timeline/TimelineTaskSplitLayout
 */

'use client';

import { memo, type ReactNode } from 'react';
import { clsx } from 'clsx';

/**
 * 分割レイアウトのプロパティ。
 */
export interface TimelineTaskSplitLayoutProps {
  /** タイムラインパネル（左または上） */
  timelinePanel: ReactNode;
  /** タスク監視パネル（右または下） */
  taskPanel: ReactNode;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * タイムラインとタスク監視の分割レイアウトコンポーネント。
 *
 * Desktop では左右50-50、Mobile では上下配置で表示します。
 *
 * @example
 * ```tsx
 * <TimelineTaskSplitLayout
 *   timelinePanel={<TimelinePanel teamName="dashboard-dev" />}
 *   taskPanel={<TaskMonitorPanel teamName="dashboard-dev" />}
 * />
 * ```
 */
export const TimelineTaskSplitLayout = memo<TimelineTaskSplitLayoutProps>(
  ({ timelinePanel, taskPanel, className = '' }) => {
    return (
      <div
        className={clsx(
          // コンテナ: Mobileでは縦積み、Desktopでは横並び
          'flex flex-col lg:flex-row lg:h-full gap-0',
          className
        )}
      >
        {/* 左: タイムラインパネル（全幅または50%） */}
        <div className="w-full lg:w-1/2 lg:h-full overflow-y-auto">
          {timelinePanel}
        </div>

        {/* 右: タスク監視パネル（全幅または50%） */}
        <div className="w-full lg:w-1/2 lg:h-full overflow-y-auto border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700">
          {taskPanel}
        </div>
      </div>
    );
  }
);

TimelineTaskSplitLayout.displayName = 'TimelineTaskSplitLayout';

export default TimelineTaskSplitLayout;
