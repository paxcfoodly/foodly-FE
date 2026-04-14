'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface DefectItem {
  typeName: string;
  count: number;
}

interface DefectTop5ChartProps {
  data: DefectItem[];
  onClick?: (typeName: string) => void;
}

function getRankColor(rank: number): string {
  if (rank === 0) return '#f43f5e';
  if (rank <= 2) return '#fb923c';
  return '#94a3b8';
}

export default function DefectTop5Chart({ data, onClick }: DefectTop5ChartProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 5);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: { left: 80, right: 50, top: 8, bottom: 16 },
    xAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#cbd5e1' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((d) => d.typeName).reverse(),
      axisLabel: { fontSize: 11, color: '#64748b', width: 70, overflow: 'truncate' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      inverse: false,
    },
    series: [
      {
        type: 'bar',
        data: sorted
          .map((d, i) => ({
            value: d.count,
            itemStyle: { color: getRankColor(i), borderRadius: [0, 3, 3, 0] },
          }))
          .reverse(),
        barMaxWidth: 16,
        z: 0,
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          color: '#94a3b8',
          formatter: '{c}건',
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 180 }}
      notMerge
      onEvents={
        onClick
          ? { click: (params: { name: string }) => onClick(params.name) }
          : undefined
      }
    />
  );
}
