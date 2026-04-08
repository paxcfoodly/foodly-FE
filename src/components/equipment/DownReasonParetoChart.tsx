'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface DownReasonParetoChartProps {
  data: Array<{ reason_nm: string; total_minutes: number }>;
}

export default function DownReasonParetoChart({ data }: DownReasonParetoChartProps) {
  const reasons = data.map((d) => d.reason_nm);
  const minutes = data.map((d) => d.total_minutes);

  const total = minutes.reduce((sum, v) => sum + v, 0);
  let cumulative = 0;
  const cumulativePct = minutes.map((v) => {
    cumulative += v;
    return total > 0 ? Math.round((cumulative / total) * 1000) / 10 : 0;
  });

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: { left: 60, right: 60, top: 20, bottom: 40, containLabel: false },
    xAxis: {
      type: 'category',
      data: reasons,
      axisLabel: {
        overflow: 'truncate',
        width: 70,
        rotate: reasons.length > 5 ? 30 : 0,
        fontSize: 11,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '분',
        axisLabel: { formatter: '{value}분' },
      },
      {
        type: 'value',
        name: '누적%',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%' },
      },
    ],
    series: [
      {
        name: '비가동 시간',
        type: 'bar',
        data: minutes,
        itemStyle: { color: '#ff4d4f' },
        barMaxWidth: 40,
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          formatter: (params: { value: number }) => `${params.value}분`,
        },
      },
      {
        name: '누적 비율',
        type: 'line',
        yAxisIndex: 1,
        data: cumulativePct,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#1677ff' },
        lineStyle: { color: '#1677ff', width: 2 },
        label: {
          show: true,
          formatter: (params: { value: number }) => `${params.value}%`,
          fontSize: 10,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280 }} notMerge />;
}
