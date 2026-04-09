'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, Typography, Space, Flex } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import SearchForm from '@/components/common/SearchForm';
import DataGrid from '@/components/common/DataGrid';
import ExcelDownloadButton from '@/components/common/ExcelDownloadButton';
import ProdDailyBarChart from '@/components/reports/ProdDailyBarChart';
import apiClient from '@/lib/apiClient';

// ─── Interfaces ───

interface DailyPoint {
  date: string;
  good_qty: number;
  defect_qty: number;
  order_qty: number;
  achieve_rate: number;
  defect_rate: number;
}

interface SummaryRow {
  group_key: string;
  group_nm: string;
  good_qty: number;
  defect_qty: number;
  order_qty: number;
  achieve_rate: number;
  defect_rate: number;
  work_minutes: number;
  worker_count: number;
}

interface ItemOption {
  label: string;
  value: string;
}

interface WorkshopOption {
  label: string;
  value: string;
}

// ─── Helpers ───

const GROUP_BY_OPTIONS = [
  { label: '품목별', value: 'item' },
  { label: '라인별', value: 'workshop' },
  { label: '작업자별', value: 'worker' },
];

export default function ProductionReportPage() {
  const defaultEnd = dayjs();
  const defaultStart = defaultEnd.subtract(30, 'day');

  const [dateRange] = useState<[Dayjs, Dayjs]>([defaultStart, defaultEnd]);
  const [loading, setLoading] = useState(false);
  const [dailyData, setDailyData] = useState<DailyPoint[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
  const [groupBy, setGroupBy] = useState<string>('item');
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [workshopOptions, setWorkshopOptions] = useState<WorkshopOption[]>([]);

  // Track current filter params for excel download filename
  const [currentStart, setCurrentStart] = useState(defaultStart.format('YYYY-MM-DD'));
  const [currentEnd, setCurrentEnd] = useState(defaultEnd.format('YYYY-MM-DD'));

  const fetchAll = useCallback(
    async (
      start: string,
      end: string,
      gb: string,
      itemCd?: string,
      workshopCd?: string,
      workerId?: string,
    ) => {
      setLoading(true);
      try {
        const params: Record<string, string> = { start, end, group_by: gb };
        if (itemCd) params.item_cd = itemCd;
        if (workshopCd) params.workshop_cd = workshopCd;
        if (workerId) params.worker_id = workerId;

        const [dailyRes, summaryRes] = await Promise.all([
          apiClient.get('/v1/reports/production/daily', { params }),
          apiClient.get('/v1/reports/production/summary', { params }),
        ]);

        setDailyData(dailyRes.data.data ?? []);
        setSummaryData(summaryRes.data.data ?? []);
        setCurrentStart(start);
        setCurrentEnd(end);
        setGroupBy(gb);
      } catch {
        setDailyData([]);
        setSummaryData([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Fetch dropdown options
  const fetchOptions = useCallback(async () => {
    try {
      const [itemsRes, workshopsRes] = await Promise.all([
        apiClient.get('/v1/items', { params: { limit: 500 } }),
        apiClient.get('/v1/workshops', { params: { limit: 500 } }),
      ]);
      const items: ItemOption[] = (itemsRes.data.data ?? []).map(
        (i: { item_cd: string; item_nm: string }) => ({
          label: `${i.item_cd} - ${i.item_nm}`,
          value: i.item_cd,
        }),
      );
      const workshops: WorkshopOption[] = (workshopsRes.data.data ?? []).map(
        (w: { workshop_cd: string; workshop_nm: string }) => ({
          label: `${w.workshop_cd} - ${w.workshop_nm}`,
          value: w.workshop_cd,
        }),
      );
      setItemOptions(items);
      setWorkshopOptions(workshops);
    } catch {
      // options are optional — fail silently
    }
  }, []);

  useEffect(() => {
    fetchOptions();
    fetchAll(
      defaultStart.format('YYYY-MM-DD'),
      defaultEnd.format('YYYY-MM-DD'),
      'item',
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      const dateRangeVal = values.dateRange as string[] | undefined;
      const start = dateRangeVal?.[0] ?? dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      const end = dateRangeVal?.[1] ?? dayjs().format('YYYY-MM-DD');
      const gb = (values.group_by as string) ?? 'item';
      const itemCd = values.item_cd as string | undefined;
      const workshopCd = values.workshop_cd as string | undefined;
      fetchAll(start, end, gb, itemCd, workshopCd);
    },
    [fetchAll],
  );

  const handleReset = useCallback(() => {
    const end = dayjs().format('YYYY-MM-DD');
    const start = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    fetchAll(start, end, 'item');
  }, [fetchAll]);

  // ─── DataGrid columns (dynamic based on groupBy) ───

  const summaryColumns = React.useMemo(() => {
    const baseColumns = [
      { title: '생산량', dataIndex: 'good_qty', width: 100, sorter: true, align: 'right' as const },
      { title: '목표량', dataIndex: 'order_qty', width: 100, sorter: true, align: 'right' as const },
      {
        title: '달성률(%)',
        dataIndex: 'achieve_rate',
        width: 100,
        sorter: true,
        align: 'right' as const,
        render: (v: unknown) => `${Number(v).toFixed(1)}%`,
      },
      { title: '불량수량', dataIndex: 'defect_qty', width: 100, sorter: true, align: 'right' as const },
      {
        title: '불량률(%)',
        dataIndex: 'defect_rate',
        width: 100,
        sorter: true,
        align: 'right' as const,
        render: (v: unknown) => `${Number(v).toFixed(1)}%`,
      },
      {
        title: '가동시간(h)',
        dataIndex: 'work_hours',
        width: 110,
        sorter: true,
        align: 'right' as const,
        render: (_: unknown, record: Record<string, unknown>) =>
          (Number(record.work_minutes) / 60).toFixed(1),
      },
      {
        title: '작업인원',
        dataIndex: 'worker_count',
        width: 100,
        sorter: true,
        align: 'right' as const,
      },
    ];

    if (groupBy === 'workshop') {
      return [
        { title: '라인코드', dataIndex: 'group_key', width: 120, sorter: true },
        { title: '라인명', dataIndex: 'group_nm', width: 150, sorter: true },
        ...baseColumns,
      ];
    } else if (groupBy === 'worker') {
      return [
        { title: '작업자ID', dataIndex: 'group_key', width: 120, sorter: true },
        { title: '작업자명', dataIndex: 'group_nm', width: 150, sorter: true },
        ...baseColumns,
      ];
    } else {
      // item (default)
      return [
        { title: '품목코드', dataIndex: 'group_key', width: 120, sorter: true },
        { title: '품목명', dataIndex: 'group_nm', width: 150, sorter: true },
        ...baseColumns,
      ];
    }
  }, [groupBy]);

  // ─── Excel columns + data ───

  const excelColumns = React.useMemo(() => {
    const groupKeyHeader = groupBy === 'workshop' ? '라인코드' : groupBy === 'worker' ? '작업자ID' : '품목코드';
    const groupNmHeader = groupBy === 'workshop' ? '라인명' : groupBy === 'worker' ? '작업자명' : '품목명';
    return [
      { header: groupKeyHeader, key: 'group_key', width: 15 },
      { header: groupNmHeader, key: 'group_nm', width: 20 },
      { header: '생산량', key: 'good_qty', width: 12 },
      { header: '목표량', key: 'order_qty', width: 12 },
      { header: '달성률(%)', key: 'achieve_rate', width: 12 },
      { header: '불량수량', key: 'defect_qty', width: 12 },
      { header: '불량률(%)', key: 'defect_rate', width: 12 },
      { header: '가동시간(분)', key: 'work_minutes', width: 14 },
      { header: '작업인원', key: 'worker_count', width: 12 },
    ];
  }, [groupBy]);

  const excelData = React.useMemo(
    () =>
      summaryData.map((row) => ({
        group_key: row.group_key,
        group_nm: row.group_nm,
        good_qty: row.good_qty,
        order_qty: row.order_qty,
        achieve_rate: row.achieve_rate,
        defect_qty: row.defect_qty,
        defect_rate: row.defect_rate,
        work_minutes: row.work_minutes,
        worker_count: row.worker_count,
      })),
    [summaryData],
  );

  // ─── Search fields ───

  const searchFields = React.useMemo(
    () => [
      {
        name: 'dateRange',
        label: '조회 기간',
        type: 'dateRange' as const,
        defaultValue: dateRange,
        span: 8,
      },
      {
        name: 'group_by',
        label: '집계 기준',
        type: 'select' as const,
        defaultValue: 'item',
        options: GROUP_BY_OPTIONS,
        span: 4,
      },
      {
        name: 'item_cd',
        label: '품목',
        type: 'select' as const,
        placeholder: '전체',
        options: itemOptions,
        span: 6,
      },
      {
        name: 'workshop_cd',
        label: '라인',
        type: 'select' as const,
        placeholder: '전체',
        options: workshopOptions,
        span: 6,
      },
    ],
    [dateRange, itemOptions, workshopOptions],
  );

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        생산일보
      </Typography.Title>

      {/* SearchForm */}
      <SearchForm
        fields={searchFields}
        onSearch={handleSearch}
        onReset={handleReset}
        loading={loading}
      />

      {/* Chart */}
      <Card size="small" title="일별 생산량 / 달성률" style={{ marginTop: 24 }}>
        {dailyData.length > 0 ? (
          <ProdDailyBarChart data={dailyData} />
        ) : (
          <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bfbfbf' }}>
            데이터가 없습니다
          </div>
        )}
      </Card>

      {/* DataGrid */}
      <Card
        size="small"
        title="생산 집계"
        style={{ marginTop: 24 }}
        extra={
          <Space>
            <ExcelDownloadButton
              filename={`생산일보_${currentStart}_${currentEnd}`}
              columns={excelColumns}
              data={excelData}
              label="엑셀 다운로드"
              disabled={summaryData.length === 0}
            />
          </Space>
        }
      >
        <DataGrid
          columns={summaryColumns}
          dataSource={summaryData as unknown as Record<string, unknown>[]}
          rowKey="group_key"
          loading={loading}
          emptyText="데이터가 없습니다"
          scrollX={1100}
          sortBy="group_key"
          sortOrder="asc"
        />
      </Card>
    </div>
  );
}
