'use client';

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Activity, AlertOctagon, Wrench } from 'lucide-react';
import DashboardFilter from '@/components/dashboard/DashboardFilter';
import KpiCard from '@/components/dashboard/KpiCard';
import OeeTripleGauge from '@/components/dashboard/OeeTripleGauge';
import AvailabilityBarChart from '@/components/equipment/AvailabilityBarChart';
import DowntimeDonutChart from '@/components/dashboard/DowntimeDonutChart';
import MtbfMttrChart from '@/components/dashboard/MtbfMttrChart';
import MoldWarningList from '@/components/dashboard/MoldWarningList';

/* ── Demo Data ── */
const DEMO_AVAIL_BAR = [
  { equip_nm: 'CNC 선반 1', availability: 95.2 },
  { equip_nm: 'CNC 선반 2', availability: 92.8 },
  { equip_nm: '프레스 A', availability: 45.0 },
  { equip_nm: '프레스 B', availability: 88.5 },
  { equip_nm: '용접기 1', availability: 78.3 },
  { equip_nm: '용접기 2', availability: 93.1 },
  { equip_nm: '도장기', availability: 96.4 },
  { equip_nm: '사출기 1', availability: 91.0 },
  { equip_nm: '검사기 1', availability: 97.5 },
  { equip_nm: '포장기 A', availability: 94.2 },
];

const DEMO_DOWNTIME = [
  { reason: '고장', minutes: 185 },
  { reason: '셋업', minutes: 120 },
  { reason: '자재대기', minutes: 75 },
  { reason: '계획정지', minutes: 60 },
];

const DEMO_MTBF_MTTR = [
  { month: '2025/11', mtbf: 120, mttr: 45 },
  { month: '2025/12', mtbf: 135, mttr: 38 },
  { month: '2026/01', mtbf: 128, mttr: 42 },
  { month: '2026/02', mtbf: 142, mttr: 35 },
  { month: '2026/03', mtbf: 155, mttr: 30 },
  { month: '2026/04', mtbf: 148, mttr: 32 },
];

const DEMO_MAINT_COST = [
  { month: '11월', cost: 2800 },
  { month: '12월', cost: 3200 },
  { month: '1월', cost: 2500 },
  { month: '2월', cost: 2900 },
  { month: '3월', cost: 3100 },
  { month: '4월', cost: 2700 },
];

const DEMO_MOLD = [
  { moldCd: 'MLD-001', currentShots: 46000, warrantyShots: 50000 },
  { moldCd: 'MLD-003', currentShots: 44000, warrantyShots: 50000 },
  { moldCd: 'MLD-007', currentShots: 27500, warrantyShots: 30000 },
];

const cardCls = 'bg-white rounded-xl border border-slate-100 p-4';

export default function EquipmentDashboardPage() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [plant, setPlant] = useState('');
  const [line, setLine] = useState('');
  const [period, setPeriod] = useState('day');

  return (
    <div className="pb-6">
      <h4 className="text-lg font-semibold text-slate-800 mb-4">설비종합 대시보드</h4>

      <DashboardFilter
        date={date}
        onDateChange={setDate}
        plant={plant}
        onPlantChange={setPlant}
        plantOptions={[{ value: 'P1', label: '제1공장' }, { value: 'P2', label: '제2공장' }]}
        line={line}
        onLineChange={setLine}
        lineOptions={[
          { value: 'L1', label: 'L1-조립' },
          { value: 'L2', label: 'L2-성형' },
          { value: 'L3', label: 'L3-도장' },
        ]}
        period={period}
        onPeriodChange={setPeriod}
        onSearch={() => {}}
        onReset={() => { setDate(dayjs().format('YYYY-MM-DD')); setPlant(''); setLine(''); setPeriod('day'); }}
      />

      {/* ── Row 1: OEE (wide) + 3 compact KPI ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
        <div className={`${cardCls} xl:col-span-6`}>
          <OeeTripleGauge availability={91.2} performance={88.5} quality={97.8} oee={79.0} />
        </div>
        <div className="xl:col-span-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard title="금일 가동률" value="91.2" unit="%" subtitle="가동 18대 / 전체 20대" trend={{ value: 1.5 }} icon={Activity} iconColor="green" />
          <KpiCard title="고장 설비" value="1" unit="대" subtitle="프레스 A — 베어링 이상" trend={{ value: 0, label: '주의' }} icon={AlertOctagon} iconColor="red" />
          <KpiCard title="보전 예정 (7일)" value="3" unit="건" subtitle="CNC 선반 2, 용접기 1, 도장기" trend={{ value: 0, label: '예정' }} icon={Wrench} iconColor="yellow" />
        </div>
      </div>

      {/* ── Row 2: 가동률 순위 + 비가동 사유 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <div className={cardCls}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">설비별 가동률 순위</h5>
          <AvailabilityBarChart data={DEMO_AVAIL_BAR} />
        </div>
        <div className={cardCls}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">비가동 사유별 비중</h5>
          <DowntimeDonutChart data={DEMO_DOWNTIME} />
        </div>
      </div>

      {/* ── Row 3: MTBF/MTTR + 보전비용 + 금형 경고 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`${cardCls} xl:col-span-5`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">MTBF / MTTR 추이</h5>
          <MtbfMttrChart data={DEMO_MTBF_MTTR} />
        </div>
        <div className={`${cardCls} xl:col-span-4`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">보전비용 추이</h5>
          <div className="space-y-2 mt-1">
            {DEMO_MAINT_COST.map((m, i) => {
              const prev = i > 0 ? DEMO_MAINT_COST[i - 1].cost : m.cost;
              const diff = prev > 0 ? Math.round(((m.cost - prev) / prev) * 100) : 0;
              return (
                <div key={m.month} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-8">{m.month}</span>
                  <div className="flex-1 bg-slate-50 rounded-full h-3.5 overflow-hidden">
                    <div className="bg-blue-300 h-full rounded-full transition-all" style={{ width: `${(m.cost / 3500) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 w-12 text-right">{m.cost.toLocaleString()}</span>
                  {i > 0 && (
                    <span className={`text-[10px] font-semibold w-8 text-right ${diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {diff > 0 ? '+' : ''}{diff}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className={`${cardCls} xl:col-span-3`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">금형 타수 경고</h5>
          <MoldWarningList data={DEMO_MOLD} />
        </div>
      </div>
    </div>
  );
}
