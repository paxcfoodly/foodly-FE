'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface ParetoItem {
  typeName: string;
  count: number;
}

interface DefectParetoChartProps {
  data: ParetoItem[];
  onClick?: (typeName: string) => void;
}

function getRankColor(rank: number): string {
  if (rank < 3) return '#f43f5e';
  if (rank < 6) return '#fb923c';
  return '#94a3b8';
}

export default function DefectParetoChart({ data, onClick }: DefectParetoChartProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((s, d) => s + d.count, 0);

  let cumulative = 0;
  const cumulativeRates = sorted.map((d) => {
    cumulative += d.count;
    return total > 0 ? Math.round((cumulative / total) * 1000) / 10 : 0;
  });

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: {
      data: ['건수', '누적비율'],
      top: 0,
      textStyle: { fontSize: 10, color: '#94a3b8' },
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: { left: 40, right: 40, top: 32, bottom: 36 },
    xAxis: {
      type: 'category',
      data: sorted.map((d) => d.typeName),
      axisLabel: { fontSize: 9, color: '#94a3b8', rotate: 20 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        axisLabel: { fontSize: 9, color: '#cbd5e1' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { fontSize: 9, color: '#cbd5e1', formatter: '{value}%' },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
    ],
    series: [
      {
        name: '건수',
        type: 'bar',
        data: sorted.map((d, i) => ({
          value: d.count,
          itemStyle: { color: getRankColor(i), borderRadius: [3, 3, 0, 0] },
        })),
        barMaxWidth: 28,
        z: 0,
      },
      {
        name: '누적비율',
        type: 'line',
        yAxisIndex: 1,
        data: cumulativeRates,
        lineStyle: { color: '#818cf8', width: 2 },
        itemStyle: { color: '#818cf8' },
        symbol: 'circle',
        symbolSize: 5,
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#e2e8f0', type: 'dashed', width: 1 },
          data: [{ yAxis: 80 }],
          label: { formatter: '80%', fontSize: 9, color: '#94a3b8' },
        },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 260 }}
      notMerge
      onEvents={onClick ? { click: (params: { name: string }) => onClick(params.name) } : undefined}
    />
  );
}
