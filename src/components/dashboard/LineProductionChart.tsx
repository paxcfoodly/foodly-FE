'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface LineProductionData {
  lineName: string;
  target: number;
  actual: number;
}

interface LineProductionChartProps {
  data: LineProductionData[];
  onClick?: (lineName: string) => void;
}

const TARGET_COLOR = '#60a5fa';
const ACTUAL_COLOR = '#fb923c';
const OVER_COLOR = '#34d399';

export default function LineProductionChart({ data, onClick }: LineProductionChartProps) {
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['목표', '실적', '초과실적'],
      top: 0,
      textStyle: { fontSize: 11, color: '#64748b' },
      itemWidth: 12,
      itemHeight: 8,
      formatter: (name: string) => (name === '초과실적' ? `(${name})` : name),
    },
    grid: { left: 50, right: 30, top: 32, bottom: 24 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.lineName),
      axisLabel: { fontSize: 11, color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#cbd5e1' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: '목표',
        type: 'bar',
        data: data.map((d) => d.target),
        barGap: '15%',
        barMaxWidth: 24,
        itemStyle: { color: TARGET_COLOR, borderRadius: [3, 3, 0, 0] },
        z: 1,
      },
      {
        name: '실적',
        type: 'bar',
        data: data.map((d) => ({
          value: d.actual,
          itemStyle: {
            color: d.actual >= d.target ? OVER_COLOR : ACTUAL_COLOR,
            borderRadius: [3, 3, 0, 0],
          },
        })),
        barMaxWidth: 24,
        itemStyle: { color: ACTUAL_COLOR },
        z: 1,
        label: {
          show: true,
          position: 'top',
          fontSize: 9,
          color: '#94a3b8',
          formatter: (p: { dataIndex: number }) => {
            const d = data[p.dataIndex];
            const rate = d.target > 0 ? Math.round((d.actual / d.target) * 100) : 0;
            return `${rate}%`;
          },
        },
      },
      // Phantom series — only used for the "초과실적" legend item
      {
        name: '초과실적',
        type: 'bar',
        data: [],
        itemStyle: { color: OVER_COLOR },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 240 }}
      notMerge
      onEvents={
        onClick
          ? { click: (params: { name: string }) => onClick(params.name) }
          : undefined
      }
    />
  );
}
