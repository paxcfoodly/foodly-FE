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

interface WorkerRow { worker_id: string; worker_nm: string; dept_cd: string | null; workshop_cd: string | null; shift_cd: string | null; use_yn: string; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; [key: string]: unknown; }
interface WorkerFormValues { worker_id: string; worker_nm: string; dept_cd?: string; workshop_cd?: string; shift_cd?: string; use_yn?: string; [key: string]: unknown; }
interface WorkshopOption { workshop_cd: string; workshop_nm: string; }

const MENU_URL = '/master/worker';
const USE_YN_OPTIONS = [{ label: '사용', value: 'Y' }, { label: '미사용', value: 'N' }];
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: '사번', key: 'worker_id', width: 15 }, { header: '작업자명', key: 'worker_nm', width: 20 },
  { header: '부서코드', key: 'dept_cd', width: 12 }, { header: '작업장코드', key: 'workshop_cd', width: 15 },
  { header: '교대코드', key: 'shift_cd', width: 12 }, { header: '사용여부', key: 'use_yn', width: 10 },
];
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'worker_id', label: '사번', type: 'text', placeholder: '사번 입력' },
  { name: 'worker_nm', label: '작업자명', type: 'text', placeholder: '작업자명 입력' },
  { name: 'use_yn', label: '사용여부', type: 'select', options: [{ label: '전체', value: '' }, ...USE_YN_OPTIONS] },
];

export default function WorkerMasterPage() {
  const [items, setItems] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<WorkerRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCd, setHistoryCd] = useState('');
  const [workshopOptions, setWorkshopOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    apiClient.get<PaginatedResponse<WorkshopOption>>('/v1/workshops', { params: { limit: 9999, use_yn: 'Y' } })
      .then((res) => { const list = res.data?.data ?? []; setWorkshopOptions(list.map((w) => ({ label: `${w.workshop_cd} - ${w.workshop_nm}`, value: w.workshop_cd }))); }).catch(() => {});
  }, []);

  const fetchItems = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<WorkerRow>>('/v1/workers', { params }); const body = res.data;
      setItems(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: any) { toast.error(err?.response?.data?.message ?? '작업자 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchItems(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchItems(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchItems, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchItems(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchItems, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchItems(pagination.page, pagination.pageSize, f, o, filters); }, [fetchItems, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchItems(p, ps, sortField, sortOrder, filters); }, [fetchItems, sortField, sortOrder, filters]);
  const handleCreate = useCallback(() => { setEditItem(null); setModalMode('create'); setModalOpen(true); }, []);
  const handleEdit = useCallback((r: WorkerRow) => { setEditItem(r); setModalMode('edit'); setModalOpen(true); }, []);

  const handleSubmit = useCallback(async (values: WorkerFormValues, mode: FormModalMode) => {
    if (mode === 'create') { await apiClient.post('/v1/workers', { worker_id: values.worker_id, worker_nm: values.worker_nm, dept_cd: values.dept_cd || null, workshop_cd: values.workshop_cd || null, shift_cd: values.shift_cd || null }); }
    else { await apiClient.put(`/v1/workers/${editItem!.worker_id}`, { worker_nm: values.worker_nm, dept_cd: values.dept_cd || null, workshop_cd: values.workshop_cd || null, shift_cd: values.shift_cd || null, use_yn: values.use_yn }); }
    fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
  }, [editItem, fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleDelete = useCallback(async (r: WorkerRow) => {
    try { await apiClient.delete(`/v1/workers/${r.worker_id}`); toast.success('작업자가 삭제되었습니다.'); fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.'); }
  }, [fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleHistory = useCallback((r: WorkerRow) => { setHistoryCd(r.worker_id); setHistoryOpen(true); }, []);
  const fetchExcelData = useCallback(async () => { const res = await apiClient.get<PaginatedResponse<WorkerRow>>('/v1/workers', { params: { limit: 99999 } }); return (res.data?.data ?? []) as Record<string, unknown>[]; }, []);

  const modalInitialValues = useMemo(() => {
    if (!editItem) return undefined;
    return { worker_id: editItem.worker_id, worker_nm: editItem.worker_nm, dept_cd: editItem.dept_cd ?? undefined, workshop_cd: editItem.workshop_cd ?? undefined, shift_cd: editItem.shift_cd ?? undefined, use_yn: editItem.use_yn } as Partial<WorkerFormValues>;
  }, [editItem]);

  const columns: TableColumn<WorkerRow>[] = useMemo(() => [
    { title: '사번', dataIndex: 'worker_id', width: 120, sorter: true, ellipsis: true },
    { title: '작업자명', dataIndex: 'worker_nm', width: 150, sorter: true, ellipsis: true },
    { title: '부서코드', dataIndex: 'dept_cd', width: 100, ellipsis: true, render: (v: unknown) => (v as string) || '-' },
    { title: '작업장', dataIndex: 'workshop_cd', width: 120, ellipsis: true, render: (v: unknown) => (v as string) || '-' },
    { title: '교대코드', dataIndex: 'shift_cd', width: 100, ellipsis: true, render: (v: unknown) => (v as string) || '-' },
    { title: '사용여부', dataIndex: 'use_yn', width: 80, align: 'center', render: (v: unknown) => (<Tag color={(v as string) === 'Y' ? 'green' : 'default'}>{(v as string) === 'Y' ? '사용' : '미사용'}</Tag>) },
    { title: '등록일', dataIndex: 'create_dt', width: 110, sorter: true, render: (v: unknown) => (v ? dayjs(v as string).format('YYYY-MM-DD') : '-') },
    { title: '관리', dataIndex: '_action', width: 130, align: 'center', render: (_: unknown, r: WorkerRow) => (
      <div className="flex items-center gap-1">
        <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => handleEdit(r)}>{''}</PermissionButton>
        <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />}
          onClick={() => confirm({ title: '작업자를 삭제하시겠습니까?', content: '다른 데이터에서 참조 중인 경우 삭제가 거부됩니다.', onOk: () => handleDelete(r), okText: '삭제', danger: true })}>{''}</PermissionButton>
        <Button size="small" variant="ghost" icon={<History className="w-4 h-4" />} onClick={() => handleHistory(r)} />
      </div>
    ) },
  ], [handleEdit, handleDelete, handleHistory]);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading}
        extraButtons={<div className="flex items-center gap-2"><ExcelUploadButton uploadUrl="/v1/workers/import" onComplete={() => fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters)} /><ExcelDownloadButton filename="작업자목록" columns={EXCEL_COLUMNS} data={fetchExcelData} /></div>} />
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>작업자 등록</PermissionButton>
      </div>
      <Table<WorkerRow> columns={columns} dataSource={items} rowKey="worker_id" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1000} />

      <FormModal<WorkerFormValues> open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} onSubmit={handleSubmit} mode={modalMode} initialValues={modalInitialValues} title={modalMode === 'create' ? '작업자 등록' : '작업자 수정'} width={520}>
        {(form, mode) => (
          <>
            <FormField label="사번" required><Input name="worker_id" placeholder="사번 입력" disabled={mode === 'edit'} maxLength={20} required defaultValue={form.getFieldsValue().worker_id ?? ''} onChange={(e) => form.setFieldsValue({ worker_id: e.target.value } as any)} /></FormField>
            <FormField label="작업자명" required><Input name="worker_nm" placeholder="작업자명 입력" maxLength={100} required defaultValue={form.getFieldsValue().worker_nm ?? ''} onChange={(e) => form.setFieldsValue({ worker_nm: e.target.value } as any)} /></FormField>
            <FormField label="부서"><CommonCodeSelect groupCd="DEPT" placeholder="부서 선택" value={form.getFieldsValue().dept_cd} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => form.setFieldsValue({ dept_cd: e.target.value } as any)} /></FormField>
            <FormField label="작업장"><Select name="workshop_cd" placeholder="작업장 선택" options={[{ label: '선택 안함', value: '' }, ...workshopOptions]} defaultValue={form.getFieldsValue().workshop_cd ?? ''} onChange={(e) => form.setFieldsValue({ workshop_cd: e.target.value } as any)} /></FormField>
            <FormField label="교대"><CommonCodeSelect groupCd="SHIFT" placeholder="교대 선택" value={form.getFieldsValue().shift_cd} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => form.setFieldsValue({ shift_cd: e.target.value } as any)} /></FormField>
            {mode === 'edit' && (<FormField label="사용여부"><Select name="use_yn" options={USE_YN_OPTIONS} defaultValue={form.getFieldsValue().use_yn ?? 'Y'} onChange={(e) => form.setFieldsValue({ use_yn: e.target.value } as any)} /></FormField>)}
          </>
        )}
      </FormModal>
      <DataHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} tableName="tb_worker" recordId={historyCd} title={`작업자 변경이력 (${historyCd})`} />
    </div>
  );
}
