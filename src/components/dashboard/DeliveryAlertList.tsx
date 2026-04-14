'use client';

import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface DelayItem {
  woNo: string;
  itemName: string;
  delayDays: number;
}

interface DeliveryAlertListProps {
  data: DelayItem[];
  onClick?: (woNo: string) => void;
}

export default function DeliveryAlertList({ data, onClick }: DeliveryAlertListProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-green-600">
        <CheckCircle className="w-8 h-8 mb-2" />
        <span className="text-sm font-medium">지연 없음</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[220px] overflow-y-auto">
      {data.map((item) => (
        <button
          key={item.woNo}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors text-left"
          onClick={() => onClick?.(item.woNo)}
        >
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-gray-700">{item.woNo}</div>
            <div className="text-xs text-gray-500 truncate">{item.itemName}</div>
          </div>
          <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
            {item.delayDays}일 지연
          </span>
        </button>
      ))}
    </div>
  );
}
