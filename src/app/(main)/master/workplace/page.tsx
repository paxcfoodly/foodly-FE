'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Space,
  Tag,
  Form,
  Input,
  InputNumber,
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

interface WorkshopRow {
  workshop_cd: string;
  workshop_nm: string;
  plant_cd: string;
  parent_cd: string | null;
  workshop_type: string | null;
  sort_order: number;
  use_yn: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  [key: string]: unknown;
}

interface WorkshopFormValues {
  workshop_cd: string;
  workshop_nm: string;
  plant_cd: string;
  parent_cd?: string;
  workshop_type?: string;
  sort_order?: number;
  use_yn?: string;
  [key: string]: unknown;
}

const MENU_URL = '/master/workplace';

const USE_YN_OPTIONS = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
];

const WORKSHOP_TYPE_OPTIONS = [
  { label: '공장', value: 'PLANT' },
  { label: '작업장', value: 'WORKSHOP' },
  { label: '라인', value: 'LINE' },
];

const WORKSHOP_TYPE_LABEL: Record<string, string> = {
  PLANT: '공장',
  WORKSHOP: '작업장',
  LINE: '라인',
};

const WORKSHOP_TYPE_COLOR: Record<string, string> = {
  PLANT: 'blue',
  WORKSHOP: 'orange',
  LINE: 'green',
};

/* ── Excel columns ─── */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: '작업장코드', key: 'workshop_cd', width: 15 },
  { header: '작업장명', key: 'workshop_nm', width: 30 },
  { header: '공장코드', key: 'plant_cd', width: 12 },
  { header: '상위작업장', key: 'parent_cd', width: 15 },
  { header: '작업장유형', key: 'workshop_type', width: 12 },
  { header: '정렬순서', key: 'sort_order', width: 10 },
  { header: '사용여부', key: 'use_yn', width: 10 },
];

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'workshop_cd', label: '작업장코드', type: 'text', placeholder: '작업장코드 입력' },
  { name: 'workshop_nm', label: '작업장명', type: 'text', placeholder: '작업장명 입력' },
  {
    name: 'workshop_type',
    label: '작업장유형',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...WORKSHOP_TYPE_OPTIONS],
  },
  {
    name: 'use_yn',
    label: '사용여부',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...USE_YN_OPTIONS],
  },
];

/* ── Component ─────────────────────────────────────── */

export default function WorkshopMasterPage() {
  /* ── State ─── */
  const [items, setItems] = useState<WorkshopRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<WorkshopRow | null>(null);

  // History drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCd, setHistoryCd] = useState('');

  // Parent workshop dropdown options (self-ref, excludes self in edit mode)
  const [allWorkshops, setAllWorkshops] = useState<{ workshop_cd: string; workshop_nm: string }[]>([]);

  /* ── Load workshop options for parent_cd ─── */
  const loadWorkshopOptions = useCallback(() => {
    apiClient
      .get<PaginatedResponse<{ workshop_cd: string; workshop_nm: string }>>('/v1/workshops', { params: { limit: 9999, use_yn: 'Y' } })
      .then((res) => {
        setAllWorkshops(res.data?.data ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadWorkshopOptions();
  }, [loadWorkshopOptions]);

  const parentOptions = useMemo(() => {
    const selfCd = editItem?.workshop_cd;
    return allWorkshops
      .filter((w) => w.workshop_cd !== selfCd)
      .map((w) => ({ label: `${w.workshop_cd} - ${w.workshop_nm}`, value: w.workshop_cd }));
  }, [allWorkshops, editItem]);

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

        const res = await apiClient.get<PaginatedResponse<WorkshopRow>>('/v1/workshops', { params });
        const body = res.data;
        setItems(body.data ?? []);
        if (body.pagination) {
          setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
        }
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '작업장 목록 조회에 실패했습니다.');
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
      sorter: SorterResult<WorkshopRow> | SorterResult<WorkshopRow>[],
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

  const handleEdit = useCallback((record: WorkshopRow) => {
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: WorkshopFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/workshops', {
          workshop_cd: values.workshop_cd,
          workshop_nm: values.workshop_nm,
          plant_cd: values.plant_cd,
          parent_cd: values.parent_cd || null,
          workshop_type: values.workshop_type || null,
          sort_order: values.sort_order ?? 0,
        });
      } else {
        await apiClient.put(`/v1/workshops/${editItem!.workshop_cd}`, {
          workshop_nm: values.workshop_nm,
          plant_cd: values.plant_cd,
          parent_cd: values.parent_cd || null,
          workshop_type: values.workshop_type || null,
          sort_order: values.sort_order,
          use_yn: values.use_yn,
        });
      }
      fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      loadWorkshopOptions(); // refresh parent dropdown after mutation
    },
    [editItem, fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters, loadWorkshopOptions],
  );

  const handleDelete = useCallback(
    async (record: WorkshopRow) => {
      try {
        await apiClient.delete(`/v1/workshops/${record.workshop_cd}`);
        message.success('작업장이 삭제되었습니다.');
        fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
        loadWorkshopOptions();
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters, loadWorkshopOptions],
  );

  const handleHistory = useCallback((record: WorkshopRow) => {
    setHistoryCd(record.workshop_cd);
    setHistoryOpen(true);
  }, []);

  const fetchExcelData = useCallback(async () => {
    const res = await apiClient.get<PaginatedResponse<WorkshopRow>>('/v1/workshops/export');
    return (res.data?.data ?? []) as Record<string, unknown>[];
  }, []);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return undefined;
    return {
      workshop_cd: editItem.workshop_cd,
      workshop_nm: editItem.workshop_nm,
      plant_cd: editItem.plant_cd,
      parent_cd: editItem.parent_cd ?? undefined,
      workshop_type: editItem.workshop_type ?? undefined,
      sort_order: editItem.sort_order != null ? Number(editItem.sort_order) : undefined,
      use_yn: editItem.use_yn,
    } as Partial<WorkshopFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      { title: '작업장코드', dataIndex: 'workshop_cd', width: 130, sorter: true, ellipsis: true },
      { title: '작업장명', dataIndex: 'workshop_nm', width: 200, sorter: true, ellipsis: true },
      { title: '공장코드', dataIndex: 'plant_cd', width: 100, sorter: true, ellipsis: true },
      { title: '상위작업장', dataIndex: 'parent_cd', width: 120, ellipsis: true, render: (val: unknown) => (val as string) || '-' },
      {
        title: '작업장유형',
        dataIndex: 'workshop_type',
        width: 100,
        align: 'center' as const,
        sorter: true,
        render: (val: unknown) => {
          const v = val as string;
          if (!v) return '-';
          return <Tag color={WORKSHOP_TYPE_COLOR[v] ?? 'default'}>{WORKSHOP_TYPE_LABEL[v] ?? v}</Tag>;
        },
      },
      {
        title: '정렬순서',
        dataIndex: 'sort_order',
        width: 80,
        align: 'right' as const,
        sorter: true,
        render: (val: unknown) => (val != null ? Number(val) : 0),
      },
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
        render: (_: unknown, record: WorkshopRow) => (
          <Space size={4}>
            <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)}>{''}</PermissionButton>
            <Popconfirm title="작업장을 삭제하시겠습니까?" description="다른 데이터에서 참조 중인 경우 삭제가 거부됩니다." onConfirm={() => handleDelete(record)} okText="삭제" cancelText="취소">
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
            <ExcelUploadButton uploadUrl="/v1/workshops/import" onComplete={() => fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters)} />
            <ExcelDownloadButton filename="작업장목록" columns={EXCEL_COLUMNS} data={fetchExcelData} />
          </Space>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#666', fontSize: 13 }}>총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} type="primary" icon={<PlusOutlined />} onClick={handleCreate}>작업장 등록</PermissionButton>
      </div>

      <Table<WorkshopRow>
        columns={columns}
        dataSource={items}
        rowKey="workshop_cd"
        loading={loading}
        size="small"
        scroll={{ x: 1200 }}
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

      <FormModal<WorkshopFormValues>
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '작업장 등록' : '작업장 수정'}
        width={560}
      >
        {(form, mode) => (
          <>
            <Form.Item name="workshop_cd" label="작업장코드" rules={[{ required: true, message: '작업장코드를 입력하세요.' }, { max: 30, message: '최대 30자까지 입력 가능합니다.' }]}>
              <Input placeholder="작업장코드 입력" disabled={mode === 'edit'} maxLength={30} />
            </Form.Item>
            <Form.Item name="workshop_nm" label="작업장명" rules={[{ required: true, message: '작업장명을 입력하세요.' }, { max: 200, message: '최대 200자까지 입력 가능합니다.' }]}>
              <Input placeholder="작업장명 입력" maxLength={200} />
            </Form.Item>
            <Form.Item name="plant_cd" label="공장코드" rules={[{ required: true, message: '공장코드를 입력하세요.' }]}>
              <Input placeholder="공장코드 입력" />
            </Form.Item>
            <Form.Item name="parent_cd" label="상위작업장">
              <Select placeholder="상위작업장 선택" options={parentOptions} allowClear showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="workshop_type" label="작업장유형">
              <Select placeholder="작업장유형 선택" options={WORKSHOP_TYPE_OPTIONS} allowClear />
            </Form.Item>
            <Form.Item name="sort_order" label="정렬순서" rules={[{ type: 'number', min: 0, message: '0 이상의 값을 입력하세요.' }]}>
              <InputNumber placeholder="정렬순서" min={0} style={{ width: '100%' }} precision={0} />
            </Form.Item>
            {mode === 'edit' && (
              <Form.Item name="use_yn" label="사용여부">
                <Select options={USE_YN_OPTIONS} />
              </Form.Item>
            )}
          </>
        )}
      </FormModal>

      <DataHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} tableName="tb_workshop" recordId={historyCd} title={`작업장 변경이력 (${historyCd})`} />
    </div>
  );
}
