/**
 * ダッシュボード状態管理ストア。
 *
 * Zustand を使用してグローバル状態を一元管理します。
 * 選択状態、フィルター、UI状態、ポーリング間隔を管理し、
 * ローカルストレージへの永続化機能を提供します。
 *
 * @module stores/dashboardStore
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ParsedMessage,
  MessageFilter,
  TimeRange,
} from '@/types/message';
import type { Task } from '@/types/task';

/**
 * ビューの種類。
 */
export type ViewType = 'overview' | 'timeline' | 'tasks';

/**
 * ソート順の種類。
 */
export type SortOrder = 'asc' | 'desc';

/**
 * ダッシュボード状態インターフェース。
 *
 * グローバルに管理する状態とアクションを定義します。
 * 未読機能は削除済み（設計書1.4）。
 */
export interface DashboardState {
  // ====================
  // 選択状態
  // ====================

  /** 選択中のチーム名 */
  selectedTeam: string | null;
  /** 選択中のメッセージ */
  selectedMessage: ParsedMessage | null;
  /** 選択中のタスク */
  selectedTask: Task | null;
  /** 現在のビュー */
  currentView: ViewType;

  // ====================
  // フィルター
  // ====================

  /** 時間範囲 */
  timeRange: TimeRange;
  /** メッセージフィルター */
  messageFilter: MessageFilter;
  /** 検索クエリ */
  searchQuery: string;

  // ====================
  // ポーリング間隔
  // ====================

  /** チーム一覧のポーリング間隔（ミリ秒） */
  teamsInterval: number;
  /** タスク一覧のポーリング間隔（ミリ秒） */
  tasksInterval: number;
  /** インボックスのポーリング間隔（ミリ秒） */
  inboxInterval: number;
  /** エージェントメッセージのポーリング間隔（ミリ秒） */
  messagesInterval: number;

  // ====================
  // UI状態
  // ====================

  /** メッセージ詳細モーダルの表示状態 */
  isDetailModalOpen: boolean;
  /** タスク詳細モーダルの表示状態 */
  isTaskModalOpen: boolean;
  /** ダークモード */
  isDarkMode: boolean;
  /** サイドバーの展開状態 */
  isSidebarOpen: boolean;
  /** タイムラインの自動スクロール */
  autoScrollTimeline: boolean;

  // ====================
  // アクション
  // ====================

  /** チームを選択 */
  setSelectedTeam: (team: string | null) => void;
  /** メッセージを選択 */
  setSelectedMessage: (message: ParsedMessage | null) => void;
  /** タスクを選択 */
  setSelectedTask: (task: Task | null) => void;
  /** ビューを切り替え */
  setCurrentView: (view: ViewType) => void;

  /** 時間範囲を設定 */
  setTimeRange: (range: TimeRange) => void;
  /** メッセージフィルターを設定 */
  setMessageFilter: (filter: MessageFilter) => void;
  /** メッセージフィルターを部分的に更新 */
  updateMessageFilter: (updates: Partial<MessageFilter>) => void;
  /** 検索クエリを設定 */
  setSearchQuery: (query: string) => void;

  /** チームポーリング間隔を設定 */
  setTeamsInterval: (ms: number) => void;
  /** タスクポーリング間隔を設定 */
  setTasksInterval: (ms: number) => void;
  /** インボックスポーリング間隔を設定 */
  setInboxInterval: (ms: number) => void;
  /** メッセージポーリング間隔を設定 */
  setMessagesInterval: (ms: number) => void;

  /** 詳細モーダルを切り替え */
  toggleDetailModal: () => void;
  /** 詳細モーダルを設定 */
  setDetailModalOpen: (open: boolean) => void;
  /** タスクモーダルを切り替え */
  toggleTaskModal: () => void;
  /** タスクモーダルを設定 */
  setTaskModalOpen: (open: boolean) => void;
  /** ダークモードを切り替え */
  toggleDarkMode: () => void;
  /** ダークモードを設定 */
  setDarkMode: (dark: boolean) => void;
  /** サイドバーを切り替え */
  toggleSidebar: () => void;
  /** タイムライン自動スクロールを切り替え */
  toggleAutoScroll: () => void;

  /** すべてのフィルターをリセット */
  resetFilters: () => void;
  /** すべての状態をリセット */
  reset: () => void;
}

/**
 * 初期時間範囲（直近1時間）。
 */
const INITIAL_TIME_RANGE: TimeRange = {
  start: new Date(Date.now() - 60 * 60 * 1000),
  end: new Date(),
};

/**
 * 初期メッセージフィルター（全て表示）。
 */
const INITIAL_MESSAGE_FILTER: MessageFilter = {
  senders: [],
  receivers: [],
  types: [],
};

/**
 * デフォルトポーリング間隔（30秒）。
 */
const DEFAULT_POLLING_INTERVAL = 30000;

/**
 * 初期状態。
 */
const initialState: Omit<
  DashboardState,
  | 'setSelectedTeam'
  | 'setSelectedMessage'
  | 'setSelectedTask'
  | 'setCurrentView'
  | 'setTimeRange'
  | 'setMessageFilter'
  | 'updateMessageFilter'
  | 'setSearchQuery'
  | 'setTeamsInterval'
  | 'setTasksInterval'
  | 'setInboxInterval'
  | 'setMessagesInterval'
  | 'toggleDetailModal'
  | 'setDetailModalOpen'
  | 'toggleTaskModal'
  | 'setTaskModalOpen'
  | 'toggleDarkMode'
  | 'setDarkMode'
  | 'toggleSidebar'
  | 'toggleAutoScroll'
  | 'resetFilters'
  | 'reset'
> = {
  selectedTeam: null,
  selectedMessage: null,
  selectedTask: null,
  currentView: 'overview',
  timeRange: INITIAL_TIME_RANGE,
  messageFilter: INITIAL_MESSAGE_FILTER,
  searchQuery: '',
  teamsInterval: DEFAULT_POLLING_INTERVAL,
  tasksInterval: DEFAULT_POLLING_INTERVAL,
  inboxInterval: DEFAULT_POLLING_INTERVAL,
  messagesInterval: DEFAULT_POLLING_INTERVAL,
  isDetailModalOpen: false,
  isTaskModalOpen: false,
  isDarkMode: false,
  isSidebarOpen: true,
  autoScrollTimeline: true,
};

/**
 * ローカルストレージキー。
 */
const STORAGE_KEY = 'dashboard-state';

/**
 * ローカルストレージから状態を読み込みます。
 *
 * 保存された状態を復元し、Date オブジェクトを正しく再構築します。
 * エラー時やストレージが利用できない場合は null を返します。
 *
 * @returns 復元された状態の部分オブジェクト、または null
 *
 * 
 */
function loadState(): Partial<DashboardState> | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Date オブジェクトを復元
    if (parsed.timeRange) {
      parsed.timeRange = {
        start: new Date(parsed.timeRange.start),
        end: new Date(parsed.timeRange.end),
      };
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * 状態をローカルストレージに保存します。
 *
 * 永続化が必要なプロパティのみを選択して保存します。
 * ストレージが利用できない場合はサイレントに失敗します。
 *
 * @param state - 保存する状態の部分オブジェクト
 *
 * 
 */
function saveState(state: Partial<DashboardState>) {
  if (typeof window === 'undefined') return;

  try {
    const toSave = {
      isDarkMode: state.isDarkMode,
      isSidebarOpen: state.isSidebarOpen,
      autoScrollTimeline: state.autoScrollTimeline,
      teamsInterval: state.teamsInterval,
      tasksInterval: state.tasksInterval,
      inboxInterval: state.inboxInterval,
      messagesInterval: state.messagesInterval,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ストレージが利用できない場合は無視
  }
}

/**
 * ダッシュボードストアを作成。
 *
 * Zustand の create 関数を使用してストアを定義します。
 * 開発ツールミドルウェアを有効にしています。
 *
 * @example
 * ```tsx
 * const { selectedTeam, setSelectedTeam, isDarkMode } = useDashboardStore();
 * ```
 */
export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      ...loadState(),

      // ====================
      // 選択状態のアクション
      // ====================

      setSelectedTeam: (team) =>
        set({ selectedTeam: team }, false, 'setSelectedTeam'),

      setSelectedMessage: (message) =>
        set({ selectedMessage: message }, false, 'setSelectedMessage'),

      setSelectedTask: (task) =>
        set({ selectedTask: task }, false, 'setSelectedTask'),

      setCurrentView: (view) =>
        set({ currentView: view }, false, 'setCurrentView'),

      // ====================
      // フィルターのアクション
      // ====================

      setTimeRange: (range) =>
        set({ timeRange: range }, false, 'setTimeRange'),

      setMessageFilter: (filter) =>
        set({ messageFilter: filter }, false, 'setMessageFilter'),

      updateMessageFilter: (updates) =>
        set(
          (state) => ({
            messageFilter: { ...state.messageFilter, ...updates },
          }),
          false,
          'updateMessageFilter',
        ),

      setSearchQuery: (query) =>
        set({ searchQuery: query }, false, 'setSearchQuery'),

      // ====================
      // ポーリング間隔のアクション
      // ====================

      setTeamsInterval: (ms) =>
        set({ teamsInterval: ms }, false, 'setTeamsInterval'),

      setTasksInterval: (ms) =>
        set({ tasksInterval: ms }, false, 'setTasksInterval'),

      setInboxInterval: (ms) =>
        set({ inboxInterval: ms }, false, 'setInboxInterval'),

      setMessagesInterval: (ms) =>
        set({ messagesInterval: ms }, false, 'setMessagesInterval'),

      // ====================
      // UI状態のアクション
      // ====================

      toggleDetailModal: () =>
        set(
          (state) => ({ isDetailModalOpen: !state.isDetailModalOpen }),
          false,
          'toggleDetailModal',
        ),

      setDetailModalOpen: (open) =>
        set({ isDetailModalOpen: open }, false, 'setDetailModalOpen'),

      toggleTaskModal: () =>
        set(
          (state) => ({ isTaskModalOpen: !state.isTaskModalOpen }),
          false,
          'toggleTaskModal',
        ),

      setTaskModalOpen: (open) =>
        set({ isTaskModalOpen: open }, false, 'setTaskModalOpen'),

      toggleDarkMode: () => {
        set(
          (state) => {
            const newDarkMode = !state.isDarkMode;
            saveState({ isDarkMode: newDarkMode });
            return { isDarkMode: newDarkMode };
          },
          false,
          'toggleDarkMode',
        );

        // HTML class も更新
        if (typeof document !== 'undefined') {
          const html = document.documentElement;
          const newDarkMode = !get().isDarkMode;
          if (newDarkMode) {
            html.classList.add('dark');
          } else {
            html.classList.remove('dark');
          }
        }
      },

      setDarkMode: (dark) => {
        set({ isDarkMode: dark }, false, 'setDarkMode');
        saveState({ isDarkMode: dark });

        if (typeof document !== 'undefined') {
          const html = document.documentElement;
          if (dark) {
            html.classList.add('dark');
          } else {
            html.classList.remove('dark');
          }
        }
      },

      toggleSidebar: () =>
        set(
          (state) => {
            const newState = { isSidebarOpen: !state.isSidebarOpen };
            saveState(newState);
            return newState;
          },
          false,
          'toggleSidebar',
        ),

      toggleAutoScroll: () =>
        set(
          (state) => {
            const newState = { autoScrollTimeline: !state.autoScrollTimeline };
            saveState(newState);
            return newState;
          },
          false,
          'toggleAutoScroll',
        ),

      // ====================
      // リセットアクション
      // ====================

      resetFilters: () =>
        set(
          {
            timeRange: INITIAL_TIME_RANGE,
            messageFilter: INITIAL_MESSAGE_FILTER,
            searchQuery: '',
          },
          false,
          'resetFilters',
        ),

      reset: () =>
        set(
          {
            ...initialState,
            ...loadState(),
          },
          false,
          'reset',
        ),
    }),
    {
      name: 'DashboardStore',
      enabled: process.env.NODE_ENV === 'development',
    },
  ),
);

/**
 * セレクターフック: チーム関連の状態のみを取得。
 */
export const useTeamSelection = () =>
  useDashboardStore((state) => ({
    selectedTeam: state.selectedTeam,
    setSelectedTeam: state.setSelectedTeam,
  }));

/**
 * セレクターフック: メッセージ関連の状態のみを取得。
 */
export const useMessageSelection = () =>
  useDashboardStore((state) => ({
    selectedMessage: state.selectedMessage,
    setSelectedMessage: state.setSelectedMessage,
    isDetailModalOpen: state.isDetailModalOpen,
    setDetailModalOpen: state.setDetailModalOpen,
    toggleDetailModal: state.toggleDetailModal,
  }));

/**
 * セレクターフック: フィルター関連の状態のみを取得。
 */
export const useFilters = () =>
  useDashboardStore((state) => ({
    timeRange: state.timeRange,
    messageFilter: state.messageFilter,
    searchQuery: state.searchQuery,
    setTimeRange: state.setTimeRange,
    setMessageFilter: state.setMessageFilter,
    updateMessageFilter: state.updateMessageFilter,
    setSearchQuery: state.setSearchQuery,
    resetFilters: state.resetFilters,
  }));

/**
 * セレクターフック: UI状態のみを取得。
 */
export const useUIState = () =>
  useDashboardStore((state) => ({
    isDarkMode: state.isDarkMode,
    isSidebarOpen: state.isSidebarOpen,
    autoScrollTimeline: state.autoScrollTimeline,
    toggleDarkMode: state.toggleDarkMode,
    setDarkMode: state.setDarkMode,
    toggleSidebar: state.toggleSidebar,
    toggleAutoScroll: state.toggleAutoScroll,
  }));

/**
 * セレクターフック: 現在のビューのみを取得。
 */
export const useCurrentView = () =>
  useDashboardStore((state) => ({
    currentView: state.currentView,
    setCurrentView: state.setCurrentView,
  }));
