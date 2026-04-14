'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import Tag from '@/components/ui/Tag';
import Spinner from '@/components/ui/Spinner';

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
  PM: 'blue',
  CM: 'red',
  BM: 'orange',
};

function getMaintTypeColor(maint_type_cd?: string): string {
  if (!maint_type_cd) return 'blue';
  return MAINT_TYPE_COLORS[maint_type_cd] ?? 'blue';
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/* ── Component ────────────────────────────────────── */

export default function MaintenanceCalendar({
  plans,
  onDateSelect,
  loading = false,
  onMonthChange,
}: MaintenanceCalendarProps) {
  const todayStr = dayjs().format('YYYY-MM-DD');
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));

  /* Build calendar grid */
  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day(); // 0=Sun
    const totalDays = endOfMonth.date();

    const days: { date: dayjs.Dayjs; inMonth: boolean }[] = [];

    // Fill leading empty days from previous month
    for (let i = 0; i < startDay; i++) {
      days.push({ date: startOfMonth.subtract(startDay - i, 'day'), inMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      days.push({ date: currentMonth.date(d), inMonth: true });
    }

    // Fill trailing days to make complete rows
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: endOfMonth.add(i, 'day'), inMonth: false });
      }
    }

    return days;
  }, [currentMonth]);

  /* Navigate months */
  const goToPrevMonth = useCallback(() => {
    const prev = currentMonth.subtract(1, 'month');
    setCurrentMonth(prev);
    const start = prev.startOf('month').format('YYYY-MM-DD');
    const end = prev.endOf('month').format('YYYY-MM-DD');
    onMonthChange?.(start, end);
  }, [currentMonth, onMonthChange]);

  const goToNextMonth = useCallback(() => {
    const next = currentMonth.add(1, 'month');
    setCurrentMonth(next);
    const start = next.startOf('month').format('YYYY-MM-DD');
    const end = next.endOf('month').format('YYYY-MM-DD');
    onMonthChange?.(start, end);
  }, [currentMonth, onMonthChange]);

  /* Handle date cell click */
  const handleDateClick = useCallback(
    (date: dayjs.Dayjs) => {
      const dateStr = date.format('YYYY-MM-DD');
      const dayPlans = plans.filter((p) => p.next_plan_date === dateStr);
      onDateSelect(dateStr, dayPlans);
    },
    [plans, onDateSelect],
  );

  return (
    <Spinner spinning={loading}>
      <div className="bg-white rounded-xl shadow-sm p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-base font-semibold text-gray-900">
            {currentMonth.format('YYYY년 MM월')}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {DAY_LABELS.map((label, idx) => (
            <div
              key={label}
              className={`text-center text-xs font-medium py-2 ${
                idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-px">
          {calendarDays.map((item, idx) => {
            const dateStr = item.date.format('YYYY-MM-DD');
            const dayPlans = plans.filter((p) => p.next_plan_date === dateStr);
            const isToday = dateStr === todayStr;
            const isOverdue = dateStr < todayStr && dayPlans.length > 0;
            const isWeekend = item.date.day() === 0 || item.date.day() === 6;

            return (
              <div
                key={idx}
                onClick={() => handleDateClick(item.date)}
                className={`
                  min-h-[80px] p-1 border border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors
                  ${!item.inMonth ? 'bg-gray-50/50' : ''}
                  ${isToday ? 'ring-2 ring-cyan-accent/30 ring-inset' : ''}
                `}
              >
                <div
                  className={`text-xs mb-1 ${
                    !item.inMonth
                      ? 'text-gray-300'
                      : isToday
                        ? 'font-bold text-cyan-accent'
                        : isWeekend
                          ? item.date.day() === 0
                            ? 'text-red-500'
                            : 'text-blue-500'
                          : 'text-gray-700'
                  }`}
                >
                  {item.date.date()}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {dayPlans.slice(0, 3).map((plan) => (
                    <div key={plan.maint_plan_id}>
                      {isOverdue ? (
                        <Tag color="red" className="text-[10px] !px-1 !py-0">점검 지연</Tag>
                      ) : (
                        <Tag color={getMaintTypeColor(plan.maint_type_cd)} className="text-[10px] !px-1 !py-0">
                          {truncate(plan.plan_nm, 8)}
                        </Tag>
                      )}
                    </div>
                  ))}
                  {dayPlans.length > 3 && (
                    <div className="text-[10px] text-gray-400">+{dayPlans.length - 3}건</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Spinner>
  );
}
