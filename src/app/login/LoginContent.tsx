'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Lock } from 'lucide-react';
import { Button, Alert } from '@/components/ui';
import Input from '@/components/ui/Input';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-gray-100 p-4">
      <div className="w-full max-w-[400px] bg-white rounded-xl p-8 shadow-lg">
        <div className="flex flex-col gap-6 w-full">
          {/* 타이틀 */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 m-0">
              🍽️ Foodly MES
            </h1>
            <p className="text-sm text-gray-500 mt-1">식품 제조 실행 시스템</p>
          </div>

          {/* 세션 만료 안내 */}
          {reasonMessage && (
            <Alert
              type="warning"
              message={reasonMessage}
              showIcon
              closable
            />
          )}

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
              {errors.login_id && (
                <p className="text-xs text-red-500 mt-1">{errors.login_id}</p>
              )}
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
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            <Button
              variant="primary"
              type="submit"
              loading={loading}
              block
              size="large"
            >
              로그인
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
