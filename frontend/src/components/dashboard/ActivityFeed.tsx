import { ActivityEvent } from '@/types/message';

/**
 * アクティビティイベントをリアルタイムフィード形式で表示するコンポーネント。
 *
 * メッセージ、タスク更新、メンバー参加等のイベントを時系列で表示します。
 * イベントタイプに応じて異なる色のインジケーターを表示します。
 *
 * @param props.activities - アクティビティイベント配列
 * @returns アクティビティフィード要素
 *
*/
interface ActivityFeedProps {
  activities: ActivityEvent[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4">Activity Feed</h3>
        <p className="text-gray-500 text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">Activity Feed</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-2 rounded hover:bg-gray-50"
          >
            <div className={`w-2 h-2 mt-2 rounded-full ${
              activity.type === 'message' ? 'bg-blue-500' :
              activity.type === 'task_update' ? 'bg-yellow-500' :
              activity.type === 'member_join' ? 'bg-green-500' :
              'bg-gray-500'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">
                <span className="font-medium">{activity.agentName}</span>
                <span className="text-gray-500"> in </span>
                <span className="text-primary-600">{activity.teamName}</span>
              </p>
              <p className="text-xs text-gray-500 truncate">{activity.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
