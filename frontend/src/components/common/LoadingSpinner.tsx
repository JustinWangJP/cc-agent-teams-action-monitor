/**
 * データ読み込み中に表示するローディングスピナーコンポーネント。
 *
 * 中央揃えで回転する円形スピナーを表示します。データ取得中の待機状態を
 * ユーザーに視覚的に伝えるために使用します。
 *
 * @returns 回転アニメーション付きのスピナー要素
 *
 * @
 */
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>
  );
}
