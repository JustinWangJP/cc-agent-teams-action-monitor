# タイムラインCSS修正設計書

## 1. 概要

### 1.1 問題

メッセージタイムラインで30件のメッセージが取得できているが、vis-timeline の描画領域にメッセージが表示されない。

### 1.2 根本原因

vis-timeline のベースCSSがインポートされていない。

```typescript
// 現状：カスタムCSSのみインポート
import './timeline.css';

// 必要：ベースCSSもインポート
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
```

---

## 2. 修正内容

### 2.1 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/main.tsx` | vis-timeline ベースCSS のインポートを追加 |

### 2.2 変更コード

```typescript
// main.tsx の冒頭に追加
import 'vis-timeline/styles/vis-timeline-graph2d.min.css';
```

---

## 3. 影響範囲

- 全ページで vis-timeline のスタイルが利用可能になる
- ファイルサイズへの影響は最小（約15KB gzip）

---

## 4. 確認方法

1. `npm run build` が成功すること
2. タイムライン画面でメッセージが表示されること

---

*作成日: 2026-02-17*
*バージョン: 1.0.0*
