---
name: teamworks
description: "Agent Teamsを用いたチーム体制を設計・提案するスキル。実装フェーズ開始前に呼び出し、必要なSection（Product Design / Product Build）・メンバー構成をユーザーへ提示し承認を取得する。"
disable-model-invocation: true
---

# Agent Teams チーム体制構成

## 目標

選定する体制は常に以下の3軸を満たすこと:

- **高品質** — 欠陥・手戻りを最小化する実装品質
- **最適コスト** — 不要なメンバー・工数を排除（YAGNI）
- **ユーザー満足度最高** — Product Design SectionのUATで品質検証

---

## ⚠️ HARD-GATE（必須制約）

**チーム体制をユーザーへ提示し、明示的な承認を得るまで、以下を一切実行してはならない:**

- コードの記述・編集
- ファイルの作成・変更
- スキャフォールディング
- その他すべての実装作業

**プロジェクトの見た目の複雑さに関わらず、すべてのケースに適用される。**

---

## 実行ワークフロー

1. **分析** — プロジェクトのコードベース・要件・タスクを把握する
2. **Section選定** — 後述の「利用可能なSection」を参照し、必要なSectionを選択する（1つ以上、複数可）
3. **メンバー設計** — 選定した各SectionのSection Leaderを必ずアサインし、タスク量・難易度に応じてメンバーの役割・人数を決定する
4. **体制提示** — 以下のフォーマットでユーザーへ提示する
5. **承認取得** → 承認後に実装フェーズへ移行

### 提示フォーマット

```
## 提案チーム体制

### 選定Section
- **[Section名]**: [選定理由]

### メンバー構成
| ロール | 人数 | 担当タスク |
|--------|------|-----------|
| [ロール名] | [N]名 | [タスク概要] |

### コミュニケーション経路
[Section間・メンバー間の報告・連絡の流れ]

### 体制根拠
[この体制を選んだ理由・考え方]
```

---

## アンチパターン

> **「シンプルだから体制提示を省略する」は厳禁。**

手戻りを生む典型的な失敗例:

- Section LeaderなしでSectionを構成する
- 目標3軸（品質・コスト・満足度）を考慮しない
- Sectionへの依頼タスクが不明確
- 不要なメンバーを追加する（YAGNI違反）
- 体制承認なしに実装を開始する

---

## 利用可能なSection

各Sectionには必ず **Section Leaderを1名** アサインすること。

### 1. Product Design Section

| 項目 | 内容 |
|------|------|
| **Section Leader** | Product Owner |
| **役割・目標** | ユーザー満足度最高のプロダクト設計・UAT実施・フィードバック連携 |
| **選定基準** | UI/UX設計・E2Eテスト・受入テストが必要なプロジェクト |

### 2. Product Build Section

| 項目 | 内容 |
|------|------|
| **Section Leader** | Develop Leader |
| **役割・目標** | ビジネス要件・システム要件に基づく高品質・最適コストの実装。Section内テスト完了後、Product Design SectionへUATを依頼する |
| **選定基準** | フロントエンド・バックエンド・アーキテクチャ設計を伴うプロジェクト |

---

## メンバープロフィール

### Product Design Section

#### Product Owner（1名固定）

- **役割:** Section全体リード。メンバーへの具体的指示・不明点のユーザーへの問い合わせを担う
- **コミュニケーション:** Product Build Sectionとの連携は `Develop Leader` のみと行う。Build Sectionメンバーへの直接指示は禁止

#### E2E Member（上限3名）

- **役割:** Product OwnerからアサインされたE2Eテストタスクを高品質・高効率で実行する
- **コミュニケーション:** `Product Owner` のみへ報告。他メンバーへの直接指示は禁止
- **MCP Servers:** `zai-mcp-server`, `chrome-devtools`

---

### Product Build Section

#### Develop Leader（1名固定）

- **役割:** Section全体リード。メンバーへの具体的指示・Product Ownerからの指摘対応・メンバー課題へのフィードバックを担う。不明点はMCP Serverを介してWeb調査し、まとめた内容をメンバーへ共有する
- **コミュニケーション:** Product Design Sectionとの連携は `Product Owner` のみと行う。Design Sectionメンバーへの直接指示は禁止

#### Frontend Developer（上限3名）

- **役割:** UI/UX・React・Tailwindなどフロントエンド実装を担う
- **制約:** 同一ファイルへの複数名同時編集は禁止
- **コミュニケーション:** `Develop Leader` のみへ報告。他メンバーへの連絡は必ず `Develop Leader` を経由する
- **Skills:** `tailwind-design-system`, `ui-ux-pro-max`, `vercel-react-best-practices`, `error-handling-patterns`, `chrome-devtools`
- **MCP Servers:** `perplexity`, `context7`, `github`, `zai-mcp-server`, `chrome-devtools`

#### Backend Developer（上限3名）

- **役割:** Python・Java・データベース設計などバックエンド実装を担う
- **制約:** 同一ファイルへの複数名同時編集は禁止
- **コミュニケーション:** `Develop Leader` のみへ報告。他メンバーへの連絡は必ず `Develop Leader` を経由する
- **Skills:** `fastapi-templates`, `microsoft-agent-framework`, `error-handling-patterns`
- **MCP Servers:** `perplexity`, `context7`

#### System Architect（1名固定）

- **役割:** システムアーキテクチャ設計専任。コード実装は行わず、適切な設計をDevelop Leaderへ提案・共有する
- **制約:** 活動時は必ず `architect` ロールへ切り替えること
- **コミュニケーション:** `Develop Leader` のみへ報告。他メンバーへの連絡は必ず `Develop Leader` を経由する
- **Skills:** `fastapi-templates`, `microsoft-agent-framework`, `tailwind-design-system`, `ui-ux-pro-max`, `vercel-react-best-practices`, `error-handling-patterns`
- **MCP Servers:** `perplexity`, `context7`

---

## Key Principles

| 原則 | 内容 |
|------|------|
| **体制具体化** | どのSection・メンバー・ロール・スキル・MCPサーバーを使うか明確にする |
| **体制理由説明** | 体制構成の根拠を必ず説明する |
| **YAGNI徹底** | 不要なSection・メンバーを追加しない |
| **Leaderルール** | 選定した各SectionにSection Leaderを必ずアサインする |
| **コミュニケーション厳守** | Section間通信はリード同士のみ。メンバーの直接横断通信は禁止 |
