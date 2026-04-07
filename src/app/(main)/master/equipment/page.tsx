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
  DatePicker,
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

interface EquipmentRow {
  equip_cd: string;
  equip_nm: string;
  equip_type: string | null;
  maker: string | null;
  model_nm: string | null;
  install_date: string | null;
  workshop_cd: string | null;
  use_yn: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  [key: string]: unknown;
}

interface EquipmentFormValues {
  equip_cd: string;
  equip_nm: string;
  equip_type?: string;
  maker?: string;
  model_nm?: string;
  install_date?: dayjs.Dayjs | null;
  workshop_cd?: string;
  use_yn?: string;
  [key: string]: unknown;
}

interface WorkshopOption {
  workshop_cd: string;
  workshop_nm: string;
}

const MENU_URL = '/master/equipment';

const EQUIP_TYPE_OPTIONS = [
  { label: 'CNC', value: 'CNC' },
  { label: 'PRESS', value: 'PRESS' },
  { label: 'INJECTION', value: 'INJECTION' },
  { label: 'PACKAGING', value: 'PACKAGING' },
];

const EQUIP_TYPE_COLOR: Record<string, string> = {
  CNC: 'blue',
  PRESS: 'orange',
  INJECTION: 'green',
  PACKAGING: 'purple',
};

const USE_YN_OPTIONS = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
];

/* ── Excel columns ─── */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: '설비코드', key: 'equip_cd', width: 15 },
  { header: '설비명', key: 'equip_nm', width: 30 },
  { header: '설비유형', key: 'equip_type', width: 12 },
  { header: '제조사', key: 'maker', width: 15 },
  { header: '모델명', key: 'model_nm', width: 15 },
  { header: '설치일', key: 'install_date', width: 12 },
  { header: '작업장코드', key: 'workshop_cd', width: 15 },
  { header: '사용여부', key: 'use_yn', width: 10 },
];

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'equip_cd', label: '설비코드', type: 'text', placeholder: '설비코드 입력' },
  { name: 'equip_nm', label: '설비명', type: 'text', placeholder: '설비명 입력' },
  {
    name: 'equip_type',
    label: '설비유형',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...EQUIP_TYPE_OPTIONS],
  },
  {
    name: 'use_yn',
    label: '사용여부',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...USE_YN_OPTIONS],
  },
];

/* ── Component ─────────────────────────────────────── */

export default function EquipmentMasterPage() {
  /* ── State ─── */
  const [items, setItems] = useState<EquipmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<EquipmentRow | null>(null);

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

        const res = await apiClient.get<PaginatedResponse<EquipmentRow>>('/v1/equipments', { params });
        const body = res.data;
        setItems(body.data ?? []);
        if (body.pagination) {
          setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
        }
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '설비 목록 조회에 실패했습니다.');
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
      sorter: SorterResult<EquipmentRow> | SorterResult<EquipmentRow>[],
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

  const handleEdit = useCallback((record: EquipmentRow) => {
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: EquipmentFormValues, mode: FormModalMode) => {
      const installDateStr = values.install_date ? (values.install_date as dayjs.Dayjs).format('YYYY-MM-DD') : null;
      if (mode === 'create') {
        await apiClient.post('/v1/equipments', {
          equip_cd: values.equip_cd,
          equip_nm: values.equip_nm,
          equip_type: values.equip_type || null,
          maker: values.maker || null,
          model_nm: values.model_nm || null,
          install_date: installDateStr,
          workshop_cd: values.workshop_cd || null,
        });
      } else {
        await apiClient.put(`/v1/equipments/${editItem!.equip_cd}`, {
          equip_nm: values.equip_nm,
          equip_type: values.equip_type || null,
          maker: values.maker || null,
          model_nm: values.model_nm || null,
          install_date: installDateStr,
          workshop_cd: values.workshop_cd || null,
          use_yn: values.use_yn,
        });
      }
      fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: EquipmentRow) => {
      try {
        await apiClient.delete(`/v1/equipments/${record.equip_cd}`);
        message.success('설비가 삭제되었습니다.');
        fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleHistory = useCallback((record: EquipmentRow) => {
    setHistoryCd(record.equip_cd);
    setHistoryOpen(true);
  }, []);

  const fetchExcelData = useCallback(async () => {
    const res = await apiClient.get<PaginatedResponse<EquipmentRow>>('/v1/equipments/export');
    return (res.data?.data ?? []) as Record<string, unknown>[];
  }, []);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return undefined;
    return {
      equip_cd: editItem.equip_cd,
      equip_nm: editItem.equip_nm,
      equip_type: editItem.equip_type ?? undefined,
      maker: editItem.maker ?? undefined,
      model_nm: editItem.model_nm ?? undefined,
      install_date: editItem.install_date ? dayjs(editItem.install_date) : undefined,
      workshop_cd: editItem.workshop_cd ?? undefined,
      use_yn: editItem.use_yn,
    } as Partial<EquipmentFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      { title: '설비코드', dataIndex: 'equip_cd', width: 130, sorter: true, ellipsis: true },
      { title: '설비명', dataIndex: 'equip_nm', width: 200, sorter: true, ellipsis: true },
      {
        title: '설비유형',
        dataIndex: 'equip_type',
        width: 110,
        align: 'center' as const,
        sorter: true,
        render: (val: unknown) => {
          const v = val as string;
          if (!v) return '-';
          return <Tag color={EQUIP_TYPE_COLOR[v] ?? 'default'}>{v}</Tag>;
        },
      },
      { title: '제조사', dataIndex: 'maker', width: 120, ellipsis: true },
      { title: '모델명', dataIndex: 'model_nm', width: 120, ellipsis: true },
      {
        title: '설치일',
        dataIndex: 'install_date',
        width: 110,
        render: (val: unknown) => (val ? dayjs(val as string).format('YYYY-MM-DD') : '-'),
      },
      { title: '작업장', dataIndex: 'workshop_cd', width: 110, ellipsis: true },
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
        render: (_: unknown, record: EquipmentRow) => (
          <Space size={4}>
            <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)}>{''}</PermissionButton>
            <Popconfirm title="설비를 삭제하시겠습니까?" description="다른 데이터에서 참조 중인 경우 삭제가 거부됩니다." onConfirm={() => handleDelete(record)} okText="삭제" cancelText="취소">
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
            <ExcelUploadButton uploadUrl="/v1/equipments/import" onComplete={() => fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters)} />
            <ExcelDownloadButton filename="설비목록" columns={EXCEL_COLUMNS} data={fetchExcelData} />
          </Space>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#666', fontSize: 13 }}>총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} type="primary" icon={<PlusOutlined />} onClick={handleCreate}>설비 등록</PermissionButton>
      </div>

      <Table<EquipmentRow>
        columns={columns}
        dataSource={items}
        rowKey="equip_cd"
        loading={loading}
        size="small"
        scroll={{ x: 1400 }}
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

      <FormModal<EquipmentFormValues>
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '설비 등록' : '설비 수정'}
        width={560}
      >
        {(form, mode) => (
          <>
            <Form.Item name="equip_cd" label="설비코드" rules={[{ required: true, message: '설비코드를 입력하세요.' }, { max: 30, message: '최대 30자까지 입력 가능합니다.' }]}>
              <Input placeholder="설비코드 입력" disabled={mode === 'edit'} maxLength={30} />
            </Form.Item>
            <Form.Item name="equip_nm" label="설비명" rules={[{ required: true, message: '설비명을 입력하세요.' }, { max: 200, message: '최대 200자까지 입력 가능합니다.' }]}>
              <Input placeholder="설비명 입력" maxLength={200} />
            </Form.Item>
            <Form.Item name="equip_type" label="설비유형">
              <Select placeholder="설비유형 선택" options={EQUIP_TYPE_OPTIONS} allowClear />
            </Form.Item>
            <Form.Item name="maker" label="제조사">
              <Input placeholder="제조사 입력" />
            </Form.Item>
            <Form.Item name="model_nm" label="모델명">
              <Input placeholder="모델명 입력" />
            </Form.Item>
            <Form.Item name="install_date" label="설치일">
              <DatePicker placeholder="설치일 선택" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="workshop_cd" label="작업장">
              <Select placeholder="작업장 선택" options={workshopOptions} allowClear showSearch optionFilterProp="label" />
            </Form.Item>
            {mode === 'edit' && (
              <Form.Item name="use_yn" label="사용여부">
                <Select options={USE_YN_OPTIONS} />
              </Form.Item>
            )}
          </>
        )}
      </FormModal>

      <DataHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} tableName="tb_equipment" recordId={historyCd} title={`설비 변경이력 (${historyCd})`} />
    </div>
  );
}
