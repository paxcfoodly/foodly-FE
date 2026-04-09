'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Space,
  Tag,
  Select,
  Table,
  Modal,
  message,
  Popconfirm,
  Progress,
  Card,
  Tooltip,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import PermissionButton from '@/components/auth/PermissionButton';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

/* ── Types ─────────────────────────────────────────── */

interface WorkOrderRow {
  wo_id: number;
  wo_no: string;
  plan_id: number | null;
  item_cd: string;
  order_qty: number | null;
  good_qty: number | null;
  defect_qty: number | null;
  priority: number;
  status: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  item?: { item_nm: string } | null;
  prod_plan?: { plan_no: string } | null;
  [key: string]: unknown;
}

interface AssignmentRow {
  wo_id: number;
  worker_id: string;
  worker_nm: string | null;
  dept_cd: string | null;
  workshop_cd: string | null;
  assign_dt: string;
}

interface WorkerOption {
  worker_id: string;
  worker_nm: string;
}

interface WorkerAvailability {
  worker_id: string;
  worker_nm: string;
  skills: { process_cd: string; skill_level: number }[];
  conflicting_wos: { wo_id: number; wo_no: string }[];
}

const MENU_URL = '/work-order/assignment';

/* ── Status config ─── */

const STATUS_OPTIONS = [
  { label: '대기', value: 'WAIT' },
  { label: '진행', value: 'PROGRESS' },
  { label: '완료', value: 'COMPLETE' },
  { label: '마감', value: 'CLOSE' },
  { label: '취소', value: 'CANCEL' },
];

const STATUS_LABEL: Record<string, string> = {
  WAIT: '대기', PROGRESS: '진행', COMPLETE: '완료', CLOSE: '마감', CANCEL: '취소',
};

const STATUS_COLOR: Record<string, string> = {
  WAIT: 'blue', PROGRESS: 'orange', COMPLETE: 'cyan', CLOSE: 'green', CANCEL: 'red',
};

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'wo_no', label: '작업지시번호', type: 'text', placeholder: '작업지시번호 입력' },
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'status', label: '상태', type: 'select', options: [{ label: '전체', value: '' }, ...STATUS_OPTIONS] },
];

const TAG_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#13c2c2', '#722ed1', '#eb2f96', '#faad14', '#2f54eb', '#a0d911', '#f5222d'];

/* ── Component ─────────────────────────────────────── */

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

  // AbortController ref for cancelling in-flight assignment fetches
  const assignAbortRef = useRef<AbortController | null>(null);

  // Gantt data: all assignments across visible WOs
  const [allAssignments, setAllAssignments] = useState<
    { wo_id: number; wo_no: string; worker_id: string; worker_nm: string; assign_dt: string; status: string; item_nm: string }[]
  >([]);

  /* ── Load worker options (base list) ─── */
  useEffect(() => {
    apiClient
      .get<PaginatedResponse<WorkerOption>>('/v1/workers', { params: { limit: 500, 'filter[use_yn]': 'Y' } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setWorkerOptions(list.map((w) => ({ label: `${w.worker_id} - ${w.worker_nm}`, value: w.worker_id })));
      })
      .catch(() => {
        message.error('작업자 목록을 불러오지 못했습니다. 페이지를 새로고침하세요.');
      });
  }, []);

  /* ── Fetch worker availability when modal opens ─── */
  const fetchWorkerAvailability = useCallback(async (woId: number) => {
    setAvailabilityLoading(true);
    try {
      const res = await apiClient.get<WorkerAvailability[]>(`/v1/work-orders/${woId}/workers/availability`);
      setWorkerAvailability(res.data ?? []);
    } catch {
      // Non-blocking — availability info is informational only
      setWorkerAvailability([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  /* ── Fetch WO list ─── */
  const fetchOrders = useCallback(
    async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page, limit: pageSize };
        const af = sf ?? filters;
        if (sort) params.sortBy = sort;
        if (order) params.sortOrder = order;
        Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });

        const res = await apiClient.get<PaginatedResponse<WorkOrderRow>>('/v1/work-orders', { params });
        const body = res.data;
        setOrders(body.data ?? []);
        if (body.pagination) setPagination({ page: body.pagination.page, pageSize: body.pagination.pageSize, total: body.pagination.total });
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        message.error(e?.response?.data?.message ?? '작업지시 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => { fetchOrders(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /* ── Fetch assignments for selected WO ─── */
  const fetchAssignments = useCallback(async (woId: number) => {
    setAssignLoading(true);
    try {
      const res = await apiClient.get(`/v1/work-orders/${woId}/workers`);
      setAssignments(res.data?.data ?? []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e?.response?.data?.message ?? '배정 정보 조회에 실패했습니다.');
    } finally {
      setAssignLoading(false);
    }
  }, []);

  /* ── Fetch all assignments for gantt ─── */
  const fetchAllAssignments = useCallback(async (woList: WorkOrderRow[]) => {
    // Cancel any previous in-flight batch
    if (assignAbortRef.current) {
      assignAbortRef.current.abort();
    }
    const controller = new AbortController();
    assignAbortRef.current = controller;

    try {
      const results = await Promise.all(
        woList.slice(0, 50).map(async (wo) => {
          try {
            const res = await apiClient.get(`/v1/work-orders/${wo.wo_id}/workers`, {
              signal: controller.signal,
            });
            const workers: AssignmentRow[] = res.data?.data ?? [];
            return workers.map((w) => ({
              wo_id: wo.wo_id, wo_no: wo.wo_no, worker_id: w.worker_id,
              worker_nm: w.worker_nm ?? w.worker_id, assign_dt: w.assign_dt,
              status: wo.status, item_nm: wo.item?.item_nm ?? wo.item_cd,
            }));
          } catch { return []; }
        }),
      );
      if (!controller.signal.aborted) {
        setAllAssignments(results.flat());
      }
    } catch { /* ignore aborted / network errors */ }
  }, []);

  useEffect(() => { if (orders.length > 0) fetchAllAssignments(orders); }, [orders, fetchAllAssignments]);

  /* ── Handlers ─── */
  const handleSearch = useCallback((values: Record<string, unknown>) => {
    setFilters(values);
    setPagination((p) => ({ ...p, page: 1 }));
    fetchOrders(1, pagination.pageSize, sortField, sortOrder, values);
  }, [fetchOrders, pagination.pageSize, sortField, sortOrder]);

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((p) => ({ ...p, page: 1 }));
    fetchOrders(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchOrders, pagination.pageSize, sortField, sortOrder]);

  const handleTableChange = useCallback(
    (pg: TablePaginationConfig, _f: Record<string, unknown>, sorter: SorterResult<WorkOrderRow> | SorterResult<WorkOrderRow>[]) => {
      const np = pg.current ?? 1;
      const ns = pg.pageSize ?? 20;
      let sf: string | undefined;
      let so: 'asc' | 'desc' | undefined;
      if (!Array.isArray(sorter) && sorter.field && sorter.order) { sf = sorter.field as string; so = sorter.order === 'ascend' ? 'asc' : 'desc'; }
      setSortField(sf); setSortOrder(so);
      setPagination((p) => ({ ...p, page: np, pageSize: ns }));
      fetchOrders(np, ns, sf, so, filters);
    },
    [fetchOrders, filters],
  );

  const handleSelectWo = useCallback((record: WorkOrderRow) => { setSelectedWo(record); fetchAssignments(record.wo_id); }, [fetchAssignments]);

  const handleAssignOpen = useCallback(() => {
    if (!selectedWo) { message.warning('먼저 작업지시를 선택하세요.'); return; }
    setSelectedWorkerIds([]);
    setWorkerAvailability([]);
    setAssignModalOpen(true);
    fetchWorkerAvailability(selectedWo.wo_id);
  }, [selectedWo, fetchWorkerAvailability]);

  const handleAssignSubmit = useCallback(async () => {
    if (!selectedWo || selectedWorkerIds.length === 0) { message.warning('배정할 작업자를 선택하세요.'); return; }
    setAssignSubmitting(true);
    try {
      await apiClient.post(`/v1/work-orders/${selectedWo.wo_id}/workers`, { worker_ids: selectedWorkerIds });
      message.success('작업자가 배정되었습니다.');
      setAssignModalOpen(false);
      fetchAssignments(selectedWo.wo_id);
      fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e?.response?.data?.message ?? '작업자 배정에 실패했습니다.');
    } finally {
      setAssignSubmitting(false);
    }
  }, [selectedWo, selectedWorkerIds, fetchAssignments, fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  const handleUnassign = useCallback(async (workerId: string) => {
    if (!selectedWo) return;
    try {
      await apiClient.delete(`/v1/work-orders/${selectedWo.wo_id}/workers/${workerId}`);
      message.success('배정이 취소되었습니다.');
      fetchAssignments(selectedWo.wo_id);
      fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e?.response?.data?.message ?? '배정 취소에 실패했습니다. 다시 시도하세요.');
    }
  }, [selectedWo, fetchAssignments, fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  /* ── Build enriched Select options with skill/conflict tags ─── */
  const enrichedWorkerOptions = useMemo(() => {
    // Build availability map
    const availMap = new Map<string, WorkerAvailability>();
    workerAvailability.forEach((w) => availMap.set(w.worker_id, w));

    return workerOptions
      .filter((w) => !assignments.some((a) => a.worker_id === w.value))
      .map((w) => {
        const avail = availMap.get(w.value);
        return { ...w, avail };
      });
  }, [workerOptions, assignments, workerAvailability]);

  /* ── Columns ─── */
  const woColumns = useMemo(() => [
    { title: '작업지시번호', dataIndex: 'wo_no', width: 150, sorter: true, ellipsis: true },
    { title: '품목명', dataIndex: ['item', 'item_nm'], width: 150, ellipsis: true, render: (_: unknown, r: WorkOrderRow) => r.item?.item_nm ?? r.item_cd },
    { title: '지시수량', dataIndex: 'order_qty', width: 90, align: 'right' as const, render: (v: unknown) => v != null ? Number(v).toLocaleString() : '-' },
    {
      title: '진행률', dataIndex: '_progress', width: 110,
      render: (_: unknown, r: WorkOrderRow) => { const o = Number(r.order_qty ?? 0); const g = Number(r.good_qty ?? 0); return <Progress percent={o > 0 ? Math.round((g / o) * 100) : 0} size="small" />; },
    },
    { title: '상태', dataIndex: 'status', width: 80, align: 'center' as const, render: (v: unknown) => { const s = v as string; return <Tag color={STATUS_COLOR[s] ?? 'default'}>{STATUS_LABEL[s] ?? s}</Tag>; } },
    {
      title: '배정', dataIndex: '_assign', width: 60, align: 'center' as const,
      render: (_: unknown, r: WorkOrderRow) => <Button size="small" type="link" icon={<TeamOutlined />} onClick={() => handleSelectWo(r)} />,
    },
  ], [handleSelectWo]);

  const assignColumns = useMemo(() => [
    { title: '작업자 ID', dataIndex: 'worker_id', width: 120 },
    { title: '작업자명', dataIndex: 'worker_nm', width: 120, render: (v: unknown) => (v as string) ?? '-' },
    { title: '부서', dataIndex: 'dept_cd', width: 100, render: (v: unknown) => (v as string) ?? '-' },
    { title: '배정일시', dataIndex: 'assign_dt', width: 150, render: (v: unknown) => v ? dayjs(v as string).format('YYYY-MM-DD HH:mm') : '-' },
    {
      title: '해제', dataIndex: '_action', width: 70, align: 'center' as const,
      render: (_: unknown, r: AssignmentRow) => (
        <Popconfirm
          title="이 작업자의 배정을 취소하시겠습니까?"
          onConfirm={() => handleUnassign(r.worker_id)}
          okText="배정 취소"
          okType="danger"
          cancelText="돌아가기"
        >
          <PermissionButton
            action="delete"
            menuUrl={MENU_URL}
            fallback="hide"
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="배정 취소"
          >
            {''}
          </PermissionButton>
        </Popconfirm>
      ),
    },
  ], [handleUnassign]);

  /* ── Gantt: group by worker ─── */
  const ganttData = useMemo(() => {
    const map = new Map<string, { worker_nm: string; items: typeof allAssignments }>();
    allAssignments.forEach((a) => {
      if (!map.has(a.worker_id)) map.set(a.worker_id, { worker_nm: a.worker_nm, items: [] });
      map.get(a.worker_id)!.items.push(a);
    });
    return Array.from(map.entries()).map(([id, d]) => ({ worker_id: id, worker_nm: d.worker_nm, items: d.items }));
  }, [allAssignments]);

  /* ── Render ─── */
  return (
    <div>
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />

      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        {/* WO List */}
        <div style={{ flex: 2 }}>
          <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
            총 <strong>{pagination.total.toLocaleString()}</strong>건 — 작업지시를 선택하여 배정 현황을 확인하세요.
          </div>
          <Table<WorkOrderRow>
            columns={woColumns} dataSource={orders} rowKey="wo_id" loading={loading} size="small" scroll={{ x: 700 }}
            onRow={(record) => ({
              onClick: () => handleSelectWo(record),
              style: { cursor: 'pointer', background: selectedWo?.wo_id === record.wo_id ? '#e6f4ff' : undefined },
            })}
            pagination={{
              current: pagination.page, pageSize: pagination.pageSize, total: pagination.total,
              showSizeChanger: true, pageSizeOptions: ['10', '20', '50'], size: 'small',
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}건`,
            }}
            onChange={handleTableChange as any}
          />
        </div>

        {/* Assignment Detail */}
        <div style={{ flex: 1, minWidth: 360 }}>
          <Card
            title={selectedWo ? <Space><TeamOutlined /><span>{selectedWo.wo_no} 배정 현황</span></Space> : '작업자 배정'}
            extra={selectedWo && (
              <PermissionButton action="create" menuUrl={MENU_URL} fallback="hide" size="small" type="primary" icon={<PlusOutlined />} onClick={handleAssignOpen}>배정</PermissionButton>
            )}
            size="small"
          >
            {selectedWo ? (
              assignments.length === 0 && !assignLoading ? (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>배정된 작업자가 없습니다</div>
                  <div style={{ color: '#888', fontSize: 13 }}>작업자 배정 버튼을 눌러 이 작업지시에 작업자를 배정하세요.</div>
                </div>
              ) : (
                <Table<AssignmentRow>
                  columns={assignColumns} dataSource={assignments} rowKey="worker_id" loading={assignLoading}
                  size="small" pagination={false} scroll={{ x: 500 }}
                />
              )
            ) : (
              <Empty description="좌측 목록에서 작업지시를 선택하세요." />
            )}
          </Card>
        </div>
      </div>

      {/* Gantt-style Assignment Timeline */}
      <Card title="작업자별 배정 현황" size="small" style={{ marginTop: 16 }}>
        {ganttData.length === 0 ? (
          <Empty description="배정 데이터가 없습니다." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {ganttData.map((worker) => (
              <div key={worker.worker_id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ width: 140, minWidth: 140, fontSize: 12, fontWeight: 500, paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <UserOutlined style={{ marginRight: 4 }} />{worker.worker_nm}
                </div>
                <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {worker.items.map((item, i) => (
                    <Tooltip key={`${item.wo_id}-${i}`} title={<div style={{ fontSize: 12 }}><div><strong>{item.wo_no}</strong></div><div>품목: {item.item_nm}</div><div>상태: {STATUS_LABEL[item.status] ?? item.status}</div><div>배정일: {dayjs(item.assign_dt).format('YYYY-MM-DD HH:mm')}</div></div>}>
                      <Tag color={TAG_COLORS[item.wo_id % TAG_COLORS.length]} style={{ cursor: 'pointer', margin: '2px 0' }}>{item.wo_no}</Tag>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Assign Workers Modal */}
      <Modal
        title={`작업자 배정 — ${selectedWo?.wo_no ?? ''}`} open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)} onOk={handleAssignSubmit}
        confirmLoading={assignSubmitting} okText="배정" cancelText="취소" destroyOnClose width={520}
      >
        <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>배정할 작업자를 선택하세요. (복수 선택 가능)</div>
        <Select
          mode="multiple"
          placeholder="작업자 검색"
          style={{ width: '100%' }}
          value={selectedWorkerIds}
          onChange={setSelectedWorkerIds}
          showSearch
          optionFilterProp="label"
          maxTagCount={5}
          loading={availabilityLoading}
          optionRender={(option) => {
            const avail = enrichedWorkerOptions.find((w) => w.value === option.value)?.avail;
            const hasSkill = avail && avail.skills.length > 0;
            const hasConflict = avail && avail.conflicting_wos.length > 0;

            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>{option.label as string}</span>
                {avail && hasSkill && (
                  <Tag color="green">Lv.{avail.skills[0].skill_level}</Tag>
                )}
                {avail && !hasSkill && (
                  <Tooltip title="이 작업자는 해당 공정의 스킬이 없습니다. 배정은 가능하나 확인이 필요합니다.">
                    <Tag color="orange"><WarningOutlined /> 스킬미보유</Tag>
                  </Tooltip>
                )}
                {hasConflict && avail && avail.conflicting_wos.map((cwo) => (
                  <Tooltip
                    key={cwo.wo_id}
                    title={`이 작업자는 ${cwo.wo_no}에 이미 배정되어 있습니다. 배정은 가능하나 확인이 필요합니다.`}
                  >
                    <Tag color="red">배정중: {cwo.wo_no}</Tag>
                  </Tooltip>
                ))}
              </div>
            );
          }}
          options={enrichedWorkerOptions.map((w) => ({ label: w.label, value: w.value }))}
        />
      </Modal>
    </div>
  );
}
