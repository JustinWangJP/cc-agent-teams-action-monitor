/**
 * タイムラインとタスク監視の分割レイアウトコンポーネント。
 *
 * Desktop: 左右2カラム（メッセージエリア + 折りたたみ可能なタスクパネル）
 * Mobile: 上下配置
 *
 * @module components/timeline/TimelineTaskSplitLayout
 */

'use client';

import { memo, type ReactNode } from 'react';
import { clsx } from 'clsx';

/** タスクパネル展開時の幅（px） */
const TASK_PANEL_EXPANDED_WIDTH = 300;
/** タスクパネル最小化時の幅（px） */
const TASK_PANEL_COLLAPSED_WIDTH = 48;

/**
 * 分割レイアウトのプロパティ。
 */
export interface TimelineTaskSplitLayoutProps {
  /** タイムラインパネル（左または上） */
  timelinePanel: ReactNode;
  /** タスク監視パネル（右または下） */
  taskPanel: ReactNode;
  /** タスクパネルが折りたたまれているか */
  isTaskPanelCollapsed?: boolean;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * タイムラインとタスク監視の分割レイアウトコンポーネント。
 *
 * Desktop では左右分割、Mobile では上下配置で表示します。
 * タスクパネルは折りたたみ可能で、展開時は300px、最小化時は48pxです。
 *
 * @example
 * ```tsx
 * <TimelineTaskSplitLayout
 *   timelinePanel={<TimelinePanel teamName="dashboard-dev" />}
 *   taskPanel={<TaskMonitorPanel teamName="dashboard-dev" />}
 *   isTaskPanelCollapsed={false}
 * />
 * ```
 */
export const TimelineTaskSplitLayout = memo<TimelineTaskSplitLayoutProps>(
  ({ timelinePanel, taskPanel, isTaskPanelCollapsed = false, className = '' }) => {
    const taskPanelWidth = isTaskPanelCollapsed
      ? TASK_PANEL_COLLAPSED_WIDTH
      : TASK_PANEL_EXPANDED_WIDTH;

    return (
      <div
        className={clsx(
          // コンテナ: Mobileでは縦積み、Desktopでは横並び
          'flex flex-col lg:flex-row lg:h-full gap-0',
          className
        )}
      >
        {/* 左: タイムラインパネル（可変幅） */}
        <div
          className={clsx(
            'w-full lg:h-full overflow-y-auto',
            'transition-all duration-300 ease-out'
          )}
          style={{
            width: `calc(100% - ${taskPanelWidth}px)`,
          }}
        >
          {timelinePanel}
        </div>

        {/* 右: タスク監視パネル（固定幅） */}
        <div
          className={clsx(
            'w-full lg:h-full overflow-y-auto',
            'border-t lg:border-t-0 lg:border-l',
            'border-slate-200 dark:border-slate-700',
            'transition-all duration-300 ease-out',
            'flex-shrink-0'
          )}
          style={{
            width: taskPanelWidth,
          }}
        >
          {taskPanel}
        </div>
      </div>
    );
  }
);

TimelineTaskSplitLayout.displayName = 'TimelineTaskSplitLayout';

export default TimelineTaskSplitLayout;
