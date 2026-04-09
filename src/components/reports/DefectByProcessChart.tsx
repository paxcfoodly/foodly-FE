'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export interface DefectByProcessChartProps {
  data: Array<{ process_nm: string; defect_rate: number }>;
}

export default function DefectByProcessChart({ data }: DefectByProcessChartProps) {
  const processNames = data.map((d) => d.process_nm);
  const rates = data.map((d) => d.defect_rate);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p?.name ?? ''}<br/>불량률: ${Number(p?.value ?? 0).toFixed(2)}%`;
      },
    },
    grid: { left: 100, right: 60, top: 20, bottom: 30, containLabel: false },
    xAxis: {
      type: 'value',
      name: '불량률(%)',
      axisLabel: { formatter: '{value}%', fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: processNames,
      axisLabel: {
        overflow: 'truncate',
        width: 90,
        fontSize: 11,
      },
    },
    series: [
      {
        name: '불량률',
        type: 'bar',
        data: rates,
        itemStyle: { color: '#faad14' },
        barMaxWidth: 30,
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          formatter: (params: { value: number }) => `${Number(params.value).toFixed(2)}%`,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280 }} notMerge />;
}
