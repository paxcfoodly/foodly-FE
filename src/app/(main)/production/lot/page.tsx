'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Space,
  Table,
  Tag,
  Select,
  InputNumber,
  Form,
  Button,
  Modal,
  message,
  Radio,
  Checkbox,
} from 'antd';
import {
  BranchesOutlined,
  SplitCellsOutlined,
  MergeCellsOutlined,
  PrinterOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import PermissionButton from '@/components/auth/PermissionButton';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

/* ── Types ─────────────────────────────────────────── */

interface LotRow {
  lot_no: string;
  item_cd: string;
  lot_qty: number;
  lot_status: string;
  create_type: string;
  parent_lot_no: string | null;
  wo_id: number | null;
  wh_cd: string | null;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  item?: { item_nm: string; item_type?: string; unit?: string };
  work_order?: { wo_no: string };
  warehouse?: { wh_nm: string };
  [key: string]: unknown;
}

interface TraceRow {
  lot_no: string;
  item_cd: string;
  lot_qty: number;
  lot_status: string;
  create_type: string;
  parent_lot_no?: string | null;
  wo_id?: number | null;
  depth?: number;
  link_type?: string;
  // for cross-WO
  downstream_lot_no?: string;
  upstream_lot_no?: string;
  source_wo_id?: number;
}

interface ForwardTraceResult {
  origin: string;
  child_lots: TraceRow[];
  downstream_lots: TraceRow[];
}

interface BackwardTraceResult {
  origin: string;
  parent_lots: TraceRow[];
  upstream_lots: TraceRow[];
}

const MENU_URL = '/result/lot';

const LOT_STATUS_OPTIONS = [
  { label: 'ACTIVE', value: 'ACTIVE' },
  { label: 'SPLIT', value: 'SPLIT' },
  { label: 'MERGED', value: 'MERGED' },
  { label: 'CONSUMED', value: 'CONSUMED' },
];

const CREATE_TYPE_OPTIONS = [
  { label: 'PRODUCTION', value: 'PRODUCTION' },
  { label: 'INCOMING', value: 'INCOMING' },
  { label: 'SPLIT', value: 'SPLIT' },
  { label: 'MERGE', value: 'MERGE' },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'green',
  SPLIT: 'blue',
  MERGED: 'purple',
  CONSUMED: 'default',
};

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'lot_no', label: 'LOT번호', type: 'text', placeholder: 'LOT번호 입력' },
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  {
    name: 'lot_status',
    label: 'LOT상태',
    type: 'select',
    placeholder: '상태 선택',
    options: LOT_STATUS_OPTIONS,
  },
  {
    name: 'create_type',
    label: '생성유형',
    type: 'select',
    placeholder: '유형 선택',
    options: CREATE_TYPE_OPTIONS,
  },
];

/* ── Component ─────────────────────────────────────── */

export default function LotManagementPage() {
  /* ── State ─── */
  const [rows, setRows] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Trace modal
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceLotNo, setTraceLotNo] = useState('');
  const [traceDirection, setTraceDirection] = useState<'forward' | 'backward'>('forward');
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceData, setTraceData] = useState<TraceRow[]>([]);

  // Split modal
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitLot, setSplitLot] = useState<LotRow | null>(null);
  const [splitChildren, setSplitChildren] = useState<{ qty: number }[]>([{ qty: 0 }, { qty: 0 }]);
  const [splitLoading, setSplitLoading] = useState(false);

  // Merge modal
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSelectedLots, setMergeSelectedLots] = useState<string[]>([]);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [activeLots, setActiveLots] = useState<LotRow[]>([]);

  // Print
  const [printLot, setPrintLot] = useState<LotRow | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  /* ── Data Fetching ─── */
  const fetchData = useCallback(
    async (
      page = 1,
      pageSize = 20,
      sort?: string,
      order?: 'asc' | 'desc',
      searchFilters?: Record<string, unknown>,
    ) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page, limit: pageSize };
        const activeFilters = searchFilters ?? filters;
        if (sort) params.sortBy = sort;
        if (order) params.sortOrder = order;

        Object.entries(activeFilters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            params[key] = val;
          }
        });

        const res = await apiClient.get<PaginatedResponse<LotRow>>('/v1/lots', { params });
        const body = res.data;
        setRows(body.data ?? []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            pageSize: body.pagination.pageSize,
            total: body.pagination.total,
          });
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        message.error(e?.response?.data?.message ?? 'LOT 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    fetchData(1, pagination.pageSize, sortField, sortOrder, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Search handler ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchData(1, pagination.pageSize, sortField, sortOrder, values);
    },
    [fetchData, pagination.pageSize, sortField, sortOrder],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchData(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchData, pagination.pageSize, sortField, sortOrder]);

  /* ── Table change (pagination + sort) ─── */
  const handleTableChange = useCallback(
    (
      paginationConfig: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: SorterResult<LotRow> | SorterResult<LotRow>[],
    ) => {
      const newPage = paginationConfig.current ?? 1;
      const newPageSize = paginationConfig.pageSize ?? 20;

      let newSortField: string | undefined;
      let newSortOrder: 'asc' | 'desc' | undefined;

      if (!Array.isArray(sorter) && sorter.field && sorter.order) {
        newSortField = sorter.field as string;
        newSortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
      }

      setSortField(newSortField);
      setSortOrder(newSortOrder);
      setPagination((prev) => ({ ...prev, page: newPage, pageSize: newPageSize }));
      fetchData(newPage, newPageSize, newSortField, newSortOrder, filters);
    },
    [fetchData, filters],
  );

  /* ── Trace ─── */
  const openTrace = useCallback((lotNo: string) => {
    setTraceLotNo(lotNo);
    setTraceDirection('forward');
    setTraceData([]);
    setTraceOpen(true);
  }, []);

  const loadTrace = useCallback(
    async (lotNo: string, direction: 'forward' | 'backward') => {
      setTraceLoading(true);
      try {
        const res = await apiClient.get<{ data: ForwardTraceResult | BackwardTraceResult }>(
          `/v1/lots/${encodeURIComponent(lotNo)}/trace/${direction}`,
        );
        const body = res.data.data;
        if (direction === 'forward') {
          const fwd = body as ForwardTraceResult;
          const combined: TraceRow[] = [
            ...fwd.child_lots.map((r) => ({ ...r, link_type: 'CHILD_LOT' })),
            ...fwd.downstream_lots.map((r) => ({
              lot_no: r.downstream_lot_no ?? r.lot_no,
              item_cd: r.item_cd,
              lot_qty: r.lot_qty,
              lot_status: r.lot_status,
              create_type: r.create_type,
              link_type: 'DOWNSTREAM',
            })),
          ];
          setTraceData(combined);
        } else {
          const bwd = body as BackwardTraceResult;
          const combined: TraceRow[] = [
            ...bwd.parent_lots.map((r) => ({ ...r, link_type: 'PARENT_LOT' })),
            ...bwd.upstream_lots.map((r) => ({
              lot_no: r.upstream_lot_no ?? r.lot_no,
              item_cd: r.item_cd,
              lot_qty: r.lot_qty,
              lot_status: r.lot_status,
              create_type: r.create_type,
              link_type: 'UPSTREAM',
            })),
          ];
          setTraceData(combined);
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        message.error(e?.response?.data?.message ?? '추적 조회에 실패했습니다.');
      } finally {
        setTraceLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (traceOpen && traceLotNo) {
      loadTrace(traceLotNo, traceDirection);
    }
  }, [traceOpen, traceLotNo, traceDirection, loadTrace]);

  /* ── Split ─── */
  const openSplit = useCallback((record: LotRow) => {
    setSplitLot(record);
    setSplitChildren([
      { qty: Math.floor(record.lot_qty / 2) },
      { qty: record.lot_qty - Math.floor(record.lot_qty / 2) },
    ]);
    setSplitOpen(true);
  }, []);

  const handleSplitSubmit = useCallback(async () => {
    if (!splitLot) return;
    const parentQty = splitLot.lot_qty;
    const childSum = splitChildren.reduce((s, c) => s + (c.qty || 0), 0);
    if (Math.abs(childSum - parentQty) > 0.001) {
      message.error(`자식 LOT 수량 합계(${childSum})가 부모 수량(${parentQty})과 일치하지 않습니다.`);
      return;
    }
    if (splitChildren.some((c) => !c.qty || c.qty <= 0)) {
      message.error('모든 자식 LOT의 수량은 0보다 커야 합니다.');
      return;
    }
    setSplitLoading(true);
    try {
      await apiClient.post(`/v1/lots/${encodeURIComponent(splitLot.lot_no)}/split`, {
        children: splitChildren,
      });
      message.success('LOT 분할이 완료되었습니다.');
      setSplitOpen(false);
      fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e?.response?.data?.message ?? 'LOT 분할에 실패했습니다.');
    } finally {
      setSplitLoading(false);
    }
  }, [splitLot, splitChildren, fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  /* ── Merge ─── */
  const openMerge = useCallback(() => {
    setMergeSelectedLots([]);
    // Load active lots for selection
    const currentActive = rows.filter((r) => r.lot_status === 'ACTIVE');
    setActiveLots(currentActive);
    setMergeOpen(true);
  }, [rows]);

  const handleMergeSubmit = useCallback(async () => {
    if (mergeSelectedLots.length < 2) {
      message.error('병합할 LOT을 2개 이상 선택하세요.');
      return;
    }
    // Validate same item_cd
    const selectedRows = activeLots.filter((r) => mergeSelectedLots.includes(r.lot_no));
    const items = new Set(selectedRows.map((r) => r.item_cd));
    if (items.size > 1) {
      message.error('동일 품목의 LOT만 병합할 수 있습니다.');
      return;
    }
    setMergeLoading(true);
    try {
      await apiClient.post('/v1/lots/merge', { source_lot_nos: mergeSelectedLots });
      message.success('LOT 병합이 완료되었습니다.');
      setMergeOpen(false);
      fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e?.response?.data?.message ?? 'LOT 병합에 실패했습니다.');
    } finally {
      setMergeLoading(false);
    }
  }, [mergeSelectedLots, activeLots, fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  /* ── Print ─── */
  const openPrint = useCallback((record: LotRow) => {
    setPrintLot(record);
    setPrintOpen(true);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      {
        title: 'LOT번호',
        dataIndex: 'lot_no',
        width: 160,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '품목명',
        dataIndex: ['item', 'item_nm'],
        width: 160,
        ellipsis: true,
        render: (_: unknown, record: LotRow) => record.item?.item_nm ?? record.item_cd,
      },
      {
        title: 'LOT수량',
        dataIndex: 'lot_qty',
        width: 100,
        align: 'right' as const,
        sorter: true,
        render: (val: unknown) => val != null ? Number(val).toLocaleString() : '0',
      },
      {
        title: 'LOT상태',
        dataIndex: 'lot_status',
        width: 100,
        render: (val: string) => (
          <Tag color={STATUS_COLORS[val] ?? 'default'}>{val}</Tag>
        ),
      },
      {
        title: '생성유형',
        dataIndex: 'create_type',
        width: 110,
      },
      {
        title: '부모LOT',
        dataIndex: 'parent_lot_no',
        width: 160,
        ellipsis: true,
        render: (val: unknown) => (val as string) || '-',
      },
      {
        title: '작업지시번호',
        dataIndex: ['work_order', 'wo_no'],
        width: 140,
        ellipsis: true,
        render: (_: unknown, record: LotRow) => record.work_order?.wo_no ?? '-',
      },
      {
        title: '생성일시',
        dataIndex: 'create_dt',
        width: 140,
        sorter: true,
        render: (val: unknown) =>
          val ? dayjs(val as string).format('YYYY-MM-DD HH:mm') : '-',
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 160,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: LotRow) => (
          <Space size={4}>
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              type="text"
              icon={<BranchesOutlined />}
              onClick={() => openTrace(record.lot_no)}
              title="추적"
            >
              {''}
            </PermissionButton>
            {record.lot_status === 'ACTIVE' && (
              <PermissionButton
                action="update"
                menuUrl={MENU_URL}
                fallback="hide"
                size="small"
                type="text"
                icon={<SplitCellsOutlined />}
                onClick={() => openSplit(record)}
                title="분할"
              >
                {''}
              </PermissionButton>
            )}
            <PermissionButton
              action="update"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              type="text"
              icon={<PrinterOutlined />}
              onClick={() => openPrint(record)}
              title="라벨출력"
            >
              {''}
            </PermissionButton>
          </Space>
        ),
      },
    ],
    [openTrace, openSplit, openPrint],
  );

  /* ── Trace columns ─── */
  const traceColumns = useMemo(
    () => [
      { title: 'Depth', dataIndex: 'depth', width: 70, render: (val: unknown) => val ?? '-' },
      { title: 'LOT번호', dataIndex: 'lot_no', width: 160, ellipsis: true },
      { title: '품목코드', dataIndex: 'item_cd', width: 120 },
      { title: '수량', dataIndex: 'lot_qty', width: 80, align: 'right' as const, render: (val: unknown) => val != null ? Number(val).toLocaleString() : '0' },
      { title: '상태', dataIndex: 'lot_status', width: 90, render: (val: string) => <Tag color={STATUS_COLORS[val] ?? 'default'}>{val}</Tag> },
      { title: '유형', dataIndex: 'create_type', width: 100 },
      { title: '연결유형', dataIndex: 'link_type', width: 110 },
    ],
    [],
  );

  /* ── Render ─── */
  return (
    <div>
      {/* Search */}
      <SearchForm
        fields={SEARCH_FIELDS}
        onSearch={handleSearch}
        onReset={handleSearchReset}
        loading={loading}
      />

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#666', fontSize: 13 }}>
          총 <strong>{pagination.total.toLocaleString()}</strong>건
        </span>
        <PermissionButton
          action="create"
          menuUrl={MENU_URL}
          type="primary"
          icon={<MergeCellsOutlined />}
          onClick={openMerge}
        >
          LOT 병합
        </PermissionButton>
      </div>

      {/* Table */}
      <Table<LotRow>
        columns={columns}
        dataSource={rows}
        rowKey="lot_no"
        loading={loading}
        size="small"
        scroll={{ x: 1400 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}건`,
        }}
        onChange={handleTableChange as never}
      />

      {/* ── Trace Modal ─── */}
      <Modal
        open={traceOpen}
        title={`LOT 추적 — ${traceLotNo}`}
        width={900}
        onCancel={() => setTraceOpen(false)}
        footer={<Button onClick={() => setTraceOpen(false)}>닫기</Button>}
      >
        <div style={{ marginBottom: 12 }}>
          <Radio.Group
            value={traceDirection}
            onChange={(e) => setTraceDirection(e.target.value)}
          >
            <Radio.Button value="forward">정방향 (하위 추적)</Radio.Button>
            <Radio.Button value="backward">역방향 (상위 추적)</Radio.Button>
          </Radio.Group>
        </div>
        <Table
          columns={traceColumns}
          dataSource={traceData}
          rowKey={(r, i) => `${r.lot_no}-${i}`}
          loading={traceLoading}
          size="small"
          pagination={false}
          scroll={{ x: 700 }}
        />
      </Modal>

      {/* ── Split Modal ─── */}
      <Modal
        open={splitOpen}
        title="LOT 분할"
        width={560}
        onCancel={() => setSplitOpen(false)}
        onOk={handleSplitSubmit}
        confirmLoading={splitLoading}
        okText="분할 실행"
      >
        {splitLot && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 6 }}>
              <p style={{ margin: 0 }}>
                <strong>부모 LOT:</strong> {splitLot.lot_no}
              </p>
              <p style={{ margin: '4px 0 0' }}>
                <strong>품목:</strong> {splitLot.item?.item_nm ?? splitLot.item_cd} &nbsp;|&nbsp;
                <strong>수량:</strong> {splitLot.lot_qty.toLocaleString()}
              </p>
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>자식 LOT 수량 입력</strong>
              <span style={{ float: 'right', color: '#666', fontSize: 12 }}>
                합계: {splitChildren.reduce((s, c) => s + (c.qty || 0), 0).toLocaleString()} / {splitLot.lot_qty.toLocaleString()}
              </span>
            </div>
            {splitChildren.map((child, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 60 }}>LOT {idx + 1}:</span>
                <InputNumber
                  min={0.001}
                  value={child.qty}
                  onChange={(val) => {
                    const next = [...splitChildren];
                    next[idx] = { qty: val ?? 0 };
                    setSplitChildren(next);
                  }}
                  style={{ flex: 1 }}
                />
                {splitChildren.length > 2 && (
                  <Button
                    type="text"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => {
                      const next = splitChildren.filter((_, i) => i !== idx);
                      setSplitChildren(next);
                    }}
                  />
                )}
              </div>
            ))}
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => setSplitChildren([...splitChildren, { qty: 0 }])}
              style={{ marginTop: 8 }}
            >
              자식 LOT 추가
            </Button>
          </>
        )}
      </Modal>

      {/* ── Merge Modal ─── */}
      <Modal
        open={mergeOpen}
        title="LOT 병합"
        width={600}
        onCancel={() => setMergeOpen(false)}
        onOk={handleMergeSubmit}
        confirmLoading={mergeLoading}
        okText="병합 실행"
      >
        <p style={{ color: '#666', marginBottom: 12 }}>
          동일 품목의 ACTIVE LOT을 2개 이상 선택하세요.
        </p>
        {activeLots.length === 0 ? (
          <p style={{ color: '#999' }}>현재 목록에 ACTIVE LOT이 없습니다. 먼저 ACTIVE 상태 LOT을 검색하세요.</p>
        ) : (
          <Checkbox.Group
            value={mergeSelectedLots}
            onChange={(vals) => setMergeSelectedLots(vals as string[])}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {activeLots.map((lot) => (
              <Checkbox key={lot.lot_no} value={lot.lot_no}>
                {lot.lot_no} — {lot.item?.item_nm ?? lot.item_cd} ({lot.lot_qty.toLocaleString()})
              </Checkbox>
            ))}
          </Checkbox.Group>
        )}
      </Modal>

      {/* ── Print Modal ─── */}
      <Modal
        open={printOpen}
        title="LOT 라벨 출력"
        width={400}
        onCancel={() => setPrintOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setPrintOpen(false)}>닫기</Button>
            <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
              인쇄
            </Button>
          </Space>
        }
      >
        {printLot && (
          <div
            id="lot-label-print"
            style={{
              border: '2px solid #000',
              padding: 24,
              textAlign: 'center',
              fontFamily: 'monospace',
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>LOT 라벨</h2>
            <p style={{ margin: '4px 0', fontSize: 16, fontWeight: 'bold' }}>
              {printLot.lot_no}
            </p>
            <p style={{ margin: '4px 0' }}>
              {printLot.item?.item_nm ?? printLot.item_cd}
            </p>
            <p style={{ margin: '4px 0', fontSize: 18 }}>
              수량: {printLot.lot_qty.toLocaleString()}
            </p>
            <p style={{ margin: '4px 0', fontSize: 12, color: '#666' }}>
              생성일: {dayjs(printLot.create_dt).format('YYYY-MM-DD HH:mm')}
            </p>
          </div>
        )}
      </Modal>

      {/* Print CSS (only for label print area) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #lot-label-print,
          #lot-label-print * {
            visibility: visible !important;
          }
          #lot-label-print {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
}
