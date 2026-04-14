'use client';

import React from 'react';

interface WorkOrderCardsProps {
  waiting: number;
  inProgress: number;
  completed: number;
  delayed: number;
  onClick?: (status: string) => void;
}

const blocks = [
  { key: 'WAITING', label: '대기', bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100' },
  { key: 'IN_PROGRESS', label: '진행', bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-100' },
  { key: 'COMPLETED', label: '완료', bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-100' },
  { key: 'DELAYED', label: '지연', bg: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-100' },
] as const;

export default function WorkOrderCards({
  waiting,
  inProgress,
  completed,
  delayed,
  onClick,
}: WorkOrderCardsProps) {
  const values = { WAITING: waiting, IN_PROGRESS: inProgress, COMPLETED: completed, DELAYED: delayed };

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {blocks.map((b) => (
        <button
          key={b.key}
          className={`rounded-md border ${b.border} ${b.bg} px-2 py-1.5 flex flex-col items-center hover:opacity-80 transition-opacity`}
          onClick={() => onClick?.(b.key)}
        >
          <span className={`text-base font-mono font-bold leading-none ${b.text}`}>{values[b.key]}</span>
          <span className="text-[9px] text-slate-500 mt-0.5">{b.label}</span>
        </button>
      ))}
    </div>
  );
}
