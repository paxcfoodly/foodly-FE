'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, CheckCircle, FlaskConical, List, BarChart3 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import type { TableColumn, PaginationConfig } from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import { Section, Row } from '@/components/ui/Section';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

const GanttChart = dynamic(() => import('@/components/plan/GanttChart'), { ssr: false });

interface ProdPlanRow { plan_id: number; plan_no: string; plant_cd: string; item_cd: string; plan_qty: number | null; due_date: string; priority: number; status: string; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; item?: { item_nm: string } | null; plant?: { plant_nm: string } | null; [key: string]: unknown; }
interface ProdPlanFormValues { plant_cd: string; item_cd: string; plan_qty: number; due_date: unknown; priority: number; [key: string]: unknown; }
interface ItemOption { item_cd: string; item_nm: string; }

const MENU_URL = '/plan/management';
const STATUS_OPTIONS = [{ label: '계획', value: 'PLAN' }, { label: '확정', value: 'CONFIRMED' }, { label: '진행', value: 'PROGRESS' }, { label: '완료', value: 'COMPLETE' }, { label: '취소', value: 'CANCEL' }];
const STATUS_LABEL: Record<string, string> = { PLAN: '계획', CONFIRMED: '확정', PROGRESS: '진행', COMPLETE: '완료', CANCEL: '취소' };
const STATUS_COLOR: Record<string, string> = { PLAN: 'blue', CONFIRMED: 'green', PROGRESS: 'orange', COMPLETE: 'cyan', CANCEL: 'red' };

const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'item_cd', label: '품목', type: 'text', placeholder: '품목코드 입력' },
  { name: 'status', label: '상태', type: 'select', options: [{ label: '전체', value: '' }, ...STATUS_OPTIONS] },
  { name: 'due_date', label: '납기일', type: 'dateRange' },
];

export default function ProdPlanPage() {
  const [plans, setPlans] = useState<ProdPlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<ProdPlanRow | null>(null);
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialData, setMaterialData] = useState<{ planNo: string; itemCd: string; materials: { itemCd: string; itemNm: string; requiredQty: number; availableQty: number; shortage: number }[] } | null>(null);
  const [materialLoading, setMaterialLoading] = useState(false);

  useEffect(() => {
    apiClient.get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 9999, use_yn: 'Y' } })
      .then((res) => { const list = res.data?.data ?? []; setItemOptions(list.map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd }))); }).catch(() => {});
  }, []);

  const fetchPlans = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<ProdPlanRow>>('/v1/prod-plans', { params }); const body = res.data;
      setPlans(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: any) { toast.error(err?.response?.data?.message ?? '생산계획 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchPlans(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchPlans(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchPlans, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchPlans(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchPlans, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchPlans(pagination.page, pagination.pageSize, f, o, filters); }, [fetchPlans, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchPlans(p, ps, sortField, sortOrder, filters); }, [fetchPlans, sortField, sortOrder, filters]);

  const handleCreate = useCallback(() => { setEditItem(null); setModalMode('create'); setModalOpen(true); }, []);
  const handleEdit = useCallback((r: ProdPlanRow) => { if (r.status !== 'PLAN') { toast.warning('계획(PLAN) 상태에서만 수정할 수 있습니다.'); return; } setEditItem(r); setModalMode('edit'); setModalOpen(true); }, []);

  const handleSubmit = useCallback(async (values: ProdPlanFormValues, mode: FormModalMode) => {
    const due_date = typeof values.due_date === 'string' ? values.due_date : values.due_date && typeof values.due_date === 'object' && 'format' in (values.due_date as any) ? (values.due_date as any).format('YYYY-MM-DD') : values.due_date;
    if (mode === 'create') { await apiClient.post('/v1/prod-plans', { plant_cd: values.plant_cd, item_cd: values.item_cd, plan_qty: values.plan_qty, due_date, priority: values.priority ?? 5 }); }
    else { await apiClient.put(`/v1/prod-plans/${editItem!.plan_id}`, { plant_cd: values.plant_cd, item_cd: values.item_cd, plan_qty: values.plan_qty, due_date, priority: values.priority }); }
    fetchPlans(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
  }, [editItem, fetchPlans, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleDelete = useCallback(async (r: ProdPlanRow) => {
    try { await apiClient.delete(`/v1/prod-plans/${r.plan_id}`); toast.success('생산계획이 삭제되었습니다.'); fetchPlans(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.'); }
  }, [fetchPlans, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleConfirm = useCallback(async (r: ProdPlanRow) => {
    try { await apiClient.patch(`/v1/prod-plans/${r.plan_id}/confirm`); toast.success('생산계획이 확정되었습니다.'); fetchPlans(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? '확정에 실패했습니다.'); }
  }, [fetchPlans, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleMaterialCheck = useCallback(async (r: ProdPlanRow) => {
    setMaterialLoading(true); setMaterialModalOpen(true); setMaterialData(null);
    try { const res = await apiClient.get(`/v1/prod-plans/${r.plan_id}/material-check`); setMaterialData(res.data?.data ?? null); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? '자재 가용성 조회에 실패했습니다.'); setMaterialModalOpen(false); }
    finally { setMaterialLoading(false); }
  }, []);

  const modalInitialValues = useMemo(() => {
    if (!editItem) return { priority: 5 } as Partial<ProdPlanFormValues>;
    return { plant_cd: editItem.plant_cd, item_cd: editItem.item_cd, plan_qty: editItem.plan_qty != null ? Number(editItem.plan_qty) : undefined, due_date: editItem.due_date ? dayjs(editItem.due_date).format('YYYY-MM-DD') : undefined, priority: editItem.priority ?? 5 } as Partial<ProdPlanFormValues>;
  }, [editItem]);

  const isEditDisabled = modalMode === 'edit' && editItem?.status !== 'PLAN';

  const materialColumns: TableColumn<{ itemCd: string; itemNm: string; requiredQty: number; availableQty: number; shortage: number }>[] = useMemo(() => [
    { title: '자재코드', dataIndex: 'itemCd', width: 120 },
    { title: '자재명', dataIndex: 'itemNm', width: 160, ellipsis: true },
    { title: '소요량', dataIndex: 'requiredQty', width: 100, align: 'right', render: (v: unknown) => (v as number)?.toLocaleString() },
    { title: '가용재고', dataIndex: 'availableQty', width: 100, align: 'right', render: (v: unknown) => (v as number)?.toLocaleString() },
    { title: '부족량', dataIndex: 'shortage', width: 100, align: 'right', render: (v: unknown) => { const n = v as number; return (<span className={n > 0 ? 'text-red-500 font-semibold' : 'text-green-500 font-semibold'}>{n > 0 ? `-${n.toLocaleString()}` : '충분'}</span>); } },
  ], []);

  const columns: TableColumn<ProdPlanRow>[] = useMemo(() => [
    { title: '계획번호', dataIndex: 'plan_no', width: 160, sorter: true, ellipsis: true },
    { title: '품목명', dataIndex: 'item_cd', key: 'item_nm', width: 180, ellipsis: true, render: (_: unknown, r: ProdPlanRow) => r.item?.item_nm ?? r.item_cd },
    { title: '공장', dataIndex: 'plant_cd', width: 100, sorter: true, render: (_: unknown, r: ProdPlanRow) => r.plant?.plant_nm ?? r.plant_cd },
    { title: '계획수량', dataIndex: 'plan_qty', width: 100, align: 'right', sorter: true, render: (v: unknown) => (v != null ? Number(v).toLocaleString() : '-') },
    { title: '납기일', dataIndex: 'due_date', width: 120, sorter: true, render: (v: unknown) => (v ? dayjs(v as string).format('YYYY-MM-DD') : '-') },
    { title: '우선순위', dataIndex: 'priority', width: 90, align: 'center', sorter: true },
    { title: '상태', dataIndex: 'status', width: 90, align: 'center', sorter: true, render: (v: unknown) => { const s = v as string; return <Tag color={STATUS_COLOR[s] ?? 'default'}>{STATUS_LABEL[s] ?? s}</Tag>; } },
    { title: '등록일', dataIndex: 'create_dt', width: 110, sorter: true, render: (v: unknown) => (v ? dayjs(v as string).format('YYYY-MM-DD') : '-') },
    { title: '관리', dataIndex: '_action', width: 200, align: 'center', render: (_: unknown, r: ProdPlanRow) => {
      const isPlan = r.status === 'PLAN';
      return (
        <div className="flex items-center gap-1">
          {isPlan && (
            <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" className="text-green-500" icon={<CheckCircle className="w-4 h-4" />}
              onClick={() => confirm({ title: '생산계획을 확정하시겠습니까?', content: '확정 후에는 수정·삭제가 불가합니다.', onOk: () => handleConfirm(r), okText: '확정' })}>{''}</PermissionButton>
          )}
          <Button size="small" variant="ghost" icon={<FlaskConical className="w-4 h-4" />} onClick={() => handleMaterialCheck(r)} title="자재 가용성" />
          {isPlan ? (
            <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => handleEdit(r)}>{''}</PermissionButton>
          ) : (<Button size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} disabled />)}
          {isPlan ? (
            <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />}
              onClick={() => confirm({ title: '생산계획을 삭제하시겠습니까?', content: '확정 이후에는 삭제할 수 없습니다.', onOk: () => handleDelete(r), okText: '삭제', danger: true })}>{''}</PermissionButton>
          ) : (<Button size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />} disabled />)}
        </div>
      );
    } },
  ], [handleEdit, handleDelete, handleConfirm, handleMaterialCheck]);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
          <div className="flex items-center border border-dark-500 rounded-lg overflow-hidden">
            <button className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${viewMode === 'list' ? 'bg-cyan-accent text-white' : 'bg-dark-700 text-gray-600'}`} onClick={() => setViewMode('list')}><List className="w-3.5 h-3.5" /> 목록 뷰</button>
            <button className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${viewMode === 'gantt' ? 'bg-cyan-accent text-white' : 'bg-dark-700 text-gray-600'}`} onClick={() => setViewMode('gantt')}><BarChart3 className="w-3.5 h-3.5" /> 간트 뷰</button>
          </div>
        </div>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>생산계획 등록</PermissionButton>
      </div>

      {viewMode === 'list' ? (
        <Table<ProdPlanRow> columns={columns} dataSource={plans} rowKey="plan_id" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1100} />
      ) : (
        <GanttChart plans={plans} />
      )}

      {/* Material Availability Modal */}
      <Modal title={`자재 가용성 — ${materialData?.planNo ?? ''}`} open={materialModalOpen} onClose={() => setMaterialModalOpen(false)} footer={null} width={700}>
        <Table columns={materialColumns} dataSource={materialData?.materials ?? []} rowKey="itemCd" loading={materialLoading} emptyText="BOM이 등록되지 않았거나 소요 자재가 없습니다." />
      </Modal>

      <FormModal<ProdPlanFormValues> open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} onSubmit={handleSubmit} mode={modalMode} initialValues={modalInitialValues} title={modalMode === 'create' ? '생산계획 등록' : '생산계획 수정'} width={560}>
        {(_form, mode) => (
          <Section title="생산계획 정보">
            <Row label="공장코드" required><Input name="plant_cd" placeholder="공장코드 입력" disabled={isEditDisabled} required defaultValue={_form.getFieldsValue().plant_cd ?? ''} onChange={(e) => _form.setFieldsValue({ plant_cd: e.target.value } as any)} /></Row>
            <Row label="품목" required><Select name="item_cd" placeholder="품목 선택" options={itemOptions} required disabled={isEditDisabled} defaultValue={_form.getFieldsValue().item_cd ?? ''} onChange={(e) => _form.setFieldsValue({ item_cd: e.target.value } as any)} /></Row>
            <Row label="계획수량" required><input type="number" name="plan_qty" placeholder="계획수량" min={1} step={1} required disabled={isEditDisabled} className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15 disabled:opacity-50" defaultValue={_form.getFieldsValue().plan_qty ?? ''} onChange={(e) => _form.setFieldsValue({ plan_qty: Number(e.target.value) } as any)} /></Row>
            <Row label="납기일" required><input type="date" name="due_date" required disabled={isEditDisabled} className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15 disabled:opacity-50" defaultValue={_form.getFieldsValue().due_date as string ?? ''} onChange={(e) => _form.setFieldsValue({ due_date: e.target.value } as any)} /></Row>
            <Row label="우선순위"><input type="number" name="priority" placeholder="우선순위 (1-10)" min={1} max={10} disabled={isEditDisabled} className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15 disabled:opacity-50" defaultValue={_form.getFieldsValue().priority ?? 5} onChange={(e) => _form.setFieldsValue({ priority: Number(e.target.value) } as any)} /></Row>
            {mode === 'edit' && (<Row label="상태"><Tag color={STATUS_COLOR[editItem?.status ?? ''] ?? 'default'}>{STATUS_LABEL[editItem?.status ?? ''] ?? editItem?.status}</Tag></Row>)}
          </Section>
        )}
      </FormModal>
    </div>
  );
}
