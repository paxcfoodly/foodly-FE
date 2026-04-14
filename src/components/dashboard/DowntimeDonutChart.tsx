'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface DowntimeItem {
  reason: string;
  minutes: number;
}

interface DowntimeDonutChartProps {
  data: DowntimeItem[];
}

const COLORS: Record<string, string> = {
  고장: '#f43f5e',
  셋업: '#fbbf24',
  자재대기: '#60a5fa',
  계획정지: '#94a3b8',
};
const FALLBACK = ['#a78bfa', '#2dd4a8', '#fb923c', '#64748b'];

export default function DowntimeDonutChart({ data }: DowntimeDonutChartProps) {
  const total = data.reduce((s, d) => s + d.minutes, 0);

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}: ${p.value}분 (${p.percent}%)`,
    },
    legend: {
      orient: 'vertical' as const,
      right: 8,
      top: 'center',
      textStyle: { fontSize: 11, color: '#64748b' },
      itemWidth: 10,
      itemHeight: 10,
      formatter: (name: string) => {
        const item = data.find((d) => d.reason === name);
        return item ? `${name}  ${item.minutes}분` : name;
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['32%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        data: data.map((d, i) => ({
          value: d.minutes,
          name: d.reason,
          itemStyle: { color: COLORS[d.reason] ?? FALLBACK[i % FALLBACK.length] },
        })),
      },
    ],
    graphic: [
      {
        type: 'text',
        left: '25%',
        top: '42%',
        style: {
          text: `${total}`,
          fontSize: 18,
          fontWeight: 600,
          fontFamily: 'ui-monospace, monospace',
          fill: '#334155',
          textAlign: 'center',
        },
      },
      {
        type: 'text',
        left: '24%',
        top: '54%',
        style: {
          text: '총 비가동(분)',
          fontSize: 9,
          fill: '#94a3b8',
          textAlign: 'center',
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 220 }} notMerge />;
}
