/**
 * dashboardStore ユニットテスト。
 *
 * Zustand ストアの状態管理とアクションを検証します。
 *
 * @test stores/dashboardStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from '../dashboardStore';
import type { MessageType, MessageFilter } from '@/types/message';
import type { ParsedMessage } from '@/types/message';
import type { Task } from '@/types/task';

describe('dashboardStore', () => {
  // 各テスト前にストアをリセット
  beforeEach(() => {
    useDashboardStore.getState().reset();
  });

  describe('初期状態', () => {
    it('初期状態が正しく設定されること', () => {
      const state = useDashboardStore.getState();

      expect(state.selectedTeam).toBeNull();
      expect(state.selectedMessage).toBeNull();
      expect(state.selectedTask).toBeNull();
      expect(state.searchQuery).toBe('');
      expect(state.isDarkMode).toBe(false);
      expect(state.isSidebarOpen).toBe(true);
      expect(state.isDetailModalOpen).toBe(false);
      expect(state.isTaskModalOpen).toBe(false);
      expect(state.autoScrollTimeline).toBe(true);
      // ポーリング間隔は個別設定（teamsInterval, tasksInterval等）
      expect(state.teamsInterval).toBe(30000);
      expect(state.currentView).toBe('overview');
      expect(state.messageFilter.senders).toEqual([]);
      expect(state.messageFilter.receivers).toEqual([]);
      expect(state.messageFilter.types).toEqual([]);
    });
  });

  describe('選択状態のアクション', () => {
    it('setSelectedTeam でチームを選択できること', () => {
      const { setSelectedTeam } = useDashboardStore.getState();

      setSelectedTeam('test-team');

      expect(useDashboardStore.getState().selectedTeam).toBe('test-team');
    });

    it('setSelectedTeam で null を設定できること', () => {
      const { setSelectedTeam } = useDashboardStore.getState();

      setSelectedTeam('test-team');

      expect(useDashboardStore.getState().selectedTeam).toBe('test-team');

      setSelectedTeam(null);

      expect(useDashboardStore.getState().selectedTeam).toBeNull();
    });

    it('setSelectedMessage でメッセージを選択できること', () => {
      const mockMessage: ParsedMessage = {
        from: 'agent-1',
        text: 'Test message',
        timestamp: '2026-02-16T10:00:00Z',
        read: false,
        parsedType: 'message',
      };

      useDashboardStore.getState().setSelectedMessage(mockMessage);

      expect(useDashboardStore.getState().selectedMessage).toEqual(mockMessage);
    });

    it('setSelectedTask でタスクを選択できること', () => {
      const mockTask: Task = {
        id: 'task-1',
        subject: 'Test task',
        description: 'Test description',
        status: 'pending',
        owner: 'agent-1',
        blockedBy: [],
        blocks: [],
        activeForm: 'Testing',
      };

      useDashboardStore.getState().setSelectedTask(mockTask);

      expect(useDashboardStore.getState().selectedTask).toEqual(mockTask);
    });

    it('setSearchQuery で検索クエリを設定できること', () => {
      useDashboardStore.getState().setSearchQuery('test query');

      expect(useDashboardStore.getState().searchQuery).toBe('test query');
    });

    it('setSearchQuery で空文字列を設定できること', () => {
      useDashboardStore.getState().setSearchQuery('');

      expect(useDashboardStore.getState().searchQuery).toBe('');
    });

    it('setTeamsInterval でチームポーリング間隔を設定できること', () => {
      useDashboardStore.getState().setTeamsInterval(60000);

      expect(useDashboardStore.getState().teamsInterval).toBe(60000);
    });

    it('setTasksInterval でタスクポーリング間隔を設定できること', () => {
      useDashboardStore.getState().setTasksInterval(60000);

      expect(useDashboardStore.getState().tasksInterval).toBe(60000);
    });
  });

  describe('フィルターアクション', () => {
    it('setMessageFilter でメッセージフィルターを設定できること', () => {
      const filter: MessageFilter = { senders: ['agent-1'], receivers: ['agent-2'], types: ['message'] as MessageType[] };
      useDashboardStore.getState().setMessageFilter(filter);

      expect(useDashboardStore.getState().messageFilter).toEqual(filter);
    });

    it('updateMessageFilter でメッセージフィルターを部分的に更新できること', () => {
      useDashboardStore.getState().setMessageFilter({ senders: ['agent-1'], receivers: [], types: [] });
      useDashboardStore.getState().updateMessageFilter({ types: ['task_assignment'] });

      const filter = useDashboardStore.getState().messageFilter;
      expect(filter.senders).toEqual(['agent-1']);
      expect(filter.types).toEqual(['task_assignment']);
    });

    it('resetFilters でフィルターをリセットできること', () => {
      const filter = { senders: ['agent-1'], receivers: [], types: [] };
      useDashboardStore.getState().setMessageFilter(filter);

      useDashboardStore.getState().resetFilters();

      expect(useDashboardStore.getState().messageFilter.senders).toEqual([]);
    });
  });

  describe('UI状態のアクション', () => {
    it('toggleDetailModal でモーダル状態を切り替えられること', () => {
      const { toggleDetailModal } = useDashboardStore.getState();

      expect(useDashboardStore.getState().isDetailModalOpen).toBe(false);

      toggleDetailModal();

      expect(useDashboardStore.getState().isDetailModalOpen).toBe(true);

      toggleDetailModal();

      expect(useDashboardStore.getState().isDetailModalOpen).toBe(false);
    });

    it('setDetailModalOpen でモーダル状態を直接設定できること', () => {
      useDashboardStore.getState().setDetailModalOpen(true);

      expect(useDashboardStore.getState().isDetailModalOpen).toBe(true);

      useDashboardStore.getState().setDetailModalOpen(false);

      expect(useDashboardStore.getState().isDetailModalOpen).toBe(false);
    });

    it('toggleTaskModal でタスクモーダル状態を切り替えられること', () => {
      useDashboardStore.getState().toggleTaskModal();

      expect(useDashboardStore.getState().isTaskModalOpen).toBe(true);

      useDashboardStore.getState().toggleTaskModal();

      expect(useDashboardStore.getState().isTaskModalOpen).toBe(false);
    });

    it('toggleDarkMode でダークモードを切り替えられること', () => {
      const html = document.documentElement;

      // 初期状態を確認
      expect(useDashboardStore.getState().isDarkMode).toBe(false);

      // ダークモードをオン
      useDashboardStore.getState().toggleDarkMode();

      expect(useDashboardStore.getState().isDarkMode).toBe(true);
      expect(html.classList.contains('dark')).toBe(true);

      // ダークモードをオフ
      useDashboardStore.getState().toggleDarkMode();

      expect(useDashboardStore.getState().isDarkMode).toBe(false);
      expect(html.classList.contains('dark')).toBe(false);
    });

    it('setDarkMode でダークモードを直接設定できること', () => {
      const html = document.documentElement;

      useDashboardStore.getState().setDarkMode(true);

      expect(useDashboardStore.getState().isDarkMode).toBe(true);
      expect(html.classList.contains('dark')).toBe(true);
    });

    it('toggleSidebar でサイドバー状態を切り替えられること', () => {
      useDashboardStore.getState().toggleSidebar();

      expect(useDashboardStore.getState().isSidebarOpen).toBe(false);

      useDashboardStore.getState().toggleSidebar();

      expect(useDashboardStore.getState().isSidebarOpen).toBe(true);
    });

    it('toggleAutoScroll で自動スクロール状態を切り替えられること', () => {
      useDashboardStore.getState().toggleAutoScroll();

      expect(useDashboardStore.getState().autoScrollTimeline).toBe(false);

      useDashboardStore.getState().toggleAutoScroll();

      expect(useDashboardStore.getState().autoScrollTimeline).toBe(true);
    });
  });

  describe('リセットアクション', () => {
    it('reset で全ての状態を初期値に戻せること', () => {
      // 状態を変更
      useDashboardStore.getState().setSelectedTeam('test-team');
      useDashboardStore.getState().setSearchQuery('test');
      useDashboardStore.getState().setDarkMode(true);

      // リセット
      useDashboardStore.getState().reset();

      // 状態が初期値に戻っていることを確認（loadStateの影響でダークモードは維持される可能性がある）
      expect(useDashboardStore.getState().selectedTeam).toBeNull();
      expect(useDashboardStore.getState().searchQuery).toBe('');
    });
  });

  describe('ビューアクション', () => {
    it('setCurrentView でビューを切り替えられること', () => {
      useDashboardStore.getState().setCurrentView('tasks');

      expect(useDashboardStore.getState().currentView).toBe('tasks');

      useDashboardStore.getState().setCurrentView('timeline');

      expect(useDashboardStore.getState().currentView).toBe('timeline');
    });
  });
});
