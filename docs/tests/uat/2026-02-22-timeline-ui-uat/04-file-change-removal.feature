Feature: ファイル変更監視機能削除
  ユーザーとして
  使用されていないファイル変更機能を見たくない
  なぜなら、UIがシンプルであるべきだから

  Background:
    Given タイムラインページを開いている

  Scenario: ファイル変更パネルが表示されない
    Given タイムラインページを表示している
    When 画面全体を確認する
    Then ファイル変更パネルが存在しない
    And 「FileChangesPanel」コンポーネントが描画されない

  Scenario: ファイル変更APIエンドポイントが存在しない
    Given バックエンドAPIにアクセスする
    When GET /api/file-changes/{team} をリクエストする
    Then 404 Not Found が返される

  Scenario: タイムラインにfile_changeタイプのメッセージが表示されない
    Given セッションログにfile_changeエントリが含まれている
    When タイムラインを確認する
    Then file_changeタイプのメッセージが表示されない

  Scenario: メッセージタイプ一覧にfile_changeが含まれない
    Given types/message.ts の型定義を確認する
    Then ExtendedParsedType に file_change が含まれない
    And MESSAGE_TYPE_CONFIG に file_change が含まれない

  Scenario: useFileChangesフックが削除されている
    Given フロントエンドのhooksディレクトリを確認する
    Then useFileChanges.ts が存在しない
