/**
 * モデル関連の TypeScript 型定義。
 *
 * ModelConfig、ModelProvider、TeamModelSummary インターフェースを定義し、
 * AI モデルの視覚的表現を型安全に管理します。
 *
 * @module types/model
 */

/**
 * モデルプロバイダの種類。
 *
 * 各 AI モデルの提供元を表します。
 */
export type ModelProvider = "anthropic" | "moonshot" | "zhipu" | "Alibaba Cloud" | "other";

/**
 * モデル設定を表すインターフェース。
 *
 * 各 AI モデルの視覚的表現（色、アイコン、ラベル）を定義します。
 * モデルバッジコンポーネントで使用されます。
 */
export interface ModelConfig {
  /** モデル一意識別子 */
  id: string;
  /** 表示色（HEX） */
  color: string;
  /** アイコン絵文字 */
  icon: string;
  /** 表示ラベル */
  label: string;
  /** プロバイダ */
  provider: ModelProvider;
}

/**
 * チーム内のモデル使用状況を表すインターフェース。
 *
 * 特定のモデルを使用するエージェントの数と名前を管理します。
 */
export interface ModelUsage {
  /** モデル設定 */
  config: ModelConfig;
  /** 使用エージェント数 */
  count: number;
  /** モデルを使用するエージェント名リスト */
  agents: string[];
}

/**
 * チームのモデルサマリーを表すインターフェース。
 *
 * チーム内で使用されている全モデルの集計情報を持ちます。
 */
export interface TeamModelSummary {
  /** チーム名 */
  teamName: string;
  /** モデル使用状況リスト */
  models: ModelUsage[];
  /** 最も使用されているモデル（主要モデル） */
  primaryModel: string;
}

/**
 * 利用可能なモデル設定のレコード型。
 *
 * モデルID をキーとした ModelConfig のマップです。
 */
export type ModelConfigs = Record<string, ModelConfig>;
