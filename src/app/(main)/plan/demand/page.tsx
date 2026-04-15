'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import type { TableColumn, PaginationConfig } from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import { Section, Row } from '@/components/ui/Section';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import PermissionButton from '@/components/auth/PermissionButton';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs, { type Dayjs } from 'dayjs';

interface DemandRow { demand_id: number; demand_no: string; item_cd: string; cust_cd: string | null; demand_qty: number; due_date: string | null; status: 'OPEN' | 'PLANNED' | 'CLOSED'; remark: string | null; create_dt: string; item?: { item_nm: string } | null; customer?: { cust_nm: string } | null; [key: string]: unknown; }
interface ItemOption { item_cd: string; item_nm: string; }
interface CustomerOption { cust_cd: string; cust_nm: string; }
interface WorkshopOption { plant_cd: string; plant_nm: string; }

const MENU_URL = '/plan/demand';
const DEMAND_STATUS_OPTIONS = [{ label: '전체', value: '' }, { label: '수주', value: 'OPEN' }, { label: '계획중', value: 'PLANNED' }, { label: '완료', value: 'CLOSED' }];
const DEMAND_STATUS_COLOR: Record<string, string> = { OPEN: 'default', PLANNED: 'blue', CLOSED: 'green' };
const DEMAND_STATUS_LABEL: Record<string, string> = { OPEN: '수주', PLANNED: '계획중', CLOSED: '완료' };
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'demand_no', label: '수요번호', type: 'text', placeholder: '수요번호 입력' },
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'status', label: '상태', type: 'select', options: DEMAND_STATUS_OPTIONS },
];

export default function DemandPage() {
  const [demands, setDemands] = useState<DemandRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<DemandRow | null>(null);
  const [createFormValues, setCreateFormValues] = useState<Record<string, unknown>>({});
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftDemand, setDraftDemand] = useState<DemandRow | null>(null);
  const [draftFormValues, setDraftFormValues] = useState<Record<string, unknown>>({});
  const [draftSubmitting, setDraftSubmitting] = useState(false);

  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);
  const [workshopOptions, setWorkshopOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    apiClient.get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 500 } }).then((res) => { setItemOptions((res.data?.data ?? []).map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd }))); }).catch(() => {});
    apiClient.get<PaginatedResponse<CustomerOption>>('/v1/customers', { params: { limit: 500 } }).then((res) => { setCustomerOptions((res.data?.data ?? []).map((c) => ({ label: `${c.cust_cd} - ${c.cust_nm}`, value: c.cust_cd }))); }).catch(() => {});
    apiClient.get<PaginatedResponse<WorkshopOption>>('/v1/workshops', { params: { limit: 200 } }).then((res) => { setWorkshopOptions((res.data?.data ?? []).map((w) => ({ label: `${w.plant_cd} - ${w.plant_nm}`, value: w.plant_cd }))); }).catch(() => {});
  }, []);

  const fetchData = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<DemandRow>>('/v1/demands', { params }); const body = res.data;
      setDemands(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch { toast.error('수주 데이터를 불러오지 못했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchData(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const summary = useMemo(() => {
    const total = pagination.total;
    const closed = demands.filter((d) => d.status === 'CLOSED').length;
    const planned = demands.filter((d) => d.status === 'PLANNED').length;
    const open = demands.filter((d) => d.status === 'OPEN').length;
    return { total, closed, planned, open };
  }, [demands, pagination.total]);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchData(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchData, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchData(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchData, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchData(pagination.page, pagination.pageSize, f, o, filters); }, [fetchData, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchData(p, ps, sortField, sortOrder, filters); }, [fetchData, sortField, sortOrder, filters]);

  const handleOpenCreate = useCallback(() => { setEditingDemand(null); setCreateFormValues({}); setCreateModalOpen(true); }, []);
  const handleOpenEdit = useCallback((r: DemandRow) => { setEditingDemand(r); setCreateFormValues({ item_cd: r.item_cd, demand_qty: r.demand_qty, due_date: r.due_date ? dayjs(r.due_date).format('YYYY-MM-DD') : '', cust_cd: r.cust_cd ?? '', remark: r.remark ?? '' }); setCreateModalOpen(true); }, []);

  const handleCreateSubmit = useCallback(async () => {
    try {
      setCreateSubmitting(true);
      const payload = { item_cd: createFormValues.item_cd, demand_qty: createFormValues.demand_qty, due_date: createFormValues.due_date || undefined, cust_cd: createFormValues.cust_cd || undefined, remark: createFormValues.remark || undefined };
      if (editingDemand) { await apiClient.put(`/v1/demands/${editingDemand.demand_id}`, payload); toast.success('수주가 수정되었습니다.'); }
      else { await apiClient.post('/v1/demands', payload); toast.success('수주가 등록되었습니다.'); }
      setCreateModalOpen(false); fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } }; errorFields?: unknown[] }; if (e?.errorFields) return; toast.error(e?.response?.data?.message ?? '수주 저장에 실패했습니다.'); }
    finally { setCreateSubmitting(false); }
  }, [createFormValues, editingDemand, fetchData, filters, pagination.page, pagination.pageSize, sortField, sortOrder]);

  const handleDelete = useCallback(async (demandId: number) => {
    try { await apiClient.delete(`/v1/demands/${demandId}`); toast.success('수주가 삭제되었습니다.'); fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '수주 삭제에 실패했습니다.'); }
  }, [fetchData, filters, pagination.page, pagination.pageSize, sortField, sortOrder]);

  const handleOpenDraft = useCallback((r: DemandRow) => { setDraftDemand(r); setDraftFormValues({ plan_qty: r.demand_qty, due_date: r.due_date ? dayjs(r.due_date).format('YYYY-MM-DD') : '', plant_cd: '' }); setDraftModalOpen(true); }, []);

  const handleDraftSubmit = useCallback(async () => {
    if (!draftDemand) return;
    try {
      setDraftSubmitting(true);
      const payload = { plant_cd: draftFormValues.plant_cd, plan_qty: draftFormValues.plan_qty, due_date: draftFormValues.due_date || undefined };
      await apiClient.post(`/v1/demands/${draftDemand.demand_id}/create-plan`, payload);
      toast.success('생산계획 초안이 생성되었습니다. 계획 화면에서 내용을 확인하고 수정하세요.'); setDraftModalOpen(false);
      fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } }; errorFields?: unknown[] }; if (e?.errorFields) return;
      if (e?.response?.status === 409) { toast.warning('이미 생성된 생산계획이 있습니다.'); } else { toast.error('초안 생성에 실패했습니다. 다시 시도하세요.'); }
    } finally { setDraftSubmitting(false); }
  }, [draftDemand, draftFormValues, fetchData, filters, pagination.page, pagination.pageSize, sortField, sortOrder]);

  const columns: TableColumn<DemandRow>[] = useMemo(() => [
    { title: '수요번호', dataIndex: 'demand_no', width: 150, sorter: true, ellipsis: true },
    { title: '거래처명', dataIndex: 'cust_cd', key: 'cust_nm', width: 140, ellipsis: true, render: (_: unknown, r: DemandRow) => r.customer?.cust_nm ?? r.cust_cd ?? '-' },
    { title: '품목명', dataIndex: 'item_cd', key: 'item_nm', width: 150, ellipsis: true, render: (_: unknown, r: DemandRow) => r.item?.item_nm ?? r.item_cd },
    { title: '수량', dataIndex: 'demand_qty', width: 90, align: 'right', sorter: true, render: (v: unknown) => (v != null ? Number(v).toLocaleString() : '-') },
    { title: '납기일', dataIndex: 'due_date', width: 110, sorter: true, render: (v: unknown) => (v as string)?.slice(0, 10) ?? '-' },
    { title: '상태', dataIndex: 'status', width: 80, align: 'center', sorter: true, render: (v: unknown) => { const s = v as string; return <Tag color={DEMAND_STATUS_COLOR[s] ?? 'default'}>{DEMAND_STATUS_LABEL[s] ?? s}</Tag>; } },
    { title: '초안 생성', dataIndex: '_draft', width: 160, align: 'center', render: (_: unknown, r: DemandRow) => (
      <Tooltip title={r.status === 'PLANNED' || r.status === 'CLOSED' ? '이미 생산계획이 생성되었습니다' : ''}>
        <Button size="small" variant="primary" disabled={r.status === 'PLANNED' || r.status === 'CLOSED'} onClick={() => handleOpenDraft(r)}>생산계획 초안 생성</Button>
      </Tooltip>
    ) },
    { title: '액션', dataIndex: '_action', width: 120, align: 'center', render: (_: unknown, r: DemandRow) => (
      <div className="flex items-center gap-1">
        <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" onClick={() => handleOpenEdit(r)}>수정</PermissionButton>
        <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="danger"
          onClick={() => confirm({ title: '수주를 삭제하시겠습니까?', onOk: () => handleDelete(r.demand_id), okText: '삭제', danger: true })}>삭제</PermissionButton>
      </div>
    ) },
  ], [handleOpenDraft, handleOpenEdit, handleDelete]);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-xs text-gray-400 mb-1">전체 수주건</div><div className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-gray-400" />{summary.total}</div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-xs text-gray-400 mb-1">완료건</div><div className="text-2xl font-bold text-green-500 flex items-center gap-2"><CheckCircle className="w-5 h-5" />{summary.closed}</div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-xs text-gray-400 mb-1">진행 중</div><div className="text-2xl font-bold text-blue-500 flex items-center gap-2"><Clock className="w-5 h-5" />{summary.planned}</div></div>
        <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-xs text-gray-400 mb-1">수주</div><div className="text-2xl font-bold text-gray-900 flex items-center gap-2"><XCircle className="w-5 h-5 text-gray-400" />{summary.open}</div></div>
      </div>

      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />

      <div className="flex justify-between items-center mb-2 mt-2">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} fallback="hide" variant="primary" size="small" onClick={handleOpenCreate}>수주 등록</PermissionButton>
      </div>

      <Table<DemandRow> columns={columns} dataSource={demands} rowKey="demand_id" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1000}
        emptyText="등록된 수주가 없습니다. 수주를 등록하면 생산계획 초안을 자동으로 생성할 수 있습니다." />

      {/* Create/Edit Demand Modal */}
      <Modal title={editingDemand ? '수주 수정' : '수주 등록'} open={createModalOpen} onClose={() => setCreateModalOpen(false)} width={560}
        footer={<div className="flex items-center gap-2"><Button onClick={() => setCreateModalOpen(false)}>취소</Button><Button variant="primary" loading={createSubmitting} onClick={handleCreateSubmit}>{editingDemand ? '수정' : '등록'}</Button></div>}>
        <Section title="수주 정보">
          <Row label="품목" required><Select name="item_cd" placeholder="품목 선택" options={itemOptions} disabled={!!editingDemand} value={createFormValues.item_cd as string ?? ''} onChange={(e) => setCreateFormValues((p) => ({ ...p, item_cd: e.target.value }))} /></Row>
          <Row label="수량" required><input type="number" min={1} className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" placeholder="수량 입력" value={createFormValues.demand_qty as number ?? ''} onChange={(e) => setCreateFormValues((p) => ({ ...p, demand_qty: Number(e.target.value) }))} /></Row>
          <Row label="납기일"><input type="date" className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" value={createFormValues.due_date as string ?? ''} onChange={(e) => setCreateFormValues((p) => ({ ...p, due_date: e.target.value }))} /></Row>
          <Row label="거래처"><Select name="cust_cd" placeholder="거래처 선택 (선택)" options={[{ label: '선택 안함', value: '' }, ...customerOptions]} value={createFormValues.cust_cd as string ?? ''} onChange={(e) => setCreateFormValues((p) => ({ ...p, cust_cd: e.target.value }))} /></Row>
          <Row label="비고"><Textarea rows={2} placeholder="비고 입력 (선택)" value={createFormValues.remark as string ?? ''} onChange={(e) => setCreateFormValues((p) => ({ ...p, remark: e.target.value }))} /></Row>
        </Section>
      </Modal>

      {/* Create Plan Draft Modal */}
      <Modal title="생산계획 초안 생성" open={draftModalOpen} onClose={() => setDraftModalOpen(false)} width={560}
        footer={<div className="flex items-center gap-2"><Button onClick={() => setDraftModalOpen(false)}>취소</Button><Button variant="primary" loading={draftSubmitting} onClick={handleDraftSubmit}>초안 생성</Button></div>}>
        <Section title="초안 정보">
          <Row label="품목명"><Input disabled value={draftDemand?.item?.item_nm ?? draftDemand?.item_cd ?? ''} /></Row>
          <Row label="계획 수량" required><input type="number" min={1} required className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" placeholder="계획 수량 입력" value={draftFormValues.plan_qty as number ?? ''} onChange={(e) => setDraftFormValues((p) => ({ ...p, plan_qty: Number(e.target.value) }))} /></Row>
          <Row label="납기일"><input type="date" className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" value={draftFormValues.due_date as string ?? ''} onChange={(e) => setDraftFormValues((p) => ({ ...p, due_date: e.target.value }))} /></Row>
          <Row label="생산라인" required><Select name="plant_cd" placeholder="생산라인 선택" options={workshopOptions} required value={draftFormValues.plant_cd as string ?? ''} onChange={(e) => setDraftFormValues((p) => ({ ...p, plant_cd: e.target.value }))} /></Row>
        </Section>
      </Modal>
    </div>
  );
}
