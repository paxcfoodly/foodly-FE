'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

interface MaterialInputRow { input_id: number; wo_id: number; item_cd: string; lot_no: string | null; input_qty: number; worker_id: string | null; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; work_order?: { wo_no: string }; item?: { item_nm: string }; lot?: { lot_no: string } | null; worker?: { worker_nm: string } | null; [key: string]: unknown; }
interface MaterialInputFormValues { wo_id: number; item_cd: string; lot_no?: string; input_qty: number; worker_id?: string; [key: string]: unknown; }
interface WorkOrderOption { wo_id: number; wo_no: string; item_cd: string; item?: { item_nm: string }; }
interface ItemOption { item_cd: string; item_nm: string; }
interface WorkerOption { worker_id: string; worker_nm: string; }

const MENU_URL = '/result/material';
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'wo_id', label: '작업지시번호', type: 'text', placeholder: '작업지시 ID 입력' },
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'lot_no', label: 'LOT번호', type: 'text', placeholder: 'LOT번호 입력' },
];

export default function MaterialInputPage() {
  const [rows, setRows] = useState<MaterialInputRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const lotNoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [woRes, itemRes, wkRes] = await Promise.all([
          apiClient.get<PaginatedResponse<WorkOrderOption>>('/v1/work-orders', { params: { limit: 200, status: 'PROGRESS' } }),
          apiClient.get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 9999, use_yn: 'Y' } }),
          apiClient.get<PaginatedResponse<WorkerOption>>('/v1/workers', { params: { limit: 200 } }),
        ]);
        setWorkOrders(woRes.data?.data ?? []); setItems(itemRes.data?.data ?? []); setWorkers(wkRes.data?.data ?? []);
      } catch { /* silently fail */ }
    }; loadOptions();
  }, []);

  const fetchData = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<MaterialInputRow>>('/v1/material-inputs', { params }); const body = res.data;
      setRows(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '자재투입 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchData(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchData(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchData, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchData(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchData, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchData(pagination.page, pagination.pageSize, f, o, filters); }, [fetchData, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchData(p, ps, sortField, sortOrder, filters); }, [fetchData, sortField, sortOrder, filters]);
  const handleCreate = useCallback(() => { setModalOpen(true); }, []);

  const handleSubmit = useCallback(async (values: MaterialInputFormValues) => {
    const payload = { wo_id: values.wo_id, item_cd: values.item_cd, lot_no: values.lot_no || null, input_qty: values.input_qty ?? 0, worker_id: values.worker_id || null };
    await apiClient.post('/v1/material-inputs', payload);
    fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
  }, [fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleDelete = useCallback(async (r: MaterialInputRow) => {
    try { await apiClient.delete(`/v1/material-inputs/${r.input_id}`); toast.success('자재투입이 삭제되었습니다.'); fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '삭제에 실패했습니다.'); }
  }, [fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const columns: TableColumn<MaterialInputRow>[] = useMemo(() => [
    { title: '투입ID', dataIndex: 'input_id', width: 80, sorter: true },
    { title: '작업지시번호', dataIndex: 'wo_id', key: 'wo_no', width: 140, ellipsis: true, render: (_: unknown, r: MaterialInputRow) => r.work_order?.wo_no ?? '-' },
    { title: '품목명', dataIndex: 'item_cd', key: 'item_nm', width: 160, ellipsis: true, render: (_: unknown, r: MaterialInputRow) => r.item?.item_nm ?? r.item_cd },
    { title: 'LOT번호', dataIndex: 'lot_no', width: 160, ellipsis: true, render: (v: unknown) => (v as string) || '-' },
    { title: '투입수량', dataIndex: 'input_qty', width: 100, align: 'right', sorter: true, render: (v: unknown) => v != null ? Number(v).toLocaleString() : '0' },
    { title: '작업자', dataIndex: 'worker_id', width: 100, render: (_: unknown, r: MaterialInputRow) => r.worker?.worker_nm ?? '-' },
    { title: '등록일시', dataIndex: 'create_dt', width: 140, sorter: true, render: (v: unknown) => v ? dayjs(v as string).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '관리', dataIndex: '_action', width: 80, align: 'center', render: (_: unknown, r: MaterialInputRow) => (
      <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />}
        onClick={() => confirm({ title: '자재투입을 삭제하시겠습니까?', content: '관련 LOT 이력이 함께 삭제됩니다.', onOk: () => handleDelete(r), okText: '삭제', danger: true })}>{''}</PermissionButton>
    ) },
  ], [handleDelete]);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>자재투입 등록</PermissionButton>
      </div>
      <Table<MaterialInputRow> columns={columns} dataSource={rows} rowKey="input_id" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1000} />

      <FormModal<MaterialInputFormValues> open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} mode="create" title="자재투입 등록" width={560}>
        {(form) => (
          <>
            <FormField label="작업지시" required><Select name="wo_id" placeholder="작업지시 선택" required options={workOrders.map((wo) => ({ label: `${wo.wo_no} — ${wo.item?.item_nm ?? wo.item_cd}`, value: String(wo.wo_id) }))} defaultValue="" onChange={(e) => form.setFieldsValue({ wo_id: Number(e.target.value) } as any)} /></FormField>
            <FormField label="품목" required><Select name="item_cd" placeholder="품목 선택" required options={items.map((it) => ({ label: `${it.item_cd} — ${it.item_nm}`, value: it.item_cd }))} defaultValue="" onChange={(e) => form.setFieldsValue({ item_cd: e.target.value } as any)} /></FormField>
            <FormField label="LOT번호"><Input name="lot_no" placeholder="LOT번호 입력 (바코드 스캔)" ref={lotNoInputRef as React.Ref<HTMLInputElement>} autoFocus onChange={(e) => form.setFieldsValue({ lot_no: e.target.value } as any)} /></FormField>
            <FormField label="투입수량" required><input type="number" name="input_qty" placeholder="투입수량" min={0.001} step="any" required className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" onChange={(e) => form.setFieldsValue({ input_qty: Number(e.target.value) } as any)} /></FormField>
            <FormField label="작업자"><Select name="worker_id" placeholder="작업자 선택" options={[{ label: '선택 안함', value: '' }, ...workers.map((wk) => ({ label: wk.worker_nm, value: wk.worker_id }))]} defaultValue="" onChange={(e) => form.setFieldsValue({ worker_id: e.target.value } as any)} /></FormField>
          </>
        )}
      </FormModal>
    </div>
  );
}
