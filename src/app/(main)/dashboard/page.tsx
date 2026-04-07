'use client';

import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function DashboardPage() {
  return (
    <div>
      <Title level={3}>대시보드</Title>
      <Paragraph type="secondary">생산 현황 요약 — 준비 중</Paragraph>
    </div>
  );
}
