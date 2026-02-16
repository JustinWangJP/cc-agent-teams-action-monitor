/**
 * チームモデル関連のユーティリティ関数。
 *
 * チームメンバーのモデル情報を集計し、モデル使用状況を算出します。
 *
 * @module utils/teamModels
 */

import type { Member, Team } from '@/types/team';
import type { ModelUsage, TeamModelSummary } from '@/types/model';
import { MODEL_CONFIGS } from '@/config/models';

/**
 * メンバーリストからモデル使用状況を算出します。
 *
 * @param members - チームメンバーリスト
 * @returns モデル使用状況の配列
 */
export function computeTeamModels(members: Member[]): ModelUsage[] {
  const modelMap = new Map<string, ModelUsage>();

  members.forEach((member) => {
    const config = MODEL_CONFIGS[member.model] || MODEL_CONFIGS['default'];
    const existing = modelMap.get(config.id);

    if (existing) {
      existing.count++;
      existing.agents.push(member.name);
    } else {
      modelMap.set(config.id, {
        config,
        count: 1,
        agents: [member.name],
      });
    }
  });

  // 使用数の降順でソート
  return Array.from(modelMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * チームからモデルサマリー情報を算出します。
 *
 * @param team - チーム情報
 * @returns チームモデルサマリー
 */
export function computeTeamModelSummary(team: Team): TeamModelSummary {
  const models = computeTeamModels(team.members);
  const primaryModel = models.length > 0 ? models[0].config.id : 'unknown';

  return {
    teamName: team.name,
    models,
    primaryModel,
  };
}

/**
 * チームメンバーからユニークなモデルIDリストを取得します。
 *
 * @param members - チームメンバーリスト
 * @returns モデルIDの配列（重複なし）
 */
export function getUniqueModelIds(members: Member[]): string[] {
  const modelSet = new Set<string>();
  members.forEach((member) => {
    const config = MODEL_CONFIGS[member.model] || MODEL_CONFIGS['default'];
    modelSet.add(config.id);
  });
  return Array.from(modelSet);
}
