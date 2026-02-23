Feature: 左右分離チャットUI
  ユーザーとして
  セッションメッセージとインボックスメッセージを区別したい
  なぜなら、メッセージの発信元を一目で理解したいから

  Background:
    Given タイムラインページを開いている
    And セッションメッセージとインボックスメッセージが存在する

  Scenario: セッションメッセージが左側に表示される
    Given セッション来源のメッセージが存在する
    When タイムラインを確認する
    Then メッセージが左側に配置されている
    And アバターがメッセージの左側にある

  Scenario: インボックスメッセージが右側に表示される
    Given インボックス来源のメッセージが存在する
    When タイムラインを確認する
    Then メッセージが右側に配置されている
    And アバターがメッセージの右側にある

  Scenario: メッセージバブルの最大幅が適切に制限される
    Given 長いテキストを含むメッセージが存在する
    When メッセージを確認する
    Then バブル幅がコンテナの80%を超えない

  Scenario Outline: 複数メッセージタイプの配置確認
    Given <source>来源のメッセージが存在する
    When タイムラインを確認する
    Then メッセージが<position>に配置されている
    And アバターが<avatar_position>にある

    Examples:
      | source   | position | avatar_position |
      | session  | 左側     | 左側            |
      | inbox    | 右側     | 右側            |
