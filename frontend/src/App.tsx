/**
 * Agent Teams Dashboard メインアプリケーション。
 *
 * チーム監視、タスク管理、メッセージタイムライン、依存グラフを
 * タブ形式で切り替えて表示します。
 *
 * @module App
 */

import { useState, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { TeamCard, TeamDetailPanel } from '@/components/dashboard';
import { TaskCard } from '@/components/tasks/TaskCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { PollingIntervalSelector } from '@/components/common/PollingIntervalSelector';
import { ChatTimelinePanel } from '@/components/chat';
import { FileChangesPanel } from '@/components/file/FileChangesPanel';
import { useTeams, useTeam } from '@/hooks/useTeams';
import { useTasks } from '@/hooks/useTasks';
import { useDashboardStore } from '@/stores/dashboardStore';
import {
  LayoutDashboard,
  MessageSquare,
  ListTodo,
  Search,
  X,
  FolderOpen,
  RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';

/**
 * ビュー定義。
 */
const VIEWS = [
  { id: 'overview' as const, label: '概要', icon: LayoutDashboard },
  { id: 'timeline' as const, label: 'タイムライン', icon: MessageSquare },
  { id: 'tasks' as const, label: 'タスク', icon: ListTodo },
  { id: 'files' as const, label: 'ファイル', icon: FolderOpen },
];

function App() {
  const { teams, loading: teamsLoading, error: teamsError, refetch: refetchTeams, dataUpdatedAt: teamsDataUpdatedAt } = useTeams();
  const { tasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks, dataUpdatedAt: tasksDataUpdatedAt } = useTasks();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // タスクビュー用のフィルター状態
  const [taskTeamFilter, setTaskTeamFilter] = useState<string>('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

  // ポーリング間隔の取得と設定
  const teamsInterval = useDashboardStore((state) => state.teamsInterval);
  const setTeamsInterval = useDashboardStore((state) => state.setTeamsInterval);
  const tasksInterval = useDashboardStore((state) => state.tasksInterval);
  const setTasksInterval = useDashboardStore((state) => state.setTasksInterval);

  // 選択されたチームの詳細を取得
  const {
    team: selectedTeamDetail,
    loading: teamDetailLoading,
    refetch: refetchTeamDetail,
    dataUpdatedAt: teamDetailDataUpdatedAt,
  } = useTeam(selectedTeam || '');

  // 個別のセレクターを使用して無限レンダリングを防ぐ
  const currentView = useDashboardStore((state) => state.currentView);
  const setCurrentView = useDashboardStore((state) => state.setCurrentView);

  // Group tasks by status
  const tasksByStatus = {
    pending: tasks.filter((t) => t.status === 'pending'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  // タスクフィルタリング（チームフィルタ + 検索）
  const filteredTasks = tasks.filter((task) => {
    // チームフィルタ
    const matchesTeam = taskTeamFilter === 'all' || task.teamName === taskTeamFilter;
    // 検索（件名・担当者）
    const searchLower = taskSearchQuery.toLowerCase().trim();
    const matchesSearch = !searchLower ||
      task.subject.toLowerCase().includes(searchLower) ||
      (task.owner && task.owner.toLowerCase().includes(searchLower));
    return matchesTeam && matchesSearch;
  });

  // フィルタ済みタスクをステータス別にグループ化
  const filteredTasksByStatus = {
    pending: filteredTasks.filter((t) => t.status === 'pending'),
    in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
    completed: filteredTasks.filter((t) => t.status === 'completed'),
  };

  // チームを作成日時順（新しい順）にソート (TC-002)
  const sortedTeams = [...teams].sort((a, b) => {
    // createdAt がある場合はそれを使用、ない場合は lastActivity を使用
    const aTime = a.createdAt ?? (a.lastActivity ? new Date(a.lastActivity).getTime() / 1000 : 0);
    const bTime = b.createdAt ?? (b.lastActivity ? new Date(b.lastActivity).getTime() / 1000 : 0);
    return bTime - aTime; // 新しい順（降順）
  });

  // チーム検索フィルター (TC-006)
  const searchedTeams = searchQuery.trim()
    ? sortedTeams.filter((team) =>
        team.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : sortedTeams;

  const filteredTeams = selectedTeam
    ? searchedTeams.filter((t) => t.name === selectedTeam)
    : searchedTeams;

  // エラー状態の判定
  const hasError = teamsError || tasksError;
  const isLoading = teamsLoading || tasksLoading;

  // リトライハンドラー
  const handleRetry = useCallback(() => {
    if (teamsError) refetchTeams();
    if (tasksError) refetchTasks();
  }, [teamsError, tasksError, refetchTeams, refetchTasks]);

  // ローディング状態
  if (isLoading && !hasError) {
    return (
      <Layout>
        <LoadingSpinner message="データを読み込んでいます..." />
      </Layout>
    );
  }

  // エラー状態
  if (hasError && !isLoading) {
    const errorMessage = teamsError || tasksError || 'データの読み込みに失敗しました';

    return (
      <Layout>
        <ErrorDisplay
          message={errorMessage}
          errorType="general"
          onRetry={handleRetry}
          retryText="再接続"
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header with View Tabs and Theme Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div role="tablist" aria-label="ビュー切り替え" className="flex items-center gap-2">
              {VIEWS.map((view) => {
                const Icon = view.icon;
                const isActive = currentView === view.id;
                return (
                  <button
                    key={view.id}
                    id={`tab-${view.id}`}
                    onClick={() => setCurrentView(view.id)}
                    aria-pressed={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    role="tab"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon size={18} />
                    {view.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overview View */}
          {currentView === 'overview' && (
            <div key="overview" role="tabpanel" aria-labelledby="tab-overview" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <>
              {/* チーム詳細パネル（選択時のみ表示） */}
              {selectedTeam && selectedTeamDetail && (
                <div className="mb-6">
                  <TeamDetailPanel
                    team={selectedTeamDetail}
                    onBack={() => setSelectedTeam(null)}
                    dataUpdatedAt={teamDetailDataUpdatedAt}
                    onRefresh={refetchTeamDetail}
                    isLoading={teamDetailLoading}
                    pollingInterval={teamsInterval}
                    onPollingIntervalChange={setTeamsInterval}
                  />
                </div>
              )}

              {/* Teams Section - 全幅表示 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Active Teams</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{teams.length} teams</span>
                    <PollingIntervalSelector
                      value={teamsInterval}
                      onChange={setTeamsInterval}
                      label=""
                      lastUpdateTimestamp={teamsDataUpdatedAt}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => refetchTeams()}
                    disabled={teamsLoading}
                    className={clsx(
                      'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      'text-slate-700 dark:text-slate-300',
                      'bg-white dark:bg-slate-800',
                      'border border-slate-300 dark:border-slate-700',
                      'hover:bg-slate-50 dark:hover:bg-slate-700',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      teamsLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <RefreshCw className={clsx('w-4 h-4', teamsLoading && 'animate-spin')} />
                    更新
                  </button>
                </div>
                {/* 検索ボックス (TC-006) */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="チーム名を検索..."
                      className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* 検索結果数 */}
                  {searchQuery && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {filteredTeams.length} 件の結果
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {filteredTeams.map((team) => (
                    <TeamCard
                      key={team.name}
                      team={team}
                      onClick={() => setSelectedTeam(selectedTeam === team.name ? null : team.name)}
                    />
                  ))}
                  {filteredTeams.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                      {searchQuery ? (
                        <>
                          <p className="mb-2">検索結果がありません</p>
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-blue-500 hover:text-blue-600 text-sm"
                          >
                            検索をクリア
                          </button>
                        </>
                      ) : (
                        'No teams found. Create a team in Claude Code to see it here.'
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tasks Section - 全幅表示 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tasks</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{tasks.length} tasks</span>
                    <PollingIntervalSelector
                      value={tasksInterval}
                      onChange={setTasksInterval}
                      label=""
                      lastUpdateTimestamp={tasksDataUpdatedAt}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => refetchTasks()}
                    disabled={tasksLoading}
                    className={clsx(
                      'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      'text-slate-700 dark:text-slate-300',
                      'bg-white dark:bg-slate-800',
                      'border border-slate-300 dark:border-slate-700',
                      'hover:bg-slate-50 dark:hover:bg-slate-700',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      tasksLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <RefreshCw className={clsx('w-4 h-4', tasksLoading && 'animate-spin')} />
                    更新
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pending */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
                      Pending ({tasksByStatus.pending.length})
                    </h3>
                    <div className="space-y-2">
                      {tasksByStatus.pending.map((task) => (
                        <TaskCard key={`${task.teamName}-${task.id}`} task={task} />
                      ))}
                    </div>
                  </div>

                      {/* In Progress */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          In Progress ({tasksByStatus.in_progress.length})
                        </h3>
                        <div className="space-y-2">
                          {tasksByStatus.in_progress.map((task) => (
                            <TaskCard key={`${task.teamName}-${task.id}`} task={task} />
                          ))}
                        </div>
                      </div>

                      {/* Completed */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Completed ({tasksByStatus.completed.length})
                        </h3>
                        <div className="space-y-2">
                          {tasksByStatus.completed.map((task) => (
                            <TaskCard key={`${task.teamName}-${task.id}`} task={task} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
            </>
            </div>
          )}

          {/* Timeline View - Chat Style */}
          {currentView === 'timeline' && (
            <div key="timeline" role="tabpanel" aria-labelledby="tab-timeline" className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-[calc(100vh-200px)]">
              {/* チームセレクター */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">チームを選択:</label>
                  <select
                    value={selectedTeam || ''}
                    onChange={(e) => setSelectedTeam(e.target.value || null)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- チームを選択 --</option>
                    {teams.map((team) => (
                      <option key={team.name} value={team.name}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedTeam ? (
                <ChatTimelinePanel teamName={selectedTeam} />
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 h-[600px] flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>タイムラインを表示するチームを選択してください</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tasks View (Kanban-style) */}
          {currentView === 'tasks' && (
            <div key="tasks" role="tabpanel" aria-labelledby="tab-tasks" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* ヘッダーセクション */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tasks</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {filteredTasks.length} / {tasks.length} 件
                    </span>
                    <PollingIntervalSelector
                      value={tasksInterval}
                      onChange={setTasksInterval}
                      label="更新間隔"
                      lastUpdateTimestamp={tasksDataUpdatedAt}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => refetchTasks()}
                    disabled={tasksLoading}
                    className={clsx(
                      'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      'text-slate-700 dark:text-slate-300',
                      'bg-white dark:bg-slate-800',
                      'border border-slate-300 dark:border-slate-700',
                      'hover:bg-slate-50 dark:hover:bg-slate-700',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      tasksLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <RefreshCw className={clsx('w-4 h-4', tasksLoading && 'animate-spin')} />
                    更新
                  </button>
                </div>

                {/* フィルターコントロール */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  {/* チームフィルタ */}
                  <div className="flex-1 sm:max-w-xs">
                    <label htmlFor="task-team-filter" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      チームフィルタ
                    </label>
                    <select
                      id="task-team-filter"
                      value={taskTeamFilter}
                      onChange={(e) => setTaskTeamFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">全チーム</option>
                      {teams.map((team) => (
                        <option key={team.name} value={team.name}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* タスク検索 */}
                  <div className="flex-1 sm:max-w-xs">
                    <label htmlFor="task-search" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      件名・担当者で検索
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="task-search"
                        type="text"
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        placeholder="件名や担当者を検索..."
                        className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {taskSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTaskSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label="検索をクリア"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* フィルタ解除ボタン */}
                  {(taskTeamFilter !== 'all' || taskSearchQuery) && (
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          setTaskTeamFilter('all');
                          setTaskSearchQuery('');
                        }}
                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        フィルタを解除
                      </button>
                    </div>
                  )}
                </div>

                {/* 機能説明 */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <span className="font-medium">タスクについて:</span>
                    タスクはエージェントチームの作業単位です。チームフィルタや検索で特定のタスクを見つけられます。
                  </p>
                </div>
              </div>

              {/* カンバンボード */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pending */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400" />
                  Pending ({filteredTasksByStatus.pending.length})
                </h3>
                <div className="space-y-3">
                  {filteredTasksByStatus.pending.map((task) => (
                    <TaskCard key={`${task.teamName}-${task.id}`} task={task} />
                  ))}
                  {filteredTasksByStatus.pending.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                      タスクがありません
                    </p>
                  )}
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  In Progress ({filteredTasksByStatus.in_progress.length})
                </h3>
                <div className="space-y-3">
                  {filteredTasksByStatus.in_progress.map((task) => (
                    <TaskCard key={`${task.teamName}-${task.id}`} task={task} />
                  ))}
                  {filteredTasksByStatus.in_progress.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                      タスクがありません
                    </p>
                  )}
                </div>
              </div>

              {/* Completed */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  Completed ({filteredTasksByStatus.completed.length})
                </h3>
                <div className="space-y-3">
                  {filteredTasksByStatus.completed.map((task) => (
                    <TaskCard key={`${task.teamName}-${task.id}`} task={task} />
                  ))}
                  {filteredTasksByStatus.completed.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                      タスクがありません
                    </p>
                  )}
                </div>
              </div>
              </div>
            </div>
          )}

          {/* Files View - File Changes Panel */}
          {currentView === 'files' && (
            <div key="files" role="tabpanel" aria-labelledby="tab-files" className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-[calc(100vh-200px)]">
              {/* チームセレクター */}
              <div className="mb-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">チームを選択:</label>
                  <select
                    value={selectedTeam || ''}
                    onChange={(e) => setSelectedTeam(e.target.value || null)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- チームを選択 --</option>
                    {teams.map((team) => (
                      <option key={team.name} value={team.name}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  {selectedTeam && (
                    <button
                      type="button"
                      onClick={() => setSelectedTeam(null)}
                      className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      クリア
                    </button>
                  )}
                </div>
              </div>
              {selectedTeam ? (
                <FileChangesPanel teamName={selectedTeam} />
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 h-[600px] flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>ファイル変更を表示するチームを選択してください</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default App;
