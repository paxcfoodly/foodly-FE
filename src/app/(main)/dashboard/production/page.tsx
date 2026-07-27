'use client';

import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Target, AlertCircle, Cpu, ClipboardList, Package, Clock } from 'lucide-react';
import DashboardFilter from '@/components/dashboard/DashboardFilter';
import KpiCard from '@/components/dashboard/KpiCard';
import WorkOrderCards from '@/components/dashboard/WorkOrderCards';
import LineProductionChart from '@/components/dashboard/LineProductionChart';
import EquipStatusGrid from '@/components/dashboard/EquipStatusGrid';
import HourlyTrendChart from '@/components/dashboard/HourlyTrendChart';
import DefectTop5Chart from '@/components/dashboard/DefectTop5Chart';
import DeliveryAlertList from '@/components/dashboard/DeliveryAlertList';
import DashboardEmpty from '@/components/dashboard/DashboardEmpty';

// 대시보드 집계 API 연동 전까지 실데이터 없음 — 회사별 실적이 연결되면 이 배열들을 API 응답으로 대체
const LINE_PROD: { lineName: string; target: number; actual: number }[] = [];
const EQUIP_STATUS: { equipCd: string; equipNm: string; status: 'RUNNING' | 'DOWN' | 'SETUP' | 'IDLE' }[] = [];
const HOURLY: { hour: number; goodQty: number; defectQty: number; prevGoodQty: number }[] = [];
const DEFECT_TOP5: { typeName: string; count: number }[] = [];
const DELAY: { woNo: string; itemName: string; delayDays: number }[] = [];

const cardCls = 'bg-white rounded-xl border border-slate-100 p-4';

export default function ProductionDashboardPage() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [plant, setPlant] = useState('');
  const [line, setLine] = useState('');

  return (
    <div className="pb-6">
      <h4 className="text-lg font-semibold text-slate-800 mb-4">생산종합 대시보드</h4>

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
          { value: 'L4', label: 'L4-검사' },
          { value: 'L5', label: 'L5-포장' },
        ]}
        onSearch={() => {}}
        onReset={() => { setDate(dayjs().format('YYYY-MM-DD')); setPlant(''); setLine(''); }}
      />

      {/* ── Row 1: KPI Cards (6 columns) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
        {/* 1. 금일 달성률 — Option 1 (number + progress bar) */}
        <KpiCard
          title="금일 달성률"
          value="-"
          unit="%"
          subtitle="데이터 없음"
          icon={Target}
          iconColor="green"
        />
        {/* 2. 금일 불량률 */}
        <KpiCard
          title="금일 불량률"
          value="-"
          unit="%"
          subtitle="데이터 없음"
          icon={AlertCircle}
          iconColor="red"
        />
        {/* 3. 설비 가동률 */}
        <KpiCard
          title="설비 가동률"
          value="-"
          unit="%"
          subtitle="데이터 없음"
          icon={Cpu}
          iconColor="cyan"
        />
        {/* 4. 금일 생산량 */}
        <KpiCard
          title="금일 생산량"
          value="0"
          unit="ea"
          subtitle="데이터 없음"
          icon={Package}
          iconColor="blue"
        />
        {/* 5. 평균 가동시간 */}
        <KpiCard
          title="평균 가동시간"
          value="-"
          unit="h"
          subtitle="데이터 없음"
          icon={Clock}
          iconColor="blue"
        />
        {/* 6. 작업지시 현황 — 4 inner cards */}
        <div className={`${cardCls} col-span-1`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">작업지시 현황</p>
            <div className="w-7 h-7 rounded-md bg-violet-50 flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5 text-violet-500" />
            </div>
          </div>
          <WorkOrderCards waiting={0} inProgress={0} completed={0} delayed={0} />
        </div>
      </div>

      {/* ── Row 2: Hourly Trend (large) + Equipment Status ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
        <div className={`${cardCls} xl:col-span-8`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">시간대별 생산추이</h5>
          {HOURLY.length ? <HourlyTrendChart data={HOURLY} currentHour={new Date().getHours()} /> : <DashboardEmpty />}
        </div>
        <div className={`${cardCls} xl:col-span-4`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">설비 가동현황</h5>
          {EQUIP_STATUS.length ? <EquipStatusGrid data={EQUIP_STATUS} /> : <DashboardEmpty />}
        </div>
      </div>

      {/* ── Row 3: Line Production + Defect Top 5 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
        <div className={`${cardCls} xl:col-span-8`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">라인별 생산현황</h5>
          {LINE_PROD.length ? <LineProductionChart data={LINE_PROD} /> : <DashboardEmpty />}
        </div>
        <div className={`${cardCls} xl:col-span-4`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">금일 불량 Top 5</h5>
          {DEFECT_TOP5.length ? <DefectTop5Chart data={DEFECT_TOP5} /> : <DashboardEmpty height={140} />}
          <div className="border-t border-slate-50 mt-3 pt-3">
            <h5 className="text-xs font-semibold text-slate-500 mb-2">납기 지연 경보</h5>
            {DELAY.length ? <DeliveryAlertList data={DELAY} /> : <DashboardEmpty height={80} />}
          </div>
        </div>
      </div>
    </div>
  );
}
