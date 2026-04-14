'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AppHeader from './AppHeader';
import AppSider from './AppSider';
import { pathToLabelMap, pathLabelMap } from '@/config/menuConfig';

const MOBILE_BREAKPOINT = 1280;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

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

  // 현재 페이지 타이틀 추출
  const pathSegments = pathname.split('/').filter(Boolean);
  const fullPath = '/' + pathSegments.join('/');
  const pageTitle = pathToLabelMap[fullPath] || pathLabelMap[pathSegments[pathSegments.length - 1]] || '';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 좌측: 사이드바 */}
      <AppSider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* 우측: 헤더 + 콘텐츠 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          isMobile={isMobile}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          pageTitle={pageTitle}
        />

        <main className="flex-1 overflow-auto p-6 bg-dark-900">
          {children}
        </main>
      </div>
    </div>
  );
}
