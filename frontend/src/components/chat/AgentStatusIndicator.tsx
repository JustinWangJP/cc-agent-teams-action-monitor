/**
 * エージェントステータスインジケーターコンポーネント。
 *
 * エージェントのオンライン状態を表示します。
 *
 * @module components/chat/AgentStatusIndicator
 */

'use client';

import { memo, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { clsx } from 'clsx';

/**
 * エージェントのステータス。
 */
export type AgentStatus = 'online' | 'idle' | 'offline';

/**
 * エージェントステータスインジケーターのプロパティ。
 */
export interface AgentStatusIndicatorProps {
  /** 最終アクティビティ時刻 */
  lastActivity?: string | Date;
  /** サイズ */
  size?: 'sm' | 'md' | 'lg';
  /** テキストを表示するかどうか */
  showText?: boolean;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * 最終アクティビティ時刻からステータスを判定。
 */
function getAgentStatus(lastActivity?: string | Date): AgentStatus {
  if (!lastActivity) return 'offline';

  try {
    const last = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffMins = diffMs / (1000 * 60);

    if (diffMins < 5) return 'online';
    if (diffMins < 30) return 'idle';
    return 'offline';
  } catch {
    return 'offline';
  }
}

/**
 * ステータスに対応するスタイルを取得。
 */
function getStatusStyles(status: AgentStatus, size: string) {
  const sizeMap = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const colorMap = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    offline: 'bg-gray-400',
  };

  const glowMap = {
    online: 'ring-2 ring-green-500/30',
    idle: 'ring-2 ring-yellow-500/30',
    offline: '',
  };

  return {
    size: sizeMap[size as keyof typeof sizeMap] || sizeMap.md,
    color: colorMap[status],
    glow: glowMap[status],
  };
}

/**
 * ステータスのテキストを取得。
 */
function getStatusText(status: AgentStatus): string {
  const texts = {
    online: 'オンライン',
    idle: 'アイドル',
    offline: 'オフライン',
  };
  return texts[status];
}

/**
 * ステータスのアイコンを取得。
 */
function getStatusIcon(status: AgentStatus): string {
  const icons = {
    online: '🟢',
    idle: '🟡',
    offline: '⚫',
  };
  return icons[status];
}

/**
 * エージェントステータスインジケーターコンポーネント。
 *
 * @example
 * ```tsx
 * <AgentStatusIndicator
 *   lastActivity={agent.lastActivity}
 *   size="md"
 *   showText={true}
 * />
 * ```
 */
export const AgentStatusIndicator = memo<AgentStatusIndicatorProps>(
  ({
    lastActivity,
    size = 'md',
    showText = false,
    className,
  }) => {
    const status = useMemo(() => getAgentStatus(lastActivity), [lastActivity]);
    const styles = useMemo(() => getStatusStyles(status, size), [status, size]);

    const relativeTime = useMemo(() => {
      if (!lastActivity) return null;
      try {
        return formatDistanceToNow(new Date(lastActivity), {
          addSuffix: true,
          locale: ja,
        });
      } catch {
        return null;
      }
    }, [lastActivity]);

    return (
      <div className={clsx('inline-flex items-center gap-1.5', className)}>
        {/* ステータスドット */}
        <div
          className={clsx(
            'rounded-full transition-all duration-300',
            styles.size,
            styles.color,
            styles.glow
          )}
          title={`${getStatusText(status)}${relativeTime ? `: ${relativeTime}` : ''}`}
        />

        {/* テキスト表示 */}
        {showText && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {getStatusIcon(status)} {getStatusText(status)}
            {relativeTime && ` (${relativeTime})`}
          </span>
        )}
      </div>
    );
  }
);

AgentStatusIndicator.displayName = 'AgentStatusIndicator';

export default AgentStatusIndicator;
