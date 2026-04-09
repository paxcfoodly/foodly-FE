'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface ProdDailyBarChartProps {
  data: Array<{ date: string; good_qty: number; achieve_rate: number }>;
}

export default function ProdDailyBarChart({ data }: ProdDailyBarChartProps) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['생산량', '달성률'],
      textStyle: {
        fontSize: 12,
        fontFamily: 'Pretendard Variable, Pretendard, -apple-system, sans-serif',
      },
    },
    grid: { left: 60, right: 70, top: 40, bottom: 30, containLabel: false },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date),
      axisLabel: {
        fontSize: 12,
        fontFamily: 'Pretendard Variable, Pretendard, -apple-system, sans-serif',
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '수량',
        position: 'left',
        axisLabel: {
          fontSize: 12,
          fontFamily: 'Pretendard Variable, Pretendard, -apple-system, sans-serif',
        },
      },
      {
        type: 'value',
        name: '달성률(%)',
        min: 0,
        max: 100,
        position: 'right',
        axisLabel: {
          formatter: '{value}%',
          fontSize: 12,
          fontFamily: 'Pretendard Variable, Pretendard, -apple-system, sans-serif',
        },
      },
    ],
    series: [
      {
        name: '생산량',
        type: 'bar',
        data: data.map((d) => d.good_qty),
        itemStyle: { color: '#1677ff' },
        yAxisIndex: 0,
      },
      {
        name: '달성률',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => d.achieve_rate),
        itemStyle: { color: '#52c41a' },
        lineStyle: { color: '#52c41a', width: 2 },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
    textStyle: {
      fontFamily: 'Pretendard Variable, Pretendard, -apple-system, sans-serif',
      fontSize: 12,
    },
  };

  return <ReactECharts option={option} style={{ height: 320 }} notMerge />;
}
