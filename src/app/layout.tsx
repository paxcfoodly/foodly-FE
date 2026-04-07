import type { Metadata } from 'next';
import './globals.css';
import AntdProvider from '@/components/providers/AntdProvider';
import AuthGuard from '@/components/auth/AuthGuard';
import SessionWarningModal from '@/components/auth/SessionWarningModal';

export const metadata: Metadata = {
  title: 'Foodly MES',
  description: '식품 제조 실행 시스템 (Manufacturing Execution System)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AntdProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
          <SessionWarningModal />
        </AntdProvider>
      </body>
    </html>
  );
}
