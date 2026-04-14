'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, CheckCircle, Minus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
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

interface IncomingDtlRow { incoming_dtl_id?: number; item_cd: string; lot_no?: string | null; incoming_qty: number; inspect_status?: string | null; item?: { item_nm: string } | null; [key: string]: unknown; }
interface IncomingRow { incoming_id: number; incoming_no: string; cust_cd: string | null; status: string; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; customer?: { cust_nm: string } | null; details: IncomingDtlRow[]; [key: string]: unknown; }
interface IncomingFormValues { cust_cd: string; details: { item_cd: string; lot_no?: string | null; incoming_qty: number }[]; [key: string]: unknown; }
interface CustOption { cust_cd: string; cust_nm: string; }
interface ItemOption { item_cd: string; item_nm: string; }
interface WhOption { workshop_cd: string; workshop_nm: string; }

const MENU_URL = '/inventory/receive';
const STATUS_OPTIONS = [{ label: '계획', value: 'PLAN' }, { label: '확인', value: 'CONFIRMED' }, { label: '취소', value: 'CANCELLED' }];
const STATUS_LABEL: Record<string, string> = { PLAN: '계획', CONFIRMED: '확인', CANCELLED: '취소' };
const STATUS_COLOR: Record<string, string> = { PLAN: 'blue', CONFIRMED: 'green', CANCELLED: 'red' };
const INSPECT_LABEL: Record<string, string> = { PENDING: '대기', PASS: '합격', FAIL: '불합격' };
const INSPECT_COLOR: Record<string, string> = { PENDING: 'default', PASS: 'green', FAIL: 'red' };
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'incoming_no', label: '입고번호', type: 'text', placeholder: '입고번호 입력' },
  { name: 'status', label: '상태', type: 'select', options: [{ label: '전체', value: '' }, ...STATUS_OPTIONS] },
  { name: 'cust_cd', label: '거래처코드', type: 'text', placeholder: '거래처코드 입력' },
];

export default function IncomingPage() {
  const [incomings, setIncomings] = useState<IncomingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<IncomingRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<IncomingRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<IncomingRow | null>(null);
  const [confirmWhCd, setConfirmWhCd] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [custOptions, setCustOptions] = useState<{ label: string; value: string }[]>([]);
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);
  const [whOptions, setWhOptions] = useState<{ label: string; value: string }[]>([]);
  const [formDetails, setFormDetails] = useState<{ item_cd: string; lot_no: string; incoming_qty: number }[]>([{ item_cd: '', lot_no: '', incoming_qty: 1 }]);
  const [formCustCd, setFormCustCd] = useState('');

  useEffect(() => {
    apiClient.get<PaginatedResponse<CustOption>>('/v1/customers', { params: { limit: 9999 } }).then((res) => { setCustOptions((res.data?.data ?? []).map((c) => ({ label: `${c.cust_cd} - ${c.cust_nm}`, value: c.cust_cd }))); }).catch(() => {});
    apiClient.get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 9999, use_yn: 'Y' } }).then((res) => { setItemOptions((res.data?.data ?? []).map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd }))); }).catch(() => {});
    apiClient.get<PaginatedResponse<WhOption>>('/v1/workshops', { params: { limit: 9999 } }).then((res) => { setWhOptions((res.data?.data ?? []).map((w) => ({ label: `${w.workshop_cd} - ${w.workshop_nm}`, value: w.workshop_cd }))); }).catch(() => {});
  }, []);

  const fetchIncomings = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<IncomingRow>>('/v1/incomings', { params }); const body = res.data;
      setIncomings(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '입고 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchIncomings(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchIncomings(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchIncomings, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchIncomings(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchIncomings, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchIncomings(pagination.page, pagination.pageSize, f, o, filters); }, [fetchIncomings, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchIncomings(p, ps, sortField, sortOrder, filters); }, [fetchIncomings, sortField, sortOrder, filters]);

  const handleCreate = useCallback(() => { setEditItem(null); setModalMode('create'); setFormCustCd(''); setFormDetails([{ item_cd: '', lot_no: '', incoming_qty: 1 }]); setModalOpen(true); }, []);
  const handleEdit = useCallback((r: IncomingRow) => { if (r.status !== 'PLAN') { toast.warning('계획(PLAN) 상태에서만 수정할 수 있습니다.'); return; } setEditItem(r); setModalMode('edit'); setFormCustCd(r.cust_cd ?? ''); setFormDetails((r.details ?? []).map((d) => ({ item_cd: d.item_cd, lot_no: d.lot_no ?? '', incoming_qty: Number(d.incoming_qty) }))); setModalOpen(true); }, []);

  const handleSubmit = useCallback(async (_values: IncomingFormValues, mode: FormModalMode) => {
    const payload = { cust_cd: formCustCd, details: formDetails.filter(d => d.item_cd).map((d) => ({ item_cd: d.item_cd, lot_no: d.lot_no || null, incoming_qty: d.incoming_qty })) };
    if (mode === 'create') { await apiClient.post('/v1/incomings', payload); } else { await apiClient.put(`/v1/incomings/${editItem!.incoming_id}`, payload); }
    fetchIncomings(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
  }, [editItem, fetchIncomings, pagination.page, pagination.pageSize, sortField, sortOrder, filters, formCustCd, formDetails]);

  const handleDelete = useCallback(async (r: IncomingRow) => {
    try { await apiClient.delete(`/v1/incomings/${r.incoming_id}`); toast.success('입고가 삭제되었습니다.'); fetchIncomings(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '삭제에 실패했습니다.'); }
  }, [fetchIncomings, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleViewDetail = useCallback(async (r: IncomingRow) => { try { const res = await apiClient.get<{ data: IncomingRow }>(`/v1/incomings/${r.incoming_id}`); setDetailItem(res.data.data); } catch { setDetailItem(r); } setDetailOpen(true); }, []);
  const handleConfirmOpen = useCallback((r: IncomingRow) => { setConfirmTarget(r); setConfirmWhCd(''); setConfirmOpen(true); }, []);

  const handleConfirmSubmit = useCallback(async () => {
    if (!confirmTarget || !confirmWhCd) { toast.warning('창고를 선택하세요.'); return; }
    setConfirmLoading(true);
    try { await apiClient.patch(`/v1/incomings/${confirmTarget.incoming_id}/confirm`, { wh_cd: confirmWhCd }); toast.success('입고 확인이 완료되었습니다.'); setConfirmOpen(false); setConfirmTarget(null); setDetailOpen(false); setDetailItem(null); fetchIncomings(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '입고 확인에 실패했습니다.'); } finally { setConfirmLoading(false); }
  }, [confirmTarget, confirmWhCd, fetchIncomings, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const columns: TableColumn<IncomingRow>[] = useMemo(() => [
    { title: '입고번호', dataIndex: 'incoming_no', width: 160, sorter: true, ellipsis: true },
    { title: '거래처', dataIndex: 'cust_cd', key: 'cust_nm', width: 150, ellipsis: true, render: (_: unknown, r: IncomingRow) => r.customer?.cust_nm ?? r.cust_cd ?? '-' },
    { title: '상태', dataIndex: 'status', width: 90, align: 'center', sorter: true, render: (v: unknown) => { const s = v as string; return <Tag color={STATUS_COLOR[s] ?? 'default'}>{STATUS_LABEL[s] ?? s}</Tag>; } },
    { title: '상세 품목수', dataIndex: 'details', width: 100, align: 'center', render: (v: unknown) => (v as IncomingDtlRow[])?.length ?? 0 },
    { title: '등록일', dataIndex: 'create_dt', width: 160, sorter: true, render: (v: unknown) => (v ? dayjs(v as string).format('YYYY-MM-DD HH:mm') : '-') },
    { title: '등록자', dataIndex: 'create_by', width: 100, ellipsis: true },
    { title: '관리', dataIndex: '_action', width: 200, align: 'center', render: (_: unknown, r: IncomingRow) => {
      const isPlan = r.status === 'PLAN';
      return (
        <div className="flex items-center gap-1">
          <Button size="small" variant="ghost" icon={<Eye className="w-4 h-4" />} onClick={() => handleViewDetail(r)} title="상세" />
          {isPlan && (<PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<CheckCircle className="w-4 h-4" />} onClick={() => handleConfirmOpen(r)} title="입고확인">{''}</PermissionButton>)}
          {isPlan ? (<PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => handleEdit(r)}>{''}</PermissionButton>) : (<Button size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} disabled />)}
          {isPlan ? (<PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />} onClick={() => confirm({ title: '입고를 삭제하시겠습니까?', content: '계획 상태에서만 삭제할 수 있습니다.', onOk: () => handleDelete(r), okText: '삭제', danger: true })}>{''}</PermissionButton>) : (<Button size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />} disabled />)}
        </div>
      );
    } },
  ], [handleEdit, handleDelete, handleViewDetail, handleConfirmOpen]);

  const detailColumns: TableColumn<IncomingDtlRow>[] = useMemo(() => [
    { title: '품목코드', dataIndex: 'item_cd', width: 120 },
    { title: '품목명', dataIndex: 'item_cd', key: 'item_nm', width: 150, render: (_: unknown, r: IncomingDtlRow) => r.item?.item_nm ?? '-' },
    { title: 'LOT 번호', dataIndex: 'lot_no', width: 140, render: (v: unknown) => (v as string) || '-' },
    { title: '입고수량', dataIndex: 'incoming_qty', width: 100, align: 'right', render: (v: unknown) => (v != null ? Number(v).toLocaleString() : '-') },
    { title: '검사상태', dataIndex: 'inspect_status', width: 90, align: 'center', render: (v: unknown) => { const s = v as string; if (!s) return '-'; return <Tag color={INSPECT_COLOR[s] ?? 'default'}>{INSPECT_LABEL[s] ?? s}</Tag>; } },
  ], []);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>입고 등록</PermissionButton>
      </div>
      <Table<IncomingRow> columns={columns} dataSource={incomings} rowKey="incoming_id" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1000} />

      <FormModal<IncomingFormValues> open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} onSubmit={handleSubmit} mode={modalMode} initialValues={{ cust_cd: formCustCd, details: formDetails } as any} title={modalMode === 'create' ? '입고 등록' : '입고 수정'} width={720} layout="vertical">
        {() => (
          <>
            <FormField label="거래처" required><Select placeholder="거래처 선택" options={custOptions} required value={formCustCd} onChange={(e) => setFormCustCd(e.target.value)} /></FormField>
            <div className="mb-2 font-medium text-sm">입고 상세</div>
            {formDetails.map((d, idx) => (
              <div key={idx} className="flex items-start gap-2 mb-2">
                <Select placeholder="품목 선택" options={itemOptions} value={d.item_cd} onChange={(e) => { const next = [...formDetails]; next[idx] = { ...next[idx], item_cd: e.target.value }; setFormDetails(next); }} className="!w-[220px]" />
                <Input placeholder="LOT 번호" value={d.lot_no} onChange={(e) => { const next = [...formDetails]; next[idx] = { ...next[idx], lot_no: e.target.value }; setFormDetails(next); }} className="!w-[140px]" />
                <input type="number" placeholder="입고수량" min={0.01} step="any" value={d.incoming_qty} onChange={(e) => { const next = [...formDetails]; next[idx] = { ...next[idx], incoming_qty: Number(e.target.value) }; setFormDetails(next); }} className="w-[120px] h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" />
                {formDetails.length > 1 && <button onClick={() => setFormDetails(formDetails.filter((_, i) => i !== idx))} className="text-red-500 mt-2"><Minus className="w-4 h-4" /></button>}
              </div>
            ))}
            <Button variant="ghost" block icon={<Plus className="w-4 h-4" />} onClick={() => setFormDetails([...formDetails, { item_cd: '', lot_no: '', incoming_qty: 1 }])} className="border-dashed">상세 추가</Button>
          </>
        )}
      </FormModal>

      <Modal title={`입고 상세 — ${detailItem?.incoming_no ?? ''}`} open={detailOpen} onClose={() => { setDetailOpen(false); setDetailItem(null); }} width={700}
        footer={<div className="flex items-center gap-2">{detailItem?.status === 'PLAN' && (<Button variant="primary" icon={<CheckCircle className="w-4 h-4" />} onClick={() => { if (detailItem) handleConfirmOpen(detailItem); }}>입고확인</Button>)}<Button onClick={() => { setDetailOpen(false); setDetailItem(null); }}>닫기</Button></div>}>
        {detailItem && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-dark-700 rounded-lg text-sm">
              <div><span className="text-gray-400">입고번호:</span> {detailItem.incoming_no}</div>
              <div><span className="text-gray-400">상태:</span> <Tag color={STATUS_COLOR[detailItem.status] ?? 'default'}>{STATUS_LABEL[detailItem.status] ?? detailItem.status}</Tag></div>
              <div><span className="text-gray-400">거래처:</span> {detailItem.customer?.cust_nm ?? detailItem.cust_cd ?? '-'}</div>
              <div><span className="text-gray-400">등록일:</span> {detailItem.create_dt ? dayjs(detailItem.create_dt).format('YYYY-MM-DD HH:mm') : '-'}</div>
              <div><span className="text-gray-400">등록자:</span> {detailItem.create_by ?? '-'}</div>
              <div><span className="text-gray-400">수정자:</span> {detailItem.update_by ?? '-'}</div>
            </div>
            <Table columns={detailColumns} dataSource={detailItem.details ?? []} rowKey={(r: any) => r.incoming_dtl_id?.toString() ?? `${r.item_cd}-${r.lot_no}`} />
          </>
        )}
      </Modal>

      <Modal title={`입고확인 — ${confirmTarget?.incoming_no ?? ''}`} open={confirmOpen} onClose={() => { setConfirmOpen(false); setConfirmTarget(null); }} width={500}
        footer={<div className="flex items-center gap-2"><Button onClick={() => { setConfirmOpen(false); setConfirmTarget(null); }}>취소</Button><Button variant="primary" loading={confirmLoading} onClick={handleConfirmSubmit}>입고확인</Button></div>}>
        <FormField label="입고 창고" required><Select placeholder="창고 선택" options={whOptions} value={confirmWhCd} onChange={(e) => setConfirmWhCd(e.target.value)} /></FormField>
      </Modal>
    </div>
  );
}
