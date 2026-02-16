/**
 * タイムライン関連の TypeScript 型定義。
 *
 * vis-timeline 用の TimelineItem、TimelineGroup、TimelineData インターフェースを定義します。
 * メッセージタイムライン表示のデータ構造を表現します。
 *
 * @module types/timeline
 */

import type { ParsedMessage } from './message';

/**
 * メッセージタイプの列挙（タイムライン用）。
 *
 * バックエンドと一致させるため、ProtocolMessage の type フィールドの値を定義します。
 */
export type TimelineMessageType =
  | 'message'
  | 'idle_notification'
  | 'shutdown_request'
  | 'shutdown_response'
  | 'plan_approval_request'
  | 'plan_approval_response'
  | 'task_assignment'
  | 'unknown';

/**
 * タイムラインアイテムを表すインターフェース。
 *
 * vis-timeline の Item 型に対応します。
 * メッセージをタイムライン上のボックスとして表示します。
 */
export interface TimelineItem {
  /** アイテムの一意識別子 */
  id: string;
  /** 表示テキスト（短縮版） */
  content: string;
  /** 開始時刻（ISO 8601形式またはDateオブジェクト） */
  start: Date | string;
  /** アイテムタイプ（固定値 'box'） */
  type: 'box';
  /** CSSクラス名（スタイル適用用） */
  className?: string;
  /** グループID（送信者名） */
  group?: string;
  /** 元メッセージデータ */
  data?: ParsedMessage;
  /** 終了時刻（オプション） */
  end?: Date | string;
}

/**
 * タイムライングループを表すインターフェース。
 *
 * vis-timeline の Group 型に対応します。
 * 送信者ごとにグループ化して表示します。
 */
export interface TimelineGroup {
  /** グループの一意識別子（送信者名） */
  id: string;
  /** グループ表示名 */
  content: string;
  /** CSSクラス名（スタイル適用用） */
  className?: string;
  /** グループ順序（オプション） */
  order?: number;
}

/**
 * 時間範囲を表すインターフェース。
 *
 * タイムラインの表示可能な最小・最大時刻を持ちます。
 */
export interface TimeRangeBounds {
  /** 最小時刻（ISO 8601形式） */
  min: string;
  /** 最大時刻（ISO 8601形式） */
  max: string;
}

/**
 * タイムラインデータを表すインターフェース。
 *
 * バックエンド API からのレスポンス形式に対応します。
 * アイテム、グループ、時間範囲を含みます。
 */
export interface TimelineData {
  /** タイムラインアイテムリスト */
  items: TimelineItem[];
  /** タイムライングループリスト */
  groups: TimelineGroup[];
  /** 時間範囲（最小・最大タイムスタンプ） */
  timeRange: TimeRangeBounds;
}

/**
 * タイムラインオプションを表すインターフェース。
 *
 * vis-timeline のオプション設定を定義します。
 */
export interface TimelineOptions {
  /** 向き設定（軸とアイテムの位置） */
  orientation?: {
    axis: 'top' | 'bottom';
    item: 'top' | 'bottom';
  };
  /** 垂直スクロールを有効にするか */
  verticalScroll?: boolean;
  /** 水平スクロールを有効にするか */
  horizontalScroll?: boolean;
  /** ズームの最小値（ミリ秒） */
  zoomMin?: number;
  /** ズームの最大値（ミリ秒） */
  zoomMax?: number;
  /** 編集可能かどうか */
  editable?: boolean;
  /** 選択可能かどうか */
  selectable?: boolean;
  /** マージン設定 */
  margin?: {
    item: {
      horizontal: number;
      vertical: number;
    };
    axis: number;
  };
  /** 日時フォーマット */
  format?: {
    minorLabels?: {
      millisecond?: string;
      second?: string;
      minute?: string;
      hour?: string;
      weekday?: string;
      day?: string;
      month?: string;
      year?: string;
    };
    majorLabels?: {
      millisecond?: string;
      second?: string;
      minute?: string;
      hour?: string;
      weekday?: string;
      day?: string;
      month?: string;
      year?: string;
    };
  };
}

/**
 * クイック時間範囲プリセットを表す型。
 *
 * ユーザーが素早く時間範囲を選択するためのプリセット。
 */
export type QuickTimeRange =
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '6h'
  | '12h'
  | '24h'
  | '7d'
  | 'all';

/**
 * クイック時間範囲の設定。
 */
export const QUICK_TIME_RANGES: Record<QuickTimeRange, { label: string; minutes: number | null }> = {
  '5m': { label: '5分', minutes: 5 },
  '15m': { label: '15分', minutes: 15 },
  '30m': { label: '30分', minutes: 30 },
  '1h': { label: '1時間', minutes: 60 },
  '6h': { label: '6時間', minutes: 360 },
  '12h': { label: '12時間', minutes: 720 },
  '24h': { label: '24時間', minutes: 1440 },
  '7d': { label: '7日間', minutes: 10080 },
  'all': { label: '全期間', minutes: null },
};

/**
 * メッセージタイプリスト（セレクトボックス用）。
 */
export const MESSAGE_TYPES: { value: TimelineMessageType; label: string; icon: string }[] = [
  { value: 'message', label: 'メッセージ', icon: '💬' },
  { value: 'idle_notification', label: 'アイドル通知', icon: '💤' },
  { value: 'shutdown_request', label: 'シャットダウン要求', icon: '🛑' },
  { value: 'shutdown_response', label: 'シャットダウン応答', icon: '✓' },
  { value: 'plan_approval_request', label: 'プラン承認要求', icon: '📋' },
  { value: 'plan_approval_response', label: 'プラン承認応答', icon: '✅' },
  { value: 'task_assignment', label: 'タスク割り当て', icon: '📝' },
  { value: 'unknown', label: '不明', icon: '❓' },
];

/**
 * メッセージタイプに対応するCSSクラス名を取得する関数。
 *
 * @param type メッセージタイプ
 * @returns CSSクラス名
 */
export function getTimelineItemClass(type: TimelineMessageType): string {
  const classMap: Record<TimelineMessageType, string> = {
    message: 'timeline-item-message',
    idle_notification: 'timeline-item-idle',
    shutdown_request: 'timeline-item-shutdown',
    shutdown_response: 'timeline-item-shutdown-response',
    plan_approval_request: 'timeline-item-plan-request',
    plan_approval_response: 'timeline-item-plan-response',
    task_assignment: 'timeline-item-task',
    unknown: 'timeline-item-unknown',
  };
  return classMap[type] || 'timeline-item-default';
}

/**
 * メッセージタイプに対応するアイコンを取得する関数。
 *
 * @param type メッセージタイプ
 * @returns アイコン文字列
 */
export function getMessageTypeIcon(type: TimelineMessageType): string {
  const iconMap: Record<TimelineMessageType, string> = {
    message: '💬',
    idle_notification: '💤',
    shutdown_request: '🛑',
    shutdown_response: '✓',
    plan_approval_request: '📋',
    plan_approval_response: '✅',
    task_assignment: '📝',
    unknown: '❓',
  };
  return iconMap[type] || '❓';
}

/**
 * メッセージタイプに対応するラベルを取得する関数。
 *
 * @param type メッセージタイプ
 * @returns ラベル文字列
 */
export function getMessageTypeLabel(type: TimelineMessageType): string {
  const labelMap: Record<TimelineMessageType, string> = {
    message: 'メッセージ',
    idle_notification: 'アイドル通知',
    shutdown_request: 'シャットダウン要求',
    shutdown_response: 'シャットダウン応答',
    plan_approval_request: 'プラン承認要求',
    plan_approval_response: 'プラン承認応答',
    task_assignment: 'タスク割り当て',
    unknown: '不明',
  };
  return labelMap[type] || '不明';
}
