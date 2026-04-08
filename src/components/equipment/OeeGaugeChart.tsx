'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Tooltip } from 'antd';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface OeeGaugeChartProps {
  title: string;
  value: number;
  hasData?: boolean;
}

export default function OeeGaugeChart({ title, value, hasData = true }: OeeGaugeChartProps) {
  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.65, '#ff4d4f'],
              [0.85, '#faad14'],
              [1, '#52c41a'],
            ],
          },
        },
        pointer: { show: true, length: '60%' },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: 600,
          formatter: '{value}%',
          offsetCenter: [0, '70%'],
        },
        data: [{ value, name: title }],
        title: { fontSize: 14, offsetCenter: [0, '90%'] },
        axisTick: { show: true },
        splitLine: { show: true },
        axisLabel: { show: true, fontSize: 10 },
      },
    ],
  };

  const chart = (
    <ReactECharts option={option} style={{ width: 200, height: 200 }} />
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
