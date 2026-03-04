/**
 * Agent Teams Dashboard メインアプリケーション。
 *
 * チーム監視、タスク管理、メッセージタイムライン、依存グラフを
 * タブ形式で切り替えて表示します。
 *
 * @module App
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { TeamCard, TeamDetailPanel } from "@/components/dashboard";
import { TaskCard } from "@/components/tasks/TaskCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorDisplay } from "@/components/common/ErrorDisplay";
import { PollingIntervalSelector } from "@/components/common/PollingIntervalSelector";
import { ChatTimelinePanel } from "@/components/chat";
import { TimelineTaskSplitLayout } from "@/components/timeline/TimelineTaskSplitLayout";
import { TaskMonitorPanel } from "@/components/tasks/TaskMonitorPanel";
import { useTeams, useTeam } from "@/hooks/useTeams";
import { useTasks, useTeamTasks } from "@/hooks/useTasks";
import { useUnifiedTimeline } from "@/hooks/useUnifiedTimeline";
import { useDashboardStore } from "@/stores/dashboardStore";
import {
  LayoutDashboard,
  MessageSquare,
  ListTodo,
  Search,
  X,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

/**
 * ビュー定義。
 */
function useViews() {
  const { t } = useTranslation('common');
  return [
    { id: "overview" as const, label: t('navigation.overview'), icon: LayoutDashboard },
    { id: "timeline" as const, label: t('navigation.timeline'), icon: MessageSquare },
    { id: "tasks" as const, label: t('navigation.tasks'), icon: ListTodo },
  ] as const;
}

function App() {
  const { t } = useTranslation(['common', 'a11y']);
  const VIEWS = useViews();
  const {
    teams,
    loading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams,
    dataUpdatedAt: teamsDataUpdatedAt,
  } = useTeams();
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
    dataUpdatedAt: tasksDataUpdatedAt,
  } = useTasks();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // タスクビュー用のフィルター状態
  const [taskTeamFilter, setTaskTeamFilter] = useState<string>("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState("");

  // ポーリング間隔の取得と設定
  const teamsInterval = useDashboardStore((state) => state.teamsInterval);
  const setTeamsInterval = useDashboardStore((state) => state.setTeamsInterval);
  const tasksInterval = useDashboardStore((state) => state.tasksInterval);
  const setTasksInterval = useDashboardStore((state) => state.setTasksInterval);
  const messagesInterval = useDashboardStore((state) => state.messagesInterval);
  const setMessagesInterval = useDashboardStore((state) => state.setMessagesInterval);

  // 個別のセレクターを使用して無限レンダリングを防ぐ
  const currentView = useDashboardStore((state) => state.currentView);
  const setCurrentView = useDashboardStore((state) => state.setCurrentView);

  // タスクパネルの折りたたみ状態
  const isTaskPanelCollapsed = useDashboardStore((state) => state.isTaskPanelCollapsed);
  const toggleTaskPanel = useDashboardStore((state) => state.toggleTaskPanel);

  // タイムライン用のデータ取得（統合更新ボタン用）
  const { refetch: refetchTimeline, dataUpdatedAt: timelineDataUpdatedAt } = useUnifiedTimeline({
    teamName: selectedTeam || '',
    enabled: currentView === 'timeline' && !!selectedTeam,
  });
  const { refetch: refetchTeamTasks } = useTeamTasks(selectedTeam || '');

  // タイムライン統合更新ハンドラー
  const handleTimelineRefresh = useCallback(() => {
    refetchTimeline();
    refetchTeamTasks();
  }, [refetchTimeline, refetchTeamTasks]);

  // 選択されたチームの詳細を取得
  const {
    team: selectedTeamDetail,
    loading: teamDetailLoading,
    refetch: refetchTeamDetail,
    dataUpdatedAt: teamDetailDataUpdatedAt,
  } = useTeam(selectedTeam || "");

  // タスクフィルタリング（チームフィルタ + 検索）
  const filteredTasks = tasks.filter((task) => {
    // チームフィルタ
    const matchesTeam =
      taskTeamFilter === "all" || task.teamName === taskTeamFilter;
    // 検索（件名・担当者）
    const searchLower = taskSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      task.subject.toLowerCase().includes(searchLower) ||
      (task.owner && task.owner.toLowerCase().includes(searchLower));
    return matchesTeam && matchesSearch;
  });

  // フィルタ済みタスクをステータス別にグループ化
  const filteredTasksByStatus = {
    pending: filteredTasks.filter((t) => t.status === "pending"),
    in_progress: filteredTasks.filter((t) => t.status === "in_progress"),
    completed: filteredTasks.filter((t) => t.status === "completed"),
  };

  // チームを作成日時順（新しい順）にソート (TC-002)
  const sortedTeams = [...teams].sort((a, b) => {
    // createdAt がある場合はそれを使用、ない場合は lastActivity を使用
    const aTime =
      a.createdAt ??
      (a.lastActivity ? new Date(a.lastActivity).getTime() / 1000 : 0);
    const bTime =
      b.createdAt ??
      (b.lastActivity ? new Date(b.lastActivity).getTime() / 1000 : 0);
    return bTime - aTime; // 新しい順（降順）
  });

  // チーム検索フィルター (TC-006)
  const searchedTeams = searchQuery.trim()
    ? sortedTeams.filter((team) =>
        team.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
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
        <LoadingSpinner message={t('loading_data')} />
      </Layout>
    );
  }

  // エラー状態
  if (hasError && !isLoading) {
    const errorMessage =
      teamsError || tasksError || t('load_error');

    return (
      <Layout>
        <ErrorDisplay
          message={errorMessage}
          errorType="general"
          onRetry={handleRetry}
          retryText={t('buttons.reconnect')}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="px-4 py-6">
          {/* Header with View Tabs and Theme Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div
              role="tablist"
              aria-label={t('a11y:view_switcher')}
              className="flex items-center gap-2"
            >
              {VIEWS.map((view) => {
                const Icon = view.icon;
                const isActive = currentView === view.id;
                return (
                  <button
                    key={view.id}
                    id={`tab-${view.id}`}
                    onClick={() => setCurrentView(view.id)}
                    aria-pressed={isActive}
                    aria-current={isActive ? "page" : undefined}
                    role="tab"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${
                      isActive
                        ? "bg-blue-500 text-white ring-2 ring-blue-300"
                        : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:ring-2 focus:ring-blue-500"
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
          {currentView === "overview" && (
            <div
              key="overview"
              role="tabpanel"
              aria-labelledby="tab-overview"
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
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
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {t('teams.active_teams')}
                      </h2>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {t('teams.teams_count', { count: teams.length })}
                      </span>
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
                        "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                        "text-slate-700 dark:text-slate-300",
                        "bg-white dark:bg-slate-800",
                        "border border-slate-300 dark:border-slate-700",
                        "hover:bg-slate-50 dark:hover:bg-slate-700",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                        teamsLoading && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <RefreshCw
                        className={clsx(
                          "w-4 h-4",
                          teamsLoading && "animate-spin",
                        )}
                      />
                      {t('buttons.refresh')}
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
                        placeholder={t('teams.search_placeholder')}
                        className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {/* 検索結果数 */}
                    {searchQuery && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t('teams.search_results', { count: filteredTeams.length })}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {filteredTeams.map((team) => (
                      <TeamCard
                        key={team.name}
                        team={team}
                        onClick={() =>
                          setSelectedTeam(
                            selectedTeam === team.name ? null : team.name,
                          )
                        }
                      />
                    ))}
                    {filteredTeams.length === 0 && (
                      <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                        {searchQuery ? (
                          <>
                            <p className="mb-2">{t('teams.no_search_results')}</p>
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              className="text-blue-500 hover:text-blue-600 text-sm"
                            >
                              {t('teams.clear_search')}
                            </button>
                          </>
                        ) : (
                          t('teams.no_teams')
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            </div>
          )}

          {/* Timeline View - Chat Style with Split Layout */}
          {currentView === "timeline" && (
            <div
              key="timeline"
              role="tabpanel"
              aria-labelledby="tab-timeline"
              className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-[calc(100vh-200px)]"
            >
              {/* チームセレクター + 更新UI（統合） */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label htmlFor="timeline-team-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('teams.select_team')}:
                  </label>
                  <select
                    id="timeline-team-select"
                    value={selectedTeam || ""}
                    onChange={(e) => setSelectedTeam(e.target.value || null)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('teams.select_team_placeholder')}</option>
                    {teams.map((team) => (
                      <option key={team.name} value={team.name}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedTeam && (
                  <div className="flex items-center gap-3">
                    <PollingIntervalSelector
                      value={messagesInterval}
                      onChange={setMessagesInterval}
                      label=""
                      lastUpdateTimestamp={timelineDataUpdatedAt}
                    />
                    <button
                      type="button"
                      onClick={handleTimelineRefresh}
                      className={clsx(
                        "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                        "text-slate-700 dark:text-slate-300",
                        "bg-white dark:bg-slate-800",
                        "border border-slate-300 dark:border-slate-700",
                        "hover:bg-slate-50 dark:hover:bg-slate-700",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                      )}
                      aria-label={t('a11y.refresh_timeline')}
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t('buttons.refresh')}
                    </button>
                  </div>
                )}
              </div>
              {selectedTeam ? (
                <TimelineTaskSplitLayout
                  isTaskPanelCollapsed={isTaskPanelCollapsed}
                  taskPanelOffset={100}
                  timelinePanel={<ChatTimelinePanel teamName={selectedTeam} />}
                  taskPanel={
                    <TaskMonitorPanel
                      teamName={selectedTeam}
                      isCollapsed={isTaskPanelCollapsed}
                      onToggle={toggleTaskPanel}
                    />
                  }
                />
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 h-[600px] flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{t('teams.select_timeline_team')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tasks View (Kanban-style) */}
          {currentView === "tasks" && (
            <div
              key="tasks"
              role="tabpanel"
              aria-labelledby="tab-tasks"
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {/* ヘッダーセクション */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {t('tasks.title')}
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t('tasks.count', { filtered: filteredTasks.length, total: tasks.length })}
                    </span>
                    <PollingIntervalSelector
                      value={tasksInterval}
                      onChange={setTasksInterval}
                      label={t('header.polling_interval')}
                      lastUpdateTimestamp={tasksDataUpdatedAt}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => refetchTasks()}
                    disabled={tasksLoading}
                    className={clsx(
                      "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                      "text-slate-700 dark:text-slate-300",
                      "bg-white dark:bg-slate-800",
                      "border border-slate-300 dark:border-slate-700",
                      "hover:bg-slate-50 dark:hover:bg-slate-700",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                      tasksLoading && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <RefreshCw
                      className={clsx(
                        "w-4 h-4",
                        tasksLoading && "animate-spin",
                      )}
                    />
                    {t('buttons.refresh')}
                  </button>
                </div>

                {/* フィルターコントロール */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  {/* チームフィルタ */}
                  <div className="flex-1 sm:max-w-xs">
                    <label
                      htmlFor="task-team-filter"
                      className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t('tasks.filter_label')}
                    </label>
                    <select
                      id="task-team-filter"
                      value={taskTeamFilter}
                      onChange={(e) => setTaskTeamFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">{t('tasks.filter_all')}</option>
                      {teams.map((team) => (
                        <option key={team.name} value={team.name}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* タスク検索 */}
                  <div className="flex-1 sm:max-w-xs">
                    <label
                      htmlFor="task-search"
                      className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {t('tasks.search_label')}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="task-search"
                        type="text"
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        placeholder={t('tasks.search_placeholder')}
                        className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {taskSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTaskSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label={t('a11y.clear_search')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* フィルタ解除ボタン */}
                  {(taskTeamFilter !== "all" || taskSearchQuery) && (
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          setTaskTeamFilter("all");
                          setTaskSearchQuery("");
                        }}
                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        {t('tasks.clear_filters')}
                      </button>
                    </div>
                  )}
                </div>

                {/* 機能説明 */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <span className="font-medium">{t('tasks.title')}:</span>
                    {t('tasks.description')}
                  </p>
                </div>
              </div>

              {/* カンバンボード */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pending */}
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-400" />
                    {t('tasks.status.pending')} ({filteredTasksByStatus.pending.length})
                  </h3>
                  <div className="space-y-3">
                    {filteredTasksByStatus.pending.map((task) => (
                      <TaskCard
                        key={`${task.teamName}-${task.id}`}
                        task={task}
                      />
                    ))}
                    {filteredTasksByStatus.pending.length === 0 && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                        {t('tasks.no_tasks')}
                      </p>
                    )}
                  </div>
                </div>

                {/* In Progress */}
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    {t('tasks.status.in_progress')} ({filteredTasksByStatus.in_progress.length})
                  </h3>
                  <div className="space-y-3">
                    {filteredTasksByStatus.in_progress.map((task) => (
                      <TaskCard
                        key={`${task.teamName}-${task.id}`}
                        task={task}
                      />
                    ))}
                    {filteredTasksByStatus.in_progress.length === 0 && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                        {t('tasks.no_tasks')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Completed */}
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    {t('tasks.status.completed')} ({filteredTasksByStatus.completed.length})
                  </h3>
                  <div className="space-y-3">
                    {filteredTasksByStatus.completed.map((task) => (
                      <TaskCard
                        key={`${task.teamName}-${task.id}`}
                        task={task}
                      />
                    ))}
                    {filteredTasksByStatus.completed.length === 0 && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                        {t('tasks.no_tasks')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default App;
