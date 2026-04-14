'use client';

import React, { useState, useEffect } from 'react';

/* ── Types ── */
type EquipStatus = 'RUNNING' | 'DOWN' | 'SETUP' | 'IDLE';

interface AndonEquip {
  equipCd: string;
  equipNm: string;
  status: EquipStatus;
}

interface LineData {
  lineId: string;
  lineName: string;
  itemName: string;
  targetQty: number;
  actualQty: number;
  defectCount: number;
  defectRate: number;
  availabilityRate: number;
  shift: string;
  equipment: AndonEquip[];
}

/* ── Demo Data ── */
const DEMO_LINES: LineData[] = [
  {
    lineId: 'line-1',
    lineName: '라인 1 - 조립',
    itemName: '하우징 어셈블리 A',
    targetQty: 300,
    actualQty: 262,
    defectCount: 6,
    defectRate: 2.2,
    availabilityRate: 95.0,
    shift: 'A조',
    equipment: [
      { equipCd: 'EQ-001', equipNm: 'CNC 선반 1', status: 'RUNNING' },
      { equipCd: 'EQ-002', equipNm: 'CNC 선반 2', status: 'RUNNING' },
      { equipCd: 'EQ-005', equipNm: '용접기 1', status: 'SETUP' },
      { equipCd: 'EQ-006', equipNm: '용접기 2', status: 'RUNNING' },
    ],
  },
  {
    lineId: 'line-2',
    lineName: '라인 2 - 성형',
    itemName: '커넥터 브라켓 B',
    targetQty: 250,
    actualQty: 230,
    defectCount: 8,
    defectRate: 3.4,
    availabilityRate: 88.5,
    shift: 'A조',
    equipment: [
      { equipCd: 'EQ-009', equipNm: '사출기 1', status: 'RUNNING' },
      { equipCd: 'EQ-010', equipNm: '사출기 2', status: 'IDLE' },
      { equipCd: 'EQ-003', equipNm: '프레스 A', status: 'DOWN' },
      { equipCd: 'EQ-004', equipNm: '프레스 B', status: 'RUNNING' },
    ],
  },
  {
    lineId: 'line-3',
    lineName: '라인 3 - 도장',
    itemName: '외장 패널 C',
    targetQty: 200,
    actualQty: 185,
    defectCount: 3,
    defectRate: 1.6,
    availabilityRate: 96.4,
    shift: 'B조',
    equipment: [
      { equipCd: 'EQ-007', equipNm: '도장기', status: 'RUNNING' },
      { equipCd: 'EQ-008', equipNm: '건조로', status: 'RUNNING' },
      { equipCd: 'EQ-017', equipNm: '연삭기', status: 'RUNNING' },
    ],
  },
];

/* ── Status config (light theme) ── */
const statusStyle: Record<EquipStatus, { bg: string; text: string; ring: string }> = {
  RUNNING: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600', ring: '' },
  DOWN: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-600', ring: 'animate-pulse ring-2 ring-rose-200' },
  SETUP: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600', ring: '' },
  IDLE: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-400', ring: '' },
};
const statusLabel: Record<EquipStatus, string> = { RUNNING: '가동', DOWN: '고장', SETUP: '셋업', IDLE: '미사용' };

function rateColor(rate: number): string {
  if (rate >= 90) return 'text-emerald-600';
  if (rate >= 70) return 'text-amber-500';
  return 'text-rose-500';
}

function barColor(rate: number): string {
  if (rate >= 90) return 'bg-emerald-400';
  if (rate >= 70) return 'bg-amber-400';
  return 'bg-rose-400';
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function AndonLine({ line }: { line: LineData }) {
  const rate = line.targetQty > 0 ? Math.round((line.actualQty / line.targetQty) * 1000) / 10 : 0;
  const hasDown = line.equipment.some((e) => e.status === 'DOWN');

  return (
    <div className={`flex flex-col h-full rounded-2xl border ${hasDown ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'} bg-white overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-100">
        <span className="text-slate-800 text-xl font-bold">{line.lineName}</span>
        <span className="text-slate-500 text-sm">{line.itemName}</span>
      </div>

      {/* Main KPI */}
      <div className="flex-[35] flex items-center justify-center gap-10 px-6 py-8">
        <div className="text-center">
          <div className="text-slate-400 text-sm mb-1">목표수량</div>
          <div className="text-slate-800 font-mono text-6xl font-bold tabular-nums">
            {line.targetQty.toLocaleString()}
          </div>
        </div>
        <div className="w-px h-20 bg-slate-200" />
        <div className="text-center">
          <div className="text-slate-400 text-sm mb-1">실적수량</div>
          <div className="text-emerald-600 font-mono text-6xl font-bold tabular-nums">
            {line.actualQty.toLocaleString()}
          </div>
        </div>
        <div className="w-px h-20 bg-slate-200" />
        <div className="text-center">
          <div className="text-slate-400 text-sm mb-1">달성률</div>
          <div className={`font-mono text-6xl font-bold tabular-nums ${rateColor(rate)}`}>
            {rate}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 pb-4">
        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor(rate)}`}
            style={{ width: `${Math.min(rate, 100)}%` }}
          />
        </div>
      </div>

      {/* Equipment status */}
      <div className="px-6 py-4 border-t border-slate-100">
        <div className="grid grid-cols-4 gap-3">
          {line.equipment.map((eq) => {
            const s = statusStyle[eq.status];
            return (
              <div
                key={eq.equipCd}
                className={`rounded-xl border p-3 text-center ${s.bg} ${s.ring}`}
              >
                <div className={`text-xs font-semibold ${s.text}`}>{statusLabel[eq.status]}</div>
                <div className="text-sm font-medium text-slate-700 mt-1">{eq.equipNm}</div>
                <div className="text-[10px] text-slate-400">{eq.equipCd}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom info */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-100">
        <span className="text-slate-500 text-sm">
          불량 <span className="font-mono font-bold text-rose-500">{line.defectCount}건</span>
          <span className="text-slate-300 mx-2">|</span>
          불량률 <span className="font-mono font-bold text-rose-500">{line.defectRate}%</span>
        </span>
        <span className="text-slate-500 text-sm">
          가동률 <span className="font-mono font-bold text-emerald-600">{line.availabilityRate}%</span>
        </span>
        <span className="text-slate-500 text-sm">
          근무조: <span className="font-bold text-slate-700">{line.shift}</span>
        </span>
      </div>
    </div>
  );
}

export default function AndonPage() {
  const clock = useClock();
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % DEMO_LINES.length);
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const currentLine = DEMO_LINES[currentIdx];
  const timeStr = clock.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-4 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-slate-800">현장 안돈 (Andon)</h4>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {DEMO_LINES.map((l, i) => (
              <button
                key={l.lineId}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                  i === currentIdx
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setCurrentIdx(i)}
              >
                {l.lineName.split(' - ')[0]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Live</span>
          </div>
          <span className="text-slate-700 font-mono text-xl tabular-nums">{timeStr}</span>
        </div>
      </div>

      {/* Andon display */}
      <div className="flex-1">
        <AndonLine line={currentLine} />
      </div>

      {/* Auto-rotate indicator */}
      <div className="flex justify-center gap-2 mt-3">
        {DEMO_LINES.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === currentIdx ? 'bg-blue-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
