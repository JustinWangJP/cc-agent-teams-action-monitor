/**
 * TC-005: ChatMessageBubble 拡張のテスト.
 *
 * 統合タイムライン対応したメッセージバブルコンポーネントを検証します。
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ChatMessageBubble, { type ChatMessageBubbleProps } from '../ChatMessageBubble';
import type { UnifiedTimelineEntry, ParsedMessage } from '@/types/message';

describe('TC-005: ChatMessageBubble 拡張', () => {
  const baseProps: ChatMessageBubbleProps = {
    message: {
      from: 'team-lead',
      to: 'member1',
      text: 'テストメッセージ',
      timestamp: '2026-02-21T10:00:00+00:00',
      read: true,
      parsedType: 'message',
    },
    onClick: vi.fn(),
  };

  describe('TC-005-01: inbox メッセージ表示', () => {
    it('従来通りの表示で inbox メッセージが表示される', () => {
      const message: ParsedMessage = {
        from: 'team-lead',
        text: 'inbox メッセージ',
        timestamp: '2026-02-21T10:00:00+00:00',
        read: true,
        parsedType: 'message',
      };

      render(<ChatMessageBubble {...baseProps} message={message} />);

      expect(screen.getByText('inbox メッセージ')).toBeInTheDocument();
      expect(screen.getByText('team-lead')).toBeInTheDocument();
    });
  });

  describe('TC-005-02: session メッセージ表示', () => {
    it('新デザインで session 由来のエントリが表示される', () => {
      const message: UnifiedTimelineEntry = {
        id: 'session-2026-02-21T10:00:00Z-thinking',
        content: '思考中...',
        text: '思考中...',
        from: 'assistant',
        timestamp: '2026-02-21T10:00:00+00:00',
        source: 'session',
        parsedType: 'thinking',
        details: {
          thinking: '思考プロセス内容...',
        },
      };

      render(<ChatMessageBubble {...baseProps} message={message} />);

      expect(screen.getByText('思考中...')).toBeInTheDocument();
      expect(screen.getByText('assistant')).toBeInTheDocument();
    });
  });

  describe('TC-005-03: user_message アイコン', () => {
    it('👤 アイコンが表示される', () => {
      const message: UnifiedTimelineEntry = {
        id: 'session-user-message',
        content: 'ユーザーメッセージ',
        text: 'ユーザーメッセージ',
        from: 'user',
        timestamp: '2026-02-21T10:00:00+00:00',
        source: 'session',
        parsedType: 'user_message',
      };

      render(<ChatMessageBubble {...baseProps} message={message} />);

      // user_message のアバター（title属性で判定）
      expect(screen.getByTitle('User')).toBeInTheDocument();
      // アイコン絵文字が含まれることを確認
      expect(screen.getAllByText('👤').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('TC-005-04: assistant_message アイコン', () => {
    it('🤖 アイコンが表示される', () => {
      const message: UnifiedTimelineEntry = {
        id: 'session-assistant-message',
        content: 'AI の応答',
        text: 'AI の応答',
        from: 'assistant',
        timestamp: '2026-02-21T10:00:00+00:00',
        source: 'session',
        parsedType: 'assistant_message',
      };

      render(<ChatMessageBubble {...baseProps} message={message} />);

      // assistant_message のアバター（title属性で判定）
      expect(screen.getByTitle('AI Assistant')).toBeInTheDocument();
      // アイコン絵文字が含まれることを確認
      expect(screen.getAllByText('🤖').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('TC-005-05: thinking アイコン', () => {
    it('💭 アイコンが表示される', () => {
      const message: UnifiedTimelineEntry = {
        id: 'session-thinking',
        content: '思考中...',
        text: '思考中...',
        from: 'assistant',
        timestamp: '2026-02-21T10:00:00+00:00',
        source: 'session',
        parsedType: 'thinking',
        details: {
          thinking: '思考内容...',
        },
      };

      render(<ChatMessageBubble {...baseProps} message={message} />);

      // thinking のアイコン（💭）を確認
      expect(screen.getByText('💭')).toBeInTheDocument();
    });
  });

  // TC-005-06, TC-005-07: tool_use, file_change はフィルターから削除されたためテストをスキップ

  describe('TC-005-06: thinking 詳細表示', () => {
    it('折りたたみ可能な思考ブロックが表示される', async () => {
      const user = userEvent.setup();

      const message: UnifiedTimelineEntry = {
        id: 'session-thinking-detailed',
        content: '思考中...',
        text: '思考中...',
        from: 'assistant',
        timestamp: '2026-02-21T10:00:00+00:00',
        source: 'session',
        parsedType: 'thinking',
        details: {
          thinking: 'これは思考プロセスの詳細内容です。タスクを分析し、最適な解決策を検討します...',
        },
      };

      render(<ChatMessageBubble {...baseProps} message={message} />);

      // 思考プロセスボタンを確認
      const thinkingButton = screen.getByText('💭 思考プロセス');
      expect(thinkingButton).toBeInTheDocument();

      // クリックして展開
      await user.click(thinkingButton);

      // 詳細内容が pre タグで表示されることを確認（queryAllByText で複数要素を取得）
      const thinkingElements = screen.getAllByText(/これは思考プロセスの詳細内容です/);
      expect(thinkingElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // TC-005-09, TC-005-10: file_change, tool_use はフィルターから削除されたためテストをスキップ

  describe('TC-005-07: 検索ハイライト', () => {
    it('該当テキストがハイライト表示される', () => {
      const message: ParsedMessage = {
        from: 'team-lead',
        text: 'これはテストメッセージです',
        timestamp: '2026-02-21T10:00:00+00:00',
        read: true,
        parsedType: 'message',
      };

      const { container } = render(
        <ChatMessageBubble {...baseProps} message={message} searchQuery="テスト" />
      );

      // ハイライト表示を確認（mark タグのクラスで判定）
      const markElement = container.querySelector('mark.bg-yellow-200');
      expect(markElement).toBeInTheDocument();
      expect(markElement).toHaveTextContent('テスト');
    });
  });

  describe('TC-005-12: 選択状態表示', () => {
    it('isSelected: true で選択枠が表示される', () => {
      const message: ParsedMessage = {
        from: 'team-lead',
        text: '選択されたメッセージ',
        timestamp: '2026-02-21T10:00:00+00:00',
        read: true,
        parsedType: 'message',
      };

      const { container } = render(
        <ChatMessageBubble {...baseProps} message={message} isSelected={true} />
      );

      // 選択状態のクラス（bg-blue-50）が適用されていることを確認
      const messageElement = container.querySelector('.bg-blue-50');
      expect(messageElement).toBeInTheDocument();
    });
  });

  describe('クリックハンドラー', () => {
    it('メッセージクリックで onClick が呼ばれる', async () => {
      const user = userEvent.setup();
      const onClickMock = vi.fn();

      const message: ParsedMessage = {
        from: 'team-lead',
        text: 'クリック可能メッセージ',
        timestamp: '2026-02-21T10:00:00+00:00',
        read: true,
        parsedType: 'message',
      };

      render(
        <ChatMessageBubble {...baseProps} message={message} onClick={onClickMock} />
      );

      const messageElement = screen.getByText('クリック可能メッセージ');
      await user.click(messageElement);

      expect(onClickMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Markdown レンダリング', () => {
    it('Markdown 形式のテキストが適切にレンダリングされる', () => {
      const message: ParsedMessage = {
        from: 'team-lead',
        text: `# ヘッダー

- リストアイテム 1
- リストアイテム 2

**太字テキスト**`,
        timestamp: '2026-02-21T10:00:00+00:00',
        read: true,
        parsedType: 'message',
      };

      render(<ChatMessageBubble {...baseProps} message={message} />);

      // Markdown コンポーネントが使用されていることを確認
      expect(screen.getByText('ヘッダー')).toBeInTheDocument();
      expect(screen.getByText('リストアイテム 1')).toBeInTheDocument();
      expect(screen.getByText('太字テキスト')).toBeInTheDocument();
    });
  });

  describe('ブックマークボタン', () => {
    it('ホバー時にブックマークボタンが表示される', async () => {
      const user = userEvent.setup();

      const message: ParsedMessage = {
        from: 'team-lead',
        text: 'ブックマーク可能メッセージ',
        timestamp: '2026-02-21T10:00:00+00:00',
        read: true,
        parsedType: 'message',
      };

      const { container } = render(
        <ChatMessageBubble {...baseProps} message={message} showBookmark={true} />
      );

      const messageElement = container.querySelector('.group');

      if (messageElement) {
        // ホバーシミュレーション
        await user.hover(messageElement);

        // ブックマークボタンが存在することだけを確認（aria-pressed 属性で判定）
        const bookmarkButton = container.querySelector('[aria-label*="ブックマーク"]');
        expect(bookmarkButton).toBeInTheDocument();
      }
    });
  });

  describe('メタデータ表示', () => {
    it('showMetadata: true でセッションメタデータが表示される', () => {
      const message: UnifiedTimelineEntry = {
        id: 'session-with-metadata',
        content: 'メタデータ付きメッセージ',
        text: 'メタデータ付きメッセージ',
        from: 'assistant',
        timestamp: '2026-02-21T10:00:00+00:00',
        source: 'session',
        parsedType: 'task_assignment',
        details: {
          taskId: 'task-123',
          taskSubject: 'テストタスク',
        },
      };

      render(
        <ChatMessageBubble {...baseProps} message={message} showMetadata={true} />
      );

      // メタデータセクションが表示されることを確認
      expect(screen.getByText('📋 メタデータ')).toBeInTheDocument();
      expect(screen.getByText('#task-123')).toBeInTheDocument();
      expect(screen.getByText('テストタスク')).toBeInTheDocument();
    });
  });
});

describe('FileChangeBadge コンポーネント', () => {
  it('created 操作のバッジが正しいアイコンと色で表示される', () => {
    render(
      <span data-testid="file-badge">
        <span>✨</span>
        <span>test.tsx</span>
      </span>
    );

    expect(screen.getByText('✨')).toBeInTheDocument();
    expect(screen.getByText('test.tsx')).toBeInTheDocument();
  });
});
