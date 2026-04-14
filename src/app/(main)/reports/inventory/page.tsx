'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import dayjs from 'dayjs';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Empty from '@/components/ui/Empty';
import Table, { type TableColumn } from '@/components/ui/Table';
import InventoryBarChart from '@/components/reports/InventoryBarChart';
import ExcelDownloadButton from '@/components/common/ExcelDownloadButton';
import apiClient from '@/lib/apiClient';

// ─── Types ───

interface InventoryRow {
  item_cd: string;
  item_nm: string;
  wh_cd: string;
  wh_nm: string;
  qty: number;
  unit: string;
  out_qty: number;
  turnover_rate: number;
  days_since_last_tx: number;
  is_stagnant: boolean;
  [key: string]: unknown;
}

interface SelectOption {
  value: string;
  label: string;
}

// ─── Columns ───

const inventoryColumns: TableColumn<InventoryRow>[] = [
  { title: '품목코드', dataIndex: 'item_cd', width: 120, ellipsis: true },
  { title: '품목명', dataIndex: 'item_nm', width: 150, ellipsis: true },
  { title: '창고', dataIndex: 'wh_nm', width: 120, ellipsis: true },
  {
    title: '현재고',
    dataIndex: 'qty',
    width: 100,
    align: 'right',
    sorter: true,
  },
  { title: '단위', dataIndex: 'unit', width: 80 },
  {
    title: '기간출고량',
    dataIndex: 'out_qty',
    width: 110,
    align: 'right',
    sorter: true,
  },
  {
    title: '회전율(회)',
    dataIndex: 'turnover_rate',
    width: 110,
    align: 'right',
    sorter: true,
    render: (v: unknown) => Number(v).toFixed(2),
  },
  {
    title: '체류일수',
    dataIndex: 'days_since_last_tx',
    width: 110,
    align: 'right',
    sorter: true,
  },
];

const excelColumns = [
  { header: '품목코드', key: 'item_cd', width: 15 },
  { header: '품목명', key: 'item_nm', width: 20 },
  { header: '창고', key: 'wh_nm', width: 15 },
  { header: '현재고', key: 'qty', width: 12 },
  { header: '단위', key: 'unit', width: 8 },
  { header: '기간출고량', key: 'out_qty', width: 14 },
  { header: '회전율(회)', key: 'turnover_rate', width: 12 },
  { header: '체류일수', key: 'days_since_last_tx', width: 12 },
];

// ─── Inline styles for warning rows ───

const stagnantStyles = `
  .row-warning td { background: #fffbe6 !important; }
  .row-danger td { background: #fff1f0 !important; }
`;

// ─── Page ───

export default function InventoryReportPage() {
  const [itemCd, setItemCd] = useState<string>('');
  const [whCd, setWhCd] = useState<string>('');
  const [stagnantOnly, setStagnantOnly] = useState(false);
  const [data, setData] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemOptions, setItemOptions] = useState<SelectOption[]>([]);
  const [whOptions, setWhOptions] = useState<SelectOption[]>([]);

  const [tablePage, setTablePage] = useState(1);
  const pageSize = 20;

  // Load dropdown options on mount
  useEffect(() => {
    Promise.all([
      apiClient.get('/v1/items', { params: { page: 1, pageSize: 200 } }),
      apiClient.get('/v1/warehouses', { params: { page: 1, pageSize: 100 } }),
    ])
      .then(([itemsRes, whRes]) => {
        const items = itemsRes.data.data?.items ?? itemsRes.data.data ?? [];
        const whs = whRes.data.data?.items ?? whRes.data.data ?? [];
        setItemOptions(
          items.map((i: { item_cd: string; item_nm: string }) => ({
            value: i.item_cd,
            label: `${i.item_nm} (${i.item_cd})`,
          })),
        );
        setWhOptions(
          whs.map((w: { wh_cd: string; wh_nm: string }) => ({
            value: w.wh_cd,
            label: w.wh_nm,
          })),
        );
      })
      .catch(() => {});
  }, []);

  const fetchAll = useCallback(
    async (params: { wh_cd?: string; item_cd?: string; stagnant_only?: boolean }) => {
      setLoading(true);
      try {
        const res = await apiClient.get('/v1/reports/inventory/summary', { params });
        setData(res.data.data ?? []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchAll({});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    fetchAll({
      wh_cd: whCd || undefined,
      item_cd: itemCd || undefined,
      stagnant_only: stagnantOnly || undefined,
    });
  };

  const handleReset = () => {
    setItemCd('');
    setWhCd('');
    setStagnantOnly(false);
    fetchAll({});
  };

  // Chart data — top 20 items by qty
  const chartData = [...data]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 20)
    .map((d) => ({ item_nm: d.item_nm, qty: d.qty, turnover_rate: d.turnover_rate }));

  const paginatedData = data.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  return (
    <div className="pb-6">
      <style>{stagnantStyles}</style>

      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        재고현황 리포트
      </h4>

      {/* Search Form */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={itemCd}
            onChange={(e) => setItemCd(e.target.value)}
            className="h-9 w-[200px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
          >
            <option value="">품목 전체</option>
            {itemOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={whCd}
            onChange={(e) => setWhCd(e.target.value)}
            className="h-9 w-[160px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
          >
            <option value="">창고 전체</option>
            {whOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={stagnantOnly}
              onChange={(e) => setStagnantOnly(e.target.checked)}
              className="accent-cyan-600"
            />
            장기체류만 보기
          </label>
          <Button variant="primary" icon={<Search className="w-4 h-4" />} onClick={handleSearch} loading={loading}>
            조회
          </Button>
          <Button icon={<RotateCcw className="w-4 h-4" />} onClick={handleReset}>
            초기화
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-4 shadow-sm mt-6">
        <h5 className="text-sm font-semibold text-gray-700 mb-4">품목별 재고현황</h5>
        {loading ? (
          <div className="h-[320px] flex items-center justify-center">
            <Spinner tip="데이터를 집계하는 중입니다..." />
          </div>
        ) : chartData.length > 0 ? (
          <InventoryBarChart data={chartData} />
        ) : (
          <div className="h-[320px] flex items-center justify-center">
            <Empty description="데이터가 없습니다" />
          </div>
        )}
      </div>

      {/* DataGrid */}
      <div className="bg-white rounded-xl p-4 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-sm font-semibold text-gray-700">재고 상세</h5>
          <ExcelDownloadButton
            filename={`재고현황_${dayjs().format('YYYY-MM-DD')}`}
            columns={excelColumns}
            data={data as unknown as Record<string, unknown>[]}
            disabled={data.length === 0 || loading}
          />
        </div>
        <Table<InventoryRow>
          columns={inventoryColumns}
          dataSource={paginatedData}
          rowKey={(r) => `${r.item_cd}-${r.wh_cd}`}
          loading={loading}
          scrollX={900}
          onRow={(record) => ({
            className:
              record.days_since_last_tx >= 180
                ? 'row-danger'
                : record.days_since_last_tx >= 90
                  ? 'row-warning'
                  : '',
          })}
          pagination={{
            current: tablePage,
            pageSize,
            total: data.length,
            onChange: (p) => setTablePage(p),
          }}
        />
      </div>
    </div>
  );
}
