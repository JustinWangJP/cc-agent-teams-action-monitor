/**
 * 時間範囲スライダーコンポーネント。
 *
 * タイムラインの表示期間を直感的に調整するためのスライダーとクイック選択ボタンを提供します。
 *
 * @module components/timeline/TimeRangeSlider
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import type { TimeRange } from '@/types/message';
import { useDashboardStore } from '@/stores/dashboardStore';
import { QUICK_TIME_RANGES, type QuickTimeRange } from '@/types/timeline';
import { format, differenceInMinutes } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { clsx } from 'clsx';

/**
 * 時間範囲スライダーのプロパティ。
 */
interface TimeRangeSliderProps {
  /** 最小時刻（データの最古時刻） */
  minTime: Date;
  /** 最大時刻（データの最新時刻） */
  maxTime: Date;
  /** 範囲変更時のコールバック */
  onChange?: (range: TimeRange) => void;
}

/**
 * クイック範囲ボタンコンポーネント。
 */
interface QuickRangeButtonProps {
  preset: QuickTimeRange;
  isActive: boolean;
  onClick: () => void;
}

const QuickRangeButton: React.FC<QuickRangeButtonProps> = ({ preset, isActive, onClick }) => {
  const config = QUICK_TIME_RANGES[preset];
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'px-2 py-1 text-xs font-medium rounded transition-colors',
        isActive
          ? 'bg-blue-500 text-white'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
      )}
    >
      {config.label}
    </button>
  );
};

/**
 * 時間範囲スライダーコンポーネント。
 *
 * スライダーで表示期間を調整し、クイック選択ボタンで素早く範囲を変更できます。
 * 自動スクロール（Play/Pause）機能も提供します。
 *
 * @example
 * ```tsx
 * <TimeRangeSlider
 *   minTime={new Date('2026-02-16T10:00:00')}
 *   maxTime={new Date('2026-02-16T18:00:00')}
 *   onChange={(range) => setTimeRange(range)}
 * />
 * ```
 */
export const TimeRangeSlider: React.FC<TimeRangeSliderProps> = ({
  minTime,
  maxTime,
  onChange,
}) => {
  // 個別セレクターを使用して無限ループを防止
  const timeRange = useDashboardStore((state) => state.timeRange);
  const setTimeRange = useDashboardStore((state) => state.setTimeRange);
  const [activePreset, setActivePreset] = useState<QuickTimeRange | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 時間範囲の全期間（ミリ秒）
  const totalDuration = useMemo(() => {
    return maxTime.getTime() - minTime.getTime();
  }, [minTime, maxTime]);

  // 現在の範囲をパーセンテージに変換
  const rangePercentages = useMemo(() => {
    const startPercent = ((timeRange.start.getTime() - minTime.getTime()) / totalDuration) * 100;
    const endPercent = ((timeRange.end.getTime() - minTime.getTime()) / totalDuration) * 100;
    return [startPercent, endPercent];
  }, [timeRange, minTime, totalDuration]);

  // 現在の範囲の分数
  const currentRangeMinutes = useMemo(() => {
    return differenceInMinutes(timeRange.end, timeRange.start);
  }, [timeRange]);

  /**
   * 範囲変更ハンドラー。
   */
  const handleRangeChange = useCallback(
    (values: number[]) => {
      const newStart = new Date(minTime.getTime() + (values[0] / 100) * totalDuration);
      const newEnd = new Date(minTime.getTime() + (values[1] / 100) * totalDuration);
      const newRange: TimeRange = { start: newStart, end: newEnd };
      setTimeRange(newRange);
      onChange?.(newRange);
      setActivePreset(null);
    },
    [minTime, totalDuration, setTimeRange, onChange],
  );

  /**
   * クイック範囲変更ハンドラー。
   */
  const handleQuickRange = useCallback(
    (preset: QuickTimeRange) => {
      const config = QUICK_TIME_RANGES[preset];
      const now = new Date();

      let newStart: Date;
      let newEnd: Date = now;

      if (config.minutes === null) {
        // 全期間
        newStart = new Date(minTime);
        newEnd = new Date(maxTime);
      } else {
        // 指定分数
        newStart = new Date(now.getTime() - config.minutes * 60 * 1000);
      }

      const newRange: TimeRange = { start: newStart, end: newEnd };
      setTimeRange(newRange);
      onChange?.(newRange);
      setActivePreset(preset);
    },
    [minTime, maxTime, setTimeRange, onChange],
  );

  /**
   * 前後移動ハンドラー。
   */
  const handleShift = useCallback(
    (direction: 'left' | 'right') => {
      const duration = timeRange.end.getTime() - timeRange.start.getTime();
      const shift = duration * 0.5; // 範囲の50%をシフト

      let newStart = new Date(timeRange.start.getTime() + (direction === 'left' ? -shift : shift));
      let newEnd = new Date(timeRange.end.getTime() + (direction === 'left' ? -shift : shift));

      // 境界チェック
      if (newStart.getTime() < minTime.getTime()) {
        const diff = minTime.getTime() - newStart.getTime();
        newStart = new Date(minTime);
        newEnd = new Date(newEnd.getTime() + diff);
      }
      if (newEnd.getTime() > maxTime.getTime()) {
        const diff = newEnd.getTime() - maxTime.getTime();
        newEnd = new Date(maxTime);
        newStart = new Date(newStart.getTime() - diff);
      }

      const newRange: TimeRange = { start: newStart, end: newEnd };
      setTimeRange(newRange);
      onChange?.(newRange);
      setActivePreset(null);
    },
    [timeRange, minTime, maxTime, setTimeRange, onChange],
  );

  /**
   * 自動スクロール切り替え。
   */
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // 自動スクロール実行
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const duration = timeRange.end.getTime() - timeRange.start.getTime();
      const shift = duration * 0.1; // 範囲の10%を進める

      const newEnd = new Date(timeRange.end.getTime() + shift);
      const newStart = new Date(timeRange.start.getTime() + shift);

      // 最大時刻を超える場合は停止
      if (newEnd.getTime() > maxTime.getTime()) {
        setIsPlaying(false);
        return;
      }

      const newRange: TimeRange = { start: newStart, end: newEnd };
      setTimeRange(newRange);
      onChange?.(newRange);
      setActivePreset(null);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, timeRange, maxTime, setTimeRange, onChange]);

  return (
    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
      {/* 時間表示 */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">開始:</span>
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {format(timeRange.start, 'HH:mm:ss', { locale: ja })}
          </span>
          <span className="text-slate-400">~</span>
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {format(timeRange.end, 'HH:mm:ss', { locale: ja })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">範囲:</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {currentRangeMinutes < 60
              ? `${currentRangeMinutes}分`
              : `${Math.floor(currentRangeMinutes / 60)}時間${currentRangeMinutes % 60}分`}
          </span>
        </div>
      </div>

      {/* スライダー */}
      <div className="relative px-1">
        <Slider.Root
          className="relative flex items-center select-none touch-none h-6 w-full"
          value={rangePercentages}
          onValueChange={handleRangeChange}
          min={0}
          max={100}
          step={0.1}
          minStepsBetweenThumbs={1}
        >
          {/* トラック */}
          <Slider.Track className="bg-slate-200 dark:bg-slate-700 relative grow rounded-full h-2">
            {/* 選択範囲 */}
            <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
          </Slider.Track>

          {/* 開始サム */}
          <Slider.Thumb
            className="block w-5 h-5 bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-full shadow hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all cursor-grab active:cursor-grabbing"
            aria-label="開始時刻"
          />

          {/* 終了サム */}
          <Slider.Thumb
            className="block w-5 h-5 bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-full shadow hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all cursor-grab active:cursor-grabbing"
            aria-label="終了時刻"
          />
        </Slider.Root>
      </div>

      {/* コントロール */}
      <div className="flex items-center justify-between">
        {/* クイック範囲ボタン */}
        <div className="flex flex-wrap gap-1">
          {(['5m', '15m', '30m', '1h', '6h', '12h', '24h', 'all'] as QuickTimeRange[]).map(
            (preset) => (
              <QuickRangeButton
                key={preset}
                preset={preset}
                isActive={activePreset === preset}
                onClick={() => handleQuickRange(preset)}
              />
            ),
          )}
        </div>

        {/* 移動・再生コントロール */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleShift('left')}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            aria-label="前へ"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleTogglePlay}
            className={clsx(
              'p-2 rounded transition-colors',
              isPlaying
                ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
            )}
            aria-label={isPlaying ? '一時停止' : '再生'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => handleShift('right')}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            aria-label="次へ"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeRangeSlider;
