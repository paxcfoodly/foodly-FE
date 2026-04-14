'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface AchievementDonutProps {
  rate: number;
  targetQty: number;
  actualQty: number;
  prevDayDiff: number;
  onClick?: () => void;
}

export default function AchievementDonut({
  rate,
  targetQty,
  actualQty,
  prevDayDiff,
  onClick,
}: AchievementDonutProps) {
  const color = rate >= 90 ? '#34d399' : rate >= 70 ? '#fbbf24' : '#fb7185';

  const option = {
    series: [
      {
        type: 'pie',
        radius: ['60%', '78%'],
        center: ['50%', '45%'],
        startAngle: 90,
        silent: false,
        data: [
          { value: rate, name: '달성', itemStyle: { color } },
          { value: Math.max(0, 100 - rate), name: '미달', itemStyle: { color: '#f1f5f9' } },
        ],
        label: { show: false },
        emphasis: { scale: false },
      },
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '34%',
        style: {
          text: `${rate}%`,
          fontSize: 22,
          fontWeight: 600,
          fontFamily: 'ui-monospace, monospace',
          fill: '#334155',
          textAlign: 'center',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '50%',
        style: {
          text: `목표 ${targetQty.toLocaleString()} / 실적 ${actualQty.toLocaleString()}`,
          fontSize: 10,
          fill: '#94a3b8',
          textAlign: 'center',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '59%',
        style: {
          text: `전일 대비 ${prevDayDiff >= 0 ? '▲' : '▼'}${Math.abs(prevDayDiff)}%`,
          fontSize: 10,
          fontWeight: 500,
          fill: prevDayDiff >= 0 ? '#10b981' : '#f43f5e',
          textAlign: 'center',
        },
      },
    ],
  };

  return (
    <div className={onClick ? 'cursor-pointer' : ''} onClick={onClick}>
      <ReactECharts option={option} style={{ height: 160 }} notMerge />
    </div>
  );
}
