'use client';

import { Typography, Result } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <Result
      icon={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
      title={title}
      subTitle={description ?? `${title} 화면은 준비 중입니다.`}
    />
  );
}
