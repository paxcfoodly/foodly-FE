'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, History } from 'lucide-react';
import { Button, Tag } from '@/components/ui';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode, type FormHandle } from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import DataGrid from '@/components/common/DataGrid';
import ExcelUploadButton from '@/components/common/ExcelUploadButton';
import ExcelDownloadButton, { type ExcelColumn } from '@/components/common/ExcelDownloadButton';
import DataHistoryDrawer from '@/components/common/DataHistoryDrawer';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import FormField from '@/components/ui/FormField';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

/* ── Types ─────────────────────────────────────────── */

interface MoldRow {
  mold_cd: string;
  mold_nm: string;
  item_cd: string | null;
  warranty_shots: number | null;
  current_shots: number;
  use_yn: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  [key: string]: unknown;
}

interface MoldFormValues {
  mold_cd: string;
  mold_nm: string;
  item_cd?: string;
  warranty_shots?: number;
  current_shots?: number;
  use_yn?: string;
  [key: string]: unknown;
}

interface ItemOption {
  item_cd: string;
  item_nm: string;
}

const MENU_URL = '/equipment/mold';

const USE_YN_OPTIONS = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
];

/* ── Excel columns ─── */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: '금형코드', key: 'mold_cd', width: 15 },
  { header: '금형명', key: 'mold_nm', width: 30 },
  { header: '적용품목', key: 'item_cd', width: 15 },
  { header: '보증타수', key: 'warranty_shots', width: 12 },
  { header: '현재타수', key: 'current_shots', width: 12 },
  { header: '사용여부', key: 'use_yn', width: 10 },
];

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'mold_cd', label: '금형코드', type: 'text', placeholder: '금형코드 입력' },
  { name: 'mold_nm', label: '금형명', type: 'text', placeholder: '금형명 입력' },
  {
    name: 'use_yn',
    label: '사용여부',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...USE_YN_OPTIONS],
  },
];

/* ── Component ─────────────────────────────────────── */

export default function MoldMasterPage() {
  /* ── State ─── */
  const [items, setItems] = useState<MoldRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<MoldRow | null>(null);

  // History drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCd, setHistoryCd] = useState('');

  // Item dropdown options
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);

  /* ── Load item options ─── */
  useEffect(() => {
    apiClient
      .get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 9999, use_yn: 'Y' } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setItemOptions(list.map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd })));
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

        const res = await apiClient.get<PaginatedResponse<MoldRow>>('/v1/molds', { params });
        const body = res.data;
        setItems(body.data ?? []);
        if (body.pagination) {
          setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? '금형 목록 조회에 실패했습니다.');
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

  const handlePageChange = useCallback(
    (newPage: number, newPageSize: number) => {
      setPagination((prev) => ({ ...prev, page: newPage, pageSize: newPageSize }));
      fetchItems(newPage, newPageSize, sortField, sortOrder, filters);
    },
    [fetchItems, sortField, sortOrder, filters],
  );

  const handleSortChange = useCallback(
    (field: string, order: 'asc' | 'desc') => {
      setSortField(field || undefined);
      setSortOrder(field ? order : undefined);
      fetchItems(pagination.page, pagination.pageSize, field || undefined, field ? order : undefined, filters);
    },
    [fetchItems, pagination.page, pagination.pageSize, filters],
  );

  const handleCreate = useCallback(() => {
    setEditItem(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: MoldRow) => {
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: MoldFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/molds', {
          mold_cd: values.mold_cd,
          mold_nm: values.mold_nm,
          item_cd: values.item_cd || null,
          warranty_shots: values.warranty_shots ?? null,
          current_shots: values.current_shots ?? 0,
        });
      } else {
        await apiClient.put(`/v1/molds/${editItem!.mold_cd}`, {
          mold_nm: values.mold_nm,
          item_cd: values.item_cd || null,
          warranty_shots: values.warranty_shots ?? null,
          current_shots: values.current_shots,
          use_yn: values.use_yn,
        });
      }
      fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    (record: MoldRow) => {
      confirm({
        title: '금형을 삭제하시겠습니까?',
        content: '다른 데이터에서 참조 중인 경우 삭제가 거부됩니다.',
        okText: '삭제',
        cancelText: '취소',
        danger: true,
        onOk: async () => {
          try {
            await apiClient.delete(`/v1/molds/${record.mold_cd}`);
            toast.success('금형이 삭제되었습니다.');
            fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
          } catch (err: any) {
            toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
          }
        },
      });
    },
    [fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleHistory = useCallback((record: MoldRow) => {
    setHistoryCd(record.mold_cd);
    setHistoryOpen(true);
  }, []);

  const fetchExcelData = useCallback(async () => {
    const res = await apiClient.get<PaginatedResponse<MoldRow>>('/v1/molds/export');
    return (res.data?.data ?? []) as Record<string, unknown>[];
  }, []);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return undefined;
    return {
      mold_cd: editItem.mold_cd,
      mold_nm: editItem.mold_nm,
      item_cd: editItem.item_cd ?? undefined,
      warranty_shots: editItem.warranty_shots != null ? Number(editItem.warranty_shots) : undefined,
      current_shots: editItem.current_shots != null ? Number(editItem.current_shots) : undefined,
      use_yn: editItem.use_yn,
    } as Partial<MoldFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      { title: '금형코드', dataIndex: 'mold_cd', width: 130, sorter: true, ellipsis: true },
      { title: '금형명', dataIndex: 'mold_nm', width: 200, sorter: true, ellipsis: true },
      { title: '적용품목', dataIndex: 'item_cd', width: 130, sorter: true, ellipsis: true },
      {
        title: '보증타수',
        dataIndex: 'warranty_shots',
        width: 100,
        align: 'right' as const,
        render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '-'),
      },
      {
        title: '현재타수',
        dataIndex: 'current_shots',
        width: 100,
        align: 'right' as const,
        render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '0'),
      },
      {
        title: '사용여부',
        dataIndex: 'use_yn',
        width: 80,
        align: 'center' as const,
        render: (val: unknown) => (
          <Tag color={(val as string) === 'Y' ? 'green' : 'gray'}>
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
        render: (_: unknown, record: MoldRow) => (
          <div className="flex items-center justify-center gap-1">
            <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => handleEdit(record)}>{''}</PermissionButton>
            <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="danger" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDelete(record)}>{''}</PermissionButton>
            <Button size="small" variant="ghost" icon={<History className="w-4 h-4" />} onClick={() => handleHistory(record)} />
          </div>
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
          <div className="flex items-center gap-2">
            <ExcelUploadButton uploadUrl="/v1/molds/import" onComplete={() => fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters)} />
            <ExcelDownloadButton filename="금형목록" columns={EXCEL_COLUMNS} data={fetchExcelData} />
          </div>
        }
      />

      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>금형 등록</PermissionButton>
      </div>

      <DataGrid<MoldRow> storageKey="equipment-mold"
        columns={columns}
        dataSource={items}
        rowKey="mold_cd"
        loading={loading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={handlePageChange}
        sortBy={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        scrollX={1100}
        size="small"
      />

      <FormModal<MoldFormValues>
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '금형 등록' : '금형 수정'}
        width={560}
      >
        {(form, mode) => (
          <>
            <FormField label="금형코드" required>
              <Input
                name="mold_cd"
                placeholder="금형코드 입력"
                disabled={mode === 'edit'}
                maxLength={30}
                required
                value={(form.getFieldsValue().mold_cd as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ mold_cd: e.target.value } as Partial<MoldFormValues>)}
              />
            </FormField>
            <FormField label="금형명" required>
              <Input
                name="mold_nm"
                placeholder="금형명 입력"
                maxLength={200}
                required
                value={(form.getFieldsValue().mold_nm as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ mold_nm: e.target.value } as Partial<MoldFormValues>)}
              />
            </FormField>
            <FormField label="적용품목">
              <Select
                placeholder="품목 선택"
                options={itemOptions}
                value={(form.getFieldsValue().item_cd as string) ?? ''}
                onChange={(e) => form.setFieldsValue({ item_cd: e.target.value } as Partial<MoldFormValues>)}
              />
            </FormField>
            <FormField label="보증타수">
              <input
                type="number"
                name="warranty_shots"
                placeholder="보증타수"
                min={0}
                className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                value={form.getFieldsValue().warranty_shots ?? ''}
                onChange={(e) => form.setFieldsValue({ warranty_shots: e.target.value ? Number(e.target.value) : undefined } as Partial<MoldFormValues>)}
              />
            </FormField>
            <FormField label="현재타수">
              <input
                type="number"
                name="current_shots"
                placeholder="현재타수"
                min={0}
                className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                value={form.getFieldsValue().current_shots ?? ''}
                onChange={(e) => form.setFieldsValue({ current_shots: e.target.value ? Number(e.target.value) : undefined } as Partial<MoldFormValues>)}
              />
            </FormField>
            {mode === 'edit' && (
              <FormField label="사용여부">
                <Select
                  options={USE_YN_OPTIONS}
                  value={(form.getFieldsValue().use_yn as string) ?? ''}
                  onChange={(e) => form.setFieldsValue({ use_yn: e.target.value } as Partial<MoldFormValues>)}
                />
              </FormField>
            )}
          </>
        )}
      </FormModal>

      <DataHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} tableName="tb_mold" recordId={historyCd} title={`금형 변경이력 (${historyCd})`} />
    </div>
  );
}
