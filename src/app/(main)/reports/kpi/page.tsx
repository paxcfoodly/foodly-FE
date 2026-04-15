'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ProdDailyBarChart from '@/components/reports/ProdDailyBarChart';
import DefectRateTrendChart from '@/components/reports/DefectRateTrendChart';
import OeeTrendChart from '@/components/equipment/OeeTrendChart';
import InventoryBarChart from '@/components/reports/InventoryBarChart';
import apiClient from '@/lib/apiClient';

// ─── Types ───

interface KpiData {
  prodAchieveRate: number;
  defectRate: number;
  avgOee: number;
  avgTurnover: number;
}

interface ProdSummaryRow {
  good_qty: number;
  order_qty: number;
}

interface ParetoRow {
  total_qty: number;
}

interface OeeSummaryRow {
  oee: number;
}

interface OeeTrendPoint {
  date: string;
  availability: number;
  oee: number;
}

interface InventoryRow {
  item_nm: string;
  qty: number;
  turnover_rate: number;
}

interface ProdDailyRow {
  date: string;
  good_qty: number;
  achieve_rate: number;
}

interface DefectTrendRow {
  date: string;
  defect_rate: number;
}

// ─── Page ───

export default function KpiDashboardPage() {
  const now = dayjs();
  const defaultStart = now.startOf('month');
  const defaultEnd = now;

  const [startDate, setStartDate] = useState(defaultStart.format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(defaultEnd.format('YYYY-MM-DD'));
  const [kpiData, setKpiData] = useState<KpiData>({
    prodAchieveRate: 0,
    defectRate: 0,
    avgOee: 0,
    avgTurnover: 0,
  });
  const [prodDailyData, setProdDailyData] = useState<ProdDailyRow[]>([]);
  const [defectTrendData, setDefectTrendData] = useState<DefectTrendRow[]>([]);
  const [oeeTrendData, setOeeTrendData] = useState<OeeTrendPoint[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async (start: string, end: string) => {
    setLoading(true);
    try {
      const [prodSummaryRes, qualityParetoRes, oeeSummaryRes, inventoryRes, prodDailyRes, qualityTrendRes, oeeTrendRes] =
        await Promise.all([
          apiClient.get('/v1/reports/production/summary', { params: { start, end, group_by: 'item' } }),
          apiClient.get('/v1/reports/quality/pareto', { params: { start, end } }),
          apiClient.get('/v1/oee/summary', { params: { start, end } }),
          apiClient.get('/v1/reports/inventory/summary'),
          apiClient.get('/v1/reports/production/daily', { params: { start, end } }),
          apiClient.get('/v1/reports/quality/trend', { params: { start, end } }),
          apiClient.get('/v1/oee/trend', { params: { start, end } }),
        ]);

      const prodSummary: ProdSummaryRow[] = prodSummaryRes.data.data ?? [];
      const qualityPareto: ParetoRow[] = qualityParetoRes.data.data ?? [];
      const oeeSummary: OeeSummaryRow[] = oeeSummaryRes.data.data ?? [];
      const inventory: InventoryRow[] = inventoryRes.data.data ?? [];
      const prodDaily: ProdDailyRow[] = prodDailyRes.data.data ?? [];
      const qualityTrend: DefectTrendRow[] = qualityTrendRes.data.data ?? [];
      const oeeTrend: OeeTrendPoint[] = oeeTrendRes.data.data ?? [];

      // Calculate KPI values
      const totalGood = prodSummary.reduce((s, r) => s + (r.good_qty ?? 0), 0);
      const totalOrder = prodSummary.reduce((s, r) => s + (r.order_qty ?? 0), 0);
      const prodAchieveRate = totalOrder > 0 ? Math.round((totalGood / totalOrder) * 1000) / 10 : 0;

      const totalDefect = qualityPareto.reduce((s, r) => s + (r.total_qty ?? 0), 0);
      const defectRate = totalOrder > 0 ? Math.round((totalDefect / totalOrder) * 10000) / 100 : 0;

      const oeeValues = oeeSummary.map((r) => r.oee).filter((v) => v != null);
      const avgOee = oeeValues.length > 0
        ? Math.round((oeeValues.reduce((s, v) => s + v, 0) / oeeValues.length) * 10) / 10
        : 0;

      const turnoverValues = inventory.map((r) => r.turnover_rate).filter((v) => v != null && v > 0);
      const avgTurnover = turnoverValues.length > 0
        ? Math.round((turnoverValues.reduce((s, v) => s + v, 0) / turnoverValues.length) * 10) / 10
        : 0;

      setKpiData({ prodAchieveRate, defectRate, avgOee, avgTurnover });
      setProdDailyData(prodDaily);
      setDefectTrendData(qualityTrend);
      setOeeTrendData(oeeTrend);
      setInventoryData(
        [...inventory]
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 10),
      );
    } catch {
      setKpiData({ prodAchieveRate: 0, defectRate: 0, avgOee: 0, avgTurnover: 0 });
      setProdDailyData([]);
      setDefectTrendData([]);
      setOeeTrendData([]);
      setInventoryData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(startDate, endDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => fetchAll(startDate, endDate);

  const handleThisMonth = () => {
    const start = dayjs().startOf('month').format('YYYY-MM-DD');
    const end = dayjs().format('YYYY-MM-DD');
    setStartDate(start);
    setEndDate(end);
    fetchAll(start, end);
  };

  const handleThisWeek = () => {
    const start = dayjs().startOf('week').format('YYYY-MM-DD');
    const end = dayjs().format('YYYY-MM-DD');
    setStartDate(start);
    setEndDate(end);
    fetchAll(start, end);
  };

  return (
    <div className="pb-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        종합 KPI 대시보드
      </h4>

      {/* Period Filter */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <Button onClick={handleThisMonth}>이번달</Button>
        <Button onClick={handleThisWeek}>이번주</Button>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
        />
        <span className="text-gray-400">~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
        />
        <Button variant="primary" icon={<Search className="w-4 h-4" />} onClick={handleSearch} loading={loading}>
          조회
        </Button>
      </div>

      {/* KPI Cards — 4 columns (일관된 높이를 위해 종합 OEE도 숫자 카드 형태로) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '생산 달성률', value: kpiData.prodAchieveRate.toFixed(1), unit: '%' },
          { label: '불량률', value: kpiData.defectRate.toFixed(2), unit: '%' },
          { label: '종합 OEE', value: kpiData.avgOee.toFixed(1), unit: '%' },
          { label: '재고 회전율', value: kpiData.avgTurnover.toFixed(1), unit: '회' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm">
            {loading ? (
              <div className="h-[60px] flex items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                <p className="text-[28px] font-semibold text-gray-900 leading-none">
                  {card.value}
                  <span className="text-lg font-normal text-gray-500 ml-1">{card.unit}</span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mini Charts Row — 차트가 잘리지 않도록 컨테이너 높이 확장 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h5 className="text-sm font-semibold text-gray-700 mb-2">생산추이</h5>
          <div className="h-[240px]">
            <ProdDailyBarChart data={prodDailyData} height={220} />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h5 className="text-sm font-semibold text-gray-700 mb-2">불량률 추이</h5>
          <div className="h-[240px]">
            <DefectRateTrendChart data={defectTrendData} height={220} />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h5 className="text-sm font-semibold text-gray-700 mb-2">OEE 추이</h5>
          <div className="h-[240px]">
            <OeeTrendChart data={oeeTrendData} height={220} />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h5 className="text-sm font-semibold text-gray-700 mb-2">재고현황</h5>
          <div className="h-[240px]">
            <InventoryBarChart data={inventoryData} height={220} />
          </div>
        </div>
      </div>
    </div>
  );
}
