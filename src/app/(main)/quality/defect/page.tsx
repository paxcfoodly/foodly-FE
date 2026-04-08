'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Space, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import DataGrid, { type DataGridColumn } from '@/components/common/DataGrid';
import ExcelDownloadButton from '@/components/common/ExcelDownloadButton';
import DefectFormModal from '@/components/quality/DefectFormModal';
import DisposeFormModal from '@/components/quality/DisposeFormModal';
import apiClient from '@/lib/apiClient';

/* ── Types ──────────────────────────────────────────── */

interface DefectRow {
  defect_id: number;
  defect_no: string;
  wo_id?: number | null;
  item_cd: string;
  lot_no?: string | null;
  defect_type_cd?: string | null;
  defect_cause_cd?: string | null;
  defect_qty: number;
  status: string;
  process_cd?: string | null;
  remark?: string | null;
  file_id?: number | null;
  create_dt: string;
  item?: { item_nm: string } | null;
  lot?: { lot_status: string } | null;
  work_order?: { wo_no: string } | null;
  disposals?: Array<{
    dispose_id: number;
    dispose_type: string;
    dispose_qty: number;
    approve_by?: string | null;
    approve_dt?: string | null;
    remark?: string | null;
    create_by?: string | null;
    create_dt: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/* ── Status config ──────────────────────────────────── */

const STATUS_LABEL: Record<string, string> = {
  REGISTERED: '등록',
  PROCESSING: '처리중',
  COMPLETED: '완료',
};

const STATUS_COLOR: Record<string, string> = {
  REGISTERED: 'blue',
  PROCESSING: 'warning',
  COMPLETED: 'success',
};

/* ── Search fields ──────────────────────────────────── */

const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'defect_no', label: '불량번호', type: 'text', placeholder: '불량번호 입력' },
  { name: 'lot_no', label: 'LOT', type: 'text', placeholder: 'LOT번호 입력' },
  { name: 'item_cd', label: '품목', type: 'text', placeholder: '품목코드 입력' },
  {
    name: 'status',
    label: '상태',
    type: 'select',
    options: [
      { label: '전체', value: '' },
      { label: '등록', value: 'REGISTERED' },
      { label: '처리중', value: 'PROCESSING' },
      { label: '완료', value: 'COMPLETED' },
    ],
  },
];

/* ── Excel columns ──────────────────────────────────── */

const EXCEL_COLUMNS = [
  { header: '불량번호', key: 'defect_no', width: 20 },
  { header: 'LOT번호', key: 'lot_no', width: 20 },
  { header: '품목코드', key: 'item_cd', width: 15 },
  { header: '품목명', key: 'item_nm', width: 25 },
  { header: '불량유형', key: 'defect_type_cd', width: 15 },
  { header: '불량원인', key: 'defect_cause_cd', width: 15 },
  { header: '수량', key: 'defect_qty', width: 10 },
  { header: '상태', key: 'status', width: 12 },
  { header: '등록일', key: 'create_dt', width: 20 },
];

/* ── Component ──────────────────────────────────────── */

export default function DefectPage() {
  /* ── State ─── */
  const [defects, setDefects] = useState<DefectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // DefectFormModal state
  const [defectModalOpen, setDefectModalOpen] = useState(false);
  const [defectModalMode, setDefectModalMode] = useState<'create' | 'view'>('create');
  const [selectedDefect, setSelectedDefect] = useState<DefectRow | null>(null);

  // DisposeFormModal state
  const [disposeModalOpen, setDisposeModalOpen] = useState(false);
  const [selectedDefectIdForDispose, setSelectedDefectIdForDispose] = useState<number>(0);

  /* ── Data Fetching ─── */
  const fetchDefects = useCallback(
    async (
      page = pagination.page,
      pageSize = pagination.pageSize,
      searchFilters?: Record<string, unknown>,
    ) => {
      setLoading(true);
      try {
        const activeFilters = searchFilters ?? filters;
        const params: Record<string, unknown> = { page, limit: pageSize };

        Object.entries(activeFilters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            params[key] = val;
          }
        });

        const res = await apiClient.get('/v1/defects', { params });
        const body = res.data as {
          data: DefectRow[];
          pagination?: { page: number; pageSize: number; total: number };
        };
        setDefects(body.data ?? []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            pageSize: body.pagination.pageSize,
            total: body.pagination.total,
          });
        }
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  /* ── Fetch defect detail (for refresh after disposal) ─── */
  const refreshSelectedDefect = useCallback(async (defectId: number) => {
    try {
      const res = await apiClient.get(`/v1/defects/${defectId}`);
      const body = res.data as { data: DefectRow };
      setSelectedDefect(body.data);
    } catch {
      // Non-critical — just close
    }
  }, []);

  useEffect(() => {
    fetchDefects(1, pagination.pageSize, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Search handlers ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchDefects(1, pagination.pageSize, values);
    },
    [fetchDefects, pagination.pageSize],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchDefects(1, pagination.pageSize, {});
  }, [fetchDefects, pagination.pageSize]);

  /* ── Pagination change ─── */
  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      setPagination((prev) => ({ ...prev, page, pageSize }));
      fetchDefects(page, pageSize, filters);
    },
    [fetchDefects, filters],
  );

  /* ── Modal open/close ─── */
  const handleCreateClick = useCallback(() => {
    setSelectedDefect(null);
    setDefectModalMode('create');
    setDefectModalOpen(true);
  }, []);

  const handleRowClick = useCallback((record: DefectRow) => {
    setSelectedDefect(record);
    setDefectModalMode('view');
    setDefectModalOpen(true);
  }, []);

  const handleDefectModalClose = useCallback(() => {
    setDefectModalOpen(false);
    setSelectedDefect(null);
  }, []);

  const handleDefectSaved = useCallback(() => {
    setDefectModalOpen(false);
    setSelectedDefect(null);
    fetchDefects(pagination.page, pagination.pageSize, filters);
  }, [fetchDefects, pagination.page, pagination.pageSize, filters]);

  /* ── Disposal modal ─── */
  const handleDisposeOpen = useCallback((defectId: number) => {
    setSelectedDefectIdForDispose(defectId);
    setDefectModalOpen(false);
    setDisposeModalOpen(true);
  }, []);

  const handleDisposeClose = useCallback(() => {
    setDisposeModalOpen(false);
    setSelectedDefectIdForDispose(0);
  }, []);

  const handleDisposeSaved = useCallback(async () => {
    setDisposeModalOpen(false);
    // Refresh list
    await fetchDefects(pagination.page, pagination.pageSize, filters);
    // If defect detail was open, refresh it and reopen
    if (selectedDefect) {
      await refreshSelectedDefect(selectedDefect.defect_id);
      setDefectModalMode('view');
      setDefectModalOpen(true);
    }
    setSelectedDefectIdForDispose(0);
  }, [fetchDefects, pagination.page, pagination.pageSize, filters, selectedDefect, refreshSelectedDefect]);

  /* ── Excel data ─── */
  const getExcelData = useCallback(async () => {
    const params: Record<string, unknown> = { limit: 9999 };
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') params[key] = val;
    });
    const res = await apiClient.get('/v1/defects', { params });
    const body = res.data as { data: DefectRow[] };
    return (body.data ?? []).map((d) => ({
      ...d,
      item_nm: d.item?.item_nm ?? d.item_cd,
      status: STATUS_LABEL[d.status] ?? d.status,
    }));
  }, [filters]);

  /* ── Table columns ─── */
  const columns = useMemo<DataGridColumn<DefectRow>[]>(
    () => [
      { title: '불량번호', dataIndex: 'defect_no', width: 150, sorter: true, ellipsis: true },
      {
        title: 'LOT',
        dataIndex: 'lot_no',
        width: 130,
        ellipsis: true,
        render: (val: unknown) => (val as string) || '-',
      },
      {
        title: '품목',
        dataIndex: 'item_nm',
        width: 180,
        ellipsis: true,
        render: (_: unknown, record: DefectRow) => record.item?.item_nm ?? record.item_cd,
      },
      {
        title: '유형',
        dataIndex: 'defect_type_cd',
        width: 100,
        ellipsis: true,
        render: (val: unknown) => (val as string) || '-',
      },
      {
        title: '원인',
        dataIndex: 'defect_cause_cd',
        width: 100,
        ellipsis: true,
        render: (val: unknown) => (val as string) || '-',
      },
      {
        title: '수량',
        dataIndex: 'defect_qty',
        width: 80,
        align: 'right',
        sorter: true,
        render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '-'),
      },
      {
        title: '상태',
        dataIndex: 'status',
        width: 90,
        align: 'center',
        sorter: true,
        render: (val: unknown) => {
          const v = val as string;
          return (
            <Tag color={STATUS_COLOR[v] ?? 'default'}>
              {STATUS_LABEL[v] ?? v}
            </Tag>
          );
        },
      },
      {
        title: '등록일',
        dataIndex: 'create_dt',
        width: 160,
        sorter: true,
        render: (val: unknown) =>
          val ? new Date(val as string).toLocaleDateString('ko-KR') : '-',
      },
    ],
    [],
  );

  /* ── Render ─── */
  return (
    <div>
      {/* Search */}
      <SearchForm
        fields={SEARCH_FIELDS}
        onSearch={handleSearch}
        onReset={handleSearchReset}
        loading={loading}
      />

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ color: '#666', fontSize: 13 }}>
          총 <strong>{pagination.total.toLocaleString()}</strong>건
        </span>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateClick}>
            불량 등록
          </Button>
          <ExcelDownloadButton
            filename="불량목록"
            columns={EXCEL_COLUMNS}
            data={getExcelData}
          />
        </Space>
      </div>

      {/* Data Grid */}
      <DataGrid<DefectRow>
        columns={columns}
        dataSource={defects}
        rowKey="defect_id"
        loading={loading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={handlePageChange}
        emptyText="불량 데이터가 없습니다."
        scrollX={900}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
      />

      {/* DefectFormModal */}
      <DefectFormModal
        open={defectModalOpen}
        mode={defectModalMode}
        record={selectedDefect ?? undefined}
        onClose={handleDefectModalClose}
        onSaved={handleDefectSaved}
        onDisposeOpen={handleDisposeOpen}
      />

      {/* DisposeFormModal */}
      <DisposeFormModal
        open={disposeModalOpen}
        defectId={selectedDefectIdForDispose}
        onClose={handleDisposeClose}
        onSaved={handleDisposeSaved}
      />
    </div>
  );
}
