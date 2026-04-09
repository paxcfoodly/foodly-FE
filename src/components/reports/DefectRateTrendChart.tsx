'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export interface DefectRateTrendChartProps {
  data: Array<{ date: string; defect_rate: number }>;
}

export default function DefectRateTrendChart({ data }: DefectRateTrendChartProps) {
  const dates = data.map((d) => d.date);
  const rates = data.map((d) => d.defect_rate);

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p?.name ?? ''}<br/>불량률: ${Number(p?.value ?? 0).toFixed(2)}%`;
      },
    },
    grid: { left: 50, right: 30, top: 30, bottom: 30, containLabel: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '불량률(%)',
      axisLabel: { formatter: '{value}%', fontSize: 11 },
    },
    series: [
      {
        name: '불량률',
        type: 'line',
        data: rates,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#ff4d4f' },
        lineStyle: { color: '#ff4d4f', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 77, 79, 0.2)' },
              { offset: 1, color: 'rgba(255, 77, 79, 0)' },
            ],
          },
        },
        label: {
          show: false,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 320 }} notMerge />;
}
