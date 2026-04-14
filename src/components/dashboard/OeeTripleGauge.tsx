'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface OeeSingleGaugeProps {
  title: string;
  value: number;
  color: string;
}

function OeeSingleGauge({ title, value, color }: OeeSingleGaugeProps) {
  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        axisLine: {
          lineStyle: { width: 12, color: [[value / 100, color], [1, '#f1f5f9']] },
        },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 18,
          fontWeight: 600,
          fontFamily: 'ui-monospace, monospace',
          formatter: '{value}%',
          offsetCenter: [0, '10%'],
          color: '#334155',
        },
        title: {
          fontSize: 11,
          color: '#94a3b8',
          offsetCenter: [0, '42%'],
        },
        data: [{ value, name: title }],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 120 }} notMerge />;
}

interface OeeTripleGaugeProps {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export default function OeeTripleGauge({ availability, performance, quality, oee }: OeeTripleGaugeProps) {
  const oeeColor = oee >= 85 ? '#10b981' : oee >= 70 ? '#f59e0b' : '#f43f5e';

  return (
    <div>
      <div className="text-center mb-1">
        <span className="text-xs text-slate-400">종합 OEE</span>
        <div className={`text-2xl font-mono font-bold`} style={{ color: oeeColor }}>{oee}%</div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <OeeSingleGauge title="가동률" value={availability} color="#60a5fa" />
        <OeeSingleGauge title="성능률" value={performance} color="#2dd4a8" />
        <OeeSingleGauge title="양품률" value={quality} color="#a78bfa" />
      </div>
    </div>
  );
}
