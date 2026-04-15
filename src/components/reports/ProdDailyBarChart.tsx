'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface ProdDailyBarChartProps {
  data: Array<{ date: string; good_qty: number; achieve_rate: number }>;
  height?: number;
}

export default function ProdDailyBarChart({ data, height = 320 }: ProdDailyBarChartProps) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['생산량', '달성률'],
      top: 8,
      left: 'center',
      textStyle: {
        fontSize: 12,
        fontFamily: 'Pretendard Variable, Pretendard, -apple-system, sans-serif',
      },
    },
    grid: { left: 60, right: 70, top: 45, bottom: 30, containLabel: false },
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
        nameLocation: 'middle',
        nameGap: 42,
        nameRotate: 90,
        position: 'left',
        axisLabel: {
          fontSize: 12,
          fontFamily: 'Pretendard Variable, Pretendard, -apple-system, sans-serif',
        },
      },
      {
        type: 'value',
        name: '달성률(%)',
        nameLocation: 'middle',
        nameGap: 42,
        nameRotate: -90,
        min: 0,
        position: 'right',
        axisLabel: {
          formatter: '{value}%',
          fontSize: 12,
          fontFamily: 'Pretendard Variable, Pretendard, -apple-system, sans-serif',
        },
        // 좌측 수량 축의 splitLine과 다른 간격으로 그어져 시각적으로
        // 어수선해 보이는 문제를 피하려고 우측 축의 그리드는 끔.
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '생산량',
        type: 'bar',
        barMaxWidth: 28,
        data: data.map((d) => d.good_qty),
        itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
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

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
