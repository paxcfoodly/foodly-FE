'use client';

import React, { useCallback } from 'react';
import { Calendar, Tag, Badge, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import type { CellRenderInfo } from 'rc-picker/lib/interface';
import dayjs from 'dayjs';

/* ── Types ─────────────────────────────────────────── */

export interface MaintPlanCalendarItem {
  maint_plan_id: number;
  equip_cd: string;
  plan_nm: string;
  maint_type_cd?: string;
  next_plan_date: string;
  equipment: { equip_nm: string };
  assignee?: { worker_nm: string } | null;
}

export interface MaintenanceCalendarProps {
  plans: MaintPlanCalendarItem[];
  onDateSelect: (date: string, plans: MaintPlanCalendarItem[]) => void;
  loading?: boolean;
  onMonthChange?: (start: string, end: string) => void;
}

/* ── Helpers ─────────────────────────────────────────── */

const MAINT_TYPE_COLORS: Record<string, string> = {
  PM: '#1677ff',
  CM: '#ff4d4f',
  BM: '#faad14',
};

function getMaintTypeColor(maint_type_cd?: string): string {
  if (!maint_type_cd) return '#1677ff';
  return MAINT_TYPE_COLORS[maint_type_cd] ?? '#1677ff';
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

/* ── Component ────────────────────────────────────── */

export default function MaintenanceCalendar({
  plans,
  onDateSelect,
  loading = false,
  onMonthChange,
}: MaintenanceCalendarProps) {
  const today = dayjs().format('YYYY-MM-DD');

  /* Render date cell with plan tags */
  const cellRender = useCallback(
    (value: Dayjs, info: CellRenderInfo<Dayjs>) => {
      if (info.type !== 'date') return info.originNode;

      const dateStr = value.format('YYYY-MM-DD');
      const dayPlans = plans.filter((p) => p.next_plan_date === dateStr);

      if (dayPlans.length === 0) return info.originNode;

      const isOverdue = dateStr < today;

      return (
        <div className="ant-picker-cell-inner ant-picker-calendar-date">
          <div className="ant-picker-calendar-date-value">{value.date()}</div>
          <div
            className="ant-picker-calendar-date-content"
            style={{ overflow: 'hidden' }}
          >
            {dayPlans.map((plan) => {
              if (isOverdue) {
                return (
                  <div key={plan.maint_plan_id} style={{ marginBottom: 2 }}>
                    <Tag
                      color="red"
                      style={{ fontSize: 11, padding: '0 4px', marginRight: 0 }}
                    >
                      점검 지연
                    </Tag>
                  </div>
                );
              }
              return (
                <div key={plan.maint_plan_id} style={{ marginBottom: 2 }}>
                  <Tag
                    color={getMaintTypeColor(plan.maint_type_cd)}
                    style={{ fontSize: 11, padding: '0 4px', marginRight: 0 }}
                  >
                    {truncate(plan.plan_nm, 8)}
                  </Tag>
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [plans, today],
  );

  /* Handle panel change (month navigation) */
  const handlePanelChange = useCallback(
    (value: Dayjs) => {
      const start = value.startOf('month').format('YYYY-MM-DD');
      const end = value.endOf('month').format('YYYY-MM-DD');
      onMonthChange?.(start, end);
    },
    [onMonthChange],
  );

  /* Handle date cell click */
  const handleSelect = useCallback(
    (date: Dayjs) => {
      const dateStr = date.format('YYYY-MM-DD');
      const dayPlans = plans.filter((p) => p.next_plan_date === dateStr);
      onDateSelect(dateStr, dayPlans);
    },
    [plans, onDateSelect],
  );

  return (
    <Spin spinning={loading}>
      <Calendar
        mode="month"
        cellRender={cellRender}
        onPanelChange={handlePanelChange}
        onSelect={handleSelect}
        fullscreen
      />
    </Spin>
  );
}
