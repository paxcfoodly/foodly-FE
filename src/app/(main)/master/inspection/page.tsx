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
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

/* ── Types ─────────────────────────────────────────── */

interface InspectStdRow {
  inspect_std_id: number;
  item_cd: string | null;
  process_cd: string | null;
  inspect_type: string | null;
  inspect_item_nm: string;
  measure_type: string | null;
  lsl: string | number | null;
  target_val: string | number | null;
  usl: string | number | null;
  unit: string | null;
  sampling_std: string | null;
  use_yn: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  [key: string]: unknown;
}

interface InspectStdFormValues {
  inspect_std_id?: number;
  item_cd?: string;
  process_cd?: string;
  inspect_type?: string;
  inspect_item_nm: string;
  measure_type?: string;
  lsl?: number;
  target_val?: number;
  usl?: number;
  unit?: string;
  sampling_std?: string;
  use_yn?: string;
  [key: string]: unknown;
}

interface ItemOption {
  item_cd: string;
  item_nm: string;
}

interface ProcessOption {
  process_cd: string;
  process_nm: string;
}

const MENU_URL = '/master/inspection';

const INSPECT_TYPE_OPTIONS = [
  { label: '수입검사', value: 'IQC' },
  { label: '공정검사', value: 'PQC' },
  { label: '출하검사', value: 'OQC' },
];

const INSPECT_TYPE_LABEL: Record<string, string> = {
  IQC: '수입검사',
  PQC: '공정검사',
  OQC: '출하검사',
};

const INSPECT_TYPE_COLOR: Record<string, string> = {
  IQC: 'blue',
  PQC: 'orange',
  OQC: 'green',
};

const MEASURE_TYPE_OPTIONS = [
  { label: '계량형', value: 'VARIABLE' },
  { label: '계수형', value: 'ATTRIBUTE' },
];

const USE_YN_OPTIONS = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
];

/* ── Excel columns ─── */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: 'ID', key: 'inspect_std_id', width: 8 },
  { header: '품목코드', key: 'item_cd', width: 15 },
  { header: '공정코드', key: 'process_cd', width: 15 },
  { header: '검사유형', key: 'inspect_type', width: 10 },
  { header: '검사항목명', key: 'inspect_item_nm', width: 25 },
  { header: '측정유형', key: 'measure_type', width: 10 },
  { header: 'LSL', key: 'lsl', width: 10 },
  { header: '목표값', key: 'target_val', width: 10 },
  { header: 'USL', key: 'usl', width: 10 },
  { header: '단위', key: 'unit', width: 10 },
  { header: '샘플링기준', key: 'sampling_std', width: 15 },
  { header: '사용여부', key: 'use_yn', width: 10 },
];

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'inspect_item_nm', label: '검사항목명', type: 'text', placeholder: '검사항목명 입력' },
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  {
    name: 'inspect_type',
    label: '검사유형',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...INSPECT_TYPE_OPTIONS],
  },
  {
    name: 'use_yn',
    label: '사용여부',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...USE_YN_OPTIONS],
  },
];

/* ── Component ─────────────────────────────────────── */

export default function InspectStdMasterPage() {
  /* ── State ─── */
  const [items, setItems] = useState<InspectStdRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<InspectStdRow | null>(null);

  // History drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCd, setHistoryCd] = useState('');

  // Dropdown options
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);
  const [processOptions, setProcessOptions] = useState<{ label: string; value: string }[]>([]);

  /* ── Load dropdown options ─── */
  useEffect(() => {
    apiClient
      .get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 9999, use_yn: 'Y' } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setItemOptions(list.map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd })));
      })
      .catch(() => {});

    apiClient
      .get<PaginatedResponse<ProcessOption>>('/v1/processes', { params: { limit: 9999, use_yn: 'Y' } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setProcessOptions(list.map((p) => ({ label: `${p.process_cd} - ${p.process_nm}`, value: p.process_cd })));
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

        const res = await apiClient.get<PaginatedResponse<InspectStdRow>>('/v1/inspect-stds', { params });
        const body = res.data;
        setItems(body.data ?? []);
        if (body.pagination) {
          setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
        }
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '검사기준 목록 조회에 실패했습니다.');
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
      sorter: SorterResult<InspectStdRow> | SorterResult<InspectStdRow>[],
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

  const handleEdit = useCallback((record: InspectStdRow) => {
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: InspectStdFormValues, mode: FormModalMode) => {
      const payload = {
        item_cd: values.item_cd || null,
        process_cd: values.process_cd || null,
        inspect_type: values.inspect_type || null,
        inspect_item_nm: values.inspect_item_nm,
        measure_type: values.measure_type || null,
        lsl: values.lsl ?? null,
        target_val: values.target_val ?? null,
        usl: values.usl ?? null,
        unit: values.unit || null,
        sampling_std: values.sampling_std || null,
      };

      if (mode === 'create') {
        await apiClient.post('/v1/inspect-stds', payload);
      } else {
        await apiClient.put(`/v1/inspect-stds/${editItem!.inspect_std_id}`, {
          ...payload,
          use_yn: values.use_yn,
        });
      }
      fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: InspectStdRow) => {
      try {
        await apiClient.delete(`/v1/inspect-stds/${record.inspect_std_id}`);
        message.success('검사기준이 삭제되었습니다.');
        fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleHistory = useCallback((record: InspectStdRow) => {
    setHistoryCd(String(record.inspect_std_id));
    setHistoryOpen(true);
  }, []);

  const fetchExcelData = useCallback(async () => {
    const res = await apiClient.get<PaginatedResponse<InspectStdRow>>('/v1/inspect-stds', { params: { limit: 99999 } });
    return (res.data?.data ?? []) as Record<string, unknown>[];
  }, []);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return undefined;
    return {
      inspect_std_id: editItem.inspect_std_id,
      item_cd: editItem.item_cd ?? undefined,
      process_cd: editItem.process_cd ?? undefined,
      inspect_type: editItem.inspect_type ?? undefined,
      inspect_item_nm: editItem.inspect_item_nm,
      measure_type: editItem.measure_type ?? undefined,
      lsl: editItem.lsl != null ? Number(editItem.lsl) : undefined,
      target_val: editItem.target_val != null ? Number(editItem.target_val) : undefined,
      usl: editItem.usl != null ? Number(editItem.usl) : undefined,
      unit: editItem.unit ?? undefined,
      sampling_std: editItem.sampling_std ?? undefined,
      use_yn: editItem.use_yn,
    } as Partial<InspectStdFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'inspect_std_id', width: 60, sorter: true },
      { title: '품목코드', dataIndex: 'item_cd', width: 120, ellipsis: true, render: (val: unknown) => (val as string) || '-' },
      { title: '공정코드', dataIndex: 'process_cd', width: 120, ellipsis: true, render: (val: unknown) => (val as string) || '-' },
      {
        title: '검사유형',
        dataIndex: 'inspect_type',
        width: 90,
        align: 'center' as const,
        render: (val: unknown) => {
          const v = val as string;
          if (!v) return '-';
          return <Tag color={INSPECT_TYPE_COLOR[v] ?? 'default'}>{INSPECT_TYPE_LABEL[v] ?? v}</Tag>;
        },
      },
      { title: '검사항목명', dataIndex: 'inspect_item_nm', width: 180, sorter: true, ellipsis: true },
      { title: '측정유형', dataIndex: 'measure_type', width: 80, align: 'center' as const, render: (val: unknown) => (val as string) || '-' },
      {
        title: 'LSL',
        dataIndex: 'lsl',
        width: 80,
        align: 'right' as const,
        render: (val: unknown) => val != null ? Number(val).toLocaleString() : '-',
      },
      {
        title: '목표값',
        dataIndex: 'target_val',
        width: 80,
        align: 'right' as const,
        render: (val: unknown) => val != null ? Number(val).toLocaleString() : '-',
      },
      {
        title: 'USL',
        dataIndex: 'usl',
        width: 80,
        align: 'right' as const,
        render: (val: unknown) => val != null ? Number(val).toLocaleString() : '-',
      },
      { title: '단위', dataIndex: 'unit', width: 60, align: 'center' as const, render: (val: unknown) => (val as string) || '-' },
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
        render: (_: unknown, record: InspectStdRow) => (
          <Space size={4}>
            <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)}>{''}</PermissionButton>
            <Popconfirm title="검사기준을 삭제하시겠습니까?" description="다른 데이터에서 참조 중인 경우 삭제가 거부됩니다." onConfirm={() => handleDelete(record)} okText="삭제" cancelText="취소">
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
            <ExcelUploadButton uploadUrl="/v1/inspect-stds/import" onComplete={() => fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters)} />
            <ExcelDownloadButton filename="검사기준목록" columns={EXCEL_COLUMNS} data={fetchExcelData} />
          </Space>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#666', fontSize: 13 }}>총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} type="primary" icon={<PlusOutlined />} onClick={handleCreate}>검사기준 등록</PermissionButton>
      </div>

      <Table<InspectStdRow>
        columns={columns}
        dataSource={items}
        rowKey="inspect_std_id"
        loading={loading}
        size="small"
        scroll={{ x: 1500 }}
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

      <FormModal<InspectStdFormValues>
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '검사기준 등록' : '검사기준 수정'}
        width={600}
      >
        {(form, mode) => (
          <>
            <Form.Item name="item_cd" label="품목">
              <Select placeholder="품목 선택" options={itemOptions} allowClear showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="process_cd" label="공정">
              <Select placeholder="공정 선택" options={processOptions} allowClear showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="inspect_type" label="검사유형">
              <Select placeholder="검사유형 선택" options={INSPECT_TYPE_OPTIONS} allowClear />
            </Form.Item>
            <Form.Item name="inspect_item_nm" label="검사항목명" rules={[{ required: true, message: '검사항목명을 입력하세요.' }, { max: 200, message: '최대 200자까지 입력 가능합니다.' }]}>
              <Input placeholder="검사항목명 입력" maxLength={200} />
            </Form.Item>
            <Form.Item name="measure_type" label="측정유형">
              <Select placeholder="측정유형 선택" options={MEASURE_TYPE_OPTIONS} allowClear />
            </Form.Item>
            <Form.Item name="lsl" label="LSL (하한)">
              <InputNumber placeholder="하한값" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="target_val" label="목표값">
              <InputNumber placeholder="목표값" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="usl" label="USL (상한)">
              <InputNumber placeholder="상한값" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="unit" label="단위">
              <Input placeholder="단위 입력 (mm, kg 등)" maxLength={20} />
            </Form.Item>
            <Form.Item name="sampling_std" label="샘플링기준">
              <Input placeholder="샘플링기준 입력" maxLength={100} />
            </Form.Item>
            {mode === 'edit' && (
              <Form.Item name="use_yn" label="사용여부">
                <Select options={USE_YN_OPTIONS} />
              </Form.Item>
            )}
          </>
        )}
      </FormModal>

      <DataHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} tableName="tb_inspect_std" recordId={historyCd} title={`검사기준 변경이력 (${historyCd})`} />
    </div>
  );
}
