'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Empty from '@/components/ui/Empty';
import Table, { type TableColumn } from '@/components/ui/Table';
import OeeGaugeChart from '@/components/equipment/OeeGaugeChart';
import AvailabilityBarChart from '@/components/equipment/AvailabilityBarChart';
import OeeTrendChart from '@/components/equipment/OeeTrendChart';
import ExcelDownloadButton from '@/components/common/ExcelDownloadButton';
import apiClient from '@/lib/apiClient';

// ─── Types ───

interface OeeResult {
  equip_cd: string;
  equip_nm: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  total_run_min: number;
  total_down_min: number;
  good_qty: number;
  defect_qty: number;
  has_prod_data: boolean;
}

interface OeeTrendPoint {
  date: string;
  availability: number;
  oee: number;
}

// ─── Helpers ───

function average(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
}

// ─── Columns ───

type GridRow = OeeResult & { run_hours: number; down_hours: number; [key: string]: unknown };

const oeeColumns: TableColumn<GridRow>[] = [
  { title: '설비코드', dataIndex: 'equip_cd', width: 120, ellipsis: true },
  { title: '설비명', dataIndex: 'equip_nm', width: 150, ellipsis: true },
  {
    title: '가동률(%)',
    dataIndex: 'availability',
    width: 100,
    align: 'right',
    sorter: true,
    render: (v: unknown) => Number(v).toFixed(1),
  },
  {
    title: '성능률(%)',
    dataIndex: 'performance',
    width: 100,
    align: 'right',
    sorter: true,
    render: (v: unknown) => Number(v).toFixed(1),
  },
  {
    title: '양품률(%)',
    dataIndex: 'quality',
    width: 100,
    align: 'right',
    sorter: true,
    render: (v: unknown) => Number(v).toFixed(1),
  },
  {
    title: 'OEE(%)',
    dataIndex: 'oee',
    width: 100,
    align: 'right',
    sorter: true,
    render: (v: unknown) => Number(v).toFixed(1),
  },
  {
    title: '가동시간(h)',
    dataIndex: 'run_hours',
    width: 120,
    align: 'right',
    render: (v: unknown) => Number(v).toFixed(1),
  },
  {
    title: '비가동시간(h)',
    dataIndex: 'down_hours',
    width: 130,
    align: 'right',
    render: (v: unknown) => Number(v).toFixed(1),
  },
  {
    title: '생산수량',
    dataIndex: 'good_qty',
    width: 100,
    align: 'right',
    sorter: true,
  },
  {
    title: '불량수량',
    dataIndex: 'defect_qty',
    width: 100,
    align: 'right',
    sorter: true,
  },
];

const excelColumns = [
  { header: '설비코드', key: 'equip_cd', width: 15 },
  { header: '설비명', key: 'equip_nm', width: 20 },
  { header: '가동률(%)', key: 'availability', width: 12 },
  { header: '성능률(%)', key: 'performance', width: 12 },
  { header: '양품률(%)', key: 'quality', width: 12 },
  { header: 'OEE(%)', key: 'oee', width: 12 },
  { header: '가동시간(h)', key: 'run_hours', width: 14 },
  { header: '비가동시간(h)', key: 'down_hours', width: 16 },
  { header: '생산수량', key: 'good_qty', width: 12 },
  { header: '불량수량', key: 'defect_qty', width: 12 },
];

// ─── Page ───

export default function OeeReportPage() {
  const defaultEnd = dayjs();
  const defaultStart = defaultEnd.subtract(30, 'day');

  const [startDate, setStartDate] = useState(defaultStart.format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(defaultEnd.format('YYYY-MM-DD'));
  const [summaryData, setSummaryData] = useState<OeeResult[]>([]);
  const [trendData, setTrendData] = useState<OeeTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const [tablePage, setTablePage] = useState(1);
  const pageSize = 20;

  const fetchAll = useCallback(async (start: string, end: string) => {
    setLoading(true);
    try {
      const [summaryRes, trendRes] = await Promise.all([
        apiClient.get('/v1/oee/summary', { params: { start, end } }),
        apiClient.get('/v1/oee/trend', { params: { start, end } }),
      ]);

      setSummaryData(summaryRes.data.data ?? []);
      setTrendData(trendRes.data.data ?? []);
    } catch {
      setSummaryData([]);
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(startDate, endDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    fetchAll(startDate, endDate);
  };

  const handleReset = () => {
    const end = dayjs();
    const start = end.subtract(30, 'day');
    setStartDate(start.format('YYYY-MM-DD'));
    setEndDate(end.format('YYYY-MM-DD'));
    fetchAll(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
  };

  // Aggregate averages across all equipment
  const avgAvailability = average(summaryData.map((d) => d.availability));
  const avgPerformance = average(summaryData.map((d) => d.performance));
  const avgQuality = average(summaryData.map((d) => d.quality));
  const hasProdData = summaryData.some((d) => d.has_prod_data);

  const availabilityBarData = summaryData.map((d) => ({
    equip_nm: d.equip_nm,
    availability: d.availability,
  }));

  // DataGrid rows with computed run_hours / down_hours
  const gridRows: GridRow[] = summaryData.map((d) => ({
    ...d,
    run_hours: Math.round((d.total_run_min / 60) * 10) / 10,
    down_hours: Math.round((d.total_down_min / 60) * 10) / 10,
  }));

  const paginatedRows = gridRows.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  return (
    <div className="pb-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        OEE 리포트
      </h4>

      {/* Search Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-600">조회 기간:</span>
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
          <Button icon={<RotateCcw className="w-4 h-4" />} onClick={handleReset}>
            초기화
          </Button>
        </div>
      </div>

      {/* OEE Gauge Cards */}
      <div className="bg-white rounded-xl p-4 shadow-sm mt-6">
        <h5 className="text-sm font-semibold text-gray-700 mb-4">OEE 현황</h5>
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Spinner tip="데이터를 집계하는 중입니다..." />
          </div>
        ) : summaryData.length === 0 ? (
          <Empty description="데이터가 없습니다" />
        ) : (
          <div className="flex justify-around items-center flex-wrap gap-4">
            <div className="text-center">
              <OeeGaugeChart title="가동률" value={avgAvailability} hasData={true} />
            </div>
            <div className="text-center">
              <OeeGaugeChart title="성능률" value={avgPerformance} hasData={hasProdData} />
            </div>
            <div className="text-center">
              <OeeGaugeChart title="양품률" value={avgQuality} hasData={hasProdData} />
            </div>
          </div>
        )}
      </div>

      {/* Availability Bar Chart */}
      <div className="bg-white rounded-xl p-4 shadow-sm mt-6">
        <h5 className="text-sm font-semibold text-gray-700 mb-4">설비별 가동률</h5>
        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <Spinner tip="데이터를 집계하는 중입니다..." />
          </div>
        ) : availabilityBarData.length > 0 ? (
          <AvailabilityBarChart data={availabilityBarData} />
        ) : (
          <div className="h-[280px] flex items-center justify-center">
            <Empty description="데이터가 없습니다" />
          </div>
        )}
      </div>

      {/* OEE Trend Chart */}
      <div className="bg-white rounded-xl p-4 shadow-sm mt-6">
        <h5 className="text-sm font-semibold text-gray-700 mb-4">OEE 추이</h5>
        {loading ? (
          <div className="h-[240px] flex items-center justify-center">
            <Spinner tip="데이터를 집계하는 중입니다..." />
          </div>
        ) : trendData.length > 0 ? (
          <OeeTrendChart data={trendData} />
        ) : (
          <div className="h-[240px] flex items-center justify-center">
            <Empty description="데이터가 없습니다" />
          </div>
        )}
      </div>

      {/* DataGrid */}
      <div className="bg-white rounded-xl p-4 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-sm font-semibold text-gray-700">설비별 OEE 상세</h5>
          <ExcelDownloadButton
            filename={`OEE리포트_${startDate}_${endDate}`}
            columns={excelColumns}
            data={gridRows as unknown as Record<string, unknown>[]}
            disabled={gridRows.length === 0 || loading}
          />
        </div>
        <Table<GridRow>
          columns={oeeColumns}
          dataSource={paginatedRows}
          rowKey="equip_cd"
          loading={loading}
          scrollX={1200}
          pagination={{
            current: tablePage,
            pageSize,
            total: gridRows.length,
            onChange: (p) => setTablePage(p),
          }}
        />
      </div>
    </div>
  );
}
