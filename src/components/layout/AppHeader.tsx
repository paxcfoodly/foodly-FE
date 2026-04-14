'use client';

import {
  Bell,
  User,
  LogOut,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from 'lucide-react';
import { Dropdown, Badge, Avatar } from '@/components/ui';
import type { DropdownItem } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { logoutApi } from '@/lib/authApi';

interface AppHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
  onMobileMenuOpen?: () => void;
  pageTitle?: string;
}

export default function AppHeader({
  collapsed,
  onToggleCollapse,
  isMobile,
  onMobileMenuOpen,
  pageTitle,
}: AppHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // API 실패해도 로컬 로그아웃 진행
    }
    logout();
    window.location.href = '/login';
  };

  const userMenuItems: DropdownItem[] = [
    {
      key: 'profile',
      icon: <User className="w-4 h-4" />,
      label: '내 정보',
    },
    { key: 'divider', type: 'divider', label: '' },
    {
      key: 'logout',
      icon: <LogOut className="w-4 h-4" />,
      label: '로그아웃',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <header className="h-16 bg-dark-800 border-b border-dark-500 flex items-center justify-between px-6 shrink-0">
      {/* 좌측: 토글 + 페이지 타이틀 */}
      <div className="flex items-center gap-3">
        {isMobile ? (
          <button
            onClick={onMobileMenuOpen}
            className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-500" />
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-gray-500" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-gray-500" />
            )}
          </button>
        )}
        {pageTitle && (
          <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
        )}
      </div>

      {/* 우측: 검색 + 알림 + 사용자 */}
      <div className="flex items-center gap-4">
        {!isMobile && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="검색..."
              className="bg-dark-700 border border-dark-500 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-700 placeholder-dark-400 focus:outline-none focus:border-cyan-accent/50 w-64"
            />
          </div>
        )}

        <button className="relative p-2 rounded-lg hover:bg-dark-700 transition-colors">
          <Badge count={3} size="small">
            <Bell className="w-5 h-5 text-gray-500" />
          </Badge>
        </button>

        <Dropdown items={userMenuItems} trigger={['click']} placement="bottomRight">
          <div className="flex items-center gap-2 cursor-pointer">
            <Avatar
              size={32}
              icon={<User className="w-4 h-4" />}
              style={{ background: 'rgba(8, 145, 178, 0.15)', color: '#0891b2' }}
            />
            {!isMobile && (
              <div className="leading-tight">
                <div className="text-sm font-medium text-gray-900">
                  {user?.userNm ?? '사용자'}
                </div>
                {user?.roleNm && (
                  <div className="text-xs text-dark-400">
                    {user.roleNm}
                  </div>
                )}
              </div>
            )}
          </div>
        </Dropdown>
      </div>
    </header>
  );
}
