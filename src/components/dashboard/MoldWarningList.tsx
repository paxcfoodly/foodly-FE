'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface MoldItem {
  moldCd: string;
  currentShots: number;
  warrantyShots: number;
}

interface MoldWarningListProps {
  data: MoldItem[];
}

export default function MoldWarningList({ data }: MoldWarningListProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-green-600">
        <span className="text-sm font-medium">경고 금형 없음</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[220px] overflow-y-auto">
      {data.map((m) => {
        const ratio = m.warrantyShots > 0 ? m.currentShots / m.warrantyShots : 0;
        const pct = Math.round(ratio * 100);
        const isRed = pct >= 90;
        return (
          <div
            key={m.moldCd}
            className={`flex items-center gap-3 p-2.5 rounded-lg ${isRed ? 'bg-red-50' : 'bg-yellow-50'}`}
          >
            <AlertTriangle className={`w-4 h-4 shrink-0 ${isRed ? 'text-red-500' : 'text-yellow-500'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-gray-700">{m.moldCd}</div>
              <div className="text-[11px] text-gray-500">
                {m.currentShots.toLocaleString()} / {m.warrantyShots.toLocaleString()} 타
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isRed ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
