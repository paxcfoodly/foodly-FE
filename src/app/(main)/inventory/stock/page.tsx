'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Wrench } from 'lucide-react';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import type { TableColumn, PaginationConfig } from '@/components/ui/Table';
import toast from '@/components/ui/toast';
import { Section, Row } from '@/components/ui/Section';
import PermissionButton from '@/components/auth/PermissionButton';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

interface InventoryRow { inventory_id: number; item_cd: string; lot_no: string | null; wh_cd: string; qty: number; allocated_qty: number; available_qty: number; create_by: string | null; create_dt: string; update_by: string | null; update_dt: string | null; item?: { item_nm: string } | null; lot?: { lot_status: string } | null; warehouse?: { wh_nm: string } | null; [key: string]: unknown; }
interface AdjustFormValues { adjust_qty: number; adjust_reason?: string; }

const MENU_URL = '/inventory/stock';
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'wh_cd', label: '창고코드', type: 'text', placeholder: '창고코드 입력' },
  { name: 'lot_no', label: 'LOT번호', type: 'text', placeholder: 'LOT번호 입력' },
];

export default function InventoryStockPage() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<InventoryRow | null>(null);
  const [adjustValues, setAdjustValues] = useState<AdjustFormValues>({ adjust_qty: 0, adjust_reason: '' });
  const [adjustLoading, setAdjustLoading] = useState(false);

  const fetchInventory = useCallback(async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: pageSize }; const af = sf ?? filters;
      if (sort) params.sortBy = sort; if (order) params.sortOrder = order;
      Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });
      const res = await apiClient.get<PaginatedResponse<InventoryRow>>('/v1/inventory', { params }); const body = res.data;
      setItems(body.data ?? []); if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
    } catch (err: any) { toast.error(err?.response?.data?.message ?? '재고 목록 조회에 실패했습니다.'); } finally { setLoading(false); }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchInventory(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((v: Record<string, unknown>) => { setFilters(v); setPagination((p) => ({ ...p, page: 1 })); fetchInventory(1, pagination.pageSize, sortField, sortOrder, v); }, [fetchInventory, pagination.pageSize, sortField, sortOrder]);
  const handleSearchReset = useCallback(() => { setFilters({}); setPagination((p) => ({ ...p, page: 1 })); fetchInventory(1, pagination.pageSize, sortField, sortOrder, {}); }, [fetchInventory, pagination.pageSize, sortField, sortOrder]);
  const handleSortChange = useCallback((f: string, o: 'asc' | 'desc') => { setSortField(f); setSortOrder(o); fetchInventory(pagination.page, pagination.pageSize, f, o, filters); }, [fetchInventory, pagination.page, pagination.pageSize, filters]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPagination((prev) => ({ ...prev, page: p, pageSize: ps })); fetchInventory(p, ps, sortField, sortOrder, filters); }, [fetchInventory, sortField, sortOrder, filters]);

  const handleAdjustOpen = useCallback((r: InventoryRow) => { setAdjustTarget(r); setAdjustValues({ adjust_qty: 0, adjust_reason: '' }); setAdjustOpen(true); }, []);

  const handleAdjustSubmit = useCallback(async () => {
    if (!adjustTarget) return;
    if (adjustValues.adjust_qty === 0) { toast.error('0이 아닌 값을 입력하세요.'); return; }
    setAdjustLoading(true);
    try {
      await apiClient.post('/v1/inventory/adjust', { item_cd: adjustTarget.item_cd, lot_no: adjustTarget.lot_no ?? null, wh_cd: adjustTarget.wh_cd, adjust_qty: adjustValues.adjust_qty, adjust_reason: adjustValues.adjust_reason ?? '' });
      toast.success('재고가 조정되었습니다.'); setAdjustOpen(false); setAdjustTarget(null);
      fetchInventory(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: any) { toast.error(err?.response?.data?.message ?? '재고 조정에 실패했습니다.'); } finally { setAdjustLoading(false); }
  }, [adjustTarget, adjustValues, fetchInventory, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const columns: TableColumn<InventoryRow>[] = useMemo(() => [
    { title: '품목코드', dataIndex: 'item_cd', width: 120, sorter: true, ellipsis: true },
    { title: '품목명', dataIndex: 'item_cd', key: 'item_nm', width: 180, ellipsis: true, render: (_: unknown, r: InventoryRow) => r.item?.item_nm ?? '-' },
    { title: 'LOT번호', dataIndex: 'lot_no', width: 140, sorter: true, ellipsis: true, render: (v: unknown) => (v as string) ?? '-' },
    { title: '창고코드', dataIndex: 'wh_cd', width: 100, sorter: true },
    { title: '창고명', dataIndex: 'wh_cd', key: 'wh_nm', width: 140, ellipsis: true, render: (_: unknown, r: InventoryRow) => r.warehouse?.wh_nm ?? '-' },
    { title: '재고수량', dataIndex: 'qty', width: 110, align: 'right', render: (v: unknown) => (v != null ? Number(v).toLocaleString() : '0') },
    { title: '할당수량', dataIndex: 'allocated_qty', width: 110, align: 'right', render: (v: unknown) => (v != null ? Number(v).toLocaleString() : '0') },
    { title: '가용수량', dataIndex: 'available_qty', width: 110, align: 'right', render: (v: unknown) => { const n = v != null ? Number(v) : 0; return <span className={`font-semibold ${n <= 0 ? 'text-red-500' : ''}`}>{n.toLocaleString()}</span>; } },
    { title: '최종수정일', dataIndex: 'update_dt', width: 140, render: (v: unknown) => (v ? dayjs(v as string).format('YYYY-MM-DD HH:mm') : '-') },
    { title: '관리', dataIndex: '_action', width: 90, align: 'center', render: (_: unknown, r: InventoryRow) => (
      <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" variant="link" icon={<Wrench className="w-4 h-4" />} onClick={() => handleAdjustOpen(r)}>조정</PermissionButton>
    ) },
  ], [handleAdjustOpen]);

  const paginationConfig: PaginationConfig = useMemo(() => ({ current: pagination.page, pageSize: pagination.pageSize, total: pagination.total, onChange: handlePageChange, pageSizeOptions: [10, 20, 50, 100] }), [pagination, handlePageChange]);

  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">총 <strong>{pagination.total.toLocaleString()}</strong>건</span>
      </div>
      <Table<InventoryRow> columns={columns} dataSource={items} rowKey="inventory_id" loading={loading} pagination={paginationConfig} sortBy={sortField} sortOrder={sortOrder} onSortChange={handleSortChange} scrollX={1200} />

      <Modal title="재고 조정" open={adjustOpen} onClose={() => { setAdjustOpen(false); setAdjustTarget(null); }} width={480}
        footer={<div className="flex items-center gap-2"><Button onClick={() => { setAdjustOpen(false); setAdjustTarget(null); }}>취소</Button><Button variant="primary" loading={adjustLoading} onClick={handleAdjustSubmit}>조정</Button></div>}>
        {adjustTarget && (
          <div className="space-y-5">
            <Section title="재고 정보">
              <Row label="품목코드"><span className="text-sm text-gray-700 leading-9">{adjustTarget.item_cd}</span></Row>
              <Row label="품목명"><span className="text-sm text-gray-700 leading-9">{adjustTarget.item?.item_nm ?? '-'}</span></Row>
              <Row label="LOT번호"><span className="text-sm text-gray-700 leading-9">{adjustTarget.lot_no ?? '-'}</span></Row>
              <Row label="창고"><span className="text-sm text-gray-700 leading-9">{adjustTarget.warehouse?.wh_nm ?? adjustTarget.wh_cd}</span></Row>
              <Row label="현재 재고"><span className="text-sm text-gray-700 leading-9">{Number(adjustTarget.qty).toLocaleString()}</span></Row>
              <Row label="가용 수량"><span className="text-sm text-gray-700 leading-9">{Number(adjustTarget.available_qty).toLocaleString()}</span></Row>
            </Section>
            <Section title="조정 내역">
              <Row label="조정 수량" required>
                <input type="number" placeholder="조정 수량 (예: 10, -5)" step={1} className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                  value={adjustValues.adjust_qty || ''} onChange={(e) => setAdjustValues((p) => ({ ...p, adjust_qty: Number(e.target.value) }))} />
                <p className="text-xs text-gray-400 mt-1">양수: 재고 증가, 음수: 재고 감소</p>
              </Row>
              <Row label="조정 사유">
                <Textarea placeholder="조정 사유를 입력하세요" rows={3} maxLength={500} value={adjustValues.adjust_reason ?? ''} onChange={(e) => setAdjustValues((p) => ({ ...p, adjust_reason: e.target.value }))} />
              </Row>
            </Section>
          </div>
        )}
      </Modal>
    </div>
  );
}
