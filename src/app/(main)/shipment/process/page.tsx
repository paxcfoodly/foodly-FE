'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import Modal from '@/components/ui/Modal';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import DataGrid, { type DataGridColumn } from '@/components/common/DataGrid';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';

interface ShipmentDetail { ship_dtl_id: number; item_cd: string; lot_no: string | null; order_qty: number; actual_qty: number | null; item?: { item_nm: string }; lot?: { lot_qty: number; lot_status: string; wh_cd: string }; [key: string]: unknown; }
interface Shipment { ship_id: number; ship_no: string; cust_cd: string; status: string; plan_dt: string | null; actual_ship_dt: string | null; cancel_reason: string | null; remark: string | null; customer?: { cust_nm: string }; details: ShipmentDetail[]; [key: string]: unknown; }

const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'ship_no', label: '출하번호', type: 'text', placeholder: '출하번호 입력' },
  { name: 'date_range', label: '기간', type: 'dateRange' },
];

const TOP_COLUMNS: DataGridColumn<Shipment>[] = [
  { title: '출하번호', dataIndex: 'ship_no', width: 160 },
  { title: '거래처', dataIndex: 'customer', width: 180, render: (val: unknown, record: Shipment) => { const c = val as { cust_nm?: string } | null; return c?.cust_nm ?? record.cust_cd; } },
  { title: '지시일', dataIndex: 'plan_dt', width: 110, render: (val: unknown) => (val ? String(val).slice(0, 10) : '-') },
  { title: 'LOT 수', dataIndex: 'details', width: 80, align: 'center', render: (val: unknown) => { const d = val as ShipmentDetail[]; return d?.length ?? 0; } },
  { title: '지시수량', dataIndex: 'details', key: 'order_qty', width: 100, align: 'right', render: (val: unknown) => { const d = val as ShipmentDetail[]; return (d ?? []).reduce((s, row) => s + (row.order_qty ?? 0), 0); } },
  { title: '상태', dataIndex: 'status', width: 90, align: 'center', render: () => <Tag color="warning">지시등록</Tag> },
];

export default function ShipmentProcessPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useState<Record<string, unknown>>({});
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [actualQtyMap, setActualQtyMap] = useState<Record<number, number>>({});
  const [confirming, setConfirming] = useState(false);

  const fetchShipments = useCallback(async (p = page, ps = pageSize, params = searchParams) => {
    setLoading(true);
    try { const res = await apiClient.get('/v1/shipments', { params: { page: p, limit: ps, status: 'PLAN', ...params } }); const { data: rows, pagination } = res.data; setShipments(Array.isArray(rows) ? rows : []); setTotal(pagination?.total ?? 0); }
    catch { setShipments([]); setTotal(0); } finally { setLoading(false); }
  }, [page, pageSize, searchParams]);

  useEffect(() => { fetchShipments(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = useCallback((values: Record<string, unknown>) => {
    const params: Record<string, unknown> = {};
    if (values.ship_no) params.ship_no = values.ship_no;
    if (Array.isArray(values.date_range) && values.date_range.length === 2) { params.start_dt = values.date_range[0]; params.end_dt = values.date_range[1]; }
    setSearchParams(params); setPage(1); fetchShipments(1, pageSize, params);
  }, [fetchShipments, pageSize]);

  const handleReset = useCallback(() => { setSearchParams({}); setPage(1); fetchShipments(1, pageSize, {}); }, [fetchShipments, pageSize]);
  const handlePageChange = useCallback((p: number, ps: number) => { setPage(p); setPageSize(ps); fetchShipments(p, ps, searchParams); }, [fetchShipments, searchParams]);

  const handleRowClick = useCallback((record: Shipment) => {
    setSelectedShipment(record); setSelectedRowKeys([]);
    const initMap: Record<number, number> = {}; (record.details ?? []).forEach((d) => { initMap[d.ship_dtl_id] = d.order_qty; }); setActualQtyMap(initMap);
  }, []);

  const handleDetailSelectionChange = useCallback((keys: React.Key[]) => { setSelectedRowKeys(keys); }, []);
  const handleActualQtyChange = useCallback((dtlId: number, value: number | null) => { setActualQtyMap((prev) => ({ ...prev, [dtlId]: value ?? 1 })); }, []);

  const isConfirmEnabled = selectedShipment !== null && selectedRowKeys.length > 0 && selectedRowKeys.every((key) => {
    const dtlId = Number(key); const detail = (selectedShipment?.details ?? []).find((d) => d.ship_dtl_id === dtlId);
    if (!detail) return false; const qty = actualQtyMap[dtlId] ?? 0; return qty >= 1 && qty <= detail.order_qty;
  });

  const handleConfirm = useCallback(() => {
    if (!selectedShipment) return; const n = selectedRowKeys.length;
    confirm({ title: '출하확정', content: `출하확정: 선택한 ${n}개 LOT를 출하 처리합니다. 확정 후 재고가 차감됩니다. 계속하시겠습니까?`, okText: '확정', onOk: async () => {
      setConfirming(true);
      try {
        await apiClient.patch(`/v1/shipments/${selectedShipment.ship_id}/confirm`, { details: selectedRowKeys.map((key) => ({ ship_dtl_id: Number(key), actual_qty: actualQtyMap[Number(key)] })) });
        toast.success('출하확정이 완료되었습니다. 재고가 차감되었습니다.');
        setSelectedShipment(null); setSelectedRowKeys([]); setActualQtyMap({}); fetchShipments(1, pageSize, searchParams); setPage(1);
      } catch (err: unknown) { const e = err as { response?: { data?: { error?: string } }; message?: string }; toast.error(e?.response?.data?.error ?? e?.message ?? '출하확정에 실패했습니다.'); } finally { setConfirming(false); }
    } });
  }, [selectedShipment, selectedRowKeys, actualQtyMap, fetchShipments, pageSize, searchParams]);

  const DETAIL_COLUMNS: DataGridColumn<ShipmentDetail>[] = [
    { title: '품목', dataIndex: 'item_cd', width: 200, render: (val: unknown, record: ShipmentDetail) => { const nm = record.item?.item_nm; return nm ? `${String(val)} / ${nm}` : String(val); } },
    { title: 'LOT번호', dataIndex: 'lot_no', width: 160, render: (val: unknown) => val ? String(val) : '-' },
    { title: '지시수량', dataIndex: 'order_qty', width: 100, align: 'right' },
    { title: '실출하수량', dataIndex: 'ship_dtl_id', width: 160, align: 'right', render: (val: unknown, record: ShipmentDetail) => {
      const dtlId = val as number; const currentVal = actualQtyMap[dtlId] ?? record.order_qty; const isOver = currentVal > record.order_qty;
      return (
        <div>
          <input type="number" min={1} max={record.order_qty} value={currentVal} onChange={(e) => handleActualQtyChange(dtlId, Number(e.target.value))}
            className={`w-[100px] h-8 bg-dark-700 border rounded-lg px-2 text-sm text-gray-700 focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15 ${isOver ? 'border-red-500' : 'border-dark-500'}`} />
          {isOver && <div className="text-red-500 text-[11px] mt-0.5">실 출하수량은 지시수량을 초과할 수 없습니다.</div>}
        </div>
      );
    } },
    { title: '재고잔량', dataIndex: 'lot', width: 100, align: 'right', render: (val: unknown) => { const lot = val as { lot_qty?: number } | null; return lot?.lot_qty ?? '-'; } },
  ];

  return (
    <div className="px-6 py-4">
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleReset} loading={loading} />
      <DataGrid<Shipment> storageKey="shipment-process-list" columns={TOP_COLUMNS} dataSource={shipments} rowKey="ship_id" loading={loading} page={page} pageSize={pageSize} total={total} onPageChange={handlePageChange} scrollX={800}
        emptyText="처리 대상 없음 — 출하확정 대기 중인 출하지시가 없습니다." onRow={(record) => ({ onClick: () => handleRowClick(record), style: { cursor: 'pointer', background: selectedShipment?.ship_id === record.ship_id ? '#e6f4ff' : undefined } })} />

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <h5 className="text-base font-semibold text-gray-900">{selectedShipment ? `LOT 출하 처리 — ${selectedShipment.ship_no}` : 'LOT 출하 처리'}</h5>
          <div className="flex items-center gap-2">
            {selectedShipment && selectedRowKeys.length > 0 && (<span className="text-gray-400 text-sm">{selectedRowKeys.length}개 선택됨</span>)}
            <Button variant="primary" disabled={!isConfirmEnabled} loading={confirming} onClick={handleConfirm}>출하확정</Button>
          </div>
        </div>

        {selectedShipment ? (
          <DataGrid<ShipmentDetail> storageKey="shipment-process-detail" columns={DETAIL_COLUMNS} dataSource={selectedShipment.details ?? []} rowKey="ship_dtl_id" selectionMode="multiple" selectedRowKeys={selectedRowKeys} onSelectionChange={handleDetailSelectionChange} scrollX={800} emptyText="LOT 정보가 없습니다." />
        ) : (
          <div className="py-8 text-center text-gray-400 bg-dark-700 rounded-lg border border-dashed border-gray-300">위 목록에서 출하지시를 선택하면 LOT 목록이 표시됩니다.</div>
        )}
      </div>
    </div>
  );
}
