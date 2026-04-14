'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, History } from 'lucide-react';
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
interface WorkshopRow { workshop_cd: string; workshop_nm: string; plant_cd: string; parent_cd: string | null; workshop_type: string | null; sort_order: number; use_yn: string; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; [key: string]: unknown; }
interface WorkshopFormValues { workshop_cd: string; workshop_nm: string; plant_cd: string; parent_cd?: string; workshop_type?: string; sort_order?: number; use_yn?: string; [key: string]: unknown; }

const MENU_URL = '/master/workplace';
const USE_YN_OPTIONS = [{ label: '사용', value: 'Y' }, { label: '미사용', value: 'N' }];
const WORKSHOP_TYPE_OPTIONS = [{ label: '공장', value: 'PLANT' }, { label: '작업장', value: 'WORKSHOP' }, { label: '라인', value: 'LINE' }];
const WORKSHOP_TYPE_LABEL: Record<string, string> = { PLANT: '공장', WORKSHOP: '작업장', LINE: '라인' };
const WORKSHOP_TYPE_COLOR: Record<string, string> = { PLANT: 'blue', WORKSHOP: 'orange', LINE: 'green' };

const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: '작업장코드', key: 'workshop_cd', width: 15 }, { header: '작업장명', key: 'workshop_nm', width: 30 },
  { header: '공장코드', key: 'plant_cd', width: 12 }, { header: '상위작업장', key: 'parent_cd', width: 15 },
  { header: '작업장유형', key: 'workshop_type', width: 12 }, { header: '정렬순서', key: 'sort_order', width: 10 },
  { header: '사용여부', key: 'use_yn', width: 10 },
];

const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'workshop_cd', label: '작업장코드', type: 'text', placeholder: '작업장코드 입력' },
  { name: 'workshop_nm', label: '작업장명', type: 'text', placeholder: '작업장명 입력' },
  { name: 'workshop_type', label: '작업장유형', type: 'select', options: [{ label: '전체', value: '' }, ...WORKSHOP_TYPE_OPTIONS] },
  { name: 'use_yn', label: '사용여부', type: 'select', options: [{ label: '전체', value: '' }, ...USE_YN_OPTIONS] },
];

export default function WorkshopMasterPage() {
  const [items, setItems] = useState<WorkshopRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<WorkshopRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCd, setHistoryCd] = useState('');
  const [allWorkshops, setAllWorkshops] = useState<{ workshop_cd: string; workshop_nm: string }[]>([]);

  const loadWorkshopOptions = useCallback(() => {
    apiClient.get<PaginatedResponse<{ workshop_cd: string; workshop_nm: string }>>('/v1/workshops', { params: { limit: 9999, use_yn: 'Y' } })
      .then((res) => { setAllWorkshops(res.data?.data ?? []); }).catch(() => {});
  }, []);

  useEffect(() => { loadWorkshopOptions(); }, [loadWorkshopOptions]);

  const parentOptions = useMemo(() => {
    const selfCd = editItem?.workshop_cd;
    return allWorkshops.filter((w) => w.workshop_cd !== selfCd).map((w) => ({ label: `${w.workshop_cd} - ${w.workshop_nm}`, value: w.workshop_cd }));
  }, [allWorkshops, editItem]);

  const fetchItems = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', searchFilters?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize };
      const af = searchFilters ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<WorkshopRow>>('/v1/workshops', { params });
      const body = res.data; setItems(body.data ?? []);
      if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: any) { toast.error(err?.response?.data?.message ?? '작업장 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchItems(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((values: Record<string, unknown>) => { setFilters(values); setPagination((p) => ({ ...p, page: 1 })); fetchItems(1, pagination.pageSize, sortField, sortOrder, values); }, [fetchItems, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchItems(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchItems, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchItems(pagination.page, pagination.pageSize, f, o, filters); }, [fetchItems, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchItems(p, ps, sortField, sortOrder, filters); }, [fetchItems, sortField, sortOrder, filters]);

  const handleCreate = useCallback(() => { setEditItem(null); setModalMode('create'); setModalOpen(true); }, []);
  const handleEdit = useCallback((r: WorkshopRow) => { setEditItem(r); setModalMode('edit'); setModalOpen(true); }, []);

  const handleSubmit = useCallback(async (values: WorkshopFormValues, mode: FormModalMode) => {
    if (mode === 'create') {
      await apiClient.post('/v1/workshops', { workshop_cd: values.workshop_cd, workshop_nm: values.workshop_nm, plant_cd: values.plant_cd, parent_cd: values.parent_cd || null, workshop_type: values.workshop_type || null, sort_order: values.sort_order ?? 0 });
    } else {
      await apiClient.put(`/v1/workshops/${editItem!.workshop_cd}`, { workshop_nm: values.workshop_nm, plant_cd: values.plant_cd, parent_cd: values.parent_cd || null, workshop_type: values.workshop_type || null, sort_order: values.sort_order, use_yn: values.use_yn });
    }
    fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters); loadWorkshopOptions();
  }, [editItem, fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters, loadWorkshopOptions]);

  const handleDelete = useCallback(async (r: WorkshopRow) => {
    try { await apiClient.delete(`/v1/workshops/${r.workshop_cd}`); toast.success('작업장이 삭제되었습니다.'); fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters); loadWorkshopOptions(); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.'); }
  }, [fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters, loadWorkshopOptions]);

  const handleHistory = useCallback((r: WorkshopRow) => { setHistoryCd(r.workshop_cd); setHistoryOpen(true); }, []);
  const fetchExcelData = useCallback(async () => { const res = await apiClient.get<PaginatedResponse<WorkshopRow>>('/v1/workshops/export'); return (res.data?.data ?? []) as Record<string, unknown>[]; }, []);

  const modalInitialValues = useMemo(() => {
    if (!editItem) return undefined;
    return { workshop_cd: editItem.workshop_cd, workshop_nm: editItem.workshop_nm, plant_cd: editItem.plant_cd, parent_cd: editItem.parent_cd ?? undefined, workshop_type: editItem.workshop_type ?? undefined, sort_order: editItem.sort_order != null ? Number(editItem.sort_order) : undefined, use_yn: editItem.use_yn } as Partial<WorkshopFormValues>;
  }, [editItem]);

  const columns: TableColumn<WorkshopRow>[] = useMemo(() => [
    { title: '작업장코드', dataIndex: 'workshop_cd', width: 130, sorter: true, ellipsis: true },
    { title: '작업장명', dataIndex: 'workshop_nm', width: 200, sorter: true, ellipsis: true },
    { title: '공장코드', dataIndex: 'plant_cd', width: 100, sorter: true, ellipsis: true },
    { title: '상위작업장', dataIndex: 'parent_cd', width: 120, ellipsis: true, render: (val: unknown) => (val as string) || '-' },
    { title: '작업장유형', dataIndex: 'workshop_type', width: 100, align: 'center', sorter: true, render: (val: unknown) => { const v = val as string; if (!v) return '-'; return <Tag color={WORKSHOP_TYPE_COLOR[v] ?? 'default'}>{WORKSHOP_TYPE_LABEL[v] ?? v}</Tag>; } },
    { title: '정렬순서', dataIndex: 'sort_order', width: 80, align: 'right', sorter: true, render: (val: unknown) => (val != null ? Number(val) : 0) },
    { title: '사용여부', dataIndex: 'use_yn', width: 80, align: 'center', render: (val: unknown) => (<Tag color={(val as string) === 'Y' ? 'green' : 'default'}>{(val as string) === 'Y' ? '사용' : '미사용'}</Tag>) },
    { title: '등록일', dataIndex: 'create_dt', width: 110, sorter: true, render: (val: unknown) => (val ? dayjs(val as string).format('YYYY-MM-DD') : '-') },
    { title: '관리', dataIndex: '_action', width: 130, align: 'center', render: (_: unknown, record: WorkshopRow) => (
      <div className="flex items-center gap-1">
        <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => handleEdit(record)}>{''}</PermissionButton>
        <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />}
          onClick={() => confirm({ title: '작업장을 삭제하시겠습니까?', content: '다른 데이터에서 참조 중인 경우 삭제가 거부됩니다.', onOk: () => handleDelete(record), okText: '삭제', danger: true })}>{''}</PermissionButton>
        <Button size="small" variant="ghost" icon={<History className="w-4 h-4" />} onClick={() => handleHistory(record)} />
      </div>
    ) },
  ], [handleEdit, handleDelete, handleHistory]);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading}
        extraButtons={<div className="flex items-center gap-2"><ExcelUploadButton uploadUrl="/v1/workshops/import" onComplete={() => fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters)} /><ExcelDownloadButton filename="작업장목록" columns={EXCEL_COLUMNS} data={fetchExcelData} /></div>} />
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>작업장 등록</PermissionButton>
      </div>
      <Table<WorkshopRow> columns={columns} dataSource={items} rowKey="workshop_cd" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1200} />

      <FormModal<WorkshopFormValues> open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} onSubmit={handleSubmit} mode={modalMode} initialValues={modalInitialValues} title={modalMode === 'create' ? '작업장 등록' : '작업장 수정'} width={560}>
        {(form, mode) => (
          <>
            <FormField label="작업장코드" required><Input name="workshop_cd" placeholder="작업장코드 입력" disabled={mode === 'edit'} maxLength={30} required defaultValue={form.getFieldsValue().workshop_cd ?? ''} onChange={(e) => form.setFieldsValue({ workshop_cd: e.target.value } as any)} /></FormField>
            <FormField label="작업장명" required><Input name="workshop_nm" placeholder="작업장명 입력" maxLength={200} required defaultValue={form.getFieldsValue().workshop_nm ?? ''} onChange={(e) => form.setFieldsValue({ workshop_nm: e.target.value } as any)} /></FormField>
            <FormField label="공장코드" required><Input name="plant_cd" placeholder="공장코드 입력" required defaultValue={form.getFieldsValue().plant_cd ?? ''} onChange={(e) => form.setFieldsValue({ plant_cd: e.target.value } as any)} /></FormField>
            <FormField label="상위작업장"><Select name="parent_cd" placeholder="상위작업장 선택" options={[{ label: '선택 안함', value: '' }, ...parentOptions]} defaultValue={form.getFieldsValue().parent_cd ?? ''} onChange={(e) => form.setFieldsValue({ parent_cd: e.target.value } as any)} /></FormField>
            <FormField label="작업장유형"><Select name="workshop_type" placeholder="작업장유형 선택" options={[{ label: '선택 안함', value: '' }, ...WORKSHOP_TYPE_OPTIONS]} defaultValue={form.getFieldsValue().workshop_type ?? ''} onChange={(e) => form.setFieldsValue({ workshop_type: e.target.value } as any)} /></FormField>
            <FormField label="정렬순서"><input type="number" name="sort_order" placeholder="정렬순서" min={0} step={1} className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" defaultValue={form.getFieldsValue().sort_order ?? ''} onChange={(e) => form.setFieldsValue({ sort_order: e.target.value ? Number(e.target.value) : undefined } as any)} /></FormField>
            {mode === 'edit' && (<FormField label="사용여부"><Select name="use_yn" options={USE_YN_OPTIONS} defaultValue={form.getFieldsValue().use_yn ?? 'Y'} onChange={(e) => form.setFieldsValue({ use_yn: e.target.value } as any)} /></FormField>)}
          </>
        )}
      </FormModal>
      <DataHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} tableName="tb_workshop" recordId={historyCd} title={`작업장 변경이력 (${historyCd})`} />
    </div>
  );
}
