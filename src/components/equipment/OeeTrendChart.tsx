'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface OeeTrendChartProps {
  data: Array<{ date: string; availability: number; oee: number }>;
}

export default function OeeTrendChart({ data }: OeeTrendChartProps) {
  const dates = data.map((d) => d.date);
  const oeeValues = data.map((d) => d.oee);
  const availabilityValues = data.map((d) => d.availability);

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ seriesName: string; value: number; name: string }>) => {
        const date = params[0]?.name ?? '';
        return params
          .map((p) => `${p.seriesName}: ${Number(p.value).toFixed(1)}%`)
          .join('<br/>')
          .replace(/^/, `${date}<br/>`);
      },
    },
    legend: {
      data: ['OEE', '가동률'],
      top: 0,
    },
    grid: { left: 50, right: 80, top: 40, bottom: 30, containLabel: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        name: 'OEE',
        type: 'line',
        data: oeeValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        itemStyle: { color: '#1677ff' },
        lineStyle: { color: '#1677ff', width: 2, type: 'solid' },
        markLine: {
          symbol: 'none',
          silent: true,
          data: [
            {
              yAxis: 85,
              lineStyle: { type: 'dashed', color: '#52c41a', width: 1.5 },
              label: { formatter: '목표 85%', position: 'insideEndTop', color: '#52c41a', fontSize: 11 },
            },
            {
              yAxis: 65,
              lineStyle: { type: 'dashed', color: '#ff4d4f', width: 1.5 },
              label: { formatter: '경고 65%', position: 'insideEndTop', color: '#ff4d4f', fontSize: 11 },
            },
          ],
        },
      },
      {
        name: '가동률',
        type: 'line',
        data: availabilityValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        itemStyle: { color: '#52c41a' },
        lineStyle: { color: '#52c41a', width: 2, type: 'dashed' },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 240 }} notMerge />;
}
