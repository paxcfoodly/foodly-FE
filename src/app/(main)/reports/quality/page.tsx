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
  Tag,
  Table,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import DefectParetoChart from '@/components/reports/DefectParetoChart';
import DefectByProcessChart from '@/components/reports/DefectByProcessChart';
import DefectRateTrendChart from '@/components/reports/DefectRateTrendChart';
import ExcelDownloadButton from '@/components/common/ExcelDownloadButton';
import CommonCodeSelect from '@/components/common/CommonCodeSelect';
import apiClient from '@/lib/apiClient';

const { RangePicker } = DatePicker;

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
}

// ─── Columns ───

const detailColumns: ColumnsType<DetailRow> = [
  { title: '불량유형', dataIndex: 'defect_type_nm', key: 'defect_type_nm', width: 130, ellipsis: true },
  { title: '불량원인', dataIndex: 'defect_cause_nm', key: 'defect_cause_nm', width: 130, ellipsis: true },
  { title: '공정', dataIndex: 'process_nm', key: 'process_nm', width: 120, ellipsis: true },
  { title: '발생일', dataIndex: 'defect_date', key: 'defect_date', width: 120 },
  {
    title: '불량수량',
    dataIndex: 'defect_qty',
    key: 'defect_qty',
    width: 100,
    align: 'right',
    sorter: (a, b) => a.defect_qty - b.defect_qty,
  },
];

// ─── Page ───

export default function QualityReportPage() {
  const defaultEnd = dayjs();
  const defaultStart = defaultEnd.subtract(30, 'day');

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([defaultStart, defaultEnd]);
  const [defectTypeCd, setDefectTypeCd] = useState<string | undefined>(undefined);

  const [paretoData, setParetoData] = useState<ParetoRow[]>([]);
  const [processData, setProcessData] = useState<ByProcessRow[]>([]);
  const [trendData, setTrendData] = useState<TrendRow[]>([]);
  const [detailData, setDetailData] = useState<DetailRow[]>([]);
  const [selectedDefectType, setSelectedDefectType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startDate = dateRange[0].format('YYYY-MM-DD');
  const endDate = dateRange[1].format('YYYY-MM-DD');

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
    setDateRange([start, end]);
    setDefectTypeCd(undefined);
    setSelectedDefectType(null);
    fetchAll(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
  };

  // Pareto drill-down: client-side filter by defect_type_nm
  const filteredData: DetailRow[] =
    selectedDefectType
      ? detailData.filter((r) => r.defect_type_nm === selectedDefectType)
      : detailData;

  // Excel columns
  const excelColumns = [
    { header: '불량유형', key: 'defect_type_nm', width: 20 },
    { header: '불량원인', key: 'defect_cause_nm', width: 20 },
    { header: '공정', key: 'process_nm', width: 18 },
    { header: '발생일', key: 'defect_date', width: 14 },
    { header: '불량수량', key: 'defect_qty', width: 12 },
  ];

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        불량분석 리포트
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
          <CommonCodeSelect
            groupCd="DEFECT_TYPE"
            placeholder="불량유형 전체"
            value={defectTypeCd}
            onChange={(val: string) => setDefectTypeCd(val || undefined)}
            style={{ width: 160 }}
            showAll
            allLabel="불량유형 전체"
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
          >
            조회
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            초기화
          </Button>
        </Space>
      </Card>

      {/* Chart Row 1: Pareto + By Process */}
      <Flex gap={16} style={{ marginTop: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card size="small" title="불량유형 파레토">
            {loading ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin tip="데이터를 집계하는 중입니다..." />
              </div>
            ) : paretoData.length > 0 ? (
              <DefectParetoChart
                data={paretoData}
                onBarClick={(name) => setSelectedDefectType(name)}
                selectedType={selectedDefectType}
              />
            ) : (
              <Empty description="데이터가 없습니다" style={{ height: 280, paddingTop: 80 }} />
            )}
          </Card>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card size="small" title="공정별 불량률">
            {loading ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin tip="데이터를 집계하는 중입니다..." />
              </div>
            ) : processData.length > 0 ? (
              <DefectByProcessChart data={processData} />
            ) : (
              <Empty description="데이터가 없습니다" style={{ height: 280, paddingTop: 80 }} />
            )}
          </Card>
        </div>
      </Flex>

      {/* Chart Row 2: Trend */}
      <Card size="small" title="불량률 추이" style={{ marginTop: 24 }}>
        {loading ? (
          <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin tip="데이터를 집계하는 중입니다..." />
          </div>
        ) : trendData.length > 0 ? (
          <DefectRateTrendChart data={trendData} />
        ) : (
          <Empty description="데이터가 없습니다" style={{ height: 320, paddingTop: 100 }} />
        )}
      </Card>

      {/* DataGrid */}
      <Card
        size="small"
        title={
          <Space>
            <span>불량 상세</span>
            {selectedDefectType && (
              <Tag
                color="blue"
                closable
                onClose={() => setSelectedDefectType(null)}
              >
                {selectedDefectType} 필터 적용 중
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
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
          </Space>
        }
        style={{ marginTop: 24 }}
      >
        <Table<DetailRow>
          columns={detailColumns}
          dataSource={filteredData}
          rowKey={(r, index) => `${r.defect_type_cd}-${r.defect_date}-${r.defect_qty}-${index}`}
          loading={loading}
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 20, showTotal: (total) => `총 ${total}건` }}
        />
      </Card>
    </div>
  );
}
