/**
 * dashboardStore ユニットテスト。
 *
 * Zustand ストアの状態管理とアクションを検証します。
 *
 * @test stores/dashboardStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useDashboardStore,
  useTeamSelection,
  useMessageSelection,
  useFilters,
  useUIState,
  useCurrentView,
} from '../dashboardStore';
import type { ParsedMessage, Task } from '@/types';

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
      expect(state.currentView).toBe('overview');
      expect(state.searchQuery).toBe('');
      expect(state.isDetailModalOpen).toBe(false);
      expect(state.isTaskModalOpen).toBe(false);
      expect(state.isSidebarOpen).toBe(true);
      expect(state.autoScrollTimeline).toBe(true);
    });

    it('初期時間範囲が直近1時間であること', () => {
      const state = useDashboardStore.getState();
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      expect(state.timeRange.start.getTime()).toBeLessThanOrEqual(oneHourAgo + 1000);
      expect(state.timeRange.start.getTime()).toBeGreaterThanOrEqual(oneHourAgo - 1000);
      expect(state.timeRange.end.getTime()).toBeLessThanOrEqual(now + 1000);
      expect(state.timeRange.end.getTime()).toBeGreaterThanOrEqual(now - 1000);
    });

    it('初期メッセージフィルターが全て空であること', () => {
      const state = useDashboardStore.getState();

      expect(state.messageFilter.senders).toEqual([]);
      expect(state.messageFilter.receivers).toEqual([]);
      expect(state.messageFilter.types).toEqual([]);
      expect(state.messageFilter.unreadOnly).toBe(false);
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
        activeForm: 'Testing',
        status: 'pending',
        blocks: [],
        blockedBy: [],
      };

      useDashboardStore.getState().setSelectedTask(mockTask);

      expect(useDashboardStore.getState().selectedTask).toEqual(mockTask);
    });

    it('setCurrentView でビューを切り替えられること', () => {
      const { setCurrentView } = useDashboardStore.getState();

      setCurrentView('timeline');

      expect(useDashboardStore.getState().currentView).toBe('timeline');

      setCurrentView('tasks');

      expect(useDashboardStore.getState().currentView).toBe('tasks');
    });
  });

  describe('フィルターのアクション', () => {
    it('setTimeRange で時間範囲を設定できること', () => {
      const newRange = {
        start: new Date('2026-02-16T09:00:00Z'),
        end: new Date('2026-02-16T10:00:00Z'),
      };

      useDashboardStore.getState().setTimeRange(newRange);

      expect(useDashboardStore.getState().timeRange).toEqual(newRange);
    });

    it('setMessageFilter でフィルターを設定できること', () => {
      const newFilter = {
        senders: ['agent-1', 'agent-2'],
        receivers: [],
        types: ['message'],
        unreadOnly: true,
      };

      useDashboardStore.getState().setMessageFilter(newFilter);

      expect(useDashboardStore.getState().messageFilter).toEqual(newFilter);
    });

    it('updateMessageFilter でフィルターを部分的に更新できること', () => {
      const initialFilter = useDashboardStore.getState().messageFilter;

      useDashboardStore.getState().updateMessageFilter({ unreadOnly: true });

      const updatedFilter = useDashboardStore.getState().messageFilter;
      expect(updatedFilter.unreadOnly).toBe(true);
      // 他のフィールドは変更されていない
      expect(updatedFilter.senders).toEqual(initialFilter.senders);
      expect(updatedFilter.receivers).toEqual(initialFilter.receivers);
      expect(updatedFilter.types).toEqual(initialFilter.types);
    });

    it('setSearchQuery で検索クエリを設定できること', () => {
      useDashboardStore.getState().setSearchQuery('test query');

      expect(useDashboardStore.getState().searchQuery).toBe('test query');
    });

    it('resetFilters で全てのフィルターをリセットできること', () => {
      // 先にフィルターを変更
      useDashboardStore.getState().setSearchQuery('test');
      useDashboardStore.getState().updateMessageFilter({ unreadOnly: true });

      // リセット
      useDashboardStore.getState().resetFilters();

      const state = useDashboardStore.getState();
      expect(state.searchQuery).toBe('');
      expect(state.messageFilter.unreadOnly).toBe(false);
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
      // ダークモードは HTML class を変更するため、Document モックが必要
      const html = document.documentElement;

      useDashboardStore.getState().toggleDarkMode();

      expect(useDashboardStore.getState().isDarkMode).toBe(true);
      expect(html.classList.contains('dark')).toBe(true);

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

  describe('セレクターフック', () => {
    it('useTeamSelection がチーム選択関連の状態を返すこと', () => {
      const selection = useTeamSelection();

      expect(selection).toHaveProperty('selectedTeam');
      expect(selection).toHaveProperty('setSelectedTeam');
    });

    it('useMessageSelection がメッセージ選択関連の状態を返すこと', () => {
      const selection = useMessageSelection();

      expect(selection).toHaveProperty('selectedMessage');
      expect(selection).toHaveProperty('setSelectedMessage');
      expect(selection).toHaveProperty('isDetailModalOpen');
      expect(selection).toHaveProperty('setDetailModalOpen');
      expect(selection).toHaveProperty('toggleDetailModal');
    });

    it('useFilters がフィルター関連の状態を返すこと', () => {
      const filters = useFilters();

      expect(filters).toHaveProperty('timeRange');
      expect(filters).toHaveProperty('messageFilter');
      expect(filters).toHaveProperty('searchQuery');
      expect(filters).toHaveProperty('setTimeRange');
      expect(filters).toHaveProperty('setMessageFilter');
      expect(filters).toHaveProperty('updateMessageFilter');
      expect(filters).toHaveProperty('setSearchQuery');
      expect(filters).toHaveProperty('resetFilters');
    });

    it('useUIState がUI状態を返すこと', () => {
      const ui = useUIState();

      expect(ui).toHaveProperty('isDarkMode');
      expect(ui).toHaveProperty('isSidebarOpen');
      expect(ui).toHaveProperty('autoScrollTimeline');
      expect(ui).toHaveProperty('toggleDarkMode');
      expect(ui).toHaveProperty('setDarkMode');
      expect(ui).toHaveProperty('toggleSidebar');
      expect(ui).toHaveProperty('toggleAutoScroll');
    });

    it('useCurrentView がビュー関連の状態を返すこと', () => {
      const view = useCurrentView();

      expect(view).toHaveProperty('currentView');
      expect(view).toHaveProperty('setCurrentView');
    });
  });

  describe('リセットアクション', () => {
    it('reset で全ての状態を初期値に戻せること', () => {
      // 状態を変更
      useDashboardStore.getState().setSelectedTeam('test-team');
      useDashboardStore.getState().setSearchQuery('test');
      useDashboardStore.getState().toggleDarkMode();

      expect(useDashboardStore.getState().selectedTeam).toBe('test-team');
      expect(useDashboardStore.getState().searchQuery).toBe('test');
      expect(useDashboardStore.getState().isDarkMode).toBe(true);

      // リセット
      useDashboardStore.getState().reset();

      // 初期状態に戻っている（isDarkMode は localStorage からの復帰で変わる可能性がある）
      expect(useDashboardStore.getState().selectedTeam).toBeNull();
      expect(useDashboardStore.getState().searchQuery).toBe('');
    });
  });
});
