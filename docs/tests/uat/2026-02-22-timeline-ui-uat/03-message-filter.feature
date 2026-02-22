Feature: メッセージタイプフィルター
  ユーザーとして
  特定のタイプのメッセージのみを表示したい
  なぜなら、関心のある情報に素早くアクセスしたいから

  Background:
    Given タイムラインページを開いている
    And 複数タイプのメッセージが存在する
      | user_message      |
      | assistant_message |
      | thinking          |
      | task_assignment   |
      | task_completed    |

  Scenario: ユーザーメッセージのみフィルタリング
    Given フィルター設定を開いている
    When 「ユーザーメッセージ」のみを選択する
    Then ユーザーメッセージのみが表示される
    And 他のタイプのメッセージが非表示になる

  Scenario: AI応答のみフィルタリング
    Given フィルター設定を開いている
    When 「AI応答」のみを選択する
    Then アシスタントメッセージのみが表示される
    And 他のタイプのメッセージが非表示になる

  Scenario: 思考プロセスのみフィルタリング
    Given フィルター設定を開いている
    When 「思考」のみを選択する
    Then thinkingメッセージのみが表示される

  Scenario: 複数タイプを同時にフィルタリング
    Given フィルター設定を開いている
    When 「ユーザーメッセージ」と「AI応答」を選択する
    Then ユーザーメッセージとアシスタントメッセージが表示される
    And 他のタイプは非表示になる

  Scenario: tool_useとfile_changeがフィルターオプションに存在しない
    Given フィルター設定を開いている
    When フィルターオプション一覧を確認する
    Then 「tool_use」オプションが存在しない
    And 「file_change」オプションが存在しない

  Scenario: フィルターをリセットする
    Given 「ユーザーメッセージ」のみが選択されている
    When フィルターをリセットする
    Then すべてのタイプのメッセージが表示される
