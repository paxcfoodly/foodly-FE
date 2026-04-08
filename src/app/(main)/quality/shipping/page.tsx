'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import DataGrid, { type DataGridColumn } from '@/components/common/DataGrid';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import ExcelDownloadButton from '@/components/common/ExcelDownloadButton';
import InspectionFormModal from '@/components/quality/InspectionFormModal';
import apiClient from '@/lib/apiClient';

/* ── Types ─────────────────────────────────────────── */

interface InspectResult {
  inspect_result_id: number;
  inspect_no: string;
  inspect_type: string;
  lot_no: string;
  judge: string;
  create_dt: string;
  remark?: string;
  item?: { item_nm: string };
  [key: string]: unknown;
}

/* ── Search field definitions ───────────────────── */

const SEARCH_FIELDS: SearchFieldDef[] = [
  {
    name: 'lot_no',
    label: 'LOT번호',
    type: 'text',
    placeholder: 'LOT번호 입력',
  },
  {
    name: 'item_nm',
    label: '품목',
    type: 'text',
    placeholder: '품목명 입력',
  },
  {
    name: 'date_range',
    label: '기간',
    type: 'dateRange',
  },
  {
    name: 'judge',
    label: '판정',
    type: 'select',
    options: [
      { value: '', label: '전체' },
      { value: 'PASS', label: '합격' },
      { value: 'FAIL', label: '불합격' },
    ],
  },
];

/* ── Column definitions ─────────────────────────── */

const COLUMNS: DataGridColumn<InspectResult>[] = [
  {
    title: '검사번호',
    dataIndex: 'inspect_no',
    width: 140,
  },
  {
    title: '품목',
    dataIndex: 'item',
    width: 220,
    ellipsis: true,
    render: (val: unknown) => {
      const item = val as { item_nm?: string } | null;
      return item?.item_nm ?? '-';
    },
  },
  {
    title: 'LOT',
    dataIndex: 'lot_no',
    width: 160,
  },
  {
    title: '판정',
    dataIndex: 'judge',
    width: 90,
    align: 'center',
    render: (val: unknown) => {
      const judge = val as string;
      if (judge === 'PASS') return <Tag color="success">합격</Tag>;
      if (judge === 'FAIL') return <Tag color="error">불합격</Tag>;
      return '-';
    },
  },
  {
    title: '검사일',
    dataIndex: 'create_dt',
    width: 120,
    render: (val: unknown) => {
      if (!val) return '-';
      return String(val).slice(0, 10);
    },
  },
];

/* ── Excel columns ───────────────────────────────── */

const EXCEL_COLUMNS = [
  { header: '검사번호', key: 'inspect_no', width: 18 },
  { header: '품목', key: 'item_nm', width: 22 },
  { header: 'LOT', key: 'lot_no', width: 18 },
  { header: '판정', key: 'judge_label', width: 10 },
  { header: '검사일', key: 'create_dt', width: 16 },
];

/* ── Component ────────────────────────────────────── */

export default function ShippingInspectionPage() {
  const [data, setData] = useState<InspectResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useState<Record<string, unknown>>({});

  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'view'>('create');
  const [selectedRecord, setSelectedRecord] = useState<InspectResult | undefined>();

  /* ── Fetch data ─────────────────────────────────── */
  const fetchData = useCallback(
    async (p = page, ps = pageSize, params = searchParams) => {
      setLoading(true);
      try {
        const res = await apiClient.get('/v1/inspect-results', {
          params: {
            inspect_type: 'SHIPPING',
            page: p,
            limit: ps,
            ...params,
          },
        });
        const { data: rows, pagination } = res.data;
        setData(Array.isArray(rows) ? rows : []);
        setTotal(pagination?.total ?? 0);
      } catch {
        setData([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, searchParams],
  );

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Handlers ──────────────────────────────────── */

  const handleSearch = useCallback((values: Record<string, unknown>) => {
    const params: Record<string, unknown> = {};
    if (values.lot_no) params.lot_no = values.lot_no;
    if (values.item_nm) params.item_nm = values.item_nm;
    if (values.judge) params.judge = values.judge;
    if (Array.isArray(values.date_range) && values.date_range.length === 2) {
      params.start_dt = values.date_range[0];
      params.end_dt = values.date_range[1];
    }
    setSearchParams(params);
    setPage(1);
    fetchData(1, pageSize, params);
  }, [fetchData, pageSize]);

  const handleReset = useCallback(() => {
    setSearchParams({});
    setPage(1);
    fetchData(1, pageSize, {});
  }, [fetchData, pageSize]);

  const handlePageChange = useCallback(
    (p: number, ps: number) => {
      setPage(p);
      setPageSize(ps);
      fetchData(p, ps, searchParams);
    },
    [fetchData, searchParams],
  );

  const handleRowClick = useCallback((record: InspectResult) => {
    setSelectedRecord(record);
    setModalMode('view');
    setModalOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedRecord(undefined);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedRecord(undefined);
  }, []);

  const handleSaved = useCallback(() => {
    fetchData(1, pageSize, searchParams);
    setPage(1);
  }, [fetchData, pageSize, searchParams]);

  /* ── Excel data getter ──────────────────────────── */
  const getExcelData = useCallback(async () => {
    const res = await apiClient.get('/v1/inspect-results', {
      params: { inspect_type: 'SHIPPING', limit: 10000, ...searchParams },
    });
    const rows: InspectResult[] = res.data?.data ?? [];
    return rows.map((r) => ({
      inspect_no: r.inspect_no,
      item_nm: r.item?.item_nm ?? '',
      lot_no: r.lot_no,
      judge_label: r.judge === 'PASS' ? '합격' : r.judge === 'FAIL' ? '불합격' : '',
      create_dt: r.create_dt ? String(r.create_dt).slice(0, 10) : '',
    }));
  }, [searchParams]);

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* Search form */}
      <SearchForm
        fields={SEARCH_FIELDS}
        onSearch={handleSearch}
        onReset={handleReset}
        loading={loading}
      />

      {/* Toolbar */}
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            검사 등록
          </Button>
          <ExcelDownloadButton
            filename="출하검사목록"
            columns={EXCEL_COLUMNS}
            data={getExcelData}
          />
        </Space>
      </div>

      {/* Data grid */}
      <DataGrid<InspectResult>
        columns={COLUMNS}
        dataSource={data}
        rowKey="inspect_result_id"
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        emptyText="검사 데이터가 없습니다."
        scrollX={700}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
      />

      {/* Inspection modal */}
      <InspectionFormModal
        open={modalOpen}
        mode={modalMode}
        inspectType="SHIPPING"
        record={selectedRecord as Record<string, unknown> | undefined}
        onClose={handleModalClose}
        onSaved={handleSaved}
      />
    </div>
  );
}
