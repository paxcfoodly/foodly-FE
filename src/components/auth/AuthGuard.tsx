'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { usePermissionStore } from '@/stores/permissionStore';
import { AlertCircle } from 'lucide-react';

const PUBLIC_PATHS = ['/login'];
/** 인증만 필요하고 별도 메뉴 권한 검사 불필요한 경로 */
const AUTH_ONLY_PATHS = ['/dashboard', '/'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const fetchPermissions = usePermissionStore((s) => s.fetchPermissions);
  const permLoaded = usePermissionStore((s) => s.loaded);
  const hasMenuAccess = usePermissionStore((s) => s.hasMenuAccess);
  const [checked, setChecked] = useState(false);

  // 1. hydrate 인증 상태
  useEffect(() => {
    hydrate();
    setChecked(true);
  }, [hydrate]);

  // 2. 인증 완료 후 권한 로드
  useEffect(() => {
    if (checked && isAuthenticated && !permLoaded) {
      void fetchPermissions();
    }
  }, [checked, isAuthenticated, permLoaded, fetchPermissions]);

  // 3. 미인증 시 로그인으로 리다이렉트
  useEffect(() => {
    if (!checked) return;
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (!isAuthenticated && !isPublic) {
      router.replace('/login');
    }
  }, [checked, isAuthenticated, pathname, router]);

  // 공개 페이지는 항상 렌더링
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  // hydrate 완료 전 로딩
  if (!checked) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="large" tip="로딩 중..." />
      </div>
    );
  }

  // 미인증이면 리다이렉트 대기
  if (!isAuthenticated) {
    return null;
  }

  // 권한 로딩 중
  if (!permLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="large" tip="권한 확인 중..." />
      </div>
    );
  }

  // 4. 메뉴 권한 검사: URL 직접 입력 차단
  const isAuthOnly = AUTH_ONLY_PATHS.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/')),
  );

  if (!isAuthOnly && !hasMenuAccess(pathname)) {
    // 정확한 경로가 없으면 상위 경로에서 찾기 (e.g. /master/item/123 → /master/item)
    const segments = pathname.split('/').filter(Boolean);
    let parentAccess = false;
    for (let i = segments.length - 1; i >= 1; i--) {
      const parentPath = '/' + segments.slice(0, i).join('/');
      if (hasMenuAccess(parentPath)) {
        parentAccess = true;
        break;
      }
    }

    if (!parentAccess) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center max-w-md px-6">
            <div className="flex justify-center mb-6">
              <AlertCircle className="w-16 h-16 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한 없음</h1>
            <p className="text-gray-500 mb-8">
              해당 페이지에 대한 접근 권한이 없습니다. 관리자에게 문의하세요.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
            >
              대시보드로 이동
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
