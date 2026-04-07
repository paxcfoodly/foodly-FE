'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Space, theme } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { loginApi } from '@/lib/authApi';

const { Title, Text } = Typography;

interface LoginFormValues {
  login_id: string;
  password: string;
}

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { token: themeToken } = theme.useToken();

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

  const handleLogin = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await loginApi(values);
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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${themeToken.colorPrimary}22 0%, ${themeToken.colorBgLayout} 100%)`,
        padding: 16,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: themeToken.boxShadowTertiary,
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 타이틀 */}
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0 }}>
              🍽️ Foodly MES
            </Title>
            <Text type="secondary">식품 제조 실행 시스템</Text>
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
          <Form
            form={form}
            layout="vertical"
            onFinish={handleLogin}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="login_id"
              rules={[{ required: true, message: '아이디를 입력해 주세요' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="아이디"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '비밀번호를 입력해 주세요' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="비밀번호"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
              >
                로그인
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
