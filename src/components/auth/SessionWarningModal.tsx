'use client';

import { Modal, Button } from '@/components/ui';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function SessionWarningModal() {
  const showWarning = useAuthStore((s) => s.showSessionWarning);
  const dismiss = useAuthStore((s) => s.dismissSessionWarning);
  const logout = useAuthStore((s) => s.logout);

  return (
    <Modal
      open={showWarning}
      onClose={dismiss}
      title={
        <span className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          세션 만료 경고
        </span>
      }
      maskClosable={false}
      footer={
        <>
          <Button
            variant="default"
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
          >
            로그아웃
          </Button>
          <Button variant="primary" onClick={dismiss}>
            계속 사용하기
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        5분 후 자동 로그아웃됩니다. 계속 사용하시려면 &quot;계속 사용하기&quot;를 클릭하세요.
      </p>
    </Modal>
  );
}
