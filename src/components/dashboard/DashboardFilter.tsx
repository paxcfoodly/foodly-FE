'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import Button from '@/components/ui/Button';

interface FilterOption {
  value: string;
  label: string;
}

interface DashboardFilterProps {
  date: string;
  onDateChange: (v: string) => void;
  plant: string;
  onPlantChange: (v: string) => void;
  plantOptions?: FilterOption[];
  line?: string;
  onLineChange?: (v: string) => void;
  lineOptions?: FilterOption[];
  period?: string;
  onPeriodChange?: (v: string) => void;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
}

const selectClass =
  'h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15';

export default function DashboardFilter({
  date,
  onDateChange,
  plant,
  onPlantChange,
  plantOptions = [],
  line,
  onLineChange,
  lineOptions = [],
  period,
  onPeriodChange,
  onSearch,
  onReset,
  loading,
}: DashboardFilterProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-600">기준일:</span>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className={selectClass}
        />
        <span className="text-sm text-gray-600 ml-2">공장:</span>
        <select
          value={plant}
          onChange={(e) => onPlantChange(e.target.value)}
          className={selectClass}
        >
          <option value="">전체</option>
          {plantOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {onLineChange && (
          <>
            <span className="text-sm text-gray-600 ml-2">라인:</span>
            <select
              value={line ?? ''}
              onChange={(e) => onLineChange(e.target.value)}
              className={selectClass}
            >
              <option value="">전체</option>
              {lineOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </>
        )}

        {onPeriodChange && (
          <>
            <span className="text-sm text-gray-600 ml-2">기간:</span>
            <select
              value={period ?? 'day'}
              onChange={(e) => onPeriodChange(e.target.value)}
              className={selectClass}
            >
              <option value="day">금일</option>
              <option value="week">금주</option>
              <option value="month">금월</option>
            </select>
          </>
        )}

        <Button
          variant="primary"
          icon={<Search className="w-4 h-4" />}
          onClick={onSearch}
          loading={loading}
        >
          검색
        </Button>
        <Button icon={<RotateCcw className="w-4 h-4" />} onClick={onReset}>
          초기화
        </Button>
      </div>
    </div>
  );
}
