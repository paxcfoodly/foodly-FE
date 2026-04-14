'use client';

import React, { useMemo } from 'react';
import Tag from '@/components/ui/Tag';
import Tooltip from '@/components/ui/Tooltip';
import Empty from '@/components/ui/Empty';
import dayjs, { type Dayjs } from 'dayjs';

/* ── Types ─────────────────────────────────────────── */

export interface GanttPlan {
  plan_id: number;
  plan_no: string;
  plant_cd: string;
  item_cd: string;
  plan_qty: number | null;
  due_date: string;
  priority: number;
  status: string;
  create_dt: string;
  item?: { item_nm: string } | null;
  plant?: { plant_nm: string } | null;
}

/* ── Status config ─── */

const STATUS_COLOR: Record<string, string> = {
  PLAN: '#1677ff',
  CONFIRMED: '#52c41a',
  PROGRESS: '#fa8c16',
  COMPLETE: '#13c2c2',
  CANCEL: '#ff4d4f',
};

const STATUS_LABEL: Record<string, string> = {
  PLAN: '계획',
  CONFIRMED: '확정',
  PROGRESS: '진행',
  COMPLETE: '완료',
  CANCEL: '취소',
};

const STATUS_TAG_COLOR: Record<string, string> = {
  PLAN: 'blue',
  CONFIRMED: 'green',
  PROGRESS: 'orange',
  COMPLETE: 'cyan',
  CANCEL: 'red',
};

const STATUS_PROGRESS: Record<string, number> = {
  PLAN: 0.15,
  CONFIRMED: 0.4,
  PROGRESS: 0.7,
  COMPLETE: 1.0,
  CANCEL: 0,
};

/* ── Helpers ─── */

function getDateRange(plans: GanttPlan[]): { start: Dayjs; end: Dayjs; totalDays: number } {
  if (plans.length === 0) {
    const now = dayjs();
    return { start: now, end: now.add(30, 'day'), totalDays: 30 };
  }

  const allDates: Dayjs[] = [];
  plans.forEach((p) => {
    allDates.push(dayjs(p.create_dt));
    allDates.push(dayjs(p.due_date));
  });

  let start = allDates[0];
  let end = allDates[0];
  allDates.forEach((d) => {
    if (d.isBefore(start)) start = d;
    if (d.isAfter(end)) end = d;
  });

  // Pad 2 days on each side
  start = start.subtract(2, 'day');
  end = end.add(2, 'day');
  const totalDays = end.diff(start, 'day') || 1;

  return { start, end, totalDays };
}

function generateDateHeaders(start: Dayjs, totalDays: number): { label: string; isMonthStart: boolean; date: Dayjs }[] {
  const headers: { label: string; isMonthStart: boolean; date: Dayjs }[] = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = start.add(i, 'day');
    headers.push({
      label: d.format('DD'),
      isMonthStart: d.date() === 1,
      date: d,
    });
  }
  return headers;
}

/* ── Component ─────────────────────────────────────── */

interface GanttChartProps {
  plans: GanttPlan[];
}

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 220;
const DAY_WIDTH = 32;

export default function GanttChart({ plans }: GanttChartProps) {
  const { start, totalDays } = useMemo(() => getDateRange(plans), [plans]);
  const dateHeaders = useMemo(() => generateDateHeaders(start, totalDays), [start, totalDays]);

  // Group months for header
  const monthHeaders = useMemo(() => {
    const months: { label: string; span: number }[] = [];
    let currentMonth = '';
    dateHeaders.forEach((h) => {
      const m = h.date.format('YYYY-MM');
      if (m !== currentMonth) {
        months.push({ label: h.date.format('YYYY년 MM월'), span: 1 });
        currentMonth = m;
      } else {
        months[months.length - 1].span += 1;
      }
    });
    return months;
  }, [dateHeaders]);

  const chartWidth = dateHeaders.length * DAY_WIDTH;

  if (plans.length === 0) {
    return <Empty description="표시할 생산계획이 없습니다." />;
  }

  return (
    <div className="overflow-x-auto border border-gray-100 rounded-lg bg-white">
      <div className="flex" style={{ minWidth: LABEL_WIDTH + chartWidth }}>
        {/* Left labels */}
        <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }} className="border-r border-gray-100 shrink-0">
          {/* Month header spacer */}
          <div className="h-7 border-b border-gray-100 bg-gray-50" />
          {/* Day header spacer */}
          <div className="h-7 border-b border-gray-200 bg-gray-50 px-3 leading-7 font-semibold text-xs text-gray-500">
            계획
          </div>
          {/* Row labels */}
          {plans.map((p) => (
            <div
              key={p.plan_id}
              style={{ height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px` }}
              className="px-3 border-b border-gray-50 overflow-hidden text-ellipsis whitespace-nowrap text-xs"
            >
              <Tag color={STATUS_TAG_COLOR[p.status] ?? 'gray'} className="mr-1.5 !text-[10px]">
                {STATUS_LABEL[p.status] ?? p.status}
              </Tag>
              <span title={`${p.plan_no} · ${p.item?.item_nm ?? p.item_cd}`}>
                {p.item?.item_nm ?? p.item_cd}
              </span>
            </div>
          ))}
        </div>

        {/* Right chart area */}
        <div className="flex-1 overflow-hidden">
          {/* Month header */}
          <div className="flex h-7 bg-gray-50 border-b border-gray-100">
            {monthHeaders.map((m, idx) => (
              <div
                key={idx}
                style={{ width: m.span * DAY_WIDTH, minWidth: m.span * DAY_WIDTH }}
                className="text-center text-[11px] font-semibold leading-7 text-gray-700 border-r border-gray-100"
              >
                {m.span >= 3 ? m.label : ''}
              </div>
            ))}
          </div>

          {/* Day header */}
          <div className="flex h-7 bg-gray-50 border-b border-gray-200">
            {dateHeaders.map((h, idx) => {
              const isWeekend = h.date.day() === 0 || h.date.day() === 6;
              return (
                <div
                  key={idx}
                  style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                  className={`text-center text-[10px] leading-7 ${
                    isWeekend ? 'text-red-500' : 'text-gray-500'
                  } ${h.isMonthStart ? 'border-r border-gray-300' : 'border-r border-gray-50'} ${
                    h.date.day() === 1 ? 'font-semibold' : ''
                  }`}
                >
                  {h.label}
                </div>
              );
            })}
          </div>

          {/* Bars */}
          {plans.map((p) => {
            const planStart = dayjs(p.create_dt);
            const planEnd = dayjs(p.due_date);
            const offsetDays = planStart.diff(start, 'day');
            const durationDays = Math.max(planEnd.diff(planStart, 'day'), 1);

            const left = offsetDays * DAY_WIDTH;
            const width = durationDays * DAY_WIDTH;
            const barColor = STATUS_COLOR[p.status] ?? '#1677ff';
            const progress = STATUS_PROGRESS[p.status] ?? 0;

            return (
              <div
                key={p.plan_id}
                className="relative border-b border-gray-50"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {dateHeaders.map((h, idx) => (
                    <div
                      key={idx}
                      style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                      className={`${
                        h.isMonthStart ? 'border-r border-gray-200' : 'border-r border-gray-50/50'
                      } ${h.date.day() === 0 || h.date.day() === 6 ? 'bg-black/[0.015]' : ''}`}
                    />
                  ))}
                </div>

                {/* Bar */}
                <Tooltip
                  title={
                    <div className="text-xs">
                      <div><strong>{p.plan_no}</strong></div>
                      <div>품목: {p.item?.item_nm ?? p.item_cd}</div>
                      <div>수량: {p.plan_qty?.toLocaleString() ?? '-'}</div>
                      <div>기간: {planStart.format('MM/DD')} ~ {planEnd.format('MM/DD')}</div>
                      <div>상태: {STATUS_LABEL[p.status] ?? p.status}</div>
                    </div>
                  }
                >
                  <div
                    className="absolute cursor-pointer z-[1] rounded overflow-hidden"
                    style={{
                      top: 6,
                      left,
                      width: Math.max(width, DAY_WIDTH),
                      height: ROW_HEIGHT - 12,
                      background: `${barColor}22`,
                      border: `1px solid ${barColor}66`,
                    }}
                  >
                    {/* Progress fill */}
                    <div
                      className="h-full rounded-l"
                      style={{
                        width: `${progress * 100}%`,
                        background: `${barColor}55`,
                      }}
                    />
                    {/* Label on bar */}
                    {width >= DAY_WIDTH * 3 && (
                      <div
                        className="absolute top-0 left-1.5 right-1.5 h-full text-[11px] font-medium text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{ lineHeight: `${ROW_HEIGHT - 12}px` }}
                      >
                        {p.plan_no}
                      </div>
                    )}
                  </div>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
