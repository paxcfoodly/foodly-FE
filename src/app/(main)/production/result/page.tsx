'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Table from '@/components/ui/Table';
import type { TableColumn, PaginationConfig } from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import FormField from '@/components/ui/FormField';
import Select from '@/components/ui/Select';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

interface ResultRow { result_id: number; wo_id: number; lot_no: string | null; equip_cd: string | null; worker_id: number | null; good_qty: number; defect_qty: number; work_start_dt: string | null; work_end_dt: string | null; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; work_order?: { wo_no: string; item_cd: string; item?: { item_nm: string } }; lot?: { lot_no: string; lot_qty: number | null } | null; equipment?: { equip_nm: string } | null; worker?: { worker_nm: string } | null; [key: string]: unknown; }
interface ResultFormValues { wo_id: number; equip_cd?: string; worker_id?: number; good_qty: number; defect_qty?: number; work_start_dt?: unknown; work_end_dt?: unknown; auto_lot?: boolean; [key: string]: unknown; }
interface WorkOrderOption { wo_id: number; wo_no: string; item_cd: string; item?: { item_nm: string }; }
interface EquipmentOption { equip_cd: string; equip_nm: string; }
interface WorkerOption { worker_id: number; worker_nm: string; }

const MENU_URL = '/result/manage';
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'wo_no', label: '작업지시번호', type: 'text', placeholder: '작업지시번호 입력' },
  { name: 'dateRange', label: '작업기간', type: 'dateRange', placeholder: '작업기간' },
  { name: 'equip_cd', label: '설비', type: 'text', placeholder: '설비코드 입력' },
  { name: 'worker_id', label: '작업자', type: 'text', placeholder: '작업자 ID 입력' },
];

export default function ProdResultPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<ResultRow | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [equipments, setEquipments] = useState<EquipmentOption[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [woRes, eqRes, wkRes] = await Promise.all([
          apiClient.get<PaginatedResponse<WorkOrderOption>>('/v1/work-orders', { params: { limit: 200, status: 'PROGRESS' } }),
          apiClient.get<PaginatedResponse<EquipmentOption>>('/v1/equipments', { params: { limit: 200 } }),
          apiClient.get<PaginatedResponse<WorkerOption>>('/v1/workers', { params: { limit: 200 } }),
        ]);
        setWorkOrders(woRes.data?.data ?? []); setEquipments(eqRes.data?.data ?? []); setWorkers(wkRes.data?.data ?? []);
      } catch { /* silently fail */ }
    }; loadOptions();
  }, []);

  const fetchData = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') { if (k === 'dateRange' && Array.isArray(v) && v.length === 2) { params.startDate = dayjs(v[0] as string).format('YYYY-MM-DD'); params.endDate = dayjs(v[1] as string).format('YYYY-MM-DD'); } else { params[k] = v; } } });
      const res = await apiClient.get<PaginatedResponse<ResultRow>>('/v1/prod-results', { params }); const body = res.data;
      setRows(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '실적 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchData(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchData(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchData, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchData(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchData, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchData(pagination.page, pagination.pageSize, f, o, filters); }, [fetchData, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchData(p, ps, sortField, sortOrder, filters); }, [fetchData, sortField, sortOrder, filters]);

  const handleCreate = useCallback(() => { setEditItem(null); setModalMode('create'); setModalOpen(true); }, []);
  const handleEdit = useCallback((r: ResultRow) => { setEditItem(r); setModalMode('edit'); setModalOpen(true); }, []);

  const handleSubmit = useCallback(async (values: ResultFormValues, mode: FormModalMode) => {
    const payload = { wo_id: values.wo_id, equip_cd: values.equip_cd || null, worker_id: values.worker_id ?? null, good_qty: values.good_qty ?? 0, defect_qty: values.defect_qty ?? 0, work_start_dt: values.work_start_dt ? dayjs(values.work_start_dt as string).toISOString() : null, work_end_dt: values.work_end_dt ? dayjs(values.work_end_dt as string).toISOString() : null, auto_lot: values.auto_lot ?? false };
    if (mode === 'create') { await apiClient.post('/v1/prod-results', payload); } else { await apiClient.put(`/v1/prod-results/${editItem!.result_id}`, payload); }
    fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
  }, [editItem, fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleDelete = useCallback(async (r: ResultRow) => {
    try { await apiClient.delete(`/v1/prod-results/${r.result_id}`); toast.success('실적이 삭제되었습니다.'); fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '삭제에 실패했습니다.'); }
  }, [fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const modalInitialValues = useMemo(() => {
    if (!editItem) return { auto_lot: true } as Partial<ResultFormValues>;
    return { wo_id: editItem.wo_id, equip_cd: editItem.equip_cd ?? undefined, worker_id: editItem.worker_id ?? undefined, good_qty: Number(editItem.good_qty), defect_qty: Number(editItem.defect_qty), work_start_dt: editItem.work_start_dt ? dayjs(editItem.work_start_dt).format('YYYY-MM-DDTHH:mm') : undefined, work_end_dt: editItem.work_end_dt ? dayjs(editItem.work_end_dt).format('YYYY-MM-DDTHH:mm') : undefined, auto_lot: false } as Partial<ResultFormValues>;
  }, [editItem]);

  const columns: TableColumn<ResultRow>[] = useMemo(() => [
    { title: '실적ID', dataIndex: 'result_id', width: 80, sorter: true },
    { title: '작업지시번호', dataIndex: 'wo_id', key: 'wo_no', width: 140, ellipsis: true, render: (_: unknown, r: ResultRow) => r.work_order?.wo_no ?? '-' },
    { title: '품목명', dataIndex: 'wo_id', key: 'item_nm', width: 160, ellipsis: true, render: (_: unknown, r: ResultRow) => r.work_order?.item?.item_nm ?? '-' },
    { title: '설비', dataIndex: 'equip_cd', width: 100, render: (_: unknown, r: ResultRow) => r.equipment?.equip_nm ?? r.equip_cd ?? '-' },
    { title: '작업자', dataIndex: 'worker_id', width: 100, render: (_: unknown, r: ResultRow) => r.worker?.worker_nm ?? '-' },
    { title: '양품수량', dataIndex: 'good_qty', width: 100, align: 'right', sorter: true, render: (v: unknown) => v != null ? Number(v).toLocaleString() : '0' },
    { title: '불량수량', dataIndex: 'defect_qty', width: 100, align: 'right', sorter: true, render: (v: unknown) => v != null ? Number(v).toLocaleString() : '0' },
    { title: 'LOT번호', dataIndex: 'lot_no', width: 140, ellipsis: true, render: (v: unknown) => (v as string) || '-' },
    { title: '작업시작', dataIndex: 'work_start_dt', width: 140, sorter: true, render: (v: unknown) => v ? dayjs(v as string).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '작업종료', dataIndex: 'work_end_dt', width: 140, render: (v: unknown) => v ? dayjs(v as string).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '관리', dataIndex: '_action', width: 100, align: 'center', render: (_: unknown, r: ResultRow) => (
      <div className="flex items-center gap-1">
        <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => handleEdit(r)}>{''}</PermissionButton>
        <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />}
          onClick={() => confirm({ title: '실적을 삭제하시겠습니까?', content: '관련 LOT 및 작업지시 수량이 재계산됩니다.', onOk: () => handleDelete(r), okText: '삭제', danger: true })}>{''}</PermissionButton>
      </div>
    ) },
  ], [handleEdit, handleDelete]);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>실적 등록</PermissionButton>
      </div>
      <Table<ResultRow> columns={columns} dataSource={rows} rowKey="result_id" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1400} />

      <FormModal<ResultFormValues> open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} onSubmit={handleSubmit} mode={modalMode} initialValues={modalInitialValues} title={modalMode === 'create' ? '실적 등록' : '실적 수정'} width={560}>
        {(form, mode) => (
          <>
            <FormField label="작업지시" required><Select name="wo_id" placeholder="작업지시 선택" required disabled={mode === 'edit'} options={workOrders.map((wo) => ({ label: `${wo.wo_no} — ${wo.item?.item_nm ?? wo.item_cd}`, value: String(wo.wo_id) }))} defaultValue={form.getFieldsValue().wo_id ? String(form.getFieldsValue().wo_id) : ''} onChange={(e) => form.setFieldsValue({ wo_id: Number(e.target.value) } as any)} /></FormField>
            <FormField label="설비"><Select name="equip_cd" placeholder="설비 선택" options={[{ label: '선택 안함', value: '' }, ...equipments.map((eq) => ({ label: `${eq.equip_cd} — ${eq.equip_nm}`, value: eq.equip_cd }))]} defaultValue={form.getFieldsValue().equip_cd ?? ''} onChange={(e) => form.setFieldsValue({ equip_cd: e.target.value } as any)} /></FormField>
            <FormField label="작업자"><Select name="worker_id" placeholder="작업자 선택" options={[{ label: '선택 안함', value: '' }, ...workers.map((wk) => ({ label: wk.worker_nm, value: String(wk.worker_id) }))]} defaultValue={form.getFieldsValue().worker_id ? String(form.getFieldsValue().worker_id) : ''} onChange={(e) => form.setFieldsValue({ worker_id: e.target.value ? Number(e.target.value) : undefined } as any)} /></FormField>
            <FormField label="양품수량" required><input type="number" name="good_qty" placeholder="양품수량" min={0} step={1} required className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" defaultValue={form.getFieldsValue().good_qty ?? ''} onChange={(e) => form.setFieldsValue({ good_qty: Number(e.target.value) } as any)} /></FormField>
            <FormField label="불량수량"><input type="number" name="defect_qty" placeholder="불량수량" min={0} step={1} className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" defaultValue={form.getFieldsValue().defect_qty ?? ''} onChange={(e) => form.setFieldsValue({ defect_qty: Number(e.target.value) } as any)} /></FormField>
            <FormField label="작업시작"><input type="datetime-local" name="work_start_dt" className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" defaultValue={form.getFieldsValue().work_start_dt as string ?? ''} onChange={(e) => form.setFieldsValue({ work_start_dt: e.target.value } as any)} /></FormField>
            <FormField label="작업종료"><input type="datetime-local" name="work_end_dt" className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" defaultValue={form.getFieldsValue().work_end_dt as string ?? ''} onChange={(e) => form.setFieldsValue({ work_end_dt: e.target.value } as any)} /></FormField>
            {mode === 'create' && (
              <FormField label="LOT 자동생성"><label className="flex items-center gap-2"><input type="checkbox" name="auto_lot" defaultChecked={form.getFieldsValue().auto_lot as boolean ?? true} onChange={(e) => form.setFieldsValue({ auto_lot: e.target.checked } as any)} className="accent-cyan-accent" /><span className="text-sm text-gray-700">자동 LOT 생성</span></label></FormField>
            )}
          </>
        )}
      </FormModal>
    </div>
  );
}
