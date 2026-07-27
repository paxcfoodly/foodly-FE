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
import DashboardEmpty from '@/components/dashboard/DashboardEmpty';

// 대시보드 집계 API 연동 전까지 실데이터 없음 — 회사별 실적 연결 시 API 응답으로 대체
const AVAIL_BAR: { equip_nm: string; availability: number }[] = [];
const DOWNTIME: { reason: string; minutes: number }[] = [];
const MTBF_MTTR: { month: string; mtbf: number; mttr: number }[] = [];
const MAINT_COST: { month: string; cost: number }[] = [];
const MOLD: { moldCd: string; currentShots: number; warrantyShots: number }[] = [];

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
          <OeeTripleGauge availability={0} performance={0} quality={0} oee={0} />
        </div>
        <div className="xl:col-span-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard title="금일 가동률" value="-" unit="%" subtitle="데이터 없음" icon={Activity} iconColor="green" />
          <KpiCard title="고장 설비" value="0" unit="대" subtitle="데이터 없음" icon={AlertOctagon} iconColor="red" />
          <KpiCard title="보전 예정 (7일)" value="0" unit="건" subtitle="데이터 없음" icon={Wrench} iconColor="yellow" />
        </div>
      </div>

      {/* ── Row 2: 가동률 순위 + 비가동 사유 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <div className={cardCls}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">설비별 가동률 순위</h5>
          {AVAIL_BAR.length ? <AvailabilityBarChart data={AVAIL_BAR} /> : <DashboardEmpty />}
        </div>
        <div className={cardCls}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">비가동 사유별 비중</h5>
          {DOWNTIME.length ? <DowntimeDonutChart data={DOWNTIME} /> : <DashboardEmpty />}
        </div>
      </div>

      {/* ── Row 3: MTBF/MTTR + 보전비용 + 금형 경고 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`${cardCls} xl:col-span-5`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">MTBF / MTTR 추이</h5>
          {MTBF_MTTR.length ? <MtbfMttrChart data={MTBF_MTTR} /> : <DashboardEmpty />}
        </div>
        <div className={`${cardCls} xl:col-span-4`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">보전비용 추이</h5>
          {MAINT_COST.length ? (
          <div className="space-y-2 mt-1">
            {MAINT_COST.map((m, i) => {
              const prev = i > 0 ? MAINT_COST[i - 1].cost : m.cost;
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
          ) : <DashboardEmpty />}
        </div>
        <div className={`${cardCls} xl:col-span-3`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">금형 타수 경고</h5>
          {MOLD.length ? <MoldWarningList data={MOLD} /> : <DashboardEmpty />}
        </div>
      </div>
    </div>
  );
}
