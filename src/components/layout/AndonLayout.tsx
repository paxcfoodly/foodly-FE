'use client';

import { Layout, theme } from 'antd';

const { Content } = Layout;

/**
 * 안돈(Andon) 모드 — 전체화면 레이아웃
 * 사이드바/헤더 없이 모니터 전체를 사용하는 현장 디스플레이용
 */
export default function AndonLayout({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: '#000',
      }}
    >
      <Content
        style={{
          padding: 16,
          background: '#000',
          color: '#fff',
          fontSize: 18,
        }}
      >
        {children}
      </Content>
    </Layout>
  );
}
