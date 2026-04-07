'use client';

import { useState, useEffect } from 'react';
import { Layout, Breadcrumb, theme } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import AppHeader from './AppHeader';
import AppSider from './AppSider';
import { pathLabelMap, pathToLabelMap } from '@/config/menuConfig';

const { Content, Footer } = Layout;

const MOBILE_BREAKPOINT = 1280;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { token } = theme.useToken();

  // 반응형 감지: 1280px 이하 → 모바일/태블릿 모드
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Breadcrumb 항목 생성 — full path 기반으로 정확한 라벨 매핑
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbItems = [
    { title: <HomeOutlined />, href: '/' },
    ...pathSegments.map((seg, idx) => {
      const fullPath = '/' + pathSegments.slice(0, idx + 1).join('/');
      const label = pathToLabelMap[fullPath] || pathLabelMap[seg] || seg;
      return { title: label, href: fullPath };
    }),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppSider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <Layout>
        <AppHeader
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          isMobile={isMobile}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
        />
        <Content
          style={{
            margin: 16,
            padding: 24,
            background: token.colorBgContainer,
            borderRadius: token.borderRadius,
            minHeight: 280,
          }}
        >
          {pathSegments.length > 0 && (
            <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 16 }} />
          )}
          {children}
        </Content>
        <Footer
          style={{
            textAlign: 'center',
            padding: '12px 24px',
            fontSize: 12,
            color: token.colorTextSecondary,
          }}
        >
          Foodly MES v0.1.0 · © 2026 Foodly
        </Footer>
      </Layout>
    </Layout>
  );
}
