'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Lock,
  ScanLine,
  Activity,
  FileSpreadsheet,
  ClipboardCheck,
} from 'lucide-react';
import { Button, Alert } from '@/components/ui';
import Input from '@/components/ui/Input';
import toast from '@/components/ui/toast';
import { useAuthStore } from '@/stores/authStore';
import { loginApi } from '@/lib/authApi';

interface LoginFormValues {
  login_id: string;
  password: string;
}

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<LoginFormValues>({
    login_id: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({});

  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);

  // 앱 초기화 시 토큰 복원
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // 이미 로그인된 상태면 대시보드로 이동
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  // 세션 만료 등 이유 표시
  const reason = searchParams.get('reason');
  const reasonMessage =
    reason === 'timeout'
      ? '30분간 활동이 없어 자동 로그아웃되었습니다.'
      : reason === 'expired'
        ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
        : null;

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof LoginFormValues, string>> = {};
    if (!formValues.login_id) newErrors.login_id = '아이디를 입력해 주세요';
    if (!formValues.password) newErrors.password = '비밀번호를 입력해 주세요';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await loginApi(formValues);
      login(result.user, result.accessToken, result.refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '로그인에 실패했습니다. 다시 시도해 주세요.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'kakao') => {
    const label = provider === 'google' ? 'Google' : '카카오';
    toast.info(`${label} 계정 로그인은 준비 중입니다.`);
  };

  const features = [
    {
      icon: ClipboardCheck,
      title: '생산계획 · 작업지시',
      desc: '수주에서 실적까지 단일 흐름',
    },
    {
      icon: ScanLine,
      title: 'LOT 정·역방향 추적',
      desc: '원자재–제품–출하 단위 추적',
    },
    {
      icon: Activity,
      title: '설비 OEE · 실시간 가동',
      desc: '가용성·성능·품질 자동 집계',
    },
    {
      icon: FileSpreadsheet,
      title: '리포트 · 엑셀 내보내기',
      desc: '일보 · KPI · 불량 파레토',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-gray-100 p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        {/* 좌측 — 서비스 소개 */}
        <aside className="p-10 xl:p-12 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em]">
              Foodly MES
            </span>
            <h1 className="mt-4 text-[28px] xl:text-4xl font-bold text-gray-900 leading-tight tracking-tight whitespace-nowrap">
              식품 제조 현장을 <span className="text-cyan-accent">한 곳에서</span>
            </h1>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-[360px]">
              생산계획부터 출하까지 공장의 모든 데이터를 실시간으로 관리합니다.
            </p>
          </div>

          <ul className="mt-8 space-y-4 flex-1">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center">
                  <f.icon className="w-4.5 h-4.5 text-cyan-accent" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-800">{f.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center gap-4 text-[11px] text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              HACCP 기준 기록 설계
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              JWT 기반 RBAC
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              감사로그 자동기록
            </span>
          </div>
        </aside>

        {/* 우측 — 로그인 */}
        <div className="p-8 xl:p-10 flex flex-col gap-6 justify-center">
          <div className="text-center lg:text-left">
            <h2 className="text-xl font-semibold text-gray-800">로그인</h2>
            <p className="text-sm text-gray-500 mt-1">계정 정보를 입력해 주세요</p>
          </div>

          {/* 세션 만료 안내 */}
          {reasonMessage && <Alert type="warning" message={reasonMessage} showIcon closable />}

          {/* 에러 메시지 */}
          {errorMsg && (
            <Alert
              type="error"
              message={errorMsg}
              showIcon
              closable
              onClose={() => setErrorMsg(null)}
            />
          )}

          {/* 로그인 폼 */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4" autoComplete="off">
            <div>
              <Input
                addonBefore={<User className="w-4 h-4" />}
                placeholder="아이디"
                autoFocus
                value={formValues.login_id}
                onChange={(e) => setFormValues((v) => ({ ...v, login_id: e.target.value }))}
                className={errors.login_id ? '!border-red-400' : ''}
              />
              {errors.login_id && <p className="text-xs text-red-500 mt-1">{errors.login_id}</p>}
            </div>

            <div>
              <Input
                type="password"
                addonBefore={<Lock className="w-4 h-4" />}
                placeholder="비밀번호"
                value={formValues.password}
                onChange={(e) => setFormValues((v) => ({ ...v, password: e.target.value }))}
                className={errors.password ? '!border-red-400' : ''}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <Button variant="primary" type="submit" loading={loading} block size="large">
              로그인
            </Button>
          </form>

          {/* 소셜 로그인 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.98 10.98 0 0 0 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18A10.98 10.98 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.98 10.98 0 0 0 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38z"
                  fill="#EA4335"
                />
              </svg>
              Google 계정으로 로그인
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('kakao')}
              className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#FEE500] text-sm font-medium text-[#3C1E1E] hover:bg-[#FFDB2D] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.86 1.86 5.37 4.66 6.79L5.5 21.5c-.08.28.23.52.48.36l4.16-2.75c.61.06 1.23.1 1.86.1 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
              </svg>
              카카오 계정으로 로그인
            </button>
          </div>

          <p className="text-center text-[11px] text-gray-400">소셜 로그인은 준비 중입니다</p>
        </div>
      </div>
    </div>
  );
}
