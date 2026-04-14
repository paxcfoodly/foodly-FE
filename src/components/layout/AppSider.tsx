'use client';

import { useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { Drawer } from '@/components/ui';
import { menuConfig, type MenuItem } from '@/config/menuConfig';
import { usePermissionStore } from '@/stores/permissionStore';

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

  // 권한에 따라 메뉴 필터링
  const filteredMenu = useMemo(() => {
    if (!permLoaded) return [];
    return menuConfig.reduce<MenuItem[]>((acc, parent) => {
      const filteredChildren = parent.children?.filter(
        (child) => !child.path || hasMenuAccess(child.path),
      );
      if (filteredChildren && filteredChildren.length > 0) {
        acc.push({ ...parent, children: filteredChildren });
      } else if (!parent.children && hasMenuAccess(parent.path)) {
        acc.push(parent);
      }
      return acc;
    }, []);
  }, [permLoaded, hasMenuAccess]);

  const selectedKey = pathname;
  const defaultOpenKey = '/' + (pathname.split('/')[1] || 'dashboard');

  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({
    [defaultOpenKey]: true,
  });

  const toggleSubmenu = (key: string) => {
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleItemClick = (path: string) => {
    router.push(path);
    if (isMobile) onMobileClose();
  };

  const logoSection = (
    <div className="h-16 flex items-center gap-2 px-5 border-b border-dark-500 shrink-0">
      <span className="text-2xl font-bold text-cyan-accent">F</span>
      {!collapsed && (
        <span className="text-lg font-bold tracking-tight text-gray-900 whitespace-nowrap">
          Foodly MES
        </span>
      )}
    </div>
  );

  const menuContent = (
    <nav className="flex-1 overflow-auto py-4 space-y-1 px-3">
      {filteredMenu.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const isParentActive = pathname.startsWith(item.path);
        const isOpen = openKeys[item.path] ?? isParentActive;

        return (
          <div key={item.id}>
            <button
              onClick={() => {
                if (hasChildren) toggleSubmenu(item.path);
                else handleItemClick(item.path);
              }}
              className={`
                w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors
                ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                ${isParentActive && !hasChildren
                  ? 'bg-cyan-accent/10 text-cyan-accent'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-dark-700'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {hasChildren && (
                    <ChevronDown
                      className={`w-4 h-4 text-dark-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </>
              )}
            </button>

            {hasChildren && !collapsed && isOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {item.children!.map((child) => {
                  const isActive = selectedKey === child.path;
                  return (
                    <button
                      key={child.id}
                      onClick={() => handleItemClick(child.path)}
                      className={`
                        w-full text-left text-sm rounded-lg px-3 py-2 pl-6 transition-colors truncate
                        ${isActive
                          ? 'bg-cyan-accent/10 text-cyan-accent font-medium'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-dark-700'
                        }
                      `}
                    >
                      {child.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  // 모바일: Drawer
  if (isMobile) {
    return (
      <Drawer placement="left" open={mobileOpen} onClose={onMobileClose} width={240}>
        <div className="-m-6">
          {logoSection}
          {menuContent}
        </div>
      </Drawer>
    );
  }

  // 데스크톱: 고정 사이드바
  return (
    <aside
      className={`
        ${collapsed ? 'w-16' : 'w-60'}
        bg-dark-800 border-r border-dark-500 flex flex-col shrink-0
        transition-all duration-200 overflow-hidden
      `}
    >
      {logoSection}
      {menuContent}
    </aside>
  );
}
