'use client';

import { Modal, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';

const { Text } = Typography;

export default function SessionWarningModal() {
  const showWarning = useAuthStore((s) => s.showSessionWarning);
  const dismiss = useAuthStore((s) => s.dismissSessionWarning);
  const logout = useAuthStore((s) => s.logout);

  return (
    <Modal
      title={
        <>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
          세션 만료 경고
        </>
      }
      open={showWarning}
      okText="계속 사용하기"
      cancelText="로그아웃"
      onOk={dismiss}
      onCancel={() => {
        logout();
        window.location.href = '/login';
      }}
      closable={false}
      maskClosable={false}
    >
      <Text>
        5분 후 자동 로그아웃됩니다. 계속 사용하시려면 &quot;계속 사용하기&quot;를 클릭하세요.
      </Text>
    </Modal>
  );
}
