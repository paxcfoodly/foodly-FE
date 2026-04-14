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

interface IssueDtlRow { issue_dtl_id?: number; item_cd: string; lot_no?: string | null; request_qty: number; issue_qty?: number | null; item?: { item_nm: string } | null; [key: string]: unknown; }
interface IssueRow { issue_id: number; issue_no: string; wo_id: number | null; status: string; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; work_order?: { wo_no: string } | null; details: IssueDtlRow[]; [key: string]: unknown; }
interface IssueFormValues { wo_id?: number | null; details: { item_cd: string; lot_no?: string | null; request_qty: number }[]; [key: string]: unknown; }
interface ProcessDtlInput { issue_dtl_id: number; issue_qty: number; }
interface ItemOption { item_cd: string; item_nm: string; }
interface WoOption { wo_id: number; wo_no: string; }
interface WhOption { wh_cd: string; wh_nm: string; }

const MENU_URL = '/inventory/issue';
const STATUS_OPTIONS = [{ label: '요청', value: 'REQUESTED' }, { label: '불출', value: 'ISSUED' }, { label: '취소', value: 'CANCELLED' }];
const STATUS_LABEL: Record<string, string> = { REQUESTED: '요청', ISSUED: '불출', CANCELLED: '취소' };
const STATUS_COLOR: Record<string, string> = { REQUESTED: 'blue', ISSUED: 'green', CANCELLED: 'red' };
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'issue_no', label: '불출번호', type: 'text', placeholder: '불출번호 입력' },
  { name: 'status', label: '상태', type: 'select', options: [{ label: '전체', value: '' }, ...STATUS_OPTIONS] },
  { name: 'wo_id', label: '작업지시 ID', type: 'text', placeholder: '작업지시 ID 입력' },
];

export default function MaterialIssuePage() {
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<IssueRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<IssueRow | null>(null);
  const [processOpen, setProcessOpen] = useState(false);
  const [processTarget, setProcessTarget] = useState<IssueRow | null>(null);
  const [processFormValues, setProcessFormValues] = useState<{ wh_cd: string; details: { issue_dtl_id: number; issue_qty: number }[] }>({ wh_cd: '', details: [] });
  const [processLoading, setProcessLoading] = useState(false);
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);
  const [woOptions, setWoOptions] = useState<{ label: string; value: number }[]>([]);
  const [whOptions, setWhOptions] = useState<{ label: string; value: string }[]>([]);
  // Form details for create/edit
  const [formDetails, setFormDetails] = useState<{ item_cd: string; lot_no: string; request_qty: number }[]>([{ item_cd: '', lot_no: '', request_qty: 1 }]);
  const [formWoId, setFormWoId] = useState<string>('');

  useEffect(() => {
    apiClient.get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 9999, use_yn: 'Y' } }).then((res) => { setItemOptions((res.data?.data ?? []).map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd }))); }).catch(() => {});
    apiClient.get<PaginatedResponse<WoOption>>('/v1/work-orders', { params: { limit: 9999 } }).then((res) => { setWoOptions((res.data?.data ?? []).map((w) => ({ label: w.wo_no, value: w.wo_id }))); }).catch(() => {});
    apiClient.get<PaginatedResponse<WhOption>>('/v1/workshops', { params: { limit: 9999, type: 'WAREHOUSE' } }).then((res) => { setWhOptions((res.data?.data ?? []).map((w) => ({ label: `${w.wh_cd} - ${w.wh_nm}`, value: w.wh_cd }))); }).catch(() => {});
  }, []);

  const fetchIssues = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<IssueRow>>('/v1/material-issues', { params }); const body = res.data;
      setIssues(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '불출 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchIssues(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchIssues(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchIssues, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchIssues(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchIssues, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchIssues(pagination.page, pagination.pageSize, f, o, filters); }, [fetchIssues, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchIssues(p, ps, sortField, sortOrder, filters); }, [fetchIssues, sortField, sortOrder, filters]);

  const handleCreate = useCallback(() => { setEditItem(null); setModalMode('create'); setFormWoId(''); setFormDetails([{ item_cd: '', lot_no: '', request_qty: 1 }]); setModalOpen(true); }, []);
  const handleEdit = useCallback((r: IssueRow) => { if (r.status !== 'REQUESTED') { toast.warning('요청(REQUESTED) 상태에서만 수정할 수 있습니다.'); return; } setEditItem(r); setModalMode('edit'); setFormWoId(r.wo_id ? String(r.wo_id) : ''); setFormDetails((r.details ?? []).map((d) => ({ item_cd: d.item_cd, lot_no: d.lot_no ?? '', request_qty: Number(d.request_qty) }))); setModalOpen(true); }, []);

  const handleSubmit = useCallback(async (_values: IssueFormValues, mode: FormModalMode) => {
    const payload = { wo_id: formWoId ? Number(formWoId) : null, details: formDetails.filter(d => d.item_cd).map((d) => ({ item_cd: d.item_cd, lot_no: d.lot_no || null, request_qty: d.request_qty })) };
    if (mode === 'create') { await apiClient.post('/v1/material-issues', payload); } else { await apiClient.put(`/v1/material-issues/${editItem!.issue_id}`, payload); }
    fetchIssues(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
  }, [editItem, fetchIssues, pagination.page, pagination.pageSize, sortField, sortOrder, filters, formWoId, formDetails]);

  const handleDelete = useCallback(async (r: IssueRow) => {
    try { await apiClient.delete(`/v1/material-issues/${r.issue_id}`); toast.success('불출요청이 삭제되었습니다.'); fetchIssues(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '삭제에 실패했습니다.'); }
  }, [fetchIssues, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleViewDetail = useCallback(async (r: IssueRow) => {
    try { const res = await apiClient.get<{ data: IssueRow }>(`/v1/material-issues/${r.issue_id}`); setDetailItem(res.data.data); } catch { setDetailItem(r); } setDetailOpen(true);
  }, []);

  const handleProcessOpen = useCallback(async (r: IssueRow) => {
    try { const res = await apiClient.get<{ data: IssueRow }>(`/v1/material-issues/${r.issue_id}`); const freshData = res.data.data; setProcessTarget(freshData); setProcessFormValues({ wh_cd: '', details: (freshData.details ?? []).map((d) => ({ issue_dtl_id: d.issue_dtl_id!, issue_qty: d.request_qty })) }); }
    catch { setProcessTarget(r); setProcessFormValues({ wh_cd: '', details: (r.details ?? []).map((d) => ({ issue_dtl_id: d.issue_dtl_id!, issue_qty: d.request_qty })) }); }
    setProcessOpen(true);
  }, []);

  const handleProcessSubmit = useCallback(async () => {
    if (!processTarget) return;
    if (!processFormValues.wh_cd) { toast.warning('창고를 선택하세요.'); return; }
    setProcessLoading(true);
    try {
      await apiClient.patch(`/v1/material-issues/${processTarget.issue_id}/process`, { wh_cd: processFormValues.wh_cd, details: processFormValues.details.map((d) => ({ issue_dtl_id: d.issue_dtl_id, issue_qty: d.issue_qty })) });
      toast.success('불출 처리가 완료되었습니다.'); setProcessOpen(false); setProcessTarget(null);
      fetchIssues(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '불출 처리에 실패했습니다.'); } finally { setProcessLoading(false); }
  }, [processTarget, processFormValues, fetchIssues, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const columns: TableColumn<IssueRow>[] = useMemo(() => [
    { title: '불출번호', dataIndex: 'issue_no', width: 160, sorter: true, ellipsis: true },
    { title: '작업지시', dataIndex: 'wo_id', key: 'wo_no', width: 150, ellipsis: true, render: (_: unknown, r: IssueRow) => r.work_order?.wo_no ?? '-' },
    { title: '상태', dataIndex: 'status', width: 90, align: 'center', sorter: true, render: (v: unknown) => { const s = v as string; return <Tag color={STATUS_COLOR[s] ?? 'default'}>{STATUS_LABEL[s] ?? s}</Tag>; } },
    { title: '상세 품목수', dataIndex: 'details', width: 100, align: 'center', render: (v: unknown) => (v as IssueDtlRow[])?.length ?? 0 },
    { title: '등록일', dataIndex: 'create_dt', width: 160, sorter: true, render: (v: unknown) => (v ? dayjs(v as string).format('YYYY-MM-DD HH:mm') : '-') },
    { title: '등록자', dataIndex: 'create_by', width: 100, ellipsis: true },
    { title: '관리', dataIndex: '_action', width: 200, align: 'center', render: (_: unknown, r: IssueRow) => {
      const isReq = r.status === 'REQUESTED';
      return (
        <div className="flex items-center gap-1">
          <Button size="small" variant="ghost" icon={<Eye className="w-4 h-4" />} onClick={() => handleViewDetail(r)} title="상세" />
          {isReq && (<PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<CheckCircle className="w-4 h-4" />} onClick={() => handleProcessOpen(r)} title="불출처리">{''}</PermissionButton>)}
          {isReq ? (<PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} onClick={() => handleEdit(r)}>{''}</PermissionButton>) : (<Button size="small" variant="ghost" icon={<Pencil className="w-4 h-4" />} disabled />)}
          {isReq ? (<PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />} onClick={() => confirm({ title: '불출요청을 삭제하시겠습니까?', content: '요청 상태에서만 삭제할 수 있습니다.', onOk: () => handleDelete(r), okText: '삭제', danger: true })}>{''}</PermissionButton>) : (<Button size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />} disabled />)}
        </div>
      );
    } },
  ], [handleEdit, handleDelete, handleViewDetail, handleProcessOpen]);

  const detailColumns: TableColumn<IssueDtlRow>[] = useMemo(() => [
    { title: '품목코드', dataIndex: 'item_cd', width: 120 },
    { title: '품목명', dataIndex: 'item_cd', key: 'item_nm', width: 150, render: (_: unknown, r: IssueDtlRow) => r.item?.item_nm ?? '-' },
    { title: 'LOT 번호', dataIndex: 'lot_no', width: 140, render: (v: unknown) => (v as string) || '-' },
    { title: '요청수량', dataIndex: 'request_qty', width: 100, align: 'right', render: (v: unknown) => (v != null ? Number(v).toLocaleString() : '-') },
    { title: '불출수량', dataIndex: 'issue_qty', width: 100, align: 'right', render: (v: unknown) => (v != null ? Number(v).toLocaleString() : '-') },
  ], []);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>불출요청 등록</PermissionButton>
      </div>
      <Table<IssueRow> columns={columns} dataSource={issues} rowKey="issue_id" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1000} />

      {/* Create/Edit Modal */}
      <FormModal<IssueFormValues> open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} onSubmit={handleSubmit} mode={modalMode}
        initialValues={{ wo_id: editItem?.wo_id, details: formDetails } as any} title={modalMode === 'create' ? '불출요청 등록' : '불출요청 수정'} width={720} layout="vertical">
        {() => (
          <>
            <FormField label="작업지시"><Select name="wo_id" placeholder="작업지시 선택 (선택사항)" options={[{ label: '선택 안함', value: '' }, ...woOptions.map(o => ({ label: o.label, value: String(o.value) }))]} value={formWoId} onChange={(e) => setFormWoId(e.target.value)} /></FormField>
            <div className="mb-2 font-medium text-sm">불출 상세</div>
            {formDetails.map((d, idx) => (
              <div key={idx} className="flex items-start gap-2 mb-2">
                <Select placeholder="품목 선택" options={itemOptions} value={d.item_cd} onChange={(e) => { const next = [...formDetails]; next[idx] = { ...next[idx], item_cd: e.target.value }; setFormDetails(next); }} className="!w-[220px]" />
                <Input placeholder="LOT 번호" value={d.lot_no} onChange={(e) => { const next = [...formDetails]; next[idx] = { ...next[idx], lot_no: e.target.value }; setFormDetails(next); }} className="!w-[140px]" />
                <input type="number" placeholder="요청수량" min={0.01} step="any" value={d.request_qty} onChange={(e) => { const next = [...formDetails]; next[idx] = { ...next[idx], request_qty: Number(e.target.value) }; setFormDetails(next); }}
                  className="w-[120px] h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" />
                {formDetails.length > 1 && <button onClick={() => setFormDetails(formDetails.filter((_, i) => i !== idx))} className="text-red-500 mt-2"><Minus className="w-4 h-4" /></button>}
              </div>
            ))}
            <Button variant="ghost" block icon={<Plus className="w-4 h-4" />} onClick={() => setFormDetails([...formDetails, { item_cd: '', lot_no: '', request_qty: 1 }])} className="border-dashed">상세 추가</Button>
          </>
        )}
      </FormModal>

      {/* Detail Modal */}
      <Modal title={`불출 상세 — ${detailItem?.issue_no ?? ''}`} open={detailOpen} onClose={() => { setDetailOpen(false); setDetailItem(null); }} width={700}
        footer={<div className="flex items-center gap-2">{detailItem?.status === 'REQUESTED' && (<Button variant="primary" icon={<CheckCircle className="w-4 h-4" />} onClick={() => { setDetailOpen(false); if (detailItem) handleProcessOpen(detailItem); }}>불출처리</Button>)}<Button onClick={() => { setDetailOpen(false); setDetailItem(null); }}>닫기</Button></div>}>
        {detailItem && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-dark-700 rounded-lg text-sm">
              <div><span className="text-gray-400">불출번호:</span> {detailItem.issue_no}</div>
              <div><span className="text-gray-400">상태:</span> <Tag color={STATUS_COLOR[detailItem.status] ?? 'default'}>{STATUS_LABEL[detailItem.status] ?? detailItem.status}</Tag></div>
              <div><span className="text-gray-400">작업지시:</span> {detailItem.work_order?.wo_no ?? '-'}</div>
              <div><span className="text-gray-400">등록일:</span> {detailItem.create_dt ? dayjs(detailItem.create_dt).format('YYYY-MM-DD HH:mm') : '-'}</div>
              <div><span className="text-gray-400">등록자:</span> {detailItem.create_by ?? '-'}</div>
              <div><span className="text-gray-400">수정자:</span> {detailItem.update_by ?? '-'}</div>
            </div>
            <Table columns={detailColumns} dataSource={detailItem.details ?? []} rowKey={(r: any) => r.issue_dtl_id?.toString() ?? `${r.item_cd}-${r.lot_no}`} />
          </>
        )}
      </Modal>

      {/* Process Modal */}
      <Modal title={`불출처리 — ${processTarget?.issue_no ?? ''}`} open={processOpen} onClose={() => { setProcessOpen(false); setProcessTarget(null); }} width={700}
        footer={<div className="flex items-center gap-2"><Button onClick={() => { setProcessOpen(false); setProcessTarget(null); }}>취소</Button><Button variant="primary" loading={processLoading} onClick={handleProcessSubmit}>불출처리</Button></div>}>
        <div className="space-y-4">
          <FormField label="출고 창고" required><Select placeholder="창고 선택" options={whOptions} value={processFormValues.wh_cd} onChange={(e) => setProcessFormValues((p) => ({ ...p, wh_cd: e.target.value }))} /></FormField>
          <div className="font-medium text-sm mb-2">불출 상세</div>
          <table className="w-full text-sm border-collapse"><thead><tr className="bg-dark-700"><th className="p-2 text-left">품목</th><th className="p-2 text-left">LOT</th><th className="p-2 text-right">요청수량</th><th className="p-2 text-right">불출수량</th></tr></thead>
            <tbody>{(processTarget?.details ?? []).map((d, idx) => (
              <tr key={d.issue_dtl_id ?? idx} className="border-b border-dark-600">
                <td className="p-2">{d.item?.item_nm ? `${d.item_cd} - ${d.item.item_nm}` : d.item_cd}</td>
                <td className="p-2">{d.lot_no || '-'}</td>
                <td className="p-2 text-right">{d.request_qty != null ? Number(d.request_qty).toLocaleString() : '-'}</td>
                <td className="p-2 text-right"><input type="number" min={0.01} step="any" className="w-[100px] h-8 bg-dark-700 border border-dark-500 rounded-lg px-2 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                  value={processFormValues.details[idx]?.issue_qty ?? ''} onChange={(e) => { const next = [...processFormValues.details]; next[idx] = { ...next[idx], issue_qty: Number(e.target.value) }; setProcessFormValues((p) => ({ ...p, details: next })); }} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
