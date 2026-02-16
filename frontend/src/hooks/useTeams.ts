import { useState, useEffect, useCallback } from 'react';
import { Team, TeamSummary } from '@/types/team';

/**
 * 全チーム一覧を取得・管理するカスタムフック。
 *
 * /api/teams エンドポイントからチーム一覧を取得し、10秒間隔でポーリングします。
 * ローディング状態、エラー状態、手動再取得機能を提供します。
 *
 * @returns teams - チームサマリー配列
 * @returns loading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns refetch - 手動再取得関数
 * @returns setTeams - チーム状態更新関数
 *
*/
export function useTeams() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    // Poll every 10 seconds as fallback
    const interval = setInterval(fetchTeams, 10000);
    return () => clearInterval(interval);
  }, [fetchTeams]);

  return { teams, loading, error, refetch: fetchTeams, setTeams };
}

/**
 * 特定チームの詳細を取得・管理するカスタムフック。
 *
 * /api/teams/{teamName} エンドポイントからチーム詳細を取得します。
 * チーム名が変更されると自動的に再取得します。
 *
 * @param teamName - 取得対象のチーム名
 * @returns team - チーム詳細データ（null 可能）
 * @returns loading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns setTeam - チーム状態更新関数
 *
*/
export function useTeam(teamName: string) {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/teams/${teamName}`);
        if (!response.ok) throw new Error('Failed to fetch team');
        const data = await response.json();
        setTeam(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (teamName) {
      fetchTeam();
    }
  }, [teamName]);

  return { team, loading, error, setTeam };
}
