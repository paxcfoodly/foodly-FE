'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface MtbfMttrData {
  month: string;
  mtbf: number;
  mttr: number;
}

interface MtbfMttrChartProps {
  data: MtbfMttrData[];
}

export default function MtbfMttrChart({ data }: MtbfMttrChartProps) {
  const option = {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['MTBF(시간)', 'MTTR(분)'],
      top: 0,
      textStyle: { fontSize: 10, color: '#94a3b8' },
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: { left: 45, right: 45, top: 30, bottom: 24 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.month),
      axisLabel: { fontSize: 10, color: '#cbd5e1' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: 'MTBF(h)',
        nameTextStyle: { fontSize: 9, color: '#cbd5e1' },
        axisLabel: { fontSize: 9, color: '#cbd5e1' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      {
        type: 'value',
        name: 'MTTR(min)',
        nameTextStyle: { fontSize: 9, color: '#cbd5e1' },
        axisLabel: { fontSize: 9, color: '#cbd5e1' },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
      },
    ],
    series: [
      {
        name: 'MTBF(시간)',
        type: 'line',
        data: data.map((d) => d.mtbf),
        lineStyle: { color: '#60a5fa', width: 2 },
        itemStyle: { color: '#60a5fa' },
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
      },
      {
        name: 'MTTR(분)',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => d.mttr),
        lineStyle: { color: '#fb923c', width: 2 },
        itemStyle: { color: '#fb923c' },
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 220 }} notMerge />;
}
