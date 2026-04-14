'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface InspectPassGaugeProps {
  title: string;
  rate: number;
  prevDayDiff?: number;
}

export default function InspectPassGauge({ title, rate, prevDayDiff }: InspectPassGaugeProps) {
  const color = rate >= 95 ? '#34d399' : rate >= 85 ? '#fbbf24' : '#fb7185';

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
            width: 14,
            color: [[rate / 100, color], [1, '#f1f5f9']],
          },
        },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 20,
          fontWeight: 600,
          fontFamily: 'ui-monospace, monospace',
          formatter: '{value}%',
          offsetCenter: [0, '10%'],
          color: '#334155',
        },
        title: {
          fontSize: 11,
          color: '#94a3b8',
          offsetCenter: [0, '38%'],
        },
        data: [{ value: rate, name: title }],
      },
    ],
    graphic: prevDayDiff !== undefined
      ? [
          {
            type: 'text',
            left: 'center',
            bottom: 6,
            style: {
              text: `전일 대비 ${prevDayDiff >= 0 ? '▲' : '▼'}${Math.abs(prevDayDiff)}%`,
              fontSize: 10,
              fill: prevDayDiff >= 0 ? '#10b981' : '#f43f5e',
              textAlign: 'center',
            },
          },
        ]
      : [],
  };

  return <ReactECharts option={option} style={{ height: 150 }} notMerge />;
}
