'use client';

import { Button } from '@/components/ui';
import type { ButtonProps } from '@/components/ui';
import { usePermissionStore } from '@/stores/permissionStore';

type PermissionAction = 'create' | 'update' | 'delete';

interface PermissionButtonProps extends Omit<ButtonProps, 'disabled'> {
  /** CRUD 액션: create | update | delete */
  action: PermissionAction;
  /** 메뉴 URL (e.g. '/master/item') */
  menuUrl: string;
  /** 권한 없을 때 동작: 'hide'(기본) = 안보임, 'disable' = 비활성화 */
  fallback?: 'hide' | 'disable';
  children: React.ReactNode;
}

/**
 * 권한에 따라 버튼을 표시/숨김/비활성화하는 컴포넌트
 *
 * @example
 * <PermissionButton action="create" menuUrl="/master/item">
 *   신규 등록
 * </PermissionButton>
 *
 * <PermissionButton action="delete" menuUrl="/master/item" fallback="disable">
 *   삭제
 * </PermissionButton>
 */
export default function PermissionButton({
  action,
  menuUrl,
  fallback = 'hide',
  children,
  ...buttonProps
}: PermissionButtonProps) {
  const hasPermission = usePermissionStore((s) => s.hasPermission);

  const actionMap: Record<PermissionAction, 'create' | 'update' | 'delete'> = {
    create: 'create',
    update: 'update',
    delete: 'delete',
  };

  const allowed = hasPermission(menuUrl, actionMap[action]);

  if (!allowed) {
    if (fallback === 'hide') return null;
    // fallback === 'disable'
    return (
      <Button {...buttonProps} disabled>
        {children}
      </Button>
    );
  }

  return <Button {...buttonProps}>{children}</Button>;
}
