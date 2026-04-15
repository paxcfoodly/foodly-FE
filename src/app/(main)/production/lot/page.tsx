'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GitBranch, Split, Merge, Printer, Minus, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import type { TableColumn, PaginationConfig } from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import { Section } from '@/components/ui/Section';
import PermissionButton from '@/components/auth/PermissionButton';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

interface LotRow { lot_no: string; item_cd: string; lot_qty: number; lot_status: string; create_type: string; parent_lot_no: string | null; wo_id: number | null; wh_cd: string | null; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; item?: { item_nm: string; item_type?: string; unit?: string }; work_order?: { wo_no: string }; warehouse?: { wh_nm: string }; [key: string]: unknown; }
interface TraceRow { lot_no: string; item_cd: string; lot_qty: number; lot_status: string; create_type: string; parent_lot_no?: string | null; wo_id?: number | null; depth?: number; link_type?: string; downstream_lot_no?: string; upstream_lot_no?: string; source_wo_id?: number; [key: string]: unknown; }
interface ForwardTraceResult { origin: string; child_lots: TraceRow[]; downstream_lots: TraceRow[]; }
interface BackwardTraceResult { origin: string; parent_lots: TraceRow[]; upstream_lots: TraceRow[]; }

const MENU_URL = '/result/lot';
const LOT_STATUS_OPTIONS = [{ label: 'ACTIVE', value: 'ACTIVE' }, { label: 'SPLIT', value: 'SPLIT' }, { label: 'MERGED', value: 'MERGED' }, { label: 'CONSUMED', value: 'CONSUMED' }];
const CREATE_TYPE_OPTIONS = [{ label: 'PRODUCTION', value: 'PRODUCTION' }, { label: 'INCOMING', value: 'INCOMING' }, { label: 'SPLIT', value: 'SPLIT' }, { label: 'MERGE', value: 'MERGE' }];
const STATUS_COLORS: Record<string, string> = { ACTIVE: 'green', SPLIT: 'blue', MERGED: 'purple', CONSUMED: 'default' };

const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'lot_no', label: 'LOT번호', type: 'text', placeholder: 'LOT번호 입력' },
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'lot_status', label: 'LOT상태', type: 'select', placeholder: '상태 선택', options: LOT_STATUS_OPTIONS },
  { name: 'create_type', label: '생성유형', type: 'select', placeholder: '유형 선택', options: CREATE_TYPE_OPTIONS },
];

export default function LotManagementPage() {
  const [rows, setRows] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceLotNo, setTraceLotNo] = useState('');
  const [traceDirection, setTraceDirection] = useState<'forward' | 'backward'>('forward');
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceData, setTraceData] = useState<TraceRow[]>([]);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitLot, setSplitLot] = useState<LotRow | null>(null);
  const [splitChildren, setSplitChildren] = useState<{ qty: number }[]>([{ qty: 0 }, { qty: 0 }]);
  const [splitLoading, setSplitLoading] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSelectedLots, setMergeSelectedLots] = useState<string[]>([]);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [activeLots, setActiveLots] = useState<LotRow[]>([]);
  const [printLot, setPrintLot] = useState<LotRow | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const fetchData = useCallback(async (page = 1, pageSize = 20, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<LotRow>>('/v1/lots', { params }); const body = res.data;
      setRows(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? 'LOT 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchData(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchData, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchData(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchData, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchData(pagination.page, pagination.pageSize, f, o, filters); }, [fetchData, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchData(p, ps, sortField, sortOrder, filters); }, [fetchData, sortField, sortOrder, filters]);

  const openTrace = useCallback((lotNo: string) => { setTraceLotNo(lotNo); setTraceDirection('forward'); setTraceData([]); setTraceOpen(true); }, []);
  const loadTrace = useCallback(async (lotNo: string, direction: 'forward' | 'backward') => {
    setTraceLoading(true);
    try {
      const res = await apiClient.get<{ data: ForwardTraceResult | BackwardTraceResult }>(`/v1/lots/${encodeURIComponent(lotNo)}/trace/${direction}`); const body = res.data.data;
      if (direction === 'forward') { const fwd = body as ForwardTraceResult; setTraceData([...fwd.child_lots.map((r) => ({ ...r, link_type: 'CHILD_LOT' })), ...fwd.downstream_lots.map((r) => ({ lot_no: r.downstream_lot_no ?? r.lot_no, item_cd: r.item_cd, lot_qty: r.lot_qty, lot_status: r.lot_status, create_type: r.create_type, link_type: 'DOWNSTREAM' }))]); }
      else { const bwd = body as BackwardTraceResult; setTraceData([...bwd.parent_lots.map((r) => ({ ...r, link_type: 'PARENT_LOT' })), ...bwd.upstream_lots.map((r) => ({ lot_no: r.upstream_lot_no ?? r.lot_no, item_cd: r.item_cd, lot_qty: r.lot_qty, lot_status: r.lot_status, create_type: r.create_type, link_type: 'UPSTREAM' }))]); }
    } catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? '추적 조회에 실패했습니다.'); } finally { setTraceLoading(false); }
  }, []);

  useEffect(() => { if (traceOpen && traceLotNo) loadTrace(traceLotNo, traceDirection); }, [traceOpen, traceLotNo, traceDirection, loadTrace]);

  const openSplit = useCallback((r: LotRow) => { setSplitLot(r); setSplitChildren([{ qty: Math.floor(r.lot_qty / 2) }, { qty: r.lot_qty - Math.floor(r.lot_qty / 2) }]); setSplitOpen(true); }, []);
  const handleSplitSubmit = useCallback(async () => {
    if (!splitLot) return; const parentQty = splitLot.lot_qty; const childSum = splitChildren.reduce((s, c) => s + (c.qty || 0), 0);
    if (Math.abs(childSum - parentQty) > 0.001) { toast.error(`자식 LOT 수량 합계(${childSum})가 부모 수량(${parentQty})과 일치하지 않습니다.`); return; }
    if (splitChildren.some((c) => !c.qty || c.qty <= 0)) { toast.error('모든 자식 LOT의 수량은 0보다 커야 합니다.'); return; }
    setSplitLoading(true);
    try { await apiClient.post(`/v1/lots/${encodeURIComponent(splitLot.lot_no)}/split`, { children: splitChildren }); toast.success('LOT 분할이 완료되었습니다.'); setSplitOpen(false); fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? 'LOT 분할에 실패했습니다.'); } finally { setSplitLoading(false); }
  }, [splitLot, splitChildren, fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const openMerge = useCallback(() => { setMergeSelectedLots([]); setActiveLots(rows.filter((r) => r.lot_status === 'ACTIVE')); setMergeOpen(true); }, [rows]);
  const handleMergeSubmit = useCallback(async () => {
    if (mergeSelectedLots.length < 2) { toast.error('병합할 LOT을 2개 이상 선택하세요.'); return; }
    const selectedRows = activeLots.filter((r) => mergeSelectedLots.includes(r.lot_no)); const items = new Set(selectedRows.map((r) => r.item_cd));
    if (items.size > 1) { toast.error('동일 품목의 LOT만 병합할 수 있습니다.'); return; }
    setMergeLoading(true);
    try { await apiClient.post('/v1/lots/merge', { source_lot_nos: mergeSelectedLots }); toast.success('LOT 병합이 완료되었습니다.'); setMergeOpen(false); fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters); }
    catch (err: unknown) { const e = err as { response?: { data?: { message?: string } } }; toast.error(e?.response?.data?.message ?? 'LOT 병합에 실패했습니다.'); } finally { setMergeLoading(false); }
  }, [mergeSelectedLots, activeLots, fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const openPrint = useCallback((r: LotRow) => { setPrintLot(r); setPrintOpen(true); }, []);
  const handlePrint = useCallback(() => { window.print(); }, []);

  const columns: TableColumn<LotRow>[] = useMemo(() => [
    { title: 'LOT번호', dataIndex: 'lot_no', width: 160, sorter: true, ellipsis: true },
    { title: '품목명', dataIndex: 'item_cd', key: 'item_nm', width: 160, ellipsis: true, render: (_: unknown, r: LotRow) => r.item?.item_nm ?? r.item_cd },
    { title: 'LOT수량', dataIndex: 'lot_qty', width: 100, align: 'right', sorter: true, render: (v: unknown) => v != null ? Number(v).toLocaleString() : '0' },
    { title: 'LOT상태', dataIndex: 'lot_status', width: 100, render: (v: unknown) => <Tag color={STATUS_COLORS[v as string] ?? 'default'}>{v as string}</Tag> },
    { title: '생성유형', dataIndex: 'create_type', width: 110 },
    { title: '부모LOT', dataIndex: 'parent_lot_no', width: 160, ellipsis: true, render: (v: unknown) => (v as string) || '-' },
    { title: '작업지시번호', dataIndex: 'wo_id', key: 'wo_no', width: 140, ellipsis: true, render: (_: unknown, r: LotRow) => r.work_order?.wo_no ?? '-' },
    { title: '생성일시', dataIndex: 'create_dt', width: 140, sorter: true, render: (v: unknown) => v ? dayjs(v as string).format('YYYY-MM-DD HH:mm') : '-' },
    { title: '관리', dataIndex: '_action', width: 160, align: 'center', render: (_: unknown, r: LotRow) => (
      <div className="flex items-center gap-1">
        <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<GitBranch className="w-4 h-4" />} onClick={() => openTrace(r.lot_no)} title="추적">{''}</PermissionButton>
        {r.lot_status === 'ACTIVE' && (<PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Split className="w-4 h-4" />} onClick={() => openSplit(r)} title="분할">{''}</PermissionButton>)}
        <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="ghost" icon={<Printer className="w-4 h-4" />} onClick={() => openPrint(r)} title="라벨출력">{''}</PermissionButton>
      </div>
    ) },
  ], [openTrace, openSplit, openPrint]);

  const traceColumns: TableColumn<TraceRow>[] = useMemo(() => [
    { title: 'Depth', dataIndex: 'depth', width: 70, render: (v: unknown) => (v != null ? String(v) : '-') },
    { title: 'LOT번호', dataIndex: 'lot_no', width: 160, ellipsis: true },
    { title: '품목코드', dataIndex: 'item_cd', width: 120 },
    { title: '수량', dataIndex: 'lot_qty', width: 80, align: 'right', render: (v: unknown) => v != null ? Number(v).toLocaleString() : '0' },
    { title: '상태', dataIndex: 'lot_status', width: 90, render: (v: unknown) => <Tag color={STATUS_COLORS[v as string] ?? 'default'}>{v as string}</Tag> },
    { title: '유형', dataIndex: 'create_type', width: 100 },
    { title: '연결유형', dataIndex: 'link_type', width: 110 },
  ], []);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
        <PermissionButton action="create" menuUrl={MENU_URL} variant="primary" icon={<Merge className="w-4 h-4" />} onClick={openMerge}>LOT 병합</PermissionButton>
      </div>
      <Table<LotRow> columns={columns} dataSource={rows} rowKey="lot_no" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1400} />

      {/* Trace Modal */}
      <Modal open={traceOpen} title={`LOT 추적 — ${traceLotNo}`} width={900} onClose={() => setTraceOpen(false)} footer={<Button onClick={() => setTraceOpen(false)}>닫기</Button>}>
        <div className="mb-3 flex gap-2">
          <button className={`px-3 py-1.5 text-sm rounded-lg border ${traceDirection === 'forward' ? 'bg-cyan-accent text-white border-cyan-accent' : 'bg-dark-700 border-dark-500 text-gray-700'}`} onClick={() => setTraceDirection('forward')}>정방향 (하위 추적)</button>
          <button className={`px-3 py-1.5 text-sm rounded-lg border ${traceDirection === 'backward' ? 'bg-cyan-accent text-white border-cyan-accent' : 'bg-dark-700 border-dark-500 text-gray-700'}`} onClick={() => setTraceDirection('backward')}>역방향 (상위 추적)</button>
        </div>
        <Table columns={traceColumns} dataSource={traceData} rowKey={(r: any, i: number) => `${r.lot_no}-${i}`} loading={traceLoading} scrollX={700} />
      </Modal>

      {/* Split Modal */}
      <Modal open={splitOpen} title="LOT 분할" width={560} onClose={() => setSplitOpen(false)}
        footer={<div className="flex items-center gap-2"><Button onClick={() => setSplitOpen(false)}>취소</Button><Button variant="primary" loading={splitLoading} onClick={handleSplitSubmit}>분할 실행</Button></div>}>
        {splitLot && (
          <div className="space-y-5">
            <Section title="부모 LOT">
              <p className="text-sm"><span className="text-gray-400">LOT 번호: </span>{splitLot.lot_no}</p>
              <p className="text-sm"><span className="text-gray-400">품목: </span>{splitLot.item?.item_nm ?? splitLot.item_cd}</p>
              <p className="text-sm"><span className="text-gray-400">수량: </span>{splitLot.lot_qty.toLocaleString()}</p>
            </Section>
            <Section
              title="자식 LOT"
              aside={`합계 ${splitChildren.reduce((s, c) => s + (c.qty || 0), 0).toLocaleString()} / ${splitLot.lot_qty.toLocaleString()}`}
              action={
                <Button variant="ghost" size="small" icon={<Plus className="w-4 h-4" />} onClick={() => setSplitChildren([...splitChildren, { qty: 0 }])}>
                  자식 LOT 추가
                </Button>
              }
            >
              {splitChildren.map((child, idx) => (
                <div key={idx} className="grid grid-cols-[110px_1fr] gap-3 items-center">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">LOT {idx + 1}</div>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0.001} value={child.qty} onChange={(e) => { const next = [...splitChildren]; next[idx] = { qty: Number(e.target.value) || 0 }; setSplitChildren(next); }}
                      className="flex-1 h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15" />
                    {splitChildren.length > 2 && (<Button variant="ghost" className="text-red-500" icon={<Minus className="w-4 h-4" />} onClick={() => setSplitChildren(splitChildren.filter((_, i) => i !== idx))} />)}
                  </div>
                </div>
              ))}
            </Section>
          </div>
        )}
      </Modal>

      {/* Merge Modal */}
      <Modal open={mergeOpen} title="LOT 병합" width={600} onClose={() => setMergeOpen(false)}
        footer={<div className="flex items-center gap-2"><Button onClick={() => setMergeOpen(false)}>취소</Button><Button variant="primary" loading={mergeLoading} onClick={handleMergeSubmit}>병합 실행</Button></div>}>
        <Section title="병합 LOT 선택" aside="동일 품목 ACTIVE LOT 2개 이상">
          {activeLots.length === 0 ? (<p className="text-gray-400 text-sm">현재 목록에 ACTIVE LOT이 없습니다. 먼저 ACTIVE 상태 LOT을 검색하세요.</p>) : (
            <div className="space-y-2">{activeLots.map((lot) => (
              <label key={lot.lot_no} className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700 cursor-pointer">
                <input type="checkbox" checked={mergeSelectedLots.includes(lot.lot_no)} onChange={() => setMergeSelectedLots((prev) => prev.includes(lot.lot_no) ? prev.filter((n) => n !== lot.lot_no) : [...prev, lot.lot_no])} className="accent-cyan-accent" />
                <span className="text-sm">{lot.lot_no} — {lot.item?.item_nm ?? lot.item_cd} ({lot.lot_qty.toLocaleString()})</span>
              </label>
            ))}</div>
          )}
        </Section>
      </Modal>

      {/* Print Modal */}
      <Modal open={printOpen} title="LOT 라벨 출력" width={400} onClose={() => setPrintOpen(false)}
        footer={<div className="flex items-center gap-2"><Button onClick={() => setPrintOpen(false)}>닫기</Button><Button variant="primary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>인쇄</Button></div>}>
        {printLot && (
          <div id="lot-label-print" className="border-2 border-black p-6 text-center font-mono">
            <h2 className="text-xl font-bold mb-2">LOT 라벨</h2>
            <p className="text-lg font-bold">{printLot.lot_no}</p>
            <p>{printLot.item?.item_nm ?? printLot.item_cd}</p>
            <p className="text-lg">수량: {printLot.lot_qty.toLocaleString()}</p>
            <p className="text-xs text-gray-500">생성일: {dayjs(printLot.create_dt).format('YYYY-MM-DD HH:mm')}</p>
          </div>
        )}
      </Modal>

      <style jsx global>{`@media print { body * { visibility: hidden !important; } #lot-label-print, #lot-label-print * { visibility: visible !important; } #lot-label-print { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); } }`}</style>
    </div>
  );
}
