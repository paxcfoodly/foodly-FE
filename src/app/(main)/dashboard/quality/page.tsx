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
import DashboardEmpty from '@/components/dashboard/DashboardEmpty';

// 대시보드 집계 API 연동 전까지 실데이터 없음 — 회사별 실적 연결 시 API 응답으로 대체
const PARETO: { typeName: string; count: number }[] = [];
const PROCESS_DEFECT: { processName: string; defectRate: number }[] = [];
const TREND: { date: string; rate: number; prevWeekRate: number }[] = [];
const SPC_ALERTS: { itemName: string; inspectItem: string; value: number; time: string }[] = [];
const CPK: { itemName: string; inspectItem: string; cpk: number }[] = [];

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
          <InspectPassGauge title="수입검사" rate={0} prevDayDiff={0} />
        </div>
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs text-slate-400">공정검사</p>
            <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>
          </div>
          <InspectPassGauge title="공정검사" rate={0} prevDayDiff={0} />
        </div>
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs text-slate-400">출하검사</p>
            <div className="w-7 h-7 rounded-md bg-cyan-50 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            </div>
          </div>
          <InspectPassGauge title="출하검사" rate={0} prevDayDiff={0} />
        </div>
        <KpiCard title="금일 불량 건수" value={0} unit="건" subtitle="데이터 없음" icon={Bug} iconColor="red" />
      </div>

      {/* ── Row 2: Pareto + Process Defect Rate ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <div className={cardCls}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">불량유형별 파레토</h5>
          {PARETO.length ? <DefectParetoChart data={PARETO} /> : <DashboardEmpty />}
        </div>
        <div className={cardCls}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">공정별 불량률</h5>
          {PROCESS_DEFECT.length ? <ProcessDefectChart data={PROCESS_DEFECT} /> : <DashboardEmpty />}
        </div>
      </div>

      {/* ── Row 3: Trend + SPC + Cpk ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`${cardCls} xl:col-span-5`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">불량률 추이 (7일)</h5>
          {TREND.length ? <DefectTrendChart data={TREND} /> : <DashboardEmpty />}
        </div>
        <div className={`${cardCls} xl:col-span-3`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">SPC 이상 알림</h5>
          {SPC_ALERTS.length ? <SpcAlertList data={SPC_ALERTS} /> : <DashboardEmpty />}
        </div>
        <div className={`${cardCls} xl:col-span-4`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">Cp/Cpk 현황</h5>
          {CPK.length ? <CpkTable data={CPK} /> : <DashboardEmpty />}
        </div>
      </div>
    </div>
  );
}
