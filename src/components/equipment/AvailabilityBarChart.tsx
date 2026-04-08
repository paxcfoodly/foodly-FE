'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface AvailabilityBarChartProps {
  data: Array<{ equip_nm: string; availability: number }>;
}

function getBarColor(value: number): string {
  if (value >= 85) return '#52c41a';
  if (value >= 65) return '#faad14';
  return '#ff4d4f';
}

export default function AvailabilityBarChart({ data }: AvailabilityBarChartProps) {
  const equipNames = data.map((d) => d.equip_nm);
  const seriesData = data.map((d) => ({
    value: d.availability,
    itemStyle: { color: getBarColor(d.availability) },
  }));

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p.name}<br/>가동률: ${Number(p.value).toFixed(1)}%`;
      },
    },
    grid: { left: 120, right: 40, top: 20, bottom: 30, containLabel: false },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    yAxis: {
      type: 'category',
      data: equipNames,
      axisLabel: {
        fontSize: 12,
        overflow: 'truncate',
        width: 110,
      },
    },
    series: [
      {
        type: 'bar',
        data: seriesData,
        label: {
          show: true,
          position: 'right',
          formatter: (params: { value: number }) => `${Number(params.value).toFixed(1)}%`,
          fontSize: 11,
        },
        barMaxWidth: 24,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280 }} notMerge />;
}
