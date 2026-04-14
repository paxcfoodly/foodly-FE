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

/* ── Demo Data ── */
const DEMO_LINE_PROD = [
  { lineName: 'L1-조립', target: 300, actual: 285 },
  { lineName: 'L2-성형', target: 250, actual: 262 },
  { lineName: 'L3-도장', target: 200, actual: 178 },
  { lineName: 'L4-검사', target: 280, actual: 270 },
  { lineName: 'L5-포장', target: 320, actual: 305 },
];

const DEMO_EQUIP_STATUS = [
  { equipCd: 'EQ-001', equipNm: 'CNC 선반 1', status: 'RUNNING' as const },
  { equipCd: 'EQ-002', equipNm: 'CNC 선반 2', status: 'RUNNING' as const },
  { equipCd: 'EQ-003', equipNm: '프레스 A', status: 'DOWN' as const },
  { equipCd: 'EQ-004', equipNm: '프레스 B', status: 'RUNNING' as const },
  { equipCd: 'EQ-005', equipNm: '용접기 1', status: 'SETUP' as const },
  { equipCd: 'EQ-006', equipNm: '용접기 2', status: 'RUNNING' as const },
  { equipCd: 'EQ-007', equipNm: '도장기', status: 'RUNNING' as const },
  { equipCd: 'EQ-008', equipNm: '건조로', status: 'RUNNING' as const },
  { equipCd: 'EQ-009', equipNm: '사출기 1', status: 'RUNNING' as const },
  { equipCd: 'EQ-010', equipNm: '사출기 2', status: 'IDLE' as const },
  { equipCd: 'EQ-011', equipNm: '검사기 1', status: 'RUNNING' as const },
  { equipCd: 'EQ-012', equipNm: '검사기 2', status: 'RUNNING' as const },
  { equipCd: 'EQ-013', equipNm: '포장기 A', status: 'RUNNING' as const },
  { equipCd: 'EQ-014', equipNm: '포장기 B', status: 'RUNNING' as const },
  { equipCd: 'EQ-015', equipNm: '밀링 1', status: 'RUNNING' as const },
  { equipCd: 'EQ-016', equipNm: '밀링 2', status: 'SETUP' as const },
  { equipCd: 'EQ-017', equipNm: '연삭기', status: 'RUNNING' as const },
  { equipCd: 'EQ-018', equipNm: '절단기', status: 'RUNNING' as const },
  { equipCd: 'EQ-019', equipNm: '보링머신', status: 'IDLE' as const },
  { equipCd: 'EQ-020', equipNm: '조립로봇', status: 'RUNNING' as const },
];

const DEMO_HOURLY = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6;
  const base = hour >= 8 && hour <= 17 ? 60 + Math.floor(Math.random() * 30) : 10 + Math.floor(Math.random() * 20);
  return {
    hour,
    goodQty: base,
    defectQty: Math.floor(base * (0.01 + Math.random() * 0.04)),
    prevGoodQty: Math.floor(base * (0.85 + Math.random() * 0.3)),
  };
});

const DEMO_DEFECT_TOP5 = [
  { typeName: '스크래치', count: 8 },
  { typeName: '치수불량', count: 6 },
  { typeName: '변색', count: 5 },
  { typeName: '균열', count: 3 },
  { typeName: '이물질', count: 2 },
];

const DEMO_DELAY = [
  { woNo: 'WO-2026-0412', itemName: '하우징 어셈블리 A', delayDays: 2 },
  { woNo: 'WO-2026-0398', itemName: '커넥터 브라켓 B', delayDays: 1 },
];

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
          value="87.5"
          unit="%"
          subtitle="목표 1,200 / 실적 1,050"
          trend={{ value: 2.3 }}
          icon={Target}
          iconColor="green"
          progress={87.5}
          progressColor="#34d399"
        />
        {/* 2. 금일 불량률 */}
        <KpiCard
          title="금일 불량률"
          value="2.3"
          unit="%"
          subtitle="불량 24건"
          trend={{ value: -0.5 }}
          icon={AlertCircle}
          iconColor="red"
        />
        {/* 3. 설비 가동률 */}
        <KpiCard
          title="설비 가동률"
          value="91.2"
          unit="%"
          subtitle="가동 18대 / 전체 20대"
          trend={{ value: 0.8 }}
          icon={Cpu}
          iconColor="cyan"
        />
        {/* 4. 금일 생산량 */}
        <KpiCard
          title="금일 생산량"
          value="1,050"
          unit="ea"
          subtitle="완료 18 / 전체 22"
          trend={{ value: 4.5 }}
          icon={Package}
          iconColor="blue"
        />
        {/* 5. 평균 가동시간 */}
        <KpiCard
          title="평균 가동시간"
          value="4.2"
          unit="h"
          subtitle="전일 대비 +0.3h"
          trend={{ value: 7.7 }}
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
          <WorkOrderCards waiting={3} inProgress={5} completed={12} delayed={1} />
        </div>
      </div>

      {/* ── Row 2: Hourly Trend (large) + Equipment Status ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
        <div className={`${cardCls} xl:col-span-8`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">시간대별 생산추이</h5>
          <HourlyTrendChart data={DEMO_HOURLY} currentHour={new Date().getHours()} />
        </div>
        <div className={`${cardCls} xl:col-span-4`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">설비 가동현황</h5>
          <EquipStatusGrid data={DEMO_EQUIP_STATUS} />
        </div>
      </div>

      {/* ── Row 3: Line Production + Defect Top 5 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-5">
        <div className={`${cardCls} xl:col-span-8`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">라인별 생산현황</h5>
          <LineProductionChart data={DEMO_LINE_PROD} />
        </div>
        <div className={`${cardCls} xl:col-span-4`}>
          <h5 className="text-xs font-semibold text-slate-500 mb-2">금일 불량 Top 5</h5>
          <DefectTop5Chart data={DEMO_DEFECT_TOP5} />
          <div className="border-t border-slate-50 mt-3 pt-3">
            <h5 className="text-xs font-semibold text-slate-500 mb-2">납기 지연 경보</h5>
            <DeliveryAlertList data={DEMO_DELAY} />
          </div>
        </div>
      </div>
    </div>
  );
}
