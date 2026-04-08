'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface HistogramChartProps {
  bins: Array<{ bin: string; count: number }>;
  lsl: number | null;
  usl: number | null;
}

export default function HistogramChart({ bins, lsl, usl }: HistogramChartProps) {
  const markLineData: Array<{
    xAxis: number;
    lineStyle: { type: string; color: string };
    label: { formatter: string };
  }> = [];

  if (lsl !== null) {
    // Find bin index closest to LSL
    const lslIdx = bins.findIndex((b) => {
      const [low] = b.bin.split('-').map(Number);
      return low >= lsl;
    });
    const lslBinIndex = lslIdx >= 0 ? lslIdx : 0;
    markLineData.push({
      xAxis: lslBinIndex,
      lineStyle: { type: 'dashed', color: '#ff4d4f' },
      label: { formatter: 'LSL' },
    });
  }

  if (usl !== null) {
    const uslIdx = bins.findIndex((b) => {
      const parts = b.bin.split('-');
      const high = Number(parts[parts.length - 1]);
      return high >= usl;
    });
    const uslBinIndex = uslIdx >= 0 ? uslIdx : bins.length - 1;
    markLineData.push({
      xAxis: uslBinIndex,
      lineStyle: { type: 'dashed', color: '#ff4d4f' },
      label: { formatter: 'USL' },
    });
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `구간: ${p.name}<br/>빈도: ${p.value}`;
      },
    },
    grid: { left: '5%', right: '8%', top: '15%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: bins.map((b) => b.bin),
      name: '측정값',
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '빈도',
    },
    series: [
      {
        type: 'bar',
        data: bins.map((b) => b.count),
        itemStyle: { color: 'rgba(22,119,255,0.7)' },
        ...(markLineData.length > 0
          ? {
              markLine: {
                symbol: 'none',
                silent: true,
                data: markLineData,
              },
            }
          : {}),
      },
    ],
  };

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>히스토그램</div>
      <ReactECharts option={option} style={{ height: 300 }} />
    </div>
  );
}
