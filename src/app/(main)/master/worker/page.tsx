'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Space,
  Tag,
  Form,
  Input,
  Select,
  Table,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import ExcelUploadButton from '@/components/common/ExcelUploadButton';
import ExcelDownloadButton, { type ExcelColumn } from '@/components/common/ExcelDownloadButton';
import DataHistoryDrawer from '@/components/common/DataHistoryDrawer';
import CommonCodeSelect from '@/components/common/CommonCodeSelect';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

/* ── Types ─────────────────────────────────────────── */

interface WorkerRow {
  worker_id: string;
  worker_nm: string;
  dept_cd: string | null;
  workshop_cd: string | null;
  shift_cd: string | null;
  use_yn: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  [key: string]: unknown;
}

interface WorkerFormValues {
  worker_id: string;
  worker_nm: string;
  dept_cd?: string;
  workshop_cd?: string;
  shift_cd?: string;
  use_yn?: string;
  [key: string]: unknown;
}

interface WorkshopOption {
  workshop_cd: string;
  workshop_nm: string;
}

const MENU_URL = '/master/worker';

const USE_YN_OPTIONS = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
];

/* ── Excel columns ─── */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: '사번', key: 'worker_id', width: 15 },
  { header: '작업자명', key: 'worker_nm', width: 20 },
  { header: '부서코드', key: 'dept_cd', width: 12 },
  { header: '작업장코드', key: 'workshop_cd', width: 15 },
  { header: '교대코드', key: 'shift_cd', width: 12 },
  { header: '사용여부', key: 'use_yn', width: 10 },
];

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'worker_id', label: '사번', type: 'text', placeholder: '사번 입력' },
  { name: 'worker_nm', label: '작업자명', type: 'text', placeholder: '작업자명 입력' },
  {
    name: 'use_yn',
    label: '사용여부',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...USE_YN_OPTIONS],
  },
];

/* ── Component ─────────────────────────────────────── */

export default function WorkerMasterPage() {
  /* ── State ─── */
  const [items, setItems] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<WorkerRow | null>(null);

  // History drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCd, setHistoryCd] = useState('');

  // Workshop dropdown options
  const [workshopOptions, setWorkshopOptions] = useState<{ label: string; value: string }[]>([]);

  /* ── Load workshop options ─── */
  useEffect(() => {
    apiClient
      .get<PaginatedResponse<WorkshopOption>>('/v1/workshops', { params: { limit: 9999, use_yn: 'Y' } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setWorkshopOptions(list.map((w) => ({ label: `${w.workshop_cd} - ${w.workshop_nm}`, value: w.workshop_cd })));
      })
      .catch(() => {});
  }, []);

  /* ── Data Fetching ─── */
  const fetchItems = useCallback(
    async (
      page = pagination.page,
      pageSize = pagination.pageSize,
      sort?: string,
      order?: 'asc' | 'desc',
      searchFilters?: Record<string, unknown>,
    ) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page, limit: pageSize };
        const activeFilters = searchFilters ?? filters;
        if (sort) params.sortBy = sort;
        if (order) params.sortOrder = order;
        Object.entries(activeFilters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') params[key] = val;
        });

        const res = await apiClient.get<PaginatedResponse<WorkerRow>>('/v1/workers', { params });
        const body = res.data;
        setItems(body.data ?? []);
        if (body.pagination) {
          setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
        }
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '작업자 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => {
    fetchItems(1, pagination.pageSize, sortField, sortOrder, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Handlers ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchItems(1, pagination.pageSize, sortField, sortOrder, values);
    },
    [fetchItems, pagination.pageSize, sortField, sortOrder],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchItems(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchItems, pagination.pageSize, sortField, sortOrder]);

  const handleTableChange = useCallback(
    (
      paginationConfig: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: SorterResult<WorkerRow> | SorterResult<WorkerRow>[],
    ) => {
      const newPage = paginationConfig.current ?? 1;
      const newPageSize = paginationConfig.pageSize ?? 20;
      let newSortField: string | undefined;
      let newSortOrder: 'asc' | 'desc' | undefined;
      if (!Array.isArray(sorter) && sorter.field && sorter.order) {
        newSortField = sorter.field as string;
        newSortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
      }
      setSortField(newSortField);
      setSortOrder(newSortOrder);
      setPagination((prev) => ({ ...prev, page: newPage, pageSize: newPageSize }));
      fetchItems(newPage, newPageSize, newSortField, newSortOrder, filters);
    },
    [fetchItems, filters],
  );

  const handleCreate = useCallback(() => {
    setEditItem(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: WorkerRow) => {
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: WorkerFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/workers', {
          worker_id: values.worker_id,
          worker_nm: values.worker_nm,
          dept_cd: values.dept_cd || null,
          workshop_cd: values.workshop_cd || null,
          shift_cd: values.shift_cd || null,
        });
      } else {
        await apiClient.put(`/v1/workers/${editItem!.worker_id}`, {
          worker_nm: values.worker_nm,
          dept_cd: values.dept_cd || null,
          workshop_cd: values.workshop_cd || null,
          shift_cd: values.shift_cd || null,
          use_yn: values.use_yn,
        });
      }
      fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: WorkerRow) => {
      try {
        await apiClient.delete(`/v1/workers/${record.worker_id}`);
        message.success('작업자가 삭제되었습니다.');
        fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleHistory = useCallback((record: WorkerRow) => {
    setHistoryCd(record.worker_id);
    setHistoryOpen(true);
  }, []);

  const fetchExcelData = useCallback(async () => {
    const res = await apiClient.get<PaginatedResponse<WorkerRow>>('/v1/workers', { params: { limit: 99999 } });
    return (res.data?.data ?? []) as Record<string, unknown>[];
  }, []);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return undefined;
    return {
      worker_id: editItem.worker_id,
      worker_nm: editItem.worker_nm,
      dept_cd: editItem.dept_cd ?? undefined,
      workshop_cd: editItem.workshop_cd ?? undefined,
      shift_cd: editItem.shift_cd ?? undefined,
      use_yn: editItem.use_yn,
    } as Partial<WorkerFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      { title: '사번', dataIndex: 'worker_id', width: 120, sorter: true, ellipsis: true },
      { title: '작업자명', dataIndex: 'worker_nm', width: 150, sorter: true, ellipsis: true },
      { title: '부서코드', dataIndex: 'dept_cd', width: 100, ellipsis: true, render: (val: unknown) => (val as string) || '-' },
      { title: '작업장', dataIndex: 'workshop_cd', width: 120, ellipsis: true, render: (val: unknown) => (val as string) || '-' },
      { title: '교대코드', dataIndex: 'shift_cd', width: 100, ellipsis: true, render: (val: unknown) => (val as string) || '-' },
      {
        title: '사용여부',
        dataIndex: 'use_yn',
        width: 80,
        align: 'center' as const,
        render: (val: unknown) => (
          <Tag color={(val as string) === 'Y' ? 'green' : 'default'}>
            {(val as string) === 'Y' ? '사용' : '미사용'}
          </Tag>
        ),
      },
      {
        title: '등록일',
        dataIndex: 'create_dt',
        width: 110,
        sorter: true,
        render: (val: unknown) => (val ? dayjs(val as string).format('YYYY-MM-DD') : '-'),
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 130,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: WorkerRow) => (
          <Space size={4}>
            <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)}>{''}</PermissionButton>
            <Popconfirm title="작업자를 삭제하시겠습니까?" description="다른 데이터에서 참조 중인 경우 삭제가 거부됩니다." onConfirm={() => handleDelete(record)} okText="삭제" cancelText="취소">
              <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" type="text" danger icon={<DeleteOutlined />}>{''}</PermissionButton>
            </Popconfirm>
            <Button size="small" type="text" icon={<HistoryOutlined />} onClick={() => handleHistory(record)} />
          </Space>
        ),
      },
    ],
    [handleEdit, handleDelete, handleHistory],
  );

  /* ── Render ─── */
  return (
    <div>
      <SearchForm
        fields={SEARCH_FIELDS}
        onSearch={handleSearch}
        onReset={handleSearchReset}
        loading={loading}
        extraButtons={
          <Space>
            <ExcelUploadButton uploadUrl="/v1/workers/import" onComplete={() => fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters)} />
            <ExcelDownloadButton filename="작업자목록" columns={EXCEL_COLUMNS} data={fetchExcelData} />
          </Space>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#666', fontSize: 13 }}>총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} type="primary" icon={<PlusOutlined />} onClick={handleCreate}>작업자 등록</PermissionButton>
      </div>

      <Table<WorkerRow>
        columns={columns}
        dataSource={items}
        rowKey="worker_id"
        loading={loading}
        size="small"
        scroll={{ x: 1000 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}건`,
        }}
        onChange={handleTableChange as any}
      />

      <FormModal<WorkerFormValues>
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '작업자 등록' : '작업자 수정'}
        width={520}
      >
        {(form, mode) => (
          <>
            <Form.Item name="worker_id" label="사번" rules={[{ required: true, message: '사번을 입력하세요.' }, { max: 20, message: '최대 20자까지 입력 가능합니다.' }]}>
              <Input placeholder="사번 입력" disabled={mode === 'edit'} maxLength={20} />
            </Form.Item>
            <Form.Item name="worker_nm" label="작업자명" rules={[{ required: true, message: '작업자명을 입력하세요.' }, { max: 100, message: '최대 100자까지 입력 가능합니다.' }]}>
              <Input placeholder="작업자명 입력" maxLength={100} />
            </Form.Item>
            <Form.Item name="dept_cd" label="부서">
              <CommonCodeSelect groupCd="DEPT" placeholder="부서 선택" />
            </Form.Item>
            <Form.Item name="workshop_cd" label="작업장">
              <Select placeholder="작업장 선택" options={workshopOptions} allowClear showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="shift_cd" label="교대">
              <CommonCodeSelect groupCd="SHIFT" placeholder="교대 선택" />
            </Form.Item>
            {mode === 'edit' && (
              <Form.Item name="use_yn" label="사용여부">
                <Select options={USE_YN_OPTIONS} />
              </Form.Item>
            )}
          </>
        )}
      </FormModal>

      <DataHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} tableName="tb_worker" recordId={historyCd} title={`작업자 변경이력 (${historyCd})`} />
    </div>
  );
}
