'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  DatePicker,
  Button,
  Space,
  Typography,
  Select,
  Checkbox,
  Table,
  Spin,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
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
}

interface SelectOption {
  value: string;
  label: string;
}

// ─── Columns ───

const inventoryColumns: ColumnsType<InventoryRow> = [
  { title: '품목코드', dataIndex: 'item_cd', key: 'item_cd', width: 120, ellipsis: true },
  { title: '품목명', dataIndex: 'item_nm', key: 'item_nm', width: 150, ellipsis: true },
  { title: '창고', dataIndex: 'wh_nm', key: 'wh_nm', width: 120, ellipsis: true },
  {
    title: '현재고',
    dataIndex: 'qty',
    key: 'qty',
    width: 100,
    align: 'right',
    sorter: (a, b) => a.qty - b.qty,
  },
  { title: '단위', dataIndex: 'unit', key: 'unit', width: 80 },
  {
    title: '기간출고량',
    dataIndex: 'out_qty',
    key: 'out_qty',
    width: 110,
    align: 'right',
    sorter: (a, b) => a.out_qty - b.out_qty,
  },
  {
    title: '회전율(회)',
    dataIndex: 'turnover_rate',
    key: 'turnover_rate',
    width: 110,
    align: 'right',
    render: (v: number) => v.toFixed(2),
    sorter: (a, b) => a.turnover_rate - b.turnover_rate,
  },
  {
    title: '체류일수',
    dataIndex: 'days_since_last_tx',
    key: 'days_since_last_tx',
    width: 110,
    align: 'right',
    sorter: (a, b) => a.days_since_last_tx - b.days_since_last_tx,
    defaultSortOrder: 'descend',
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

// ─── Row class for stagnant highlight ───

function rowClassName(record: InventoryRow): string {
  if (record.days_since_last_tx >= 180) return 'row-danger';
  if (record.days_since_last_tx >= 90) return 'row-warning';
  return '';
}

// ─── Inline styles for warning rows ───

const stagnantStyles = `
  .row-warning td { background: #fffbe6 !important; }
  .row-danger td { background: #fff1f0 !important; }
`;

// ─── Page ───

export default function InventoryReportPage() {
  const [baseDate, setBaseDate] = useState<Dayjs>(dayjs());
  const [itemCd, setItemCd] = useState<string | undefined>(undefined);
  const [whCd, setWhCd] = useState<string | undefined>(undefined);
  const [stagnantOnly, setStagnantOnly] = useState(false);
  const [data, setData] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemOptions, setItemOptions] = useState<SelectOption[]>([]);
  const [whOptions, setWhOptions] = useState<SelectOption[]>([]);

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
      wh_cd: whCd,
      item_cd: itemCd,
      stagnant_only: stagnantOnly || undefined,
    });
  };

  const handleReset = () => {
    setBaseDate(dayjs());
    setItemCd(undefined);
    setWhCd(undefined);
    setStagnantOnly(false);
    fetchAll({});
  };

  // Chart data — top 20 items by qty
  const chartData = [...data]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 20)
    .map((d) => ({ item_nm: d.item_nm, qty: d.qty, turnover_rate: d.turnover_rate }));

  return (
    <div style={{ padding: '0 0 24px' }}>
      <style>{stagnantStyles}</style>

      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        재고현황 리포트
      </Typography.Title>

      {/* Search Form */}
      <Card size="small" style={{ marginBottom: 0 }}>
        <Space wrap>
          <span>기준일:</span>
          <DatePicker
            value={baseDate}
            onChange={(val) => { if (val) setBaseDate(val); }}
          />
          <Select
            placeholder="품목 전체"
            value={itemCd}
            onChange={(val) => setItemCd(val || undefined)}
            allowClear
            showSearch
            optionFilterProp="label"
            options={itemOptions}
            style={{ width: 200 }}
          />
          <Select
            placeholder="창고 전체"
            value={whCd}
            onChange={(val) => setWhCd(val || undefined)}
            allowClear
            options={whOptions}
            style={{ width: 160 }}
          />
          <Checkbox
            checked={stagnantOnly}
            onChange={(e) => setStagnantOnly(e.target.checked)}
          >
            장기체류만 보기
          </Checkbox>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
            조회
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            초기화
          </Button>
        </Space>
      </Card>

      {/* Chart */}
      <Card size="small" title="품목별 재고현황" style={{ marginTop: 24 }}>
        {loading ? (
          <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin tip="데이터를 집계하는 중입니다..." />
          </div>
        ) : chartData.length > 0 ? (
          <InventoryBarChart data={chartData} />
        ) : (
          <Empty description="데이터가 없습니다" style={{ height: 320, paddingTop: 100 }} />
        )}
      </Card>

      {/* DataGrid */}
      <Card
        size="small"
        title="재고 상세"
        extra={
          <ExcelDownloadButton
            filename={`재고현황_${baseDate.format('YYYY-MM-DD')}`}
            columns={excelColumns}
            data={data as unknown as Record<string, unknown>[]}
            disabled={data.length === 0 || loading}
          />
        }
        style={{ marginTop: 24 }}
      >
        <Table<InventoryRow>
          columns={inventoryColumns}
          dataSource={data}
          rowKey={(r) => `${r.item_cd}-${r.wh_cd}`}
          rowClassName={rowClassName}
          loading={loading}
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20, showTotal: (total) => `총 ${total}건` }}
        />
      </Card>
    </div>
  );
}
