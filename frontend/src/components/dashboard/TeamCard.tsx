import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { TeamSummary } from '@/types/team';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ModelBadge } from '@/components/overview/ModelBadge';
import { useDeleteTeam } from '@/hooks/useTeams';
import type { ModelUsage } from '@/types/model';

/**
 * 削除可能なステータス一覧
 * active 状態以外は削除可能
 */
const DELETABLE_STATUSES = ['stopped', 'inactive', 'unknown'];

/**
 * チーム情報をカード形式で表示するコンポーネント。
 *
 * チーム名、説明、メンバー数、ステータスを表示します。クリック時に
 * コールバック関数を実行でき、チーム詳細表示等に使用します。
 * active 以外の状態では削除ボタンが表示されます。
 *
 * @param props.team - チームサマリーデータ
 * @param props.onClick - クリック時のコールバック関数（任意）
 * @param props.models - モデル使用状況（任意）
 * @param props.showModels - モデルバッジを表示するかどうか（任意、デフォルトfalse）
 * @param props.onDeleted - 削除完了時のコールバック関数（任意）
 * @returns チームカード要素
 *
 */
interface TeamCardProps {
  team: TeamSummary;
  onClick?: () => void;
  models?: ModelUsage[];
  showModels?: boolean;
  className?: string;
  onDeleted?: () => void;
}

/**
 * ステータスに応じたボーダー色を返す
 */
function getBorderClass(status: string): string {
  switch (status) {
    case 'active':
      return 'border-green-500 dark:border-green-400';
    case 'stopped':
      return 'border-gray-400 dark:border-gray-600 opacity-70';
    case 'inactive':
      return 'border-gray-300 dark:border-gray-700 opacity-60';
    case 'unknown':
      return 'border-yellow-400 dark:border-yellow-600 opacity-70';
    default:
      return 'border-primary-500 dark:border-primary-400';
  }
}

export function TeamCard({
  team,
  onClick,
  models,
  showModels = false,
  className = '',
  onDeleted,
}: TeamCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { deleteTeam, isDeleting } = useDeleteTeam();

  const borderClass = getBorderClass(team.status);
  const canDelete = DELETABLE_STATUSES.includes(team.status);

  /**
   * 削除ボタンクリック時のハンドラー
   * カード全体のクリックイベントを停止し、ダイアログを開く
   */
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDialogOpen(true);
  };

  /**
   * 削除確認時のハンドラー
   */
  const handleConfirmDelete = () => {
    deleteTeam(team.name, {
      onSuccess: () => {
        setIsDialogOpen(false);
        onDeleted?.();
      },
    });
  };

  return (
    <>
      <div
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer border-l-4 ${borderClass} ${className}`}
        onClick={onClick}
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {team.name}
          </h3>
          <div className="flex items-center gap-2">
            <StatusBadge status={team.status} />
            {/* 削除ボタン（active 以外の状態で表示） */}
            {canDelete && (
              <button
                onClick={handleDeleteClick}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                title="チームを削除"
                aria-label="チームを削除"
              >
                <svg
                  className="w-4 h-4 text-red-500 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {team.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {team.description}
          </p>
        )}

        {/* モデルバッジセクション（オプション） */}
        {showModels && models && models.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {models.map((modelUsage) => (
              <ModelBadge
                key={modelUsage.config.id}
                model={modelUsage.config}
                count={modelUsage.count}
                size="sm"
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{team.memberCount} members</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>{team.taskCount} tasks</span>
            </div>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[100px]">
            {team.leadAgentId.split('@')[0]}
          </span>
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-[90vw] max-w-md z-50">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              チーム削除の確認
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              <span className="font-medium text-gray-900 dark:text-gray-100">{team.name}</span>
              を削除しますか？
            </Dialog.Description>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              この操作は取り消せません。チーム設定、タスク、セッションログなど関連ファイルがすべて削除されます。
            </p>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                  disabled={isDeleting}
                >
                  キャンセル
                </button>
              </Dialog.Close>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
