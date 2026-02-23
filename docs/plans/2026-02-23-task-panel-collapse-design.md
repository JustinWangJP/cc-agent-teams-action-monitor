# タスクパネル折りたたみ機能 - 実装計画

## 概要

メッセージタイムラインを主軸に据え、タスクパネルを折りたたみ可能なドッキングパネルとして再設計する。

## 実装タスク

### Task 1: Zustand Store に状態追加
**対象ファイル:** `frontend/src/stores/dashboardStore.ts`

**変更内容:**
- `taskPanelCollapsed: boolean` 状態を追加（デフォルト: false）
- `toggleTaskPanel(): void` アクションを追加
- localStorage永続化のための `persist` ミドルウェア設定

**技術的留意点:**
- 既存の状態と型整合性を保つ
- localStorageキーは `dashboard-task-panel-collapsed` を使用

---

### Task 2: TimelineTaskSplitLayout の可変幅対応
**対象ファイル:** `frontend/src/components/timeline/TimelineTaskSplitLayout.tsx`

**変更内容:**
- `isCollapsed: boolean` プロパティを追加
- パネル幅を動的に変更:
  - 展開時: `lg:w-[calc(100%-300px)]` / `w-[300px]`
  - 最小化時: `lg:w-full` / `w-[48px]`
- トランジションクラス `transition-all duration-300 ease-out` を追加
- タスクパネルに `flex-shrink-0` を追加

**削除する箇所:**
- 固定の `lg:w-3/4` と `lg:w-1/4`

---

### Task 3: TaskMonitorPanel に折りたたみUI追加
**対象ファイル:** `frontend/src/components/tasks/TaskMonitorPanel.tsx`

**変更内容:**
- `isCollapsed: boolean` と `onToggle: () => void` プロパティを追加
- 最小化表示モードを追加:
  - 48px幅の縦列レイアウト
  - アイコン + 中央揃えの数字バッジ
  - ホバーツールチップ
  - 展開ボタン（→）

**最小化時のUI構成:**
```
┌────┐
│ 📋 │  タスクアイコン + 未完了数
│ 11 │  （中央揃え）
├────┤
│ ⏳ │  進行中アイコン + 数
│  5 │  （中央揃え）
├────┤
│ ⏸️ │  待機中アイコン + 数
│  3 │  （中央揃え）
├────┤
│ ✅ │  完了アイコン + 数
│ 11 │  （中央揃え）
├────┤
│ →  │  展開ボタン
└────┘
```

**アイコン選択:**
- タスク: `LayoutList` (lucide-react)
- 進行中: `RefreshCw` または `Loader2`
- 待機中: `PauseCircle` または `Hourglass`
- 完了: `CheckCircle2`

---

### Task 4: 親コンポーネントでの統合
**対象ファイル:** `frontend/src/App.tsx`（またはタイムラインビューを使用している箇所）

**変更内容:**
- `useDashboardStore` から `taskPanelCollapsed` と `toggleTaskPanel` を取得
- `TimelineTaskSplitLayout` に `isCollapsed` を渡す
- `TaskMonitorPanel` に `isCollapsed` と `onToggle` を渡す

---

### Task 5: アクセシビリティ対応
**対象ファイル:** `TaskMonitorPanel.tsx`

**変更内容:**
- 展開/折りたたみボタンに `aria-expanded` 属性を追加
- パネルに `aria-controls` 属性を追加
- キーボードショートカット対応（Tキーでトグル）

---

## テスト計画

### ユニットテスト
- `dashboardStore` の状態変更テスト
- `TimelineTaskSplitLayout` のレンダリング（展開/最小化両方）
- `TaskMonitorPanel` の最小化表示テスト

### 手動テスト
- 展開/折りたたみのスムーズなアニメーション確認
- localStorageへの状態永続化確認
- ダークモードでの表示確認
- モバイル表示での動作確認（タブレット以下では折りたたみ機能無効）

## デザイントークン

| 項目 | 値 |
|------|-----|
| 展開時幅 | 300px |
| 最小化時幅 | 48px |
| トランジション時間 | 300ms |
| トランジションタイミング | ease-out |
| 境界線 | `border-l border-slate-200 dark:border-slate-700` |
| 背景色 | `bg-white dark:bg-slate-800` |
| 影 | `shadow-lg` |

## ファイル変更一覧

| ファイル | 変更タイプ | 説明 |
|---------|-----------|------|
| `stores/dashboardStore.ts` | 修正 | 状態・アクション追加 |
| `components/timeline/TimelineTaskSplitLayout.tsx` | 修正 | 可変幅対応 |
| `components/tasks/TaskMonitorPanel.tsx` | 修正 | 折りたたみUI追加 |
| `App.tsx` | 修正 | 状態連携 |
