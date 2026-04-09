'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  DatePicker,
  Button,
  Space,
  Typography,
  Flex,
  Empty,
  Table,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import OeeGaugeChart from '@/components/equipment/OeeGaugeChart';
import AvailabilityBarChart from '@/components/equipment/AvailabilityBarChart';
import OeeTrendChart from '@/components/equipment/OeeTrendChart';
import ExcelDownloadButton from '@/components/common/ExcelDownloadButton';
import apiClient from '@/lib/apiClient';

const { RangePicker } = DatePicker;

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

const oeeColumns: ColumnsType<OeeResult & { run_hours: number; down_hours: number }> = [
  { title: '설비코드', dataIndex: 'equip_cd', key: 'equip_cd', width: 120, ellipsis: true },
  { title: '설비명', dataIndex: 'equip_nm', key: 'equip_nm', width: 150, ellipsis: true },
  {
    title: '가동률(%)',
    dataIndex: 'availability',
    key: 'availability',
    width: 100,
    align: 'right',
    render: (v: number) => v.toFixed(1),
    sorter: (a, b) => a.availability - b.availability,
  },
  {
    title: '성능률(%)',
    dataIndex: 'performance',
    key: 'performance',
    width: 100,
    align: 'right',
    render: (v: number) => v.toFixed(1),
    sorter: (a, b) => a.performance - b.performance,
  },
  {
    title: '양품률(%)',
    dataIndex: 'quality',
    key: 'quality',
    width: 100,
    align: 'right',
    render: (v: number) => v.toFixed(1),
    sorter: (a, b) => a.quality - b.quality,
  },
  {
    title: 'OEE(%)',
    dataIndex: 'oee',
    key: 'oee',
    width: 100,
    align: 'right',
    render: (v: number) => v.toFixed(1),
    sorter: (a, b) => a.oee - b.oee,
    defaultSortOrder: 'ascend',
  },
  {
    title: '가동시간(h)',
    dataIndex: 'run_hours',
    key: 'run_hours',
    width: 120,
    align: 'right',
    render: (v: number) => v.toFixed(1),
  },
  {
    title: '비가동시간(h)',
    dataIndex: 'down_hours',
    key: 'down_hours',
    width: 130,
    align: 'right',
    render: (v: number) => v.toFixed(1),
  },
  {
    title: '생산수량',
    dataIndex: 'good_qty',
    key: 'good_qty',
    width: 100,
    align: 'right',
    sorter: (a, b) => a.good_qty - b.good_qty,
  },
  {
    title: '불량수량',
    dataIndex: 'defect_qty',
    key: 'defect_qty',
    width: 100,
    align: 'right',
    sorter: (a, b) => a.defect_qty - b.defect_qty,
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

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([defaultStart, defaultEnd]);
  const [summaryData, setSummaryData] = useState<OeeResult[]>([]);
  const [trendData, setTrendData] = useState<OeeTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const startDate = dateRange[0].format('YYYY-MM-DD');
  const endDate = dateRange[1].format('YYYY-MM-DD');

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
    setDateRange([start, end]);
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
  type GridRow = OeeResult & { run_hours: number; down_hours: number };
  const gridRows: GridRow[] = summaryData.map((d) => ({
    ...d,
    run_hours: Math.round((d.total_run_min / 60) * 10) / 10,
    down_hours: Math.round((d.total_down_min / 60) * 10) / 10,
  }));

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        OEE 리포트
      </Typography.Title>

      {/* Search Form */}
      <Card size="small" style={{ marginBottom: 0 }}>
        <Space wrap>
          <span>조회 기간:</span>
          <RangePicker
            value={dateRange}
            onChange={(vals) => {
              if (vals && vals[0] && vals[1]) {
                setDateRange([vals[0], vals[1]]);
              }
            }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
            조회
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            초기화
          </Button>
        </Space>
      </Card>

      {/* OEE Gauge Cards */}
      <Card size="small" title="OEE 현황" style={{ marginTop: 24 }}>
        {loading ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin tip="데이터를 집계하는 중입니다..." />
          </div>
        ) : summaryData.length === 0 ? (
          <Empty description="데이터가 없습니다" style={{ padding: '24px 0' }} />
        ) : (
          <Flex justify="space-around" align="center" wrap="wrap" gap={16}>
            <div style={{ textAlign: 'center' }}>
              <OeeGaugeChart title="가동률" value={avgAvailability} hasData={true} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <OeeGaugeChart title="성능률" value={avgPerformance} hasData={hasProdData} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <OeeGaugeChart title="양품률" value={avgQuality} hasData={hasProdData} />
            </div>
          </Flex>
        )}
      </Card>

      {/* Availability Bar Chart */}
      <Card size="small" title="설비별 가동률" style={{ marginTop: 24 }}>
        {loading ? (
          <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin tip="데이터를 집계하는 중입니다..." />
          </div>
        ) : availabilityBarData.length > 0 ? (
          <AvailabilityBarChart data={availabilityBarData} />
        ) : (
          <Empty description="데이터가 없습니다" style={{ height: 280, paddingTop: 80 }} />
        )}
      </Card>

      {/* OEE Trend Chart */}
      <Card size="small" title="OEE 추이" style={{ marginTop: 24 }}>
        {loading ? (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin tip="데이터를 집계하는 중입니다..." />
          </div>
        ) : trendData.length > 0 ? (
          <OeeTrendChart data={trendData} />
        ) : (
          <Empty description="데이터가 없습니다" style={{ height: 240, paddingTop: 60 }} />
        )}
      </Card>

      {/* DataGrid */}
      <Card
        size="small"
        title="설비별 OEE 상세"
        extra={
          <ExcelDownloadButton
            filename={`OEE리포트_${startDate}_${endDate}`}
            columns={excelColumns}
            data={gridRows as unknown as Record<string, unknown>[]}
            disabled={gridRows.length === 0 || loading}
          />
        }
        style={{ marginTop: 24 }}
      >
        <Table<GridRow>
          columns={oeeColumns}
          dataSource={gridRows}
          rowKey="equip_cd"
          loading={loading}
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20, showTotal: (total) => `총 ${total}건` }}
        />
      </Card>
    </div>
  );
}
