'use client';

import React from 'react';
import { Card, Col, Row, Statistic } from 'antd';

interface CpkDisplayProps {
  cp: number | null;
  cpk: number | null;
  totalCount: number;
  subgroupCount: number;
}

function getCpkColor(value: number | null): string {
  if (value === null) return '#8c8c8c';
  if (value >= 1.33) return '#52c41a';
  if (value >= 1.0) return '#faad14';
  return '#ff4d4f';
}

function formatCpk(value: number | null): string {
  if (value === null) return '-';
  return value.toFixed(3);
}

export default function CpkDisplay({ cp, cpk, totalCount, subgroupCount }: CpkDisplayProps) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>공정능력 지수</div>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="Cp"
              value={formatCpk(cp)}
              valueStyle={{ color: getCpkColor(cp), fontSize: 28, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="Cpk"
              value={formatCpk(cpk)}
              valueStyle={{ color: getCpkColor(cpk), fontSize: 28, fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>
      <div style={{ marginTop: 12, color: '#595959', fontSize: 13 }}>
        <span style={{ marginRight: 16 }}>총 데이터: {totalCount}건</span>
        <span>서브그룹: {subgroupCount}개</span>
      </div>
      <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 12 }}>
        <span style={{ color: '#52c41a', marginRight: 8 }}>■ 우수 (≥1.33)</span>
        <span style={{ color: '#faad14', marginRight: 8 }}>■ 보통 (1.00-1.32)</span>
        <span style={{ color: '#ff4d4f' }}>■ 불량 (&lt;1.00)</span>
      </div>
    </div>
  );
}
