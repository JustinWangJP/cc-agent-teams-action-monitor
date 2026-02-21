/**
 * ファイル変更監視パネルコンポーネント。
 *
 * プロジェクトファイルの変更をリアルタイムで監視・表示します。
 *
 * @module components/file/FileChangesPanel
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useFileChanges, useFilteredFileChanges } from '@/hooks/useFileChanges';
import type { FileChangeFilter, FileChangeInfo } from '@/types/message';
import { clsx } from 'clsx';
import {
  RefreshCw,
  Filter,
  File,
  Folder,
  Plus,
  Edit,
  Trash,
  Eye,
  X,
  ChevronDown,
} from 'lucide-react';

/**
 * ファイル変更パネルのプロパティ。
 */
export interface FileChangesPanelProps {
  /** チーム名 */
  teamName: string;
  /** API ベース URL */
  apiBaseUrl?: string;
}

/**
 * 操作種別の設定。
 */
const OPERATION_CONFIG: Record<
  FileChangeInfo['operation'],
  { icon: React.ReactNode; label: string; colorClass: string }
> = {
  created: {
    icon: <Plus className="w-4 h-4" />,
    label: '作成',
    colorClass: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  },
  modified: {
    icon: <Edit className="w-4 h-4" />,
    label: '変更',
    colorClass: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  deleted: {
    icon: <Trash className="w-4 h-4" />,
    label: '削除',
    colorClass: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  read: {
    icon: <Eye className="w-4 h-4" />,
    label: '読み取り',
    colorClass: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
  },
};

/**
 * ファイル変更バッジコンポーネント。
 */
interface FileChangeBadgeProps {
  operation: FileChangeInfo['operation'];
}

const FileChangeBadge = ({ operation }: FileChangeBadgeProps) => {
  const config = OPERATION_CONFIG[operation];
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs', config.colorClass)}>
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

/**
 * フィルターセレクトコンポーネント。
 */
interface FilterSelectProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (selected: T[]) => void;
}

const FilterSelect = <T extends string>({ label, options, selected, onChange }: FilterSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback((value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }, [selected, onChange]);

  const clear = useCallback(() => {
    onChange([]);
    setIsOpen(false);
  }, [onChange]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm',
          'transition-colors',
          selected.length > 0
            ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700 text-blue-700 dark:text-blue-300'
            : 'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600 text-slate-700 dark:text-slate-300'
        )}
      >
        <Filter className="w-4 h-4" />
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="ml-auto px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
            {selected.length}
          </span>
        )}
        <ChevronDown className={clsx('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg min-w-[200px]">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm font-medium">選択</span>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  クリア
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {options.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggle(option)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * ファイル変更パネルコンポーネント。
 */
export const FileChangesPanel = ({
  teamName,
  apiBaseUrl = '/api',
}: FileChangesPanelProps) => {
  // フィルター状態
  const [filter, setFilter] = useState<FileChangeFilter>({
    operations: [],
    directories: [],
    extensions: [],
    agents: [],
  });

  // フックを使用
  const {
    entries,
    availableAgents,
    availableDirectories,
    availableExtensions,
    isLoading,
    error,
    refetch,
  } = useFileChanges({
    teamName,
    enabled: true,
    apiBaseUrl,
  });

  // フィルタ適用
  const filteredEntries = useFilteredFileChanges(entries, filter);

  // フィルター更新ハンドラー
  const updateFilter = useCallback(<K extends keyof FileChangeFilter>(
    key: K,
    value: FileChangeFilter[K]
  ) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  }, []);

  // アクティブなフィルター数
  const activeFilterCount = useMemo(() => {
    return (
      filter.operations.length +
      filter.directories.length +
      filter.extensions.length +
      filter.agents.length
    );
  }, [filter]);

  // ファイルパスを短縮
  const formatPath = useCallback((path: string) => {
    if (path.length > 60) {
      const parts = path.split('/');
      if (parts.length > 3) {
        return `.../${parts.slice(-2).join('/')}`;
      }
      return `...${path.slice(-50)}`;
    }
    return path;
  }, []);

  // チーム名が未指定の場合
  if (!teamName) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400">チームを選択してください</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            📁 ファイル変更
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filteredEntries.length}件
          </span>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className={clsx(
            'p-2 rounded-lg transition-colors',
            'hover:bg-slate-100 dark:hover:bg-slate-800',
            'disabled:opacity-50'
          )}
          title="更新"
        >
          <RefreshCw className={clsx('w-5 h-5 text-slate-600 dark:text-slate-400', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300">
            データの取得に失敗しました: {error.message}
          </p>
        </div>
      )}

      {/* フィルター */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="操作"
          options={['created', 'modified', 'deleted', 'read'] as const}
          selected={filter.operations}
          onChange={(value) => updateFilter('operations', value)}
        />
        <FilterSelect
          label="ディレクトリ"
          options={availableDirectories}
          selected={filter.directories}
          onChange={(value) => updateFilter('directories', value)}
        />
        <FilterSelect
          label="拡張子"
          options={availableExtensions}
          selected={filter.extensions}
          onChange={(value) => updateFilter('extensions', value)}
        />
        <FilterSelect
          label="エージェント"
          options={availableAgents}
          selected={filter.agents}
          onChange={(value) => updateFilter('agents', value)}
        />
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => setFilter({ operations: [], directories: [], extensions: [], agents: [] })}
            className="flex items-center gap-1 px-2 py-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
            <span>フィルター解除</span>
          </button>
        )}
      </div>

      {/* ファイル変更リスト */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-600">
            <File className="w-12 h-12 mb-2" />
            <p>ファイル変更はありません</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* アイコン（ファイル/フォルダー） */}
                <div className="flex-shrink-0 text-slate-400 dark:text-slate-600">
                  {entry.file.path.includes('/') ? (
                    <Folder className="w-5 h-5" />
                  ) : (
                    <File className="w-5 h-5" />
                  )}
                </div>

                {/* ファイルパス */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate" title={entry.file.path}>
                      {formatPath(entry.file.path)}
                    </code>
                    <FileChangeBadge operation={entry.file.operation} />
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {entry.agent && (
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                        {entry.agent}
                      </span>
                    )}
                    <span>{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileChangesPanel;
