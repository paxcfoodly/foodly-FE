'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  History,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Table from '@/components/ui/Table';
import type { TableColumn, PaginationConfig } from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
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

interface ItemRow {
  item_cd: string;
  item_nm: string;
  item_type: string;
  unit_cd: string | null;
  spec: string | null;
  drawing_no: string | null;
  safety_stock: string | number | null;
  use_yn: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  [key: string]: unknown;
}

interface ItemFormValues {
  item_cd: string;
  item_nm: string;
  item_type: string;
  unit_cd?: string;
  spec?: string;
  drawing_no?: string;
  safety_stock?: number;
  use_yn?: string;
  [key: string]: unknown;
}

const MENU_URL = '/master/item';

const ITEM_TYPE_OPTIONS = [
  { label: '원자재', value: 'RAW' },
  { label: '반제품', value: 'SEMI' },
  { label: '완제품', value: 'FIN' },
];

const ITEM_TYPE_LABEL: Record<string, string> = {
  RAW: '원자재',
  SEMI: '반제품',
  FIN: '완제품',
};

const ITEM_TYPE_COLOR: Record<string, string> = {
  RAW: 'blue',
  SEMI: 'orange',
  FIN: 'green',
};

const USE_YN_OPTIONS = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
];

/* ── Excel columns ─── */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: '품목코드', key: 'item_cd', width: 15 },
  { header: '품목명', key: 'item_nm', width: 30 },
  { header: '품목유형', key: 'item_type', width: 10 },
  { header: '단위', key: 'unit_cd', width: 10 },
  { header: '규격', key: 'spec', width: 20 },
  { header: '도면번호', key: 'drawing_no', width: 20 },
  { header: '안전재고', key: 'safety_stock', width: 12 },
  { header: '사용여부', key: 'use_yn', width: 10 },
];

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'item_nm', label: '품목명', type: 'text', placeholder: '품목명 입력' },
  {
    name: 'item_type',
    label: '품목유형',
    type: 'select',
    options: [
      { label: '전체', value: '' },
      ...ITEM_TYPE_OPTIONS,
    ],
  },
  {
    name: 'use_yn',
    label: '사용여부',
    type: 'select',
    options: [
      { label: '전체', value: '' },
      ...USE_YN_OPTIONS,
    ],
  },
];

/* ── Component ─────────────────────────────────────── */

export default function ItemMasterPage() {
  /* ── State ─── */
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<ItemRow | null>(null);

  // History drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItemCd, setHistoryItemCd] = useState('');

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
        const params: Record<string, unknown> = {
          page,
          limit: pageSize,
        };

        const activeFilters = searchFilters ?? filters;
        if (sort) params.sortBy = sort;
        if (order) params.sortOrder = order;

        // Apply search filters
        Object.entries(activeFilters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            params[key] = val;
          }
        });

        const res = await apiClient.get<PaginatedResponse<ItemRow>>('/v1/items', { params });
        const body = res.data;
        setItems(body.data ?? []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            pageSize: body.pagination.pageSize,
            total: body.pagination.total,
          });
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? '품목 목록 조회에 실패했습니다.');
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

  /* ── Search handler ─── */
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

  /* ── Sort change ─── */
  const handleSortChange = useCallback(
    (field: string, order: 'asc' | 'desc') => {
      setSortField(field);
      setSortOrder(order);
      fetchItems(pagination.page, pagination.pageSize, field, order, filters);
    },
    [fetchItems, pagination.page, pagination.pageSize, filters],
  );

  /* ── Page change ─── */
  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      setPagination((prev) => ({ ...prev, page, pageSize }));
      fetchItems(page, pageSize, sortField, sortOrder, filters);
    },
    [fetchItems, sortField, sortOrder, filters],
  );

  /* ── CRUD handlers ─── */
  const handleCreate = useCallback(() => {
    setEditItem(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: ItemRow) => {
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: ItemFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/items', {
          item_cd: values.item_cd,
          item_nm: values.item_nm,
          item_type: values.item_type,
          unit_cd: values.unit_cd || null,
          spec: values.spec || null,
          drawing_no: values.drawing_no || null,
          safety_stock: values.safety_stock ?? null,
        });
      } else {
        await apiClient.put(`/v1/items/${editItem!.item_cd}`, {
          item_nm: values.item_nm,
          item_type: values.item_type,
          unit_cd: values.unit_cd || null,
          spec: values.spec || null,
          drawing_no: values.drawing_no || null,
          safety_stock: values.safety_stock ?? null,
          use_yn: values.use_yn,
        });
      }
      fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: ItemRow) => {
      try {
        await apiClient.delete(`/v1/items/${record.item_cd}`);
        toast.success('품목이 삭제되었습니다.');
        fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? '삭제에 실패했습니다.';
        toast.error(msg);
      }
    },
    [fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  /* ── History handler ─── */
  const handleHistory = useCallback((record: ItemRow) => {
    setHistoryItemCd(record.item_cd);
    setHistoryOpen(true);
  }, []);

  /* ── Excel download data fetcher ─── */
  const fetchExcelData = useCallback(async () => {
    const res = await apiClient.get<PaginatedResponse<ItemRow>>('/v1/items/export');
    return (res.data?.data ?? []) as Record<string, unknown>[];
  }, []);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return undefined;
    return {
      item_cd: editItem.item_cd,
      item_nm: editItem.item_nm,
      item_type: editItem.item_type,
      unit_cd: editItem.unit_cd ?? undefined,
      spec: editItem.spec ?? undefined,
      drawing_no: editItem.drawing_no ?? undefined,
      safety_stock: editItem.safety_stock != null ? Number(editItem.safety_stock) : undefined,
      use_yn: editItem.use_yn,
    } as Partial<ItemFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns: TableColumn<ItemRow>[] = useMemo(
    () => [
      {
        title: '품목코드',
        dataIndex: 'item_cd',
        width: 130,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '품목명',
        dataIndex: 'item_nm',
        width: 200,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '품목유형',
        dataIndex: 'item_type',
        width: 90,
        align: 'center',
        sorter: true,
        render: (val: unknown) => {
          const v = val as string;
          return (
            <Tag color={ITEM_TYPE_COLOR[v] ?? 'default'}>
              {ITEM_TYPE_LABEL[v] ?? v}
            </Tag>
          );
        },
      },
      {
        title: '단위',
        dataIndex: 'unit_cd',
        width: 80,
        align: 'center',
      },
      {
        title: '규격',
        dataIndex: 'spec',
        width: 150,
        ellipsis: true,
      },
      {
        title: '도면번호',
        dataIndex: 'drawing_no',
        width: 130,
        ellipsis: true,
      },
      {
        title: '안전재고',
        dataIndex: 'safety_stock',
        width: 100,
        align: 'right',
        sorter: true,
        render: (val: unknown) => {
          if (val == null) return '-';
          return Number(val).toLocaleString();
        },
      },
      {
        title: '사용여부',
        dataIndex: 'use_yn',
        width: 80,
        align: 'center',
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
        render: (val: unknown) =>
          val ? dayjs(val as string).format('YYYY-MM-DD') : '-',
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 130,
        align: 'center',
        render: (_: unknown, record: ItemRow) => (
          <div className="flex items-center gap-1">
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              variant="ghost"
              icon={<Pencil className="w-4 h-4" />}
              onClick={() => handleEdit(record)}
            >
              {''}
            </PermissionButton>
            <PermissionButton
              action="delete"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              variant="ghost"
              className="text-red-500"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() =>
                confirm({
                  title: '품목을 삭제하시겠습니까?',
                  content: '다른 데이터에서 참조 중인 경우 삭제가 거부됩니다.',
                  onOk: () => handleDelete(record),
                  okText: '삭제',
                  danger: true,
                })
              }
            >
              {''}
            </PermissionButton>
            <Button
              size="small"
              variant="ghost"
              icon={<History className="w-4 h-4" />}
              onClick={() => handleHistory(record)}
            />
          </div>
        ),
      },
    ],
    [handleEdit, handleDelete, handleHistory],
  );

  /* ── Pagination config ─── */
  const paginationConfig: PaginationConfig = useMemo(
    () => ({
      current: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      onChange: handlePageChange,
      pageSizeOptions: [10, 20, 50, 100],
    }),
    [pagination, handlePageChange],
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
        extraButtons={
          <div className="flex items-center gap-2">
            <ExcelUploadButton
              uploadUrl="/v1/items/import"
              onComplete={() =>
                fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters)
              }
            />
            <ExcelDownloadButton
              filename="품목목록"
              columns={EXCEL_COLUMNS}
              data={fetchExcelData}
            />
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">
          총 <strong>{pagination.total.toLocaleString()}</strong>건
        </span>
        <PermissionButton
          action="create"
          menuUrl={MENU_URL}
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleCreate}
        >
          품목 등록
        </PermissionButton>
      </div>

      {/* Table */}
      <Table<ItemRow>
        columns={columns}
        dataSource={items}
        rowKey="item_cd"
        loading={loading}
        pagination={paginationConfig}
        sortBy={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        scrollX={1200}
      />

      {/* Create/Edit Modal */}
      <FormModal<ItemFormValues>
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '품목 등록' : '품목 수정'}
        width={560}
      >
        {(form, mode) => (
          <>
            <FormField label="품목코드" required>
              <Input
                name="item_cd"
                placeholder="품목코드 입력"
                disabled={mode === 'edit'}
                maxLength={30}
                required
                defaultValue={form.getFieldsValue().item_cd ?? ''}
                onChange={(e) => form.setFieldsValue({ item_cd: e.target.value } as Partial<ItemFormValues>)}
              />
            </FormField>
            <FormField label="품목명" required>
              <Input
                name="item_nm"
                placeholder="품목명 입력"
                maxLength={200}
                required
                defaultValue={form.getFieldsValue().item_nm ?? ''}
                onChange={(e) => form.setFieldsValue({ item_nm: e.target.value } as Partial<ItemFormValues>)}
              />
            </FormField>
            <FormField label="품목유형" required>
              <Select
                name="item_type"
                placeholder="품목유형 선택"
                options={ITEM_TYPE_OPTIONS}
                required
                defaultValue={form.getFieldsValue().item_type ?? ''}
                onChange={(e) => form.setFieldsValue({ item_type: e.target.value } as Partial<ItemFormValues>)}
              />
            </FormField>
            <FormField label="단위">
              <CommonCodeSelect
                groupCd="UNIT"
                placeholder="단위 선택"
                value={form.getFieldsValue().unit_cd}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => form.setFieldsValue({ unit_cd: e.target.value } as Partial<ItemFormValues>)}
              />
            </FormField>
            <FormField label="규격">
              <Input
                name="spec"
                placeholder="규격 입력"
                defaultValue={form.getFieldsValue().spec ?? ''}
                onChange={(e) => form.setFieldsValue({ spec: e.target.value } as Partial<ItemFormValues>)}
              />
            </FormField>
            <FormField label="도면번호">
              <Input
                name="drawing_no"
                placeholder="도면번호 입력"
                defaultValue={form.getFieldsValue().drawing_no ?? ''}
                onChange={(e) => form.setFieldsValue({ drawing_no: e.target.value } as Partial<ItemFormValues>)}
              />
            </FormField>
            <FormField label="안전재고">
              <input
                type="number"
                name="safety_stock"
                placeholder="안전재고"
                min={0}
                step={1}
                className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                defaultValue={form.getFieldsValue().safety_stock ?? ''}
                onChange={(e) => form.setFieldsValue({ safety_stock: e.target.value ? Number(e.target.value) : undefined } as Partial<ItemFormValues>)}
              />
            </FormField>
            {mode === 'edit' && (
              <FormField label="사용여부">
                <Select
                  name="use_yn"
                  options={USE_YN_OPTIONS}
                  defaultValue={form.getFieldsValue().use_yn ?? 'Y'}
                  onChange={(e) => form.setFieldsValue({ use_yn: e.target.value } as Partial<ItemFormValues>)}
                />
              </FormField>
            )}
          </>
        )}
      </FormModal>

      {/* History Drawer */}
      <DataHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        tableName="tb_item"
        recordId={historyItemCd}
        title={`품목 변경이력 (${historyItemCd})`}
      />
    </div>
  );
}
