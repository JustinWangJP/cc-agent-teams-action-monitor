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
 * メンバーリストからモデル使用状況を集計して算出します。
 *
 * 各メンバーのモデル設定を収集し、モデルごとの使用回数と
 * 使用エージェント一覧を含むModelUsage配列を返します。
 *
 * @param members - チームメンバーリスト
 * @returns モデル使用状況の配列（使用数の降順でソート済み）
 *
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
 * チーム全体のモデル使用サマリー情報を算出します。
 *
 * チームメンバーのモデルを集計し、最も多く使用されている
 * モデルを primaryModel として設定したサマリーオブジェクトを返します。
 *
 * @param team - チーム情報（name, members を含む）
 * @returns チームモデルサマリー（teamName, models, primaryModel）
 *
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
 * チームメンバーから重複を除外したユニークなモデルIDリストを取得します。
 *
 * 各メンバーのモデルを走査し、Setを使用して重複を除外した
 * モデルIDの配列を返します。
 *
 * @param members - チームメンバーリスト
 * @returns ユニークなモデルIDの配列
 *
 */
export function getUniqueModelIds(members: Member[]): string[] {
  const modelSet = new Set<string>();
  members.forEach((member) => {
    const config = MODEL_CONFIGS[member.model] || MODEL_CONFIGS['default'];
    modelSet.add(config.id);
  });
  return Array.from(modelSet);
}
