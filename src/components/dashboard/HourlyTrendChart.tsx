'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface HourlyData {
  hour: number;
  goodQty: number;
  defectQty: number;
  prevGoodQty: number;
}

interface HourlyTrendChartProps {
  data: HourlyData[];
  currentHour?: number;
}

export default function HourlyTrendChart({ data, currentHour }: HourlyTrendChartProps) {
  const hours = data.map((d) => `${String(d.hour).padStart(2, '0')}:00`);

  const option = {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['양품', '불량', '전일'],
      top: 0,
      textStyle: { fontSize: 10, color: '#94a3b8' },
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: { left: 40, right: 20, top: 30, bottom: 24 },
    xAxis: {
      type: 'category',
      data: hours,
      boundaryGap: false,
      axisLabel: { fontSize: 9, color: '#cbd5e1' },
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
        name: '양품',
        type: 'line',
        stack: 'production',
        data: data.map((d) => d.goodQty),
        areaStyle: { color: 'rgba(45,212,168,0.12)' },
        lineStyle: { color: '#2dd4a8', width: 2 },
        itemStyle: { color: '#2dd4a8' },
        smooth: true,
        symbol: 'none',
      },
      {
        name: '불량',
        type: 'line',
        stack: 'production',
        data: data.map((d) => d.defectQty),
        areaStyle: { color: 'rgba(244,63,94,0.08)' },
        lineStyle: { color: '#f43f5e', width: 1.5 },
        itemStyle: { color: '#f43f5e' },
        smooth: true,
        symbol: 'none',
      },
      {
        name: '전일',
        type: 'line',
        data: data.map((d) => d.prevGoodQty),
        lineStyle: { color: '#cbd5e1', width: 1, type: 'dashed' },
        itemStyle: { color: '#cbd5e1' },
        smooth: true,
        symbol: 'none',
      },
      ...(currentHour !== undefined
        ? [
            {
              type: 'line' as const,
              markLine: {
                silent: true,
                symbol: 'none',
                lineStyle: { color: '#818cf8', type: 'dashed' as const, width: 1 },
                data: [{ xAxis: `${String(currentHour).padStart(2, '0')}:00` }],
                label: { show: false },
              },
              data: [],
            },
          ]
        : []),
    ],
  };

  return <ReactECharts option={option} style={{ height: 220 }} notMerge />;
}
