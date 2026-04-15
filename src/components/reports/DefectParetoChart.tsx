'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export interface DefectParetoChartProps {
  data: Array<{ defect_type_nm: string; total_qty: number; cumulative_pct: number }>;
  onBarClick?: (defectTypeCd: string | null) => void;
  selectedType?: string | null;
}

export default function DefectParetoChart({
  data,
  onBarClick,
  selectedType,
}: DefectParetoChartProps) {
  const names = data.map((d) => d.defect_type_nm);
  const quantities = data.map((d) => d.total_qty);
  const cumulativePcts = data.map((d) => d.cumulative_pct);

  const barData = quantities.map((qty, idx) => ({
    value: qty,
    itemStyle: {
      color:
        selectedType && names[idx] === selectedType ? '#69b1ff' : '#1677ff',
    },
    emphasis: {
      itemStyle: {
        color: '#69b1ff',
      },
    },
  }));

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: { left: 60, right: 60, top: 20, bottom: 40, containLabel: false },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        overflow: 'truncate',
        width: 70,
        rotate: names.length > 5 ? 30 : 0,
        fontSize: 11,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '수량',
        axisLabel: { formatter: '{value}' },
      },
      {
        type: 'value',
        name: '누적%',
        min: 0,
        max: 100,
        axisLabel: { formatter: '{value}%' },
        // 좌측 수량 축의 splitLine과 다른 간격으로 그어져 시각적으로
        // 어수선해 보이는 문제를 피하려고 우측 축의 그리드는 끔.
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '불량수량',
        type: 'bar',
        data: barData,
        barMaxWidth: 40,
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          formatter: (params: { value: number }) => `${params.value}`,
        },
      },
      {
        name: '누적 비율',
        type: 'line',
        yAxisIndex: 1,
        data: cumulativePcts,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#ff4d4f' },
        lineStyle: { color: '#ff4d4f', width: 2 },
        label: {
          show: true,
          formatter: (params: { value: number }) => `${params.value}%`,
          fontSize: 10,
        },
      },
    ],
  };

  const onEvents = onBarClick
    ? {
        click: (params: { name: string }) => {
          const clicked = params.name;
          onBarClick(clicked === selectedType ? null : clicked);
        },
      }
    : undefined;

  return (
    <ReactECharts
      option={option}
      style={{ height: 280 }}
      notMerge
      onEvents={onEvents}
    />
  );
}
