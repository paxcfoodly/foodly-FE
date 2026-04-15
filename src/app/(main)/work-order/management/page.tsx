'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Split, ArrowLeftRight, FileDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Dropdown from '@/components/ui/Dropdown';
import type { DropdownItem } from '@/components/ui/Dropdown';
import type { TableColumn, PaginationConfig } from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import { Section, Row } from '@/components/ui/Section';
import Select from '@/components/ui/Select';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';

interface WorkOrderRow { wo_id: number; wo_no: string; plan_id: number | null; item_cd: string; order_qty: number | null; good_qty: number | null; defect_qty: number | null; priority: number; status: string; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; item?: { item_nm: string } | null; prod_plan?: { plan_no: string } | null; [key: string]: unknown; }
interface WorkOrderFormValues { plan_id?: number | null; item_cd: string; order_qty: number; priority: number; [key: string]: unknown; }
interface SplitFormValues { split_qty: number; }
interface ItemOption { item_cd: string; item_nm: string; }
interface ProdPlanOption { plan_id: number; plan_no: string; }

const MENU_URL = '/work-order/management';
const STATUS_OPTIONS = [{ label: '대기', value: 'WAIT' }, { label: '진행', value: 'PROGRESS' }, { label: '완료', value: 'COMPLETE' }, { label: '마감', value: 'CLOSE' }, { label: '취소', value: 'CANCEL' }];
const STATUS_LABEL: Record<string, string> = { WAIT: '대기', PROGRESS: '진행', COMPLETE: '완료', CLOSE: '마감', CANCEL: '취소' };
const STATUS_COLOR: Record<string, string> = { WAIT: 'blue', PROGRESS: 'orange', COMPLETE: 'cyan', CLOSE: 'green', CANCEL: 'red' };
const STATUS_TRANSITIONS: Record<string, string[]> = { WAIT: ['PROGRESS', 'CANCEL'], PROGRESS: ['COMPLETE', 'CANCEL'], COMPLETE: ['CLOSE'], CLOSE: [], CANCEL: [] };

const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'wo_no', label: '작업지시번호', type: 'text', placeholder: '작업지시번호 입력' },
  { name: 'item_cd', label: '품목', type: 'text', placeholder: '품목코드 입력' },
  { name: 'status', label: '상태', type: 'select', options: [{ label: '전체', value: '' }, ...STATUS_OPTIONS] },
  { name: 'plan_id', label: '생산계획 ID', type: 'text', placeholder: '계획 ID 입력' },
];

export default function WorkOrderManagementPage() {
  const [orders, setOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<WorkOrderRow | null>(null);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitTarget, setSplitTarget] = useState<WorkOrderRow | null>(null);
  const [splitQty, setSplitQty] = useState<number>(0);
  const [splitLoading, setSplitLoading] = useState(false);
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);
  const [planOptions, setPlanOptions] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    apiClient.get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 9999, use_yn: 'Y' } }).then((res) => { const list = res.data?.data ?? []; setItemOptions(list.map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd }))); }).catch(() => {});
    apiClient.get<PaginatedResponse<ProdPlanOption>>('/v1/prod-plans', { params: { limit: 9999 } }).then((res) => { const list = res.data?.data ?? []; setPlanOptions(list.map((p) => ({ label: p.plan_no, value: p.plan_id }))); }).catch(() => {});
  }, []);

  const fetchOrders = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<WorkOrderRow>>('/v1/work-orders', { params }); const body = res.data;
      setOrders(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: any) { toast.error(err?.response?.data?.message ?? '작업지시 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchOrders(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchOrders(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchOrders, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchOrders(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchOrders, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchOrders(pagination.page, pagination.pageSize, f, o, filters); }, [fetchOrders, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchOrders(p, ps, sortField, sortOrder, filters); }, [fetchOrders, sortField, sortOrder, filters]);

  const handleCreate = useCallback(() => { setEditItem(null); setModalMode('create'); setModalOpen(true); }, []);
  const handleEdit = useCallback((r: WorkOrderRow) => { if (r.status !== 'WAIT') { toast.warning('대기(WAIT) 상태에서만 수정할 수 있습니다.'); return; } setEditItem(r); setModalMode('edit'); setModalOpen(true); }, []);

  const handleSubmit = useCallback(async (values: WorkOrderFormValues, mode: FormModalMode) => {
    const payload = { plan_id: values.plan_id ?? null, item_cd: values.item_cd, order_qty: values.order_qty, priority: values.priority ?? 5 };
    if (mode === 'create') { await apiClient.post('/v1/work-orders', payload); } else { await apiClient.put(`/v1/work-orders/${editItem!.wo_id}`, payload); }
    fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
  }, [editItem, fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleDelete = useCallback(async (r: WorkOrderRow) => {
    try { await apiClient.delete(`/v1/work-orders/${r.wo_id}`); toast.success('작업지시가 삭제되었습니다.'); fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? '삭제에 실패했습니다.'); }
  }, [fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleStatusChange = useCallback(async (r: WorkOrderRow, newStatus: string) => {
    try { await apiClient.patch(`/v1/work-orders/${r.wo_id}/status`, { status: newStatus }); toast.success(`상태가 ${STATUS_LABEL[newStatus] ?? newStatus}(으)로 변경되었습니다.`); fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? '상태 변경에 실패했습니다.'); }
  }, [fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleSplitOpen = useCallback((r: WorkOrderRow) => { if (r.status !== 'WAIT') { toast.warning('대기(WAIT) 상태에서만 분할할 수 있습니다.'); return; } setSplitTarget(r); setSplitQty(0); setSplitModalOpen(true); }, []);

  const handleSplitSubmit = useCallback(async () => {
    if (!splitTarget) return;
    try {
      setSplitLoading(true);
      await apiClient.post(`/v1/work-orders/${splitTarget.wo_id}/split`, { split_qty: splitQty });
      toast.success('작업지시가 분할되었습니다.'); setSplitModalOpen(false); setSplitTarget(null);
      fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: any) { toast.error(err?.response?.data?.message ?? '분할에 실패했습니다.'); }
    finally { setSplitLoading(false); }
  }, [splitTarget, splitQty, fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handlePdfDownload = useCallback(async (r: WorkOrderRow) => {
    try {
      const res = await apiClient.get(`/v1/work-orders/${r.wo_id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' }); const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `work-order-${r.wo_no}.pdf`; document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'PDF 다운로드에 실패했습니다.'); }
  }, []);

  const modalInitialValues = useMemo(() => {
    if (!editItem) return { priority: 5 } as Partial<WorkOrderFormValues>;
    return { plan_id: editItem.plan_id, item_cd: editItem.item_cd, order_qty: editItem.order_qty != null ? Number(editItem.order_qty) : undefined, priority: editItem.priority ?? 5 } as Partial<WorkOrderFormValues>;
  }, [editItem]);

  const columns: TableColumn<WorkOrderRow>[] = useMemo(() => [
    { title: '작업지시번호', dataIndex: 'wo_no', width: 160, sorter: true, ellipsis: true },
    { title: '생산계획', dataIndex: 'plan_id', key: 'plan_no', width: 150, ellipsis: true, render: (_: unknown, r: WorkOrderRow) => r.prod_plan?.plan_no ?? '-' },
    { title: '품목명', dataIndex: 'item_cd', key: 'item_nm', width: 180, ellipsis: true, render: (_: unknown, r: WorkOrderRow) => r.item?.item_nm ?? r.item_cd },
    { title: '지시수량', dataIndex: 'order_qty', width: 100, align: 'right', sorter: true, render: (v: unknown) => (v != null ? Number(v).toLocaleString() : '-') },
    { title: '양품수량', dataIndex: 'good_qty', width: 100, align: 'right', render: (v: unknown) => (v != null ? Number(v).toLocaleString() : '0') },
    { title: '불량수량', dataIndex: 'defect_qty', width: 100, align: 'right', render: (v: unknown) => { const n = v != null ? Number(v) : 0; return <span className={n > 0 ? 'text-red-500' : ''}>{n.toLocaleString()}</span>; } },
    { title: '진행률', dataIndex: '_progress', width: 130, render: (_: unknown, r: WorkOrderRow) => {
      const oq = r.order_qty != null ? Number(r.order_qty) : 0; const gq = r.good_qty != null ? Number(r.good_qty) : 0;
      const pct = oq > 0 ? Math.round((gq / oq) * 100) : 0;
      return (<div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-cyan-accent h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} /><span className="text-xs text-gray-500 ml-1">{pct}%</span></div>);
    } },
    { title: '우선순위', dataIndex: 'priority', width: 90, align: 'center', sorter: true },
    { title: '상태', dataIndex: 'status', width: 90, align: 'center', sorter: true, render: (v: unknown) => { const s = v as string; return <Tag color={STATUS_COLOR[s] ?? 'default'}>{STATUS_LABEL[s] ?? s}</Tag>; } },
    { title: '관리', dataIndex: '_action', width: 220, align: 'center', render: (_: unknown, r: WorkOrderRow) => {
      const isWait = r.status === 'WAIT';
      const nextStatuses = STATUS_TRANSITIONS[r.status] ?? [];
      const statusMenuItems: DropdownItem[] = nextStatuses.map((s) => ({ key: s, label: <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>, onClick: () => confirm({ title: `상태를 ${STATUS_LABEL[s]}(으)로 변경하시겠습니까?`, onOk: () => handleStatusChange(r, s), okText: '변경' }) }));
      return (
        <div className="flex items-center gap-1">
          <Button size="small" variant="ghost" icon={<FileDown className="w-4 h-4" />} onClick={() => handlePdfDownload(r)} title="PDF" />
          {nextStatuses.length > 0 && (
            <Dropdown items={statusMenuItems} trigger={['click']}>
              <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<ArrowLeftRight className="w-4 h-4" />} title="상태변경">{''}</PermissionButton>
            </Dropdown>
          )}
          {isWait && (<PermissionButton action="create" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Split className="w-4 h-4" />} onClick={() => handleSplitOpen(r)} title="분할">{''}</PermissionButton>)}
          {isWait ? (<PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => handleEdit(r)}>{''}</PermissionButton>) : (<Button size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} disabled />)}
          {isWait ? (
            <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />}
              onClick={() => confirm({ title: '작업지시를 삭제하시겠습니까?', content: '대기 상태에서만 삭제할 수 있습니다.', onOk: () => handleDelete(r), okText: '삭제', danger: true })}>{''}</PermissionButton>
          ) : (<Button size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />} disabled />)}
        </div>
      );
    } },
  ], [handleEdit, handleDelete, handleStatusChange, handleSplitOpen, handlePdfDownload]);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>작업지시 등록</PermissionButton>
      </div>
      <Table<WorkOrderRow> columns={columns} dataSource={orders} rowKey="wo_id" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1400} />

      {/* Split Modal */}
      <Modal title={`작업지시 분할 — ${splitTarget?.wo_no ?? ''}`} open={splitModalOpen} onClose={() => { setSplitModalOpen(false); setSplitTarget(null); }} width={480}
        footer={<div className="flex items-center gap-2"><Button onClick={() => { setSplitModalOpen(false); setSplitTarget(null); }}>취소</Button><Button variant="primary" loading={splitLoading} onClick={handleSplitSubmit}>분할</Button></div>}>
        <Section title="분할 정보" aside={`현재 지시수량: ${splitTarget?.order_qty != null ? Number(splitTarget.order_qty).toLocaleString() : '-'}`}>
          <Row label="분할 수량" required>
            <input type="number" min={1} max={splitTarget?.order_qty != null ? Number(splitTarget.order_qty) - 1 : undefined} required
              className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
              placeholder="분할할 수량 입력" value={splitQty || ''} onChange={(e) => setSplitQty(Number(e.target.value))} />
          </Row>
        </Section>
      </Modal>

      <FormModal<WorkOrderFormValues> open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} onSubmit={handleSubmit} mode={modalMode} initialValues={modalInitialValues} title={modalMode === 'create' ? '작업지시 등록' : '작업지시 수정'} width={560}>
        {(_form, _mode) => (
          <Section title="작업지시 정보">
            <Row label="생산계획"><Select name="plan_id" placeholder="생산계획 선택 (선택사항)" options={[{ label: '선택 안함', value: '' }, ...planOptions.map(o => ({ label: o.label, value: String(o.value) }))]} defaultValue={_form.getFieldsValue().plan_id != null ? String(_form.getFieldsValue().plan_id) : ''} onChange={(e) => _form.setFieldsValue({ plan_id: e.target.value ? Number(e.target.value) : null } as any)} /></Row>
            <Row label="품목" required><Select name="item_cd" placeholder="품목 선택" options={itemOptions} required defaultValue={_form.getFieldsValue().item_cd ?? ''} onChange={(e) => _form.setFieldsValue({ item_cd: e.target.value } as any)} /></Row>
            <Row label="지시수량" required><input type="number" name="order_qty" placeholder="지시수량" min={1} step={1} required className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" defaultValue={_form.getFieldsValue().order_qty ?? ''} onChange={(e) => _form.setFieldsValue({ order_qty: Number(e.target.value) } as any)} /></Row>
            <Row label="우선순위"><input type="number" name="priority" placeholder="우선순위 (1-10)" min={1} max={10} className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" defaultValue={_form.getFieldsValue().priority ?? 5} onChange={(e) => _form.setFieldsValue({ priority: Number(e.target.value) } as any)} /></Row>
            {_mode === 'edit' && editItem && (<Row label="상태"><Tag color={STATUS_COLOR[editItem.status] ?? 'default'}>{STATUS_LABEL[editItem.status] ?? editItem.status}</Tag></Row>)}
          </Section>
        )}
      </FormModal>
    </div>
  );
}
