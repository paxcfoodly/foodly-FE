'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Users, User, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Empty from '@/components/ui/Empty';
import Tooltip from '@/components/ui/Tooltip';
import Select from '@/components/ui/Select';
import type { TableColumn, PaginationConfig } from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import PermissionButton from '@/components/auth/PermissionButton';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

interface WorkOrderRow { wo_id: number; wo_no: string; plan_id: number | null; item_cd: string; order_qty: number | null; good_qty: number | null; defect_qty: number | null; priority: number; status: string; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; item?: { item_nm: string } | null; prod_plan?: { plan_no: string } | null; [key: string]: unknown; }
interface AssignmentRow { wo_id: number; worker_id: string; worker_nm: string | null; dept_cd: string | null; workshop_cd: string | null; assign_dt: string; [key: string]: unknown; }
interface WorkerOption { worker_id: string; worker_nm: string; }
interface WorkerAvailability { worker_id: string; worker_nm: string; skills: { process_cd: string; skill_level: number }[]; conflicting_wos: { wo_id: number; wo_no: string }[]; }

const MENU_URL = '/work-order/assignment';
const STATUS_OPTIONS = [{ label: '대기', value: 'WAIT' }, { label: '진행', value: 'PROGRESS' }, { label: '완료', value: 'COMPLETE' }, { label: '마감', value: 'CLOSE' }, { label: '취소', value: 'CANCEL' }];
const STATUS_LABEL: Record<string, string> = { WAIT: '대기', PROGRESS: '진행', COMPLETE: '완료', CLOSE: '마감', CANCEL: '취소' };
const STATUS_COLOR: Record<string, string> = { WAIT: 'blue', PROGRESS: 'orange', COMPLETE: 'cyan', CLOSE: 'green', CANCEL: 'red' };
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'wo_no', label: '작업지시번호', type: 'text', placeholder: '작업지시번호 입력' },
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'status', label: '상태', type: 'select', options: [{ label: '전체', value: '' }, ...STATUS_OPTIONS] },
];
const TAG_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#13c2c2', '#722ed1', '#eb2f96', '#faad14', '#2f54eb', '#a0d911', '#f5222d'];

export default function WorkOrderAssignmentPage() {
  const [orders, setOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [selectedWo, setSelectedWo] = useState<WorkOrderRow | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [workerOptions, setWorkerOptions] = useState<{ label: string; value: string }[]>([]);
  const [workerAvailability, setWorkerAvailability] = useState<WorkerAvailability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const assignAbortRef = useRef<AbortController | null>(null);
  const [allAssignments, setAllAssignments] = useState<{ wo_id: number; wo_no: string; worker_id: string; worker_nm: string; assign_dt: string; status: string; item_nm: string }[]>([]);

  useEffect(() => {
    apiClient.get<PaginatedResponse<WorkerOption>>('/v1/workers', { params: { limit: 500, 'filter[use_yn]': 'Y' } })
      .then((res) => { const list = res.data?.data ?? []; setWorkerOptions(list.map((w) => ({ label: `${w.worker_id} - ${w.worker_nm}`, value: w.worker_id }))); })
      .catch(() => { toast.error('작업자 목록을 불러오지 못했습니다. 페이지를 새로고침하세요.'); });
  }, []);

  const fetchWorkerAvailability = useCallback(async (woId: number) => {
    setAvailabilityLoading(true);
    try { const res = await apiClient.get<WorkerAvailability[]>(`/v1/work-orders/${woId}/workers/availability`); setWorkerAvailability(res.data ?? []); }
    catch { setWorkerAvailability([]); } finally { setAvailabilityLoading(false); }
  }, []);

  const fetchOrders = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<WorkOrderRow>>('/v1/work-orders', { params }); const body = res.data;
      setOrders(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '작업지시 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchOrders(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const fetchAssignments = useCallback(async (woId: number) => {
    setAssignLoading(true);
    try { const res = await apiClient.get(`/v1/work-orders/${woId}/workers`); setAssignments(res.data?.data ?? []); }
    catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '배정 정보 조회에 실패했습니다.'); } finally { setAssignLoading(false); }
  }, []);

  const fetchAllAssignments = useCallback(async (woList: WorkOrderRow[]) => {
    if (assignAbortRef.current) assignAbortRef.current.abort();
    const controller = new AbortController(); assignAbortRef.current = controller;
    try {
      const results = await Promise.all(woList.slice(0, 50).map(async (wo) => {
        try { const res = await apiClient.get(`/v1/work-orders/${wo.wo_id}/workers`, { signal: controller.signal }); const workers: AssignmentRow[] = res.data?.data ?? []; return workers.map((w) => ({ wo_id: wo.wo_id, wo_no: wo.wo_no, worker_id: w.worker_id, worker_nm: w.worker_nm ?? w.worker_id, assign_dt: w.assign_dt, status: wo.status, item_nm: wo.item?.item_nm ?? wo.item_cd })); }
        catch { return []; }
      }));
      if (!controller.signal.aborted) setAllAssignments(results.flat());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (orders.length > 0) fetchAllAssignments(orders); }, [orders, fetchAllAssignments]);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchOrders(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchOrders, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchOrders(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchOrders, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchOrders(pagination.page, pagination.pageSize, f, o, filters); }, [fetchOrders, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchOrders(p, ps, sortField, sortOrder, filters); }, [fetchOrders, sortField, sortOrder, filters]);

  const handleSelectWo = useCallback((r: WorkOrderRow) => { setSelectedWo(r); fetchAssignments(r.wo_id); }, [fetchAssignments]);

  const handleAssignOpen = useCallback(() => {
    if (!selectedWo) { toast.warning('먼저 작업지시를 선택하세요.'); return; }
    setSelectedWorkerIds([]); setWorkerAvailability([]); setAssignModalOpen(true); fetchWorkerAvailability(selectedWo.wo_id);
  }, [selectedWo, fetchWorkerAvailability]);

  const handleAssignSubmit = useCallback(async () => {
    if (!selectedWo || selectedWorkerIds.length === 0) { toast.warning('배정할 작업자를 선택하세요.'); return; }
    setAssignSubmitting(true);
    try { await apiClient.post(`/v1/work-orders/${selectedWo.wo_id}/workers`, { worker_ids: selectedWorkerIds }); toast.success('작업자가 배정되었습니다.'); setAssignModalOpen(false); fetchAssignments(selectedWo.wo_id); fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '작업자 배정에 실패했습니다.'); }
    finally { setAssignSubmitting(false); }
  }, [selectedWo, selectedWorkerIds, fetchAssignments, fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleUnassign = useCallback(async (workerId: string) => {
    if (!selectedWo) return;
    try { await apiClient.delete(`/v1/work-orders/${selectedWo.wo_id}/workers/${workerId}`); toast.success('배정이 취소되었습니다.'); fetchAssignments(selectedWo.wo_id); fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '배정 취소에 실패했습니다. 다시 시도하세요.'); }
  }, [selectedWo, fetchAssignments, fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const enrichedWorkerOptions = useMemo(() => {
    const availMap = new Map<string, WorkerAvailability>(); workerAvailability.forEach((w) => availMap.set(w.worker_id, w));
    return workerOptions.filter((w) => !assignments.some((a) => a.worker_id === w.value)).map((w) => ({ ...w, avail: availMap.get(w.value) }));
  }, [workerOptions, assignments, workerAvailability]);

  const woColumns: TableColumn<WorkOrderRow>[] = useMemo(() => [
    { title: '작업지시번호', dataIndex: 'wo_no', width: 150, sorter: true, ellipsis: true },
    { title: '품목명', dataIndex: 'item_cd', key: 'item_nm', width: 150, ellipsis: true, render: (_: unknown, r: WorkOrderRow) => r.item?.item_nm ?? r.item_cd },
    { title: '지시수량', dataIndex: 'order_qty', width: 90, align: 'right', render: (v: unknown) => v != null ? Number(v).toLocaleString() : '-' },
    { title: '진행률', dataIndex: '_progress', width: 110, render: (_: unknown, r: WorkOrderRow) => { const o = Number(r.order_qty ?? 0); const g = Number(r.good_qty ?? 0); const pct = o > 0 ? Math.round((g / o) * 100) : 0; return (<div className="flex items-center gap-1"><div className="flex-1 bg-gray-200 rounded-full h-1.5"><div className="bg-cyan-accent h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} /></div><span className="text-xs text-gray-500">{pct}%</span></div>); } },
    { title: '상태', dataIndex: 'status', width: 80, align: 'center', render: (v: unknown) => { const s = v as string; return <Tag color={STATUS_COLOR[s] ?? 'default'}>{STATUS_LABEL[s] ?? s}</Tag>; } },
    { title: '배정', dataIndex: '_assign', width: 60, align: 'center', render: (_: unknown, r: WorkOrderRow) => <Button size="small" variant="link" icon={<Users className="w-4 h-4" />} onClick={() => handleSelectWo(r)} /> },
  ], [handleSelectWo]);

  const assignColumns: TableColumn<AssignmentRow>[] = useMemo(() => [
    { title: '작업자 ID', dataIndex: 'worker_id', width: 120 },
    { title: '작업자명', dataIndex: 'worker_nm', width: 120, render: (v: unknown) => (v as string) ?? '-' },
    { title: '부서', dataIndex: 'dept_cd', width: 100, render: (v: unknown) => (v as string) ?? '-' },
    { title: '배정일시', dataIndex: 'assign_dt', width: 150, render: (v: unknown) => v ? dayjs(v as string).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '해제', dataIndex: '_action', width: 70, align: 'center', render: (_: unknown, r: AssignmentRow) => (
      <PermissionButton action="delete" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" className="text-red-500" icon={<Trash2 className="w-4 h-4" />} aria-label="배정 취소"
        onClick={() => confirm({ title: '이 작업자의 배정을 취소하시겠습니까?', onOk: () => handleUnassign(r.worker_id), okText: '배정 취소', danger: true })}>{''}</PermissionButton>
    ) },
  ], [handleUnassign]);

  const ganttData = useMemo(() => {
    const map = new Map<string, { worker_nm: string; items: typeof allAssignments }>(); allAssignments.forEach((a) => { if (!map.has(a.worker_id)) map.set(a.worker_id, { worker_nm: a.worker_nm, items: [] }); map.get(a.worker_id)!.items.push(a); });
    return Array.from(map.entries()).map(([id, d]) => ({ worker_id: id, worker_nm: d.worker_nm, items: d.items }));
  }, [allAssignments]);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />
      <div className="flex gap-4 mt-2">
        <div className="flex-[2]">
          <div className="mb-2 text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건 — 작업지시를 선택하여 배정 현황을 확인하세요.</div>
          <Table<WorkOrderRow> columns={woColumns} dataSource={orders} rowKey="wo_id" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={700}
            onRow={(r) => ({ onClick: () => handleSelectWo(r), style: { cursor: 'pointer', background: selectedWo?.wo_id === r.wo_id ? '#e6f4ff' : undefined } })} />
        </div>
        <div className="flex-1 min-w-[360px]">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">{selectedWo ? <span className="flex items-center gap-1"><Users className="w-4 h-4" />{selectedWo.wo_no} 배정 현황</span> : '작업자 배정'}</h4>
              {selectedWo && (<PermissionButton action="create" menuUrl={MENU_URL} fallback="hide" size="small" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAssignOpen}>배정</PermissionButton>)}
            </div>
            {selectedWo ? (
              assignments.length === 0 && !assignLoading ? (
                <div className="py-6 text-center"><div className="text-sm font-semibold mb-1">배정된 작업자가 없습니다</div><div className="text-gray-400 text-xs">작업자 배정 버튼을 눌러 이 작업지시에 작업자를 배정하세요.</div></div>
              ) : (<Table<AssignmentRow> columns={assignColumns} dataSource={assignments} rowKey="worker_id" loading={assignLoading} scrollX={500} />)
            ) : (<Empty description="좌측 목록에서 작업지시를 선택하세요." />)}
          </div>
        </div>
      </div>

      {/* Gantt-style Assignment Timeline */}
      <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">작업자별 배정 현황</h4>
        {ganttData.length === 0 ? (<Empty description="배정 데이터가 없습니다." />) : (
          <div className="overflow-x-auto">
            {ganttData.map((worker) => (
              <div key={worker.worker_id} className="flex items-center py-1.5 border-b border-gray-100">
                <div className="w-[140px] min-w-[140px] text-xs font-medium pr-3 overflow-hidden text-ellipsis whitespace-nowrap"><User className="w-3 h-3 inline mr-1" />{worker.worker_nm}</div>
                <div className="flex-1 flex gap-1 flex-wrap">
                  {worker.items.map((item, i) => (
                    <Tooltip key={`${item.wo_id}-${i}`} title={<div className="text-xs"><div className="font-bold">{item.wo_no}</div><div>품목: {item.item_nm}</div><div>상태: {STATUS_LABEL[item.status] ?? item.status}</div><div>배정일: {dayjs(item.assign_dt).format('YYYY-MM-DD HH:mm')}</div></div>}>
                      <span><Tag color={TAG_COLORS[item.wo_id % TAG_COLORS.length]} className="cursor-pointer my-0.5">{item.wo_no}</Tag></span>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Workers Modal */}
      <Modal title={`작업자 배정 — ${selectedWo?.wo_no ?? ''}`} open={assignModalOpen} onClose={() => setAssignModalOpen(false)} width={520}
        footer={<div className="flex items-center gap-2"><Button onClick={() => setAssignModalOpen(false)}>취소</Button><Button variant="primary" loading={assignSubmitting} onClick={handleAssignSubmit}>배정</Button></div>}>
        <div className="mb-3 text-gray-500 text-sm">배정할 작업자를 선택하세요. (복수 선택 가능)</div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {enrichedWorkerOptions.map((w) => {
            const checked = selectedWorkerIds.includes(w.value);
            return (
              <label key={w.value} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-dark-700 ${checked ? 'bg-cyan-accent/5' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => setSelectedWorkerIds((prev) => prev.includes(w.value) ? prev.filter((id) => id !== w.value) : [...prev, w.value])} className="accent-cyan-accent" />
                <span className="text-sm">{w.label}</span>
                {w.avail && w.avail.skills.length > 0 && <Tag color="green">Lv.{w.avail.skills[0].skill_level}</Tag>}
                {w.avail && w.avail.skills.length === 0 && <Tag color="orange"><AlertTriangle className="w-3 h-3 inline" /> 스킬미보유</Tag>}
                {w.avail && w.avail.conflicting_wos.map((cwo) => <Tag key={cwo.wo_id} color="red">배정중: {cwo.wo_no}</Tag>)}
              </label>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
