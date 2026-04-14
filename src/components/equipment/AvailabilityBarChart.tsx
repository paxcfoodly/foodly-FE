'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface AvailabilityBarChartProps {
  data: Array<{ equip_nm: string; availability: number }>;
}

function getBarColor(value: number): string {
  if (value >= 85) return '#2dd4a8';
  if (value >= 65) return '#fbbf24';
  return '#fb7185';
}

export default function AvailabilityBarChart({ data }: AvailabilityBarChartProps) {
  const equipNames = data.map((d) => d.equip_nm);
  const seriesData = data.map((d) => ({
    value: d.availability,
    itemStyle: { color: getBarColor(d.availability), borderRadius: [0, 3, 3, 0] },
  }));

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p.name}<br/>가동률: ${Number(p.value).toFixed(1)}%`;
      },
    },
    grid: { left: 100, right: 40, top: 8, bottom: 24, containLabel: false },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%', color: '#cbd5e1', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: equipNames,
      axisLabel: { fontSize: 11, overflow: 'truncate', width: 90, color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: seriesData,
        label: {
          show: true,
          position: 'right',
          formatter: (params: { value: number }) => `${Number(params.value).toFixed(1)}%`,
          fontSize: 10,
          color: '#94a3b8',
        },
        barMaxWidth: 18,
        z: 0,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}
