/**
 * チーム詳細パネルコンポーネント。
 *
 * 選択されたチームの詳細情報を表示します。
 * チーム名、説明、作成日、リードエージェント、メンバーリスト（名前、モデル、ステータス）を表示します。
 *
 * @module components/dashboard/TeamDetailPanel
 */

import { Team } from '@/types/team';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ModelBadge } from '@/components/overview/ModelBadge';
import { PollingIntervalSelector } from '@/components/common/PollingIntervalSelector';
import { ArrowLeft, Calendar, User, Clock, FileText, Tag, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import { useState, useMemo } from 'react';
import { clsx } from 'clsx';

/**
 * Unixタイムスタンプ（秒またはミリ秒）をDateオブジェクトに変換。
 * ミリ秒単位（13桁以上）の場合はそのまま、秒単位（10桁以下）の場合は1000を掛ける。
 */
function parseTimestamp(timestamp: number): Date {
  // ミリ秒単位かどうかを判定（10000000000 = 1970-01-01 00:00:00 UTC の100秒後の秒数）
  // 10000000000000 = 2286-11-20 17:46:40 UTC (ミリ秒単位の境界)
  return new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);
}

/**
 * シンプルなMarkdownレンダラー（安全なReact要素ベース）。
 * 見出し、太字、リスト、コードブロック、インラインコードをサポート。
 */
function SimpleMarkdown({ content }: { content: string }) {
  const elements = useMemo(() => {
    const lines = content.split('\n');
    const result: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // コードブロック処理
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // コードブロック終了
          result.push(
            <pre key={key++} className="bg-slate-800 dark:bg-slate-950 text-slate-100 p-3 rounded-md overflow-x-auto text-xs my-2">
              <code>{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
          inCodeBlock = false;
        } else {
          // コードブロック開始
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // 見出し
      if (line.startsWith('### ')) {
        result.push(<h4 key={key++} className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-1">{renderInlineMarkdown(line.slice(4))}</h4>);
        continue;
      }
      if (line.startsWith('## ')) {
        result.push(<h3 key={key++} className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2">{renderInlineMarkdown(line.slice(3))}</h3>);
        continue;
      }
      if (line.startsWith('# ')) {
        result.push(<h2 key={key++} className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">{renderInlineMarkdown(line.slice(2))}</h2>);
        continue;
      }

      // 空行
      if (line.trim() === '') {
        result.push(<div key={key++} className="h-2" />);
        continue;
      }

      // 番号付きリスト
      const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (orderedMatch) {
        result.push(
          <div key={key++} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 ml-2">
            <span className="text-slate-400">{orderedMatch[1]}.</span>
            <span>{renderInlineMarkdown(orderedMatch[2])}</span>
          </div>
        );
        continue;
      }

      // 箇条書きリスト
      if (line.startsWith('- ') || line.startsWith('* ')) {
        result.push(
          <div key={key++} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 ml-2">
            <span className="text-slate-400">•</span>
            <span>{renderInlineMarkdown(line.slice(2))}</span>
          </div>
        );
        continue;
      }

      // 通常のテキスト
      result.push(<p key={key++} className="text-xs text-slate-600 dark:text-slate-400">{renderInlineMarkdown(line)}</p>);
    }

    return result;
  }, [content]);

  return <>{elements}</>;
}

/**
 * インラインMarkdown（太字、コード、リンク）をReact要素としてレンダリング。
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;
  let remaining = text;

  // パターン: **太字**, `コード`, [リンク](url)
  const patterns = [
    { regex: /\*\*(.+?)\*\*/, type: 'bold' },
    { regex: /`([^`]+)`/, type: 'code' },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/, type: 'link' },
  ];

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; type: string; groups: string[] } | null = null;

    for (const { regex, type } of patterns) {
      const match = remaining.match(regex);
      if (match && match.index !== undefined) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            type,
            groups: match.slice(1),
          };
        }
      }
    }

    if (earliestMatch) {
      // マッチ前のテキスト
      if (earliestMatch.index > 0) {
        parts.push(remaining.slice(0, earliestMatch.index));
      }

      // マッチした要素
      if (earliestMatch.type === 'bold') {
        parts.push(<strong key={key++} className="font-semibold text-slate-700 dark:text-slate-300">{earliestMatch.groups[0]}</strong>);
      } else if (earliestMatch.type === 'code') {
        parts.push(<code key={key++} className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-xs font-mono text-slate-700 dark:text-slate-300">{earliestMatch.groups[0]}</code>);
      } else if (earliestMatch.type === 'link') {
        parts.push(<a key={key++} href={earliestMatch.groups[1]} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">{earliestMatch.groups[0]}</a>);
      }

      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      // マッチがない場合は残りを追加
      parts.push(remaining);
      break;
    }
  }

  return parts.length > 0 ? parts : text;
}

/**
 * チーム詳細パネルのプロパティ。
 */
interface TeamDetailPanelProps {
  /** チーム詳細データ */
  team: Team;
  /** 戻るボタンクリック時のコールバック */
  onBack: () => void;
  /** 最後の更新タイムスタンプ */
  dataUpdatedAt?: number;
  /** 更新ハンドラー */
  onRefresh?: () => void;
  /** ローディング状態 */
  isLoading?: boolean;
  /** ポーリング間隔（ミリ秒） */
  pollingInterval?: number;
  /** ポーリング間隔変更ハンドラー */
  onPollingIntervalChange?: (interval: number) => void;
}

/**
 * チーム詳細パネルコンポーネント。
 *
 * チームの完全な情報を表示し、メンバー一覧と各メンバーの状態を確認できます。
 *
 * @example
 * ```tsx
 * <TeamDetailPanel
 *   team={teamDetail}
 *   onBack={() => setSelectedTeam(null)}
 * />
 * ```
 */
export function TeamDetailPanel({
  team,
  onBack,
  dataUpdatedAt,
  onRefresh,
  isLoading = false,
  pollingInterval = 30000,
  onPollingIntervalChange,
}: TeamDetailPanelProps) {
  // プロンプト表示状態（メンバーごと）
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());

  // プロンプト表示トグル
  const togglePrompt = (agentId: string) => {
    setExpandedPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  // メンバーをモデル別に集計
  const modelUsage = team.members.reduce((acc, member) => {
    const key = member.model;
    if (!acc[key]) {
      acc[key] = { count: 0, members: [] };
    }
    acc[key].count++;
    acc[key].members.push(member);
    return acc;
  }, {} as Record<string, { count: number; members: typeof team.members }>);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
      {/* ヘッダー: 戻るボタン + チーム名 */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>一覧に戻る</span>
        </button>
        <div className="flex items-center gap-3">
          {/* ポーリング間隔セレクター */}
          {onPollingIntervalChange && (
            <PollingIntervalSelector
              value={pollingInterval}
              onChange={onPollingIntervalChange}
              label="更新間隔"
              lastUpdateTimestamp={dataUpdatedAt}
            />
          )}
          {/* 更新ボタン */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className={clsx(
                'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                'text-slate-700 dark:text-slate-300',
                'bg-white dark:bg-slate-800',
                'border border-slate-300 dark:border-slate-700',
                'hover:bg-slate-50 dark:hover:bg-slate-700',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
              更新
            </button>
          )}
          <StatusBadge status={team.members.some(m => m.status === 'active') ? 'active' : 'idle'} />
        </div>
      </div>

      {/* チーム基本情報 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {team.name}
        </h2>
        {team.description && (
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {team.description}
          </p>
        )}

        {/* メタ情報 */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
          {/* 作成日 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              作成日: {format(parseTimestamp(team.createdAt), 'yyyy-MM-dd HH:mm', { locale: ja })}
            </span>
          </div>

          {/* リードエージェント */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>
              Lead: <span className="font-medium text-slate-900 dark:text-slate-100">{team.leadAgentId}</span>
            </span>
          </div>

          {/* メンバー数 */}
          <div className="flex items-center gap-2">
            <span>メンバー: </span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{team.members.length}名</span>
          </div>
        </div>
      </div>

      {/* モデル別集計 */}
      {Object.keys(modelUsage).length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            使用モデル
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(modelUsage).map(([model, data]) => (
              <ModelBadge
                key={model}
                model={model}
                count={data.count}
                size="md"
              />
            ))}
          </div>
        </div>
      )}

      {/* メンバーリスト */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          メンバーリスト
        </h3>
        <div className="space-y-3">
          {team.members.map((member) => (
            <div
              key={member.agentId}
              className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            >
              {/* メンバー基本情報 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {/* ステータスインジケーター */}
                  <StatusBadge status={member.status} size="sm" />

                  {/* 名前とagentType */}
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {member.name}
                      {member.agentType && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {member.agentType}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {member.agentId}
                    </div>
                  </div>
                </div>

                {/* モデル */}
                <ModelBadge model={member.model} size="sm" />
              </div>

              {/* メタ情報（参加日時など） */}
              <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 mb-2">
                {/* 参加日時 */}
                {member.joinedAt && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>参加: {format(parseTimestamp(member.joinedAt), 'yyyy-MM-dd HH:mm', { locale: ja })}</span>
                  </div>
                )}

                {/* 最終活動 */}
                {member.lastActivity && (
                  <div className="flex items-center gap-1">
                    <span>最終活動: {format(new Date(member.lastActivity), 'HH:mm:ss')}</span>
                  </div>
                )}

                {/* バックエンドタイプ */}
                {member.backendType && (
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>{member.backendType}</span>
                  </div>
                )}
              </div>

              {/* プロンプト（存在する場合） */}
              {member.prompt && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => togglePrompt(member.agentId)}
                    className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-full text-left"
                  >
                    <FileText className="w-3 h-3 flex-shrink-0" />
                    <span>プロンプト</span>
                    {expandedPrompts.has(member.agentId) ? (
                      <ChevronUp className="w-3 h-3 ml-auto" />
                    ) : (
                      <ChevronDown className="w-3 h-3 ml-auto" />
                    )}
                  </button>
                  {expandedPrompts.has(member.agentId) && (
                    <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-700 max-h-80 overflow-y-auto">
                      <SimpleMarkdown content={member.prompt} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TeamDetailPanel;
