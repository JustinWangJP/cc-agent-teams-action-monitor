/**
 * タイピングインジケーターコンポーネント。
 *
 * エージェントが入力中であることを表示します。
 *
 * @module components/chat/TypingIndicator
 */

'use client';

import { memo, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

/**
 * タイピング中のエージェント情報。
 */
export interface TypingAgent {
  /** エージェント名 */
  name: string;
  /** 入力開始時刻 */
  since: Date;
}

/**
 * タイピングインジケーターのプロパティ。
 */
export interface TypingIndicatorProps {
  /** タイピング中のエージェント配列 */
  typingAgents: TypingAgent[];
  /** タイムアウト時間（ミリ秒） */
  timeout?: number;
}

/**
 * 単一ドットアニメーションコンポーネント。
 */
const TypingDot = memo<{ delay: string }>(({ delay }) => (
  <div
    className={clsx(
      'w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full',
      'animate-typing-dot'
    )}
    style={{ animationDelay: delay }}
  />
));

TypingDot.displayName = 'TypingDot';

/**
 * タイピングインジケーターコンポーネント。
 *
 * タイピング中のエージェントを表示し、アニメーション付きのドットで
 * 入力中であることを視覚的に示します。タイムアウト機能で自動的に非表示になります。
 *
 * @param props.typingAgents - タイピング中のエージェント配列
 * @param props.timeout - タイムアウト時間（ミリ秒、デフォルト3000）
 * @returns タイピングインジケーター要素、またはアクティブな場合null
 *
 * @example
 * ```tsx
 * <TypingIndicator
 *   typingAgents={[
 *     { name: 'team-lead', since: new Date() },
 *     { name: 'backend-dev', since: new Date() },
 *   ]}
 *   timeout={3000}
 * />
 * ```
 *
 * 
 */
export const TypingIndicator = memo<TypingIndicatorProps>(
  ({ typingAgents, timeout = 3000 }) => {
    const { t } = useTranslation('timeline');
    // アクティブなエージェントのみを抽出（タイムアウト済みを除外）
    const [activeAgents, setActiveAgents] = useState<TypingAgent[]>([]);

    useEffect(() => {
      const now = new Date();
      const active = typingAgents.filter((agent) => {
        const elapsed = now.getTime() - agent.since.getTime();
        return elapsed < timeout;
      });
      setActiveAgents(active);

      // タイムアウト時に自動的にクリア
      if (active.length > 0) {
        const timeoutId = setTimeout(() => {
          setActiveAgents((prev) => {
            const now2 = new Date();
            return prev.filter((agent) => {
              const elapsed = now2.getTime() - agent.since.getTime();
              return elapsed < timeout;
            });
          });
        }, timeout);

        return () => clearTimeout(timeoutId);
      }
    }, [typingAgents, timeout]);

    if (activeAgents.length === 0) return null;

    // エージェント名のフォーマット
    const agentNames = activeAgents.map((a) => a.name);
    let text = '';
    if (agentNames.length === 1) {
      text = t('typing.one_typing', { name: agentNames[0] });
    } else if (agentNames.length === 2) {
      text = t('typing.two_typing', { name1: agentNames[0], name2: agentNames[1] });
    } else {
      text = t('typing.many_typing', { count: agentNames.length });
    }

    return (
      <div
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-1.5',
          'bg-slate-100 dark:bg-slate-800',
          'text-slate-600 dark:text-slate-400',
          'text-xs font-medium',
          'rounded-full'
        )}
      >
        {/* ドットアニメーション */}
        <div className="flex items-center gap-0.5">
          <TypingDot delay="0ms" />
          <TypingDot delay="150ms" />
          <TypingDot delay="300ms" />
        </div>
        <span>{text}...</span>
      </div>
    );
  }
);

TypingIndicator.displayName = 'TypingIndicator';

/**
 * タイピング状態を管理するカスタムフック。
 *
 * HTTP Polling で取得したエージェント状態から、入力中のエージェントを抽出します。
 * タイムアウト機能により、一定時間経過後に自動的にタイピング状態をクリアします。
 *
 * @param agents - エージェントの状態配列
 * @param timeout - タイムアウト時間（ミリ秒、デフォルト3000）
 * @returns タイピング中のエージェント配列
 *
 * 
 */
export function useTypingIndicator(
  agents: Array<{ name: string; isTyping?: boolean; lastActivity?: string }>,
  timeout: number = 3000
): TypingAgent[] {
  const [typingAgents, setTypingAgents] = useState<TypingAgent[]>([]);

  useEffect(() => {
    const now = new Date();
    const typing = agents
      .filter((agent) => agent.isTyping)
      .map((agent) => ({
        name: agent.name,
        since: agent.lastActivity ? new Date(agent.lastActivity) : now,
      }));
    setTypingAgents(typing);
  }, [agents]);

  // タイムアウト処理
  useEffect(() => {
    if (typingAgents.length === 0) return;

    const timeoutId = setTimeout(() => {
      setTypingAgents((prev) => {
        const now = new Date();
        return prev.filter((agent) => {
          const elapsed = now.getTime() - agent.since.getTime();
          return elapsed < timeout;
        });
      });
    }, timeout);

    return () => clearTimeout(timeoutId);
  }, [typingAgents, timeout]);

  return typingAgents;
}

export default TypingIndicator;
