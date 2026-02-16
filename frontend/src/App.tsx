/**
 * Agent Teams Dashboard メインアプリケーション。
 *
 * チーム監視、タスク管理、メッセージタイムライン、依存グラフを
 * タブ形式で切り替えて表示します。
 *
 * @module App
 */

import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { TeamCard } from '@/components/dashboard/TeamCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { TaskCard } from '@/components/tasks/TaskCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TimelinePanel } from '@/components/timeline/TimelinePanel';
import { TaskDependencyGraph } from '@/components/graph/TaskDependencyGraph';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTeams } from '@/hooks/useTeams';
import { useTasks } from '@/hooks/useTasks';
import { useDashboardStore, useCurrentView } from '@/stores/dashboardStore';
import { TeamSummary } from '@/types/team';
import { TaskSummary } from '@/types/task';
import { ActivityEvent } from '@/types/message';
import {
  LayoutDashboard,
  MessageSquare,
  ListTodo,
  GitBranch,
} from 'lucide-react';

/**
 * ビュー定義。
 */
const VIEWS = [
  { id: 'overview' as const, label: '概要', icon: LayoutDashboard },
  { id: 'timeline' as const, label: 'タイムライン', icon: MessageSquare },
  { id: 'tasks' as const, label: 'タスク', icon: ListTodo },
  { id: 'graphs' as const, label: '依存グラフ', icon: GitBranch },
];

function App() {
  const { teams, loading: teamsLoading, setTeams } = useTeams();
  const { tasks, loading: tasksLoading, setTasks } = useTasks();
  const { lastMessage, connectionStatus } = useWebSocket('dashboard');
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const { currentView, setCurrentView } = useCurrentView();
  const { setSelectedTask } = useDashboardStore();

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    const addActivity = (event: Partial<ActivityEvent>) => {
      const activity: ActivityEvent = {
        id: `${Date.now()}-${Math.random()}`,
        type: event.type || 'message',
        teamName: event.teamName || '',
        agentName: event.agentName || 'Unknown',
        content: event.content || '',
        timestamp: new Date().toISOString(),
        metadata: event.metadata,
      };
      setActivities((prev) => [activity, ...prev].slice(0, 50));
    };

    if (lastMessage.type === 'team_update' && lastMessage.team) {
      // Refresh teams list
      fetch('/api/teams')
        .then((res) => res.json())
        .then((data: TeamSummary[]) => setTeams(data))
        .catch(console.error);

      addActivity({
        type: 'member_join',
        teamName: lastMessage.team,
        agentName: 'System',
        content: `Team ${lastMessage.team} updated`,
      });
    }

    if (lastMessage.type === 'task_update' && lastMessage.team) {
      // Refresh tasks list
      fetch('/api/tasks')
        .then((res) => res.json())
        .then((data: TaskSummary[]) => setTasks(data))
        .catch(console.error);

      addActivity({
        type: 'task_update',
        teamName: lastMessage.team,
        agentName: (lastMessage.data as { owner?: string })?.owner || 'Unknown',
        content: `Task ${lastMessage.task_id} updated`,
      });
    }

    if (lastMessage.type === 'inbox_update' && lastMessage.team && lastMessage.agent) {
      addActivity({
        type: 'message',
        teamName: lastMessage.team,
        agentName: lastMessage.agent,
        content: lastMessage.messages?.length
          ? `New message: ${lastMessage.messages[lastMessage.messages.length - 1]?.text?.slice(0, 50)}...`
          : 'Inbox updated',
      });
    }
  }, [lastMessage, setTeams, setTasks]);

  // Group tasks by status
  const tasksByStatus = {
    pending: tasks.filter((t) => t.status === 'pending'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  const filteredTeams = selectedTeam
    ? teams.filter((t) => t.name === selectedTeam)
    : teams;

  // Handle node click in dependency graph
  const handleNodeClick = useCallback(
    (node: { id: string; taskId: string }) => {
      const task = tasks.find((t) => t.id === node.taskId);
      if (task) {
        setSelectedTask({
          id: task.id,
          subject: task.subject,
          status: task.status,
          activeForm: '',
          description: '',
          blocks: [],
          blockedBy: [],
          owner: task.owner,
          teamName: task.teamName,
        });
      }
    },
    [tasks, setSelectedTask]
  );

  // Convert TaskSummary to format expected by TaskDependencyGraph
  const tasksForGraph = tasks.map((t) => ({
    ...t,
    blockedBy: [],
  }));

  if (teamsLoading || tasksLoading) {
    return (
      <Layout connectionStatus={connectionStatus}>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout connectionStatus={connectionStatus}>
      <div className="bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header with View Tabs and Theme Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {VIEWS.map((view) => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.id}
                    onClick={() => setCurrentView(view.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentView === view.id
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
            <ThemeToggle />
          </div>

          {/* Overview View */}
          {currentView === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Teams Section */}
              <div className="lg:col-span-3">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Active Teams</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{teams.length} teams</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredTeams.map((team) => (
                      <TeamCard
                        key={team.name}
                        team={team}
                        onClick={() => setSelectedTeam(selectedTeam === team.name ? null : team.name)}
                      />
                    ))}
                    {filteredTeams.length === 0 && (
                      <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                        No teams found. Create a team in Claude Code to see it here.
                      </div>
                    )}
                  </div>
                </div>

                {/* Tasks Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tasks</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{tasks.length} tasks</span>
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
                          <TaskCard key={task.id} task={task} />
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
                          <TaskCard key={task.id} task={task} />
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
                          <TaskCard key={task.id} task={task} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="lg:col-span-1">
                <ActivityFeed activities={activities} />
              </div>
            </div>
          )}

          {/* Timeline View */}
          {currentView === 'timeline' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              {selectedTeam ? (
                <TimelinePanel teamName={selectedTeam} />
              ) : (
                <div className="flex items-center justify-center h-96">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pending */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400" />
                  Pending ({tasksByStatus.pending.length})
                </h3>
                <div className="space-y-3">
                  {tasksByStatus.pending.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  In Progress ({tasksByStatus.in_progress.length})
                </h3>
                <div className="space-y-3">
                  {tasksByStatus.in_progress.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>

              {/* Completed */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  Completed ({tasksByStatus.completed.length})
                </h3>
                <div className="space-y-3">
                  {tasksByStatus.completed.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dependency Graph View */}
          {currentView === 'graphs' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                タスク依存グラフ
              </h2>
              <TaskDependencyGraph
                tasks={tasksForGraph}
                width={1100}
                height={600}
                onNodeClick={handleNodeClick}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default App;
