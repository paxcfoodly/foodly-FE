'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface ProcessDefectItem {
  processName: string;
  defectRate: number;
}

interface ProcessDefectChartProps {
  data: ProcessDefectItem[];
  targetRate?: number;
}

export default function ProcessDefectChart({ data, targetRate = 2.0 }: ProcessDefectChartProps) {
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p.name}<br/>불량률: ${Number(p.value).toFixed(1)}%`;
      },
    },
    grid: { left: 80, right: 40, top: 8, bottom: 24 },
    xAxis: {
      type: 'value',
      max: (value: { max: number }) => Math.max(value.max * 1.2, targetRate * 1.5),
      axisLabel: { fontSize: 10, color: '#cbd5e1', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.processName),
      axisLabel: { fontSize: 11, color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d) => ({
          value: d.defectRate,
          itemStyle: {
            color: d.defectRate > targetRate ? '#fb7185' : '#60a5fa',
            borderRadius: [0, 3, 3, 0],
          },
        })),
        barMaxWidth: 16,
        z: 0,
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          color: '#94a3b8',
          formatter: (p: { value: number }) => `${Number(p.value).toFixed(1)}%`,
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#e2e8f0', type: 'dashed', width: 1 },
          data: [{ xAxis: targetRate }],
          label: { formatter: `목표 ${targetRate}%`, fontSize: 9, color: '#94a3b8' },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 240 }} notMerge />;
}
