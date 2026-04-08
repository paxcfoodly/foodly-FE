'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Spin } from 'antd';
import apiClient from '@/lib/apiClient';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

const STATUS_COLORS: Record<string, string> = {
  RUN: '#52c41a',
  IDLE: '#fa8c16',
  DOWN: '#ff4d4f',
  SETUP: '#faad14',
};

const STATUS_LABELS: Record<string, string> = {
  RUN: '가동',
  IDLE: '비가동',
  DOWN: '고장',
  SETUP: '점검',
};

interface TimelineSegment {
  status_id: number | string;
  status_type: string;
  down_reason_cd?: string;
  start_dt: string;
  end_dt?: string;
  duration?: number;
  memo?: string;
}

interface StatusTimelineChartProps {
  equipCd: string;
  equipNm?: string;
  startDate: string;
  endDate: string;
}

export default function StatusTimelineChart({
  equipCd,
  equipNm,
  startDate,
  endDate,
}: StatusTimelineChartProps) {
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!equipCd || !startDate || !endDate) return;

    const fetchTimeline = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(
          `/v1/equip-statuses/${equipCd}/timeline?start=${startDate}&end=${endDate}`,
        );
        setSegments(res.data.data ?? []);
      } catch {
        setSegments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [equipCd, startDate, endDate]);

  if (loading) {
    return (
      <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="small" />
      </div>
    );
  }

  const yLabel = equipNm ?? equipCd;

  const seriesData = segments.map((seg) => {
    const start = new Date(seg.start_dt).getTime();
    const end = seg.end_dt ? new Date(seg.end_dt).getTime() : Date.now();
    return {
      name: STATUS_LABELS[seg.status_type] ?? seg.status_type,
      value: [0, start, end, seg.duration ?? Math.round((end - start) / 60000)],
      itemStyle: { color: STATUS_COLORS[seg.status_type] ?? '#d9d9d9' },
      status_type: seg.status_type,
      start_dt: seg.start_dt,
      end_dt: seg.end_dt,
      duration: seg.duration,
    };
  });

  const renderItem = (params: any, api: any) => {
    const categoryIndex = api.value(0);
    const start = api.coord([api.value(1), categoryIndex]);
    const end = api.coord([api.value(2), categoryIndex]);
    const height = api.size([0, 1])[1] * 0.6;

    return {
      type: 'rect',
      transition: ['shape'],
      shape: {
        x: start[0],
        y: start[1] - height / 2,
        width: Math.max(end[0] - start[0], 4),
        height,
      },
      style: api.style(),
    };
  };

  const option = {
    tooltip: {
      formatter: (params: any) => {
        const { data } = params;
        const statusLabel = STATUS_LABELS[data.status_type] ?? data.status_type;
        const start = new Date(data.start_dt).toLocaleString('ko-KR');
        const end = data.end_dt ? new Date(data.end_dt).toLocaleString('ko-KR') : '진행 중';
        const dur = data.duration != null ? `${data.duration}분` : '-';
        return `${statusLabel}<br/>시작: ${start}<br/>종료: ${end}<br/>소요: ${dur}`;
      },
    },
    grid: { left: 80, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'time',
      min: new Date(startDate).getTime(),
      max: new Date(endDate).getTime(),
    },
    yAxis: {
      type: 'category',
      data: [yLabel],
      axisLabel: { fontSize: 12 },
    },
    series: [
      {
        type: 'custom',
        renderItem,
        itemStyle: { opacity: 0.9 },
        encode: {
          x: [1, 2],
          y: 0,
        },
        data: seriesData,
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 80 }}
      notMerge
    />
  );
}
