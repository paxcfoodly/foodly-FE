'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface SpcChartProps {
  title: string;
  data: number[];
  ucl: number;
  lcl: number;
  centerLine: number;
  labels: string[];
}

export default function SpcChart({ title, data, ucl, lcl, centerLine, labels }: SpcChartProps) {
  const yAxisName = title === 'X-bar 관리도' ? '평균값' : '범위(R)';

  const seriesData = data.map((value) => ({
    value,
    symbolSize: value > ucl || value < lcl ? 6 : 4,
    itemStyle: {
      color: value > ucl || value < lcl ? '#ff4d4f' : '#1677ff',
    },
  }));

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ dataIndex: number; value: number }>) => {
        const p = params[0];
        return `서브그룹 ${p.dataIndex + 1}<br/>값: ${Number(p.value).toFixed(4)}`;
      },
    },
    grid: { left: '5%', right: '8%', top: '15%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      name: '서브그룹',
      nameLocation: 'end',
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
    },
    series: [
      {
        type: 'line',
        data: seriesData,
        markLine: {
          symbol: 'none',
          silent: true,
          data: [
            {
              yAxis: ucl,
              lineStyle: { type: 'dashed', color: '#ff4d4f' },
              label: { formatter: `UCL: ${ucl.toFixed(4)}`, position: 'end' },
            },
            {
              yAxis: centerLine,
              lineStyle: { type: 'solid', color: '#1677ff' },
              label: { formatter: `CL: ${centerLine.toFixed(4)}`, position: 'end' },
            },
            {
              yAxis: lcl,
              lineStyle: { type: 'dashed', color: '#ff4d4f' },
              label: { formatter: `LCL: ${lcl.toFixed(4)}`, position: 'end' },
            },
          ],
        },
      },
    ],
  };

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{title}</div>
      <ReactECharts option={option} style={{ height: 400 }} />
    </div>
  );
}
