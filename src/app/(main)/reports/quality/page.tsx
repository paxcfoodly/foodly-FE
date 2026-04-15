'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Spinner from '@/components/ui/Spinner';
import Empty from '@/components/ui/Empty';
import Table, { type TableColumn } from '@/components/ui/Table';
import DefectParetoChart from '@/components/reports/DefectParetoChart';
import DefectByProcessChart from '@/components/reports/DefectByProcessChart';
import DefectRateTrendChart from '@/components/reports/DefectRateTrendChart';
import ExcelDownloadButton from '@/components/common/ExcelDownloadButton';
import CommonCodeSelect from '@/components/common/CommonCodeSelect';
import apiClient from '@/lib/apiClient';

// ─── Types ───

interface ParetoRow {
  defect_type_cd: string;
  defect_type_nm: string;
  total_qty: number;
  cumulative_pct: number;
}

interface ByProcessRow {
  process_cd: string;
  process_nm: string;
  defect_qty: number;
  total_qty: number;
  defect_rate: number;
}

interface TrendRow {
  date: string;
  defect_qty: number;
  total_qty: number;
  defect_rate: number;
}

interface DetailRow {
  defect_type_cd: string;
  defect_type_nm: string;
  defect_cause_cd: string;
  defect_cause_nm: string;
  process_cd: string;
  process_nm: string;
  defect_date: string;
  defect_qty: number;
  [key: string]: unknown;
}

// ─── Columns ───

const detailColumns: TableColumn<DetailRow>[] = [
  { title: '불량유형', dataIndex: 'defect_type_nm', width: 130, ellipsis: true },
  { title: '불량원인', dataIndex: 'defect_cause_nm', width: 130, ellipsis: true },
  { title: '공정', dataIndex: 'process_nm', width: 120, ellipsis: true },
  { title: '발생일', dataIndex: 'defect_date', width: 120 },
  {
    title: '불량수량',
    dataIndex: 'defect_qty',
    width: 100,
    align: 'right',
    sorter: true,
  },
];

// ─── Page ───

export default function QualityReportPage() {
  const defaultEnd = dayjs();
  const defaultStart = defaultEnd.subtract(30, 'day');

  const [startDate, setStartDate] = useState(defaultStart.format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(defaultEnd.format('YYYY-MM-DD'));
  const [defectTypeCd, setDefectTypeCd] = useState<string | undefined>(undefined);

  const [paretoData, setParetoData] = useState<ParetoRow[]>([]);
  const [processData, setProcessData] = useState<ByProcessRow[]>([]);
  const [trendData, setTrendData] = useState<TrendRow[]>([]);
  const [detailData, setDetailData] = useState<DetailRow[]>([]);
  const [selectedDefectType, setSelectedDefectType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [detailPage, setDetailPage] = useState(1);
  const pageSize = 20;

  const fetchAll = useCallback(async (start: string, end: string, defectType?: string) => {
    setLoading(true);
    try {
      const detailParams: Record<string, string> = { start, end };
      if (defectType) detailParams.defect_type_cd = defectType;

      const [paretoRes, processRes, trendRes, detailRes] = await Promise.all([
        apiClient.get('/v1/reports/quality/pareto', { params: { start, end } }),
        apiClient.get('/v1/reports/quality/by-process', { params: { start, end } }),
        apiClient.get('/v1/reports/quality/trend', { params: { start, end } }),
        apiClient.get('/v1/reports/quality/detail', { params: detailParams }),
      ]);

      setParetoData(paretoRes.data.data ?? []);
      setProcessData(processRes.data.data ?? []);
      setTrendData(trendRes.data.data ?? []);
      setDetailData(detailRes.data.data ?? []);
      setSelectedDefectType(null);
    } catch {
      setParetoData([]);
      setProcessData([]);
      setTrendData([]);
      setDetailData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(startDate, endDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    fetchAll(startDate, endDate, defectTypeCd);
  };

  const handleReset = () => {
    const end = dayjs();
    const start = end.subtract(30, 'day');
    setStartDate(start.format('YYYY-MM-DD'));
    setEndDate(end.format('YYYY-MM-DD'));
    setDefectTypeCd(undefined);
    setSelectedDefectType(null);
    fetchAll(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
  };

  // Pareto drill-down: client-side filter by defect_type_nm
  const filteredData: DetailRow[] =
    selectedDefectType
      ? detailData.filter((r) => r.defect_type_nm === selectedDefectType)
      : detailData;

  // Client-side pagination
  const paginatedData = filteredData.slice((detailPage - 1) * pageSize, detailPage * pageSize);

  // Excel columns
  const excelColumns = [
    { header: '불량유형', key: 'defect_type_nm', width: 20 },
    { header: '불량원인', key: 'defect_cause_nm', width: 20 },
    { header: '공정', key: 'process_nm', width: 18 },
    { header: '발생일', key: 'defect_date', width: 14 },
    { header: '불량수량', key: 'defect_qty', width: 12 },
  ];

  return (
    <div className="pb-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        불량분석 리포트
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
          <div className="w-40">
            <CommonCodeSelect
              groupCd="DEFECT_TYPE"
              placeholder="불량유형 전체"
              value={defectTypeCd}
              onChange={(e) => setDefectTypeCd(e.target.value || undefined)}
              showAll
              allLabel="불량유형 전체"
            />
          </div>
          <Button
            variant="primary"
            icon={<Search className="w-4 h-4" />}
            onClick={handleSearch}
            loading={loading}
          >
            조회
          </Button>
          <Button icon={<RotateCcw className="w-4 h-4" />} onClick={handleReset}>
            초기화
          </Button>
        </div>
      </div>

      {/* Chart Row 1: Pareto + By Process */}
      <div className="flex gap-4 mt-6">
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h5 className="text-sm font-semibold text-gray-700 mb-4">불량유형 파레토</h5>
            {loading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Spinner tip="데이터를 집계하는 중입니다..." />
              </div>
            ) : paretoData.length > 0 ? (
              <DefectParetoChart
                data={paretoData}
                onBarClick={(name) => setSelectedDefectType(name)}
                selectedType={selectedDefectType}
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <Empty description="데이터가 없습니다" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h5 className="text-sm font-semibold text-gray-700 mb-4">공정별 불량률</h5>
            {loading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Spinner tip="데이터를 집계하는 중입니다..." />
              </div>
            ) : processData.length > 0 ? (
              <DefectByProcessChart data={processData} />
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <Empty description="데이터가 없습니다" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Row 2: Trend */}
      <div className="bg-white rounded-xl p-4 shadow-sm mt-6">
        <h5 className="text-sm font-semibold text-gray-700 mb-4">불량률 추이</h5>
        {loading ? (
          <div className="h-[320px] flex items-center justify-center">
            <Spinner tip="데이터를 집계하는 중입니다..." />
          </div>
        ) : trendData.length > 0 ? (
          <DefectRateTrendChart data={trendData} />
        ) : (
          <div className="h-[320px] flex items-center justify-center">
            <Empty description="데이터가 없습니다" />
          </div>
        )}
      </div>

      {/* DataGrid */}
      <div className="bg-white rounded-xl p-4 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h5 className="text-sm font-semibold text-gray-700">불량 상세</h5>
            {selectedDefectType && (
              <Tag color="blue">
                {selectedDefectType} 필터 적용 중
                <button
                  className="ml-1.5 text-xs hover:opacity-70"
                  onClick={() => setSelectedDefectType(null)}
                >
                  ✕
                </button>
              </Tag>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedDefectType && (
              <Button size="small" onClick={() => setSelectedDefectType(null)}>
                전체 보기
              </Button>
            )}
            <ExcelDownloadButton
              filename={`불량분석_${startDate}_${endDate}`}
              columns={excelColumns}
              data={filteredData as unknown as Record<string, unknown>[]}
              disabled={filteredData.length === 0 || loading}
            />
          </div>
        </div>
        <Table<DetailRow>
          columns={detailColumns}
          dataSource={paginatedData}
          rowKey={(r, index) => `${r.defect_type_cd}-${r.defect_date}-${r.defect_qty}-${index}`}
          loading={loading}
          scrollX={600}
          pagination={{
            current: detailPage,
            pageSize,
            total: filteredData.length,
            onChange: (p) => setDetailPage(p),
          }}
        />
      </div>
    </div>
  );
}
