'use client';

import { create } from 'zustand';
import apiClient from '@/lib/apiClient';
import type { ApiResponse, PermissionItem } from '@/types';

/* ── 타입 ──────────────────────────────────────────── */
interface PermissionState {
  permissions: PermissionItem[];
  loaded: boolean;
  loading: boolean;

  /** 로그인 후 권한 목록 조회 */
  fetchPermissions: () => Promise<void>;
  /** 로그아웃 시 권한 초기화 */
  clearPermissions: () => void;

  /** 특정 메뉴의 특정 액션 권한 확인 */
  hasPermission: (menuUrl: string, action: 'read' | 'create' | 'update' | 'delete') => boolean;
  /** 메뉴 URL로 접근 가능 여부(canRead) 확인 */
  hasMenuAccess: (menuUrl: string) => boolean;
  /** 특정 메뉴의 권한 객체 반환 */
  getMenuPermission: (menuUrl: string) => PermissionItem | undefined;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  loaded: false,
  loading: false,

  fetchPermissions: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const res = await apiClient.get<ApiResponse<{ permissions: PermissionItem[] }>>(
        '/v1/auth/permissions',
      );
      const permissions = res.data.data.permissions;
      set({ permissions, loaded: true, loading: false });
    } catch (err) {
      console.error('[Permission] Failed to fetch permissions:', err);
      set({ permissions: [], loaded: true, loading: false });
    }
  },

  clearPermissions: () => {
    set({ permissions: [], loaded: false, loading: false });
  },

  hasPermission: (menuUrl: string, action: 'read' | 'create' | 'update' | 'delete') => {
    const perm = get().permissions.find((p) => p.menuUrl === menuUrl);
    if (!perm) return false;
    switch (action) {
      case 'read': return perm.canRead;
      case 'create': return perm.canCreate;
      case 'update': return perm.canUpdate;
      case 'delete': return perm.canDelete;
      default: return false;
    }
  },

  hasMenuAccess: (menuUrl: string) => {
    return get().hasPermission(menuUrl, 'read');
  },

  getMenuPermission: (menuUrl: string) => {
    return get().permissions.find((p) => p.menuUrl === menuUrl);
  },
}));
