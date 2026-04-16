import type { Metadata } from 'next';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';
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
        <AuthGuard>
          {children}
        </AuthGuard>
        <SessionWarningModal />
      </body>
    </html>
  );
}
