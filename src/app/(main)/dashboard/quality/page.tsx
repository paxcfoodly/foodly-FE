'use client';

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { ShieldCheck, Bug } from 'lucide-react';
import DashboardFilter from '@/components/dashboard/DashboardFilter';
import KpiCard from '@/components/dashboard/KpiCard';
import InspectPassGauge from '@/components/dashboard/InspectPassGauge';
import DefectParetoChart from '@/components/dashboard/DefectParetoChart';
import ProcessDefectChart from '@/components/dashboard/ProcessDefectChart';
import DefectTrendChart from '@/components/dashboard/DefectTrendChart';
import SpcAlertList from '@/components/dashboard/SpcAlertList';
import CpkTable from '@/components/dashboard/CpkTable';

/* ── Demo Data ── */
const DEMO_PARETO = [
  { typeName: '스크래치', count: 42 },
  { typeName: '치수불량', count: 35 },
  { typeName: '변색', count: 28 },
  { typeName: '균열', count: 15 },
  { typeName: '이물질', count: 12 },
  { typeName: '기포', count: 8 },
  { typeName: '미성형', count: 5 },
  { typeName: '기타', count: 3 },
];

const DEMO_PROCESS_DEFECT = [
  { processName: '사출', defectRate: 3.2 },
  { processName: '도장', defectRate: 2.8 },
  { processName: '조립', defectRate: 1.5 },
  { processName: '검사', defectRate: 0.8 },
  { processName: '포장', defectRate: 0.3 },
];

const DEMO_TREND = [
  { date: '04/04', rate: 2.8, prevWeekRate: 3.1 },
  { date: '04/05', rate: 2.5, prevWeekRate: 2.9 },
  { date: '04/06', rate: 2.2, prevWeekRate: 2.7 },
  { date: '04/07', rate: 2.6, prevWeekRate: 2.5 },
  { date: '04/08', rate: 2.1, prevWeekRate: 2.8 },
  { date: '04/09', rate: 1.9, prevWeekRate: 2.6 },
  { date: '04/10', rate: 2.3, prevWeekRate: 2.4 },
];

const DEMO_SPC_ALERTS = [
  { itemName: '하우징 A', inspectItem: '외경(mm)', value: 25.42, time: '09:30' },
  { itemName: '커넥터 B', inspectItem: '두께(mm)', value: 1.82, time: '10:15' },
  { itemName: '브라켓 C', inspectItem: '경도(HRC)', value: 62.1, time: '11:45' },
];

const DEMO_CPK = [
  { itemName: '하우징 A', inspectItem: '외경', cpk: 1.45 },
  { itemName: '하우징 A', inspectItem: '내경', cpk: 1.12 },
  { itemName: '커넥터 B', inspectItem: '두께', cpk: 0.89 },
  { itemName: '브라켓 C', inspectItem: '경도', cpk: 1.35 },
  { itemName: '샤프트 D', inspectItem: '진원도', cpk: 1.58 },
  { itemName: '기어 E', inspectItem: '치수', cpk: 0.95 },
];

const cardCls = 'bg-white rounded-xl border border-slate-100 p-4';

export default function QualityDashboardPage() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [plant, setPlant] = useState('');
  const [period, setPeriod] = useState('day');

  return (
    <div className="pb-6">
      <h4 className="text-lg font-semibold text-slate-800 mb-4">품질종합 대시보드</h4>

      <DashboardFilter
        date={date}
        onDateChange={setDate}
        plant={plant}
        onPlantChange={setPlant}
        plantOptions={[{ value: 'P1', label: '제1공장' }, { value: 'P2', label: '제2공장' }]}
        period={period}
        onPeriodChange={setPeriod}
        onSearch={() => {}}
        onReset={() => { setDate(dayjs().format('YYYY-MM-DD')); setPlant(''); setPeriod('day'); }}
      />

      {/* ── Row 1: 4 Gauge / KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs text-slate-400">수입검사</p>
            <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
          <InspectPassGauge title="수입검사" rate={96.8} prevDayDiff={1.2} />
        </div>
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs text-slate-400">공정검사</p>
            <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>
          </div>
          <InspectPassGauge title="공정검사" rate={94.2} prevDayDiff={-0.3} />
        </div>
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs text-slate-400">출하검사</p>
            <div className="w-7 h-7 rounded-md bg-cyan-50 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            </div>
          </div>
          <InspectPassGauge title="출하검사" rate={98.5} prevDayDiff={0.5} />
        </div>
        <KpiCard title="금일 불량 건수" value={24} unit="건" subtitle="전일 대비 ▼3건" trend={{ value: -11.1 }} icon={Bug} iconColor="red" />
      </div>

      {/* ── Row 2: Pareto + Process Defect Rate ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <div className={cardCls}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">불량유형별 파레토</h5>
          <DefectParetoChart data={DEMO_PARETO} />
        </div>
        <div className={cardCls}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">공정별 불량률</h5>
          <ProcessDefectChart data={DEMO_PROCESS_DEFECT} />
        </div>
      </div>

      {/* ── Row 3: Trend + SPC + Cpk ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`${cardCls} xl:col-span-5`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">불량률 추이 (7일)</h5>
          <DefectTrendChart data={DEMO_TREND} />
        </div>
        <div className={`${cardCls} xl:col-span-3`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">SPC 이상 알림</h5>
          <SpcAlertList data={DEMO_SPC_ALERTS} />
        </div>
        <div className={`${cardCls} xl:col-span-4`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">Cp/Cpk 현황</h5>
          <CpkTable data={DEMO_CPK} />
        </div>
      </div>
    </div>
  );
}
