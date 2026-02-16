import { useState, useEffect, useCallback } from 'react';
import { Task, TaskSummary } from '@/types/task';

/**
 * 全タスク一覧を取得・管理するカスタムフック。
 *
 * /api/tasks エンドポイントからタスク一覧を取得し、10秒間隔でポーリングします。
 * ローディング状態、エラー状態、手動再取得機能を提供します。
 *
 * @returns tasks - タスクサマリー配列
 * @returns loading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns refetch - 手動再取得関数
 * @returns setTasks - タスク状態更新関数
 *
 * @
 */
export function useTasks() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks, setTasks };
}

/**
 * 特定チームのタスク一覧を取得・管理するカスタムフック。
 *
 * /api/tasks/team/{teamName} エンドポイントからチーム別タスクを取得します。
 * チーム名が変更されると自動的に再取得します。
 *
 * @param teamName - 取得対象のチーム名
 * @returns tasks - タスク詳細配列
 * @returns loading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns setTasks - タスク状態更新関数
 *
 * @
 */
export function useTeamTasks(teamName: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tasks/team/${teamName}`);
        if (!response.ok) throw new Error('Failed to fetch team tasks');
        const data = await response.json();
        setTasks(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (teamName) {
      fetchTasks();
    }
  }, [teamName]);

  return { tasks, loading, error, setTasks };
}
