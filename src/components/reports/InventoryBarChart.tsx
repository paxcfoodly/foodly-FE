'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface InventoryBarChartProps {
  data: Array<{ item_nm: string; qty: number; turnover_rate: number }>;
}

export default function InventoryBarChart({ data }: InventoryBarChartProps) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['현재고', '회전율'],
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
      data: data.map((d) => d.item_nm),
      axisLabel: {
        fontSize: 12,
        fontFamily: 'Pretendard Variable, Pretendard, -apple-system, sans-serif',
        overflow: 'truncate',
        width: 80,
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
        name: '회전율(회)',
        nameLocation: 'middle',
        nameGap: 42,
        nameRotate: -90,
        position: 'right',
        axisLabel: {
          formatter: '{value}회',
          fontSize: 12,
          fontFamily: 'Pretendard Variable, Pretendard, -apple-system, sans-serif',
        },
      },
    ],
    series: [
      {
        name: '현재고',
        type: 'bar',
        barMaxWidth: 28,
        data: data.map((d) => d.qty),
        itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
        yAxisIndex: 0,
      },
      {
        name: '회전율',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => d.turnover_rate),
        itemStyle: { color: '#faad14' },
        lineStyle: { color: '#faad14', width: 2 },
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
