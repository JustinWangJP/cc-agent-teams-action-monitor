import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { TeamCard } from '@/components/dashboard/TeamCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { TaskCard } from '@/components/tasks/TaskCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTeams } from '@/hooks/useTeams';
import { useTasks } from '@/hooks/useTasks';
import { TeamSummary } from '@/types/team';
import { TaskSummary } from '@/types/task';
import { ActivityEvent } from '@/types/message';

function App() {
  const { teams, loading: teamsLoading, setTeams } = useTeams();
  const { tasks, loading: tasksLoading, setTasks } = useTasks();
  const { lastMessage, connectionStatus } = useWebSocket('dashboard');
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

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

  if (teamsLoading || tasksLoading) {
    return (
      <Layout connectionStatus={connectionStatus}>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout connectionStatus={connectionStatus}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Teams Section */}
        <div className="lg:col-span-3">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Active Teams</h2>
              <span className="text-sm text-gray-500">{teams.length} teams</span>
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
                <div className="col-span-full text-center py-8 text-gray-500">
                  No teams found. Create a team in Claude Code to see it here.
                </div>
              )}
            </div>
          </div>

          {/* Tasks Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Tasks</h2>
              <span className="text-sm text-gray-500">{tasks.length} tasks</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pending */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
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
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
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
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
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
    </Layout>
  );
}

export default App;
