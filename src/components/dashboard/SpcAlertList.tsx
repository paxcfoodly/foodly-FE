'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SpcAlert {
  itemName: string;
  inspectItem: string;
  value: number;
  time: string;
}

interface SpcAlertListProps {
  data: SpcAlert[];
  onClick?: (alert: SpcAlert) => void;
}

export default function SpcAlertList({ data, onClick }: SpcAlertListProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-green-600">
        <span className="text-sm font-medium">이상 없음</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[260px] overflow-y-auto">
      {data.map((a, i) => (
        <button
          key={i}
          className="w-full flex items-start gap-2.5 p-2.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
          onClick={() => onClick?.(a)}
        >
          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-800">{a.itemName}</div>
            <div className="text-[11px] text-gray-500">
              {a.inspectItem}: <span className="font-mono text-red-600 font-medium">{a.value}</span>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">{a.time}</span>
        </button>
      ))}
    </div>
  );
}
