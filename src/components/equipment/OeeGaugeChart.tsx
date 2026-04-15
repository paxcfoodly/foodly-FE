'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Tooltip from '@/components/ui/Tooltip';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface OeeGaugeChartProps {
  title: string;
  value: number;
  hasData?: boolean;
}

// Threshold colors aligned with existing gauge semantics:
// < 65% 빨강, < 85% 노랑, ≥ 85% 초록.
function colorFor(value: number): string {
  if (value < 65) return '#ff4d4f';
  if (value < 85) return '#faad14';
  return '#52c41a';
}

export default function OeeGaugeChart({ title, value, hasData = true }: OeeGaugeChartProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = colorFor(clamped);
  const option = {
    title: {
      text: `${clamped.toFixed(1)}%`,
      left: 'center',
      top: '38%',
      textStyle: { fontSize: 26, fontWeight: 700, color },
    },
    series: [
      {
        type: 'pie',
        radius: ['62%', '82%'],
        center: ['50%', '50%'],
        silent: true,
        label: { show: false },
        labelLine: { show: false },
        startAngle: 90,
        data: [
          { value: clamped, itemStyle: { color } },
          { value: 100 - clamped, itemStyle: { color: '#f0f0f0' } },
        ],
      },
    ],
  };

  const chart = (
    <div style={{ width: 180 }}>
      <ReactECharts option={option} style={{ width: 180, height: 180 }} />
      <div
        style={{
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 500,
          color: '#374151',
          marginTop: -8,
        }}
      >
        {title}
      </div>
    </div>
  );

  if (!hasData) {
    return (
      <Tooltip title="생산 실적 없음 - 생산실적 데이터가 등록되면 정확한 수치가 표시됩니다.">
        <div style={{ opacity: 0.6, cursor: 'help' }}>{chart}</div>
      </Tooltip>
    );
  }

  return chart;
}
