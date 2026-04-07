'use client';

import { Layout, Menu, Drawer } from 'antd';
import type { MenuProps } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { menuConfig, toAntdMenuItems, type MenuItem } from '@/config/menuConfig';
import { usePermissionStore } from '@/stores/permissionStore';

const { Sider } = Layout;

interface AppSiderProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobile: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function AppSider({
  collapsed,
  onCollapse,
  isMobile,
  mobileOpen,
  onMobileClose,
}: AppSiderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const hasMenuAccess = usePermissionStore((s) => s.hasMenuAccess);
  const permLoaded = usePermissionStore((s) => s.loaded);

  // 권한에 따라 메뉴 필터링: canRead 있는 메뉴만 표시
  const filteredMenu = useMemo(() => {
    if (!permLoaded) return []; // 권한 미로딩 시 빈 메뉴
    return menuConfig.reduce<MenuItem[]>((acc, parent) => {
      // 자식 메뉴 필터링
      const filteredChildren = parent.children?.filter(
        (child) => !child.path || hasMenuAccess(child.path),
      );
      // 자식이 모두 필터링되면 대메뉴도 숨김
      if (filteredChildren && filteredChildren.length > 0) {
        acc.push({ ...parent, children: filteredChildren });
      } else if (!parent.children && hasMenuAccess(parent.path)) {
        // 자식 없는 단독 메뉴
        acc.push(parent);
      }
      return acc;
    }, []);
  }, [permLoaded, hasMenuAccess]);

  const antdMenuItems = useMemo(() => toAntdMenuItems(filteredMenu), [filteredMenu]);

  // 현재 경로에서 선택된 메뉴 키 계산
  const selectedKey = pathname;

  // 현재 경로에서 열린 서브메뉴 키 계산 (대메뉴 path)
  const openKey = '/' + (pathname.split('/')[1] || 'dashboard');

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    router.push(key);
    if (isMobile) onMobileClose();
  };

  const menuContent = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedKey]}
      defaultOpenKeys={[openKey]}
      items={antdMenuItems}
      onClick={handleMenuClick}
      style={{ borderRight: 0 }}
    />
  );

  // 모바일/태블릿: Drawer로 전환
  if (isMobile) {
    return (
      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={onMobileClose}
        styles={{ body: { padding: 0, background: '#001529' }, wrapper: { width: 256 } }}
        closable={false}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          🍽️ Foodly MES
        </div>
        {menuContent}
      </Drawer>
    );
  }

  // 데스크톱: 고정 Sider
  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
      width={240}
      collapsedWidth={64}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
      }}
    >
      {menuContent}
    </Sider>
  );
}
