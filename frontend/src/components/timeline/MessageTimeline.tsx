/**
 * メッセージタイムラインコンポーネント。
 *
 * vis-timeline を使用して、エージェント間のメッセージ通信を時系列で可視化します。
 *
 * @module components/timeline/MessageTimeline
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Timeline, type TimelineOptions } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data/peer';
import type { TimelineGroup, TimelineData as TimelineDataType } from '@/types/timeline';
import type { ParsedMessage } from '@/types/message';
import { useDashboardStore } from '@/stores/dashboardStore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';

/**
 * メッセージタイムラインコンポーネントのプロパティ。
 */
interface MessageTimelineProps {
  /** チーム名 */
  teamName: string;
  /** タイムラインデータ */
  data?: TimelineDataType;
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** アイテムクリック時のコールバック */
  onItemClick?: (message: ParsedMessage) => void;
}

/**
 * デフォルトのタイムラインオプション。
 */
const DEFAULT_OPTIONS: TimelineOptions = {
  orientation: { axis: 'top', item: 'top' },
  verticalScroll: true,
  horizontalScroll: true,
  zoomMin: 1000 * 60 * 1, // 1分
  zoomMax: 1000 * 60 * 60 * 24, // 24時間
  editable: false,
  selectable: true,
  margin: {
    item: { horizontal: 10, vertical: 5 },
    axis: 5,
  },
  format: {
    minorLabels: {
      millisecond: 'SSS',
      second: 'HH:mm:ss',
      minute: 'HH:mm',
      hour: 'HH:mm',
    },
    majorLabels: {
      millisecond: 'HH:mm:ss',
      second: 'yyyy-MM-dd HH:mm',
      minute: 'yyyy-MM-dd HH:mm',
      hour: 'yyyy-MM-dd HH:mm',
      weekday: 'yyyy-MM-dd',
      day: 'yyyy-MM-dd',
      month: 'yyyy-MM',
      year: 'yyyy',
    },
  },
};

/**
 * メッセージタイムラインコンポーネント。
 *
 * vis-timeline を使用してメッセージを時系列表示します。
 * アイテムクリックで詳細モーダルを表示可能です。
 *
 * @example
 * ```tsx
 * <MessageTimeline
 *   teamName="dashboard-dev"
 *   data={timelineData}
 *   isLoading={false}
 *   onItemClick={(msg) => setSelectedMessage(msg)}
 * />
 * ```
 */
export const MessageTimeline: React.FC<MessageTimelineProps> = ({
  teamName: _teamName,
  data,
  isLoading = false,
  error = null,
  onItemClick,
}) => {
  /** タイムラインコンテナのDOM参照 */
  const containerRef = useRef<HTMLDivElement>(null);
  /** Timeline インスタンス */
  const timelineRef = useRef<Timeline | null>(null);
  /** データセット */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemsDatasetRef = useRef<DataSet<any, 'id'> | null>(null);
  /** グループデータセット */
  const groupsDatasetRef = useRef<DataSet<TimelineGroup, 'id'> | null>(null);

  // 個別セレクターを使用して無限ループを防止
  const autoScrollTimeline = useDashboardStore((state) => state.autoScrollTimeline);
  const selectedMessage = useDashboardStore((state) => state.selectedMessage);
  const setSelectedMessage = useDashboardStore((state) => state.setSelectedMessage);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  /** タイマーID（1秒ごとのカレントタイム更新用） */
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * タイムライン初期化。
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // データセット作成
    itemsDatasetRef.current = new DataSet<any, 'id'>([]);
    groupsDatasetRef.current = new DataSet<TimelineGroup, 'id'>([]);

    // Timeline 作成
    timelineRef.current = new Timeline(
      containerRef.current,
      itemsDatasetRef.current as any,
      groupsDatasetRef.current as any,
      DEFAULT_OPTIONS,
    );

    // カレントタイムバーを追加
    timelineRef.current.addCustomTime(new Date(), 'currentTime');

    // アイテムクリックイベント
    timelineRef.current.on('click', (properties) => {
      if (properties.item) {
        const item = itemsDatasetRef.current?.get(properties.item as string);
        if (item && onItemClick) {
          onItemClick(item as ParsedMessage);
          setSelectedMessage(item as ParsedMessage);
        }
      }
    });

    return () => {
      timelineRef.current?.destroy();
      timelineRef.current = null;
      itemsDatasetRef.current = null;
      groupsDatasetRef.current = null;
    };
  }, [onItemClick, setSelectedMessage]);

  /**
   * データ更新時の再描画。
   */
  useEffect(() => {
    if (!data || !timelineRef.current) return;

    // アイテム更新
    itemsDatasetRef.current?.clear();
    itemsDatasetRef.current?.add(data.items as any);

    // グループ更新
    groupsDatasetRef.current?.clear();
    groupsDatasetRef.current?.add(data.groups);

    // 時間範囲を設定
    if (data.timeRange) {
      const start = new Date(data.timeRange.min);
      const end = new Date(data.timeRange.max);
      timelineRef.current.setWindow(start, end);
    }

    // 自動スクロールが有効な場合、最新メッセージにスクロール
    if (autoScrollTimeline && data.items.length > 0) {
      const lastItem = data.items[data.items.length - 1];
      const lastTime = new Date(lastItem.start);
      timelineRef.current.moveTo(lastTime);
    }
  }, [data, autoScrollTimeline]);

  /**
   * 1秒ごとにカレントタイムを更新。
   */
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      setCurrentTime(now);
      timelineRef.current?.setCustomTime(now, 'currentTime');
    };

    timerIdRef.current = setInterval(updateCurrentTime, 1000);

    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
    };
  }, []);

  /**
   * 選択中のメッセージが変更された場合、該当アイテムを選択状態にする。
   */
  useEffect(() => {
    if (!timelineRef.current || !selectedMessage) return;
    // selectedMessage に id プロパティがある場合のみ選択
    const msgId = (selectedMessage as any).id;
    if (msgId) {
      timelineRef.current.setSelection(msgId);
    }
  }, [selectedMessage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400">タイムラインを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">エラーが発生しました</p>
          <p className="text-sm text-red-500 dark:text-red-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400">表示するメッセージがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー情報 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            💬 メッセージタイムライン
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {data.items.length} 件のメッセージ
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono">
            {format(currentTime, 'yyyy-MM-dd HH:mm:ss', { locale: ja })}
          </span>
        </div>
      </div>

      {/* タイムライン */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="h-full bg-white dark:bg-slate-900"
          data-testid="message-timeline"
        />
      </div>
    </div>
  );
};

export default MessageTimeline;
