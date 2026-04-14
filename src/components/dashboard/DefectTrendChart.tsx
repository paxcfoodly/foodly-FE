'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface TrendPoint {
  date: string;
  rate: number;
  prevWeekRate?: number;
}

interface DefectTrendChartProps {
  data: TrendPoint[];
  targetRate?: number;
}

export default function DefectTrendChart({ data, targetRate = 2.0 }: DefectTrendChartProps) {
  const option = {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['불량률', '전주 동기간'],
      top: 0,
      textStyle: { fontSize: 10, color: '#94a3b8' },
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: { left: 40, right: 20, top: 30, bottom: 24 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date),
      boundaryGap: false,
      axisLabel: { fontSize: 9, color: '#cbd5e1' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#cbd5e1', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: '불량률',
        type: 'line',
        data: data.map((d) => d.rate),
        lineStyle: { color: '#fb923c', width: 2 },
        itemStyle: { color: '#fb923c' },
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#e2e8f0', type: 'dashed', width: 1 },
          data: [{ yAxis: targetRate }],
          label: { formatter: `목표 ${targetRate}%`, fontSize: 9, color: '#94a3b8' },
        },
      },
      {
        name: '전주 동기간',
        type: 'line',
        data: data.map((d) => d.prevWeekRate ?? null),
        lineStyle: { color: '#cbd5e1', width: 1, type: 'dashed' },
        itemStyle: { color: '#cbd5e1' },
        smooth: true,
        symbol: 'none',
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 220 }} notMerge />;
}
