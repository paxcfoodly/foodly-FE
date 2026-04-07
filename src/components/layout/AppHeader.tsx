'use client';

import { Layout, Space, Badge, Dropdown, Avatar, Typography, Button } from 'antd';
import {
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import { logoutApi } from '@/lib/authApi';

const { Header } = Layout;
const { Text } = Typography;

interface AppHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
  onMobileMenuOpen?: () => void;
}

export default function AppHeader({
  collapsed,
  onToggleCollapse,
  isMobile,
  onMobileMenuOpen,
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

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '내 정보',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      {/* 좌측: 사이드바 토글 + 로고 */}
      <Space size="middle">
        {isMobile ? (
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 18, color: '#fff' }} />}
            onClick={onMobileMenuOpen}
            aria-label="메뉴 열기"
          />
        ) : (
          <Button
            type="text"
            icon={
              collapsed ? (
                <MenuUnfoldOutlined style={{ fontSize: 18, color: '#fff' }} />
              ) : (
                <MenuFoldOutlined style={{ fontSize: 18, color: '#fff' }} />
              )
            }
            onClick={onToggleCollapse}
            aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          />
        )}
        <Text
          strong
          style={{
            color: '#fff',
            fontSize: 18,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          🍽️ Foodly MES
        </Text>
      </Space>

      {/* 우측: 알림 + 사용자 */}
      <Space size="middle">
        <Badge count={3} size="small">
          <BellOutlined
            style={{ fontSize: 18, color: '#fff', cursor: 'pointer' }}
            aria-label="알림"
          />
        </Badge>
        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size="small" icon={<UserOutlined />} />
            {!isMobile && (
              <Space direction="vertical" size={0} style={{ lineHeight: 1.2 }}>
                <Text style={{ color: '#fff', fontSize: 13 }}>
                  {user?.userNm ?? '사용자'}
                </Text>
                {user?.roleNm && (
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
                    {user.roleNm}
                  </Text>
                )}
              </Space>
            )}
          </Space>
        </Dropdown>
      </Space>
    </Header>
  );
}
