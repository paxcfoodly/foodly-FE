'use client';

import React from 'react';

type EquipStatus = 'RUNNING' | 'DOWN' | 'SETUP' | 'IDLE';

interface EquipItem {
  equipCd: string;
  equipNm: string;
  status: EquipStatus;
}

interface EquipStatusGridProps {
  data: EquipItem[];
  onClick?: (equipCd: string) => void;
}

const statusConfig: Record<EquipStatus, { bg: string; ring: string; label: string; dot: string }> = {
  RUNNING: { bg: 'bg-emerald-50 text-emerald-600 border border-emerald-200', ring: '', label: '가동', dot: 'bg-emerald-400' },
  DOWN: { bg: 'bg-rose-50 text-rose-500 border border-rose-200', ring: 'animate-pulse ring-2 ring-rose-200', label: '고장', dot: 'bg-rose-400' },
  SETUP: { bg: 'bg-amber-50 text-amber-600 border border-amber-200', ring: '', label: '셋업', dot: 'bg-amber-400' },
  IDLE: { bg: 'bg-slate-50 text-slate-400 border border-slate-200', ring: '', label: '미사용', dot: 'bg-slate-300' },
};

export default function EquipStatusGrid({ data, onClick }: EquipStatusGridProps) {
  return (
    <div>
      {/* Legend */}
      <div className="flex gap-4 mb-3">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-4 gap-2">
        {data.map((eq) => {
          const cfg = statusConfig[eq.status];
          return (
            <button
              key={eq.equipCd}
              className={`rounded-xl p-2.5 text-center text-xs font-medium ${cfg.bg} ${cfg.ring} hover:opacity-80 transition-opacity`}
              onClick={() => onClick?.(eq.equipCd)}
              title={`${eq.equipNm} - ${cfg.label}`}
            >
              <div className="font-mono text-[11px]">{eq.equipCd}</div>
              <div className="text-[10px] opacity-70 truncate">{eq.equipNm}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
