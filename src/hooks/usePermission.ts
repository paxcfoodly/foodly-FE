'use client';

import { usePermissionStore } from '@/stores/permissionStore';

/**
 * 메뉴 URL 기반 권한 확인 훅
 * @param menuUrl - 메뉴 URL (e.g. '/master/item')
 */
export function usePermission(menuUrl: string) {
  const hasPermission = usePermissionStore((s) => s.hasPermission);
  const getMenuPermission = usePermissionStore((s) => s.getMenuPermission);

  const perm = getMenuPermission(menuUrl);

  return {
    canRead: perm?.canRead ?? false,
    canCreate: perm?.canCreate ?? false,
    canUpdate: perm?.canUpdate ?? false,
    canDelete: perm?.canDelete ?? false,
    canPrint: perm?.canPrint ?? false,
    /** 특정 액션 권한 확인 */
    has: (action: 'read' | 'create' | 'update' | 'delete') =>
      hasPermission(menuUrl, action),
  };
}
