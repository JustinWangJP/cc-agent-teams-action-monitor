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

### プロジェクト規模
| レベル | 判定根拠 |
|--------|----------|
| Level X: [レベル名] | [具体的な判定理由] |

### 選定Section
- **[Section名]**: [選定理由]

### メンバー構成
| ロール | 人数 | 担当タスク | 利用Skills | MCP Servers | AgentType |
|--------|------|-----------|------------|-------------|-------------|
| [ロール名] | [N]名 | [タスク詳細(箇条書き)] | [Skills] | [MCP Servers] | [AgenType] |

### タスク配分
```
[ロール名]
├── [タスク1]
└── [タスク2]
```

### コミュニケーション経路
[Section間・メンバー間の報告・連絡の流れ]

### 体制根拠
[この体制を選んだ理由・考え方]

### 品質検証
| チェック項目 | 結果 |
|--------------|------|
| [項目] | [結果] |

---

## 承認

上記のチーム体制で実装を開始してよろしいでしょうか？

- [ ] はい、承認します
- [ ] いいえ、修正が必要です：___________
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
- メンバー構成には利用Skills、MCP Server、AgentTypeの不記載

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
- **AgentType:** `analyzer`
- **Skills:** `ultrathink`, `sequential-thinking`
- **MCP Servers:** `perplexity`

#### E2E Member（上限3名）

- **役割:** Product OwnerからアサインされたE2Eテストタスクを高品質・高効率で実行する
- **コミュニケーション:** `Product Owner` のみへ報告。他メンバーへの直接指示は禁止
- **AgentType:** `qa`
- **Skills:** `ui-ux-pro-max`, `chrome-devtools`
- **MCP Servers:** `zai-mcp-server`, `chrome-devtools`

---

### Product Build Section

#### Develop Leader（1名固定）

- **役割:** Section全体リード。メンバーへの具体的指示・Product Ownerからの指摘対応・メンバー課題へのフィードバックを担う。不明点はMCP Serverを介してWeb調査し、まとめた内容をメンバーへ共有する。Developer間の作業を調整する。メンバーの実装コードに対してレビューを実施する。
- **コミュニケーション:** Product Design Sectionとの連携は `Product Owner` のみと行う。Design Sectionメンバーへの直接指示は禁止
- **AgentType:** `multi-agent-coordinator`
- **Skills:** `ultrathink`, `sequential-thinking`, `tailwind-design-system`, `ui-ux-pro-max`, `vercel-react-best-practices`, `error-handling-patterns`, `fastapi-templates`, `microsoft-agent-framework`
- **MCP Servers:** `perplexity`, `context7`, `zai-mcp-server`

#### Frontend Developer（上限3名）

- **役割:** UI/UX・React・Tailwindなどフロントエンド実装を担う
- **制約:** 同一ファイルへの複数名同時編集は禁止
- **コミュニケーション:** `Develop Leader` のみへ報告。他メンバーへの連絡は必ず `Develop Leader` を経由する
- **AgentType:** `frontend`
- **Skills:** `tailwind-design-system`, `ui-ux-pro-max`, `vercel-react-best-practices`, `error-handling-patterns`, `chrome-devtools`
- **MCP Servers:** `perplexity`, `context7`, `github`, `zai-mcp-server`, `chrome-devtools`

#### Backend Developer（上限3名）

- **役割:** Python・Java・データベース設計などバックエンド実装を担う
- **制約:** 同一ファイルへの複数名同時編集は禁止
- **コミュニケーション:** `Develop Leader` のみへ報告。他メンバーへの連絡は必ず `Develop Leader` を経由する
- **AgentType:** `frontend`
- **Skills:** `fastapi-templates`, `microsoft-agent-framework`, `error-handling-patterns`
- **MCP Servers:** `perplexity`, `context7`

#### System Architect（1名固定）

- **役割:** システムアーキテクチャ設計専任。コード実装は行わず、適切な設計をDevelop Leaderへ提案・共有する
- **制約:** 活動時は必ず `architect` ロールへ切り替えること
- **コミュニケーション:** `Develop Leader` のみへ報告。他メンバーへの連絡は必ず `Develop Leader` を経由する
- **Skills:** `fastapi-templates`, `microsoft-agent-framework`, `tailwind-design-system`, `ui-ux-pro-max`, `vercel-react-best-practices`, `error-handling-patterns`
- **MCP Servers:** `perplexity`, `context7`

---

## Progressive Disclosure（段階的体制選定）

プロジェクトの複雑さに応じて、体制を段階的に構築すること。

### 複雑さレベル判定

| レベル | 特徴 | 選定Section | メンバー数 |
|--------|------|-------------|-----------|
| **Level 1: シンプル** | 1〜3ファイルの修正・既存パターン準拠・テスト変更なし | Product Buildのみ | 1〜2名 |
| **Level 2: 標準** | 複数ファイル・新規機能・テスト必要・UI変更小 | Build + （必要時）Design | 2〜4名 |
| **Level 3: 複雑** | アーキテクチャ変更・新技術導入・大規模UI変更 | Build + Design + Architect | 4名以上 |

### 判定フロー

```
1. 変更ファイル数は3以下か？
   → Yes: Level 1（Buildのみ、1名）
   → No: 次へ

2. UI/UX変更または新規画面は必要か？
   → Yes: Design Section追加

3. データベース設計またはAPI設計の変更は必要か？
   → Yes: Build SectionにBackend Developer追加

4. 新技術導入またはアーキテクチャ変更は必要か？
   → Yes: System Architect追加

5. E2EテストまたはUATは必要か？
   → Yes: Design SectionにE2E Member追加
```

### 適用例

| シナリオ | レベル | 選定Section | メンバー構成 |
|----------|--------|-------------|--------------|
| バグ修正（APIエンドポイント1箇所） | Level 1 | Build | Develop Leader + Backend Developer 1名 |
| 新規CRUD画面実装 | Level 2 | Build + Design | Develop Leader + Frontend 1名 + Backend 1名、Product Owner |
| 認証システム全面刷新 | Level 3 | Build + Design + Architect | 全ロール活用 |

---

## Validationチェックリスト

体制提案前に必ず以下を確認すること。

### 必須チェック（すべて満たすこと）

| # | 項目 | 確認方法 |
|---|------|----------|
| 1 | **Leader確保** | 各SectionにSection Leaderが1名以上いるか？ |
| 2 | **YAGNI遵守** | 不要なメンバー・Sectionが含まれていないか？ |
| 3 | **スキル充足** | 必要なSkills/MCP Serversをメンバーが網羅しているか？ |
| 4 | **通信経路** | Section間の連絡経路が明確か？ |
| 5 | **HARD-GATE** | 承認前に実装作業を開始していないか？ |

### 品質チェック（推奨）

| # | 項目 | 確認方法 |
|---|------|----------|
| 6 | **タスク明確性** | 各メンバーの担当タスクは具体的に記述されているか？ |
| 7 | **並列可能性** | 同一ファイルへの複数メンバーアサインはないか？ |
| 8 | **見積もり妥当性** | 工数見積もりとメンバー数のバランスは適切か？ |
| 9 | **フォールバック** | メンバーが失敗した場合の対応策はあるか？ |
| 10 | **スコープ明確性** | 各Sectionの責任範囲は重複なく明確か？ |

### 自己検証プロンプト

体制提案前に以下を自問し、回答を記述すること：

> 「この体制で実装した場合、**品質・コスト・満足度**のどれが損なわれる可能性があるか？」

- 品質リスク: ___________
- コストリスク: ___________
- 満足度リスク: ___________

> 「ユーザーがこの体制を見て、**納得せずに修正を求める**ポイントはどこか？」

- 予想される質問: ___________
- 事前準備すべき回答: ___________

---

## Key Principles

| 原則 | 内容 |
|------|------|
| **体制具体化** | どのSection・メンバー・ロールかを明確にする |
| **体制理由説明** | 体制構成の根拠を必ず説明する |
| **YAGNI徹底** | 不要なSection・メンバーを追加しない |
| **Leaderルール** | 選定した各SectionにSection Leaderを必ずアサインする |
| **コミュニケーション厳守** | Section間通信はリード同士のみ。メンバーの直接横断通信は禁止 |
| **利用Skills, MCP Server, AgentTypeの明示提示** |体制内の各teammatesは利用する予定のSkillsとMCP Servers、AgentTypeを明確に提示する。メンバープロフィールに定義した各メンバーが保持しているSkillsとMCP Servers、AgentType以外に定義することが厳禁。 |
| **提示フォーマット徹底** | 必ず提示フォーマットに基づき体制提案を出力する |