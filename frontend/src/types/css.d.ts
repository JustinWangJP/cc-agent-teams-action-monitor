/**
 * CSS ファイルの型宣言。
 *
 * vis-timeline などのサードパーティライブラリの CSS インポート用。
 */

declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

declare module 'vis-timeline/styles/vis-timeline-graph2d.min.css'
