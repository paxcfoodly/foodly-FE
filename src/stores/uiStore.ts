'use client';

import { create } from 'zustand';

interface UiState {
  /** 사이더 접힘 여부 */
  siderCollapsed: boolean;
  /** 모바일 Drawer 열림 여부 */
  drawerOpen: boolean;
  /** 전역 로딩 오버레이 */
  globalLoading: boolean;

  /** 사이더 접힘 토글 */
  toggleSider: () => void;
  /** 사이더 접힘 직접 설정 */
  setSiderCollapsed: (collapsed: boolean) => void;
  /** Drawer 열기/닫기 */
  setDrawerOpen: (open: boolean) => void;
  /** 전역 로딩 설정 */
  setGlobalLoading: (loading: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  siderCollapsed: false,
  drawerOpen: false,
  globalLoading: false,

  toggleSider: () => set((s) => ({ siderCollapsed: !s.siderCollapsed })),
  setSiderCollapsed: (collapsed) => set({ siderCollapsed: collapsed }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
