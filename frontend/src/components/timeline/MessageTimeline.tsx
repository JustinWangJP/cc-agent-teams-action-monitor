/**
 * メッセージタイムラインコンポーネント。
 *
 * vis-timeline を使用して、エージェント間のメッセージ通信を時系列で可視化します。
 *
 * @module components/timeline/MessageTimeline
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Timeline, type TimelineOptions } from 'vis-timeline/standalone';
import type { TimelineGroup, TimelineData as TimelineDataType, TimelineItem } from '@/types/timeline';
import type { ParsedMessage } from '@/types/message';
import { useDashboardStore } from '@/stores/dashboardStore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('timeline');
  /** Timeline インスタンス */
  const timelineRef = useRef<Timeline | null>(null);
  /** コンテナ要素（コールバックrefで管理） */
  const containerElementRef = useRef<HTMLDivElement | null>(null);
  /** タイムライン初期化完了フラグ */
  const [isTimelineReady, setIsTimelineReady] = useState(false);
  /** 現在のデータを保持 */
  const currentDataRef = useRef<TimelineDataType | undefined>(undefined);

  // 個別セレクターを使用して無限ループを防止
  const autoScrollTimeline = useDashboardStore((state) => state.autoScrollTimeline);
  const selectedMessage = useDashboardStore((state) => state.selectedMessage);
  const setSelectedMessage = useDashboardStore((state) => state.setSelectedMessage);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  /** タイマーID（1秒ごとのカレントタイム更新用） */
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * タイムライン初期化関数。
   * コールバックrefから呼び出され、DOM要素が確実に存在する時点で実行される。
   */
  const initializeTimeline = useCallback((container: HTMLDivElement | null) => {
    console.log('[DIAG] initializeTimeline called, container:', container);

    // すでに初期化済みの場合はスキップ
    if (timelineRef.current) {
      console.log('[DIAG] Timeline already initialized');
      return;
    }

    if (!container) {
      console.log('[DIAG] No container, skipping');
      return;
    }

    // コンテナのサイズを確認
    const rect = container.getBoundingClientRect();
    console.log('[DIAG] Container size:', { width: rect.width, height: rect.height });

    // サイズが0の場合は初期化を延期
    if (rect.width === 0 || rect.height === 0) {
      console.log('[DIAG] Container has zero size, deferring initialization');
      setTimeout(() => initializeTimeline(container), 100);
      return;
    }

    // Timeline 作成（配列を直接使用）
    try {
      const initialItems: TimelineItem[] = [];
      const initialGroups: TimelineGroup[] = [];

      timelineRef.current = new Timeline(
        container,
        initialItems,
        initialGroups,
        DEFAULT_OPTIONS,
      );
      console.log('[DIAG] Timeline instance created:', timelineRef.current);
    } catch (err) {
      console.error('[DIAG] Failed to create timeline:', err);
      return;
    }

    // カレントタイムバーを追加
    timelineRef.current.addCustomTime(new Date(), 'currentTime');
    console.log('[DIAG] Custom time added');

    // アイテムクリックイベント
    timelineRef.current.on('click', (properties) => {
      console.log('[DIAG] Timeline click:', properties);
      if (properties.item) {
        // アイテムIDからメッセージデータを取得
        const itemId = properties.item as string;
        const message = currentDataRef.current?.items.find(i => i.id === itemId)?.data;
        if (message && onItemClick) {
          onItemClick(message);
          setSelectedMessage(message);
        }
      }
    });

    // 初期化完了フラグを設定
    setIsTimelineReady(true);
    console.log('[DIAG] Timeline initialization complete');

    // 既存のデータがあれば設定
    if (currentDataRef.current) {
      updateTimelineData(currentDataRef.current);
    }

    // 診断: タイムラインのDOMを確認
    setTimeout(() => {
      const timelineElement = container?.querySelector('.vis-timeline');
      console.log('[DIAG] Timeline DOM element:', timelineElement);
      if (timelineElement) {
        const timelineRect = timelineElement.getBoundingClientRect();
        console.log('[DIAG] Timeline DOM size:', { width: timelineRect.width, height: timelineRect.height });
      }
    }, 100);
  }, [onItemClick, setSelectedMessage]);

  /**
   * タイムラインデータ更新関数。
   */
  const updateTimelineData = useCallback((timelineData: TimelineDataType) => {
    console.log('[DIAG] Updating timeline data');
    if (!timelineRef.current) return;

    // アイテムとグループを設定
    console.log('[DIAG] Setting items:', timelineData.items.length);
    console.log('[DIAG] Setting groups:', timelineData.groups.length);

    timelineRef.current.setData({
      items: timelineData.items,
      groups: timelineData.groups,
    });

    // 時間範囲を設定
    if (timelineData.timeRange) {
      const start = new Date(timelineData.timeRange.min);
      const end = new Date(timelineData.timeRange.max);
      timelineRef.current.setWindow(start, end);
      console.log('[DIAG] Window set:', { start, end });
    }

    // 強制的に再描画
    requestAnimationFrame(() => {
      console.log('[DIAG] Calling redraw');
      timelineRef.current?.redraw();

      // 診断: アイテム要素を確認
      const container = containerElementRef.current;
      const itemElements = container?.querySelectorAll('.vis-item');
      console.log('[DIAG] Item elements count:', itemElements?.length);

      // 自動スクロールが有効な場合、最新メッセージにスクロール
      if (autoScrollTimeline && timelineData.items.length > 0) {
        const lastItem = timelineData.items[timelineData.items.length - 1];
        const lastTime = new Date(lastItem.start);
        timelineRef.current?.moveTo(lastTime);
      }
    });
  }, [autoScrollTimeline]);

  /**
   * コールバックref。
   * DOM要素がマウントされた時点でタイムラインを初期化する。
   */
  const containerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    console.log('[DIAG] containerCallbackRef called, node:', node);
    containerElementRef.current = node;
    if (node) {
      // 少し遅延させて確実にレンダリングが完了してから初期化
      setTimeout(() => initializeTimeline(node), 0);
    }
  }, [initializeTimeline]);

  /**
   * クリーンアップ。
   */
  useEffect(() => {
    return () => {
      console.log('[DIAG] Cleaning up timeline');
      timelineRef.current?.destroy();
      timelineRef.current = null;
      setIsTimelineReady(false);
    };
  }, []);

  /**
   * データ更新時の再描画。
   */
  useEffect(() => {
    console.log('[DIAG] Data effect triggered, data:', data?.items.length, 'isTimelineReady:', isTimelineReady);

    if (!data) {
      console.log('[DIAG] No data, skipping');
      return;
    }

    // データを保持
    currentDataRef.current = data;

    if (!isTimelineReady || !timelineRef.current) {
      console.log('[DIAG] Timeline not ready, data will be applied when ready');
      return;
    }

    // タイミング問題を解決するために少し遅延させる
    const timerId = setTimeout(() => {
      updateTimelineData(data);
    }, 50);

    return () => {
      clearTimeout(timerId);
    };
  }, [data, isTimelineReady, updateTimelineData]);

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
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">{t('error')}</p>
          <p className="text-sm text-red-500 dark:text-red-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400">{t('no_messages')}</p>
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
            💬 {t('message_timeline')}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('messages_count', { count: data.items.length })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono">
            {format(currentTime, 'yyyy-MM-dd HH:mm:ss', { locale: ja })}
          </span>
        </div>
      </div>

      {/* タイムライン */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerCallbackRef}
          className="absolute inset-0 bg-white dark:bg-slate-900"
          data-testid="message-timeline"
        />
      </div>
    </div>
  );
};

export default MessageTimeline;
