'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tag, Table, message, Progress, Card, Statistic, Row, Col } from 'antd';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';

/* ── Types ─────────────────────────────────────────── */

interface ProdPlanRow {
  plan_id: number;
  plan_no: string;
  plant_cd: string;
  item_cd: string;
  plan_qty: number | null;
  due_date: string;
  priority: number;
  status: string;
  create_dt: string;
  item?: { item_nm: string } | null;
  plant?: { plant_nm: string } | null;
  [key: string]: unknown;
}

interface WorkOrderRow {
  wo_id: number;
  wo_no: string;
  plan_id: number | null;
  item_cd: string;
  order_qty: number | null;
  good_qty: number | null;
  defect_qty: number | null;
  status: string;
}

interface DemandRow extends ProdPlanRow {
  wo_count: number;
  total_order_qty: number;
  total_good_qty: number;
  total_defect_qty: number;
  progress_pct: number;
}

/* ── Status config ─── */

const PLAN_STATUS_OPTIONS = [
  { label: '계획', value: 'PLAN' },
  { label: '확정', value: 'CONFIRMED' },
  { label: '진행', value: 'PROGRESS' },
  { label: '완료', value: 'COMPLETE' },
  { label: '취소', value: 'CANCEL' },
];

const PLAN_STATUS_LABEL: Record<string, string> = {
  PLAN: '계획', CONFIRMED: '확정', PROGRESS: '진행', COMPLETE: '완료', CANCEL: '취소',
};

const PLAN_STATUS_COLOR: Record<string, string> = {
  PLAN: 'blue', CONFIRMED: 'green', PROGRESS: 'orange', COMPLETE: 'cyan', CANCEL: 'red',
};

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'plan_no', label: '계획번호', type: 'text', placeholder: '계획번호 입력' },
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'status', label: '상태', type: 'select', options: [{ label: '전체', value: '' }, ...PLAN_STATUS_OPTIONS] },
];

/* ── Component ─────────────────────────────────────── */

export default function DemandDashboardPage() {
  const [demandRows, setDemandRows] = useState<DemandRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  /* ── Fetch data: plans + all WOs, then aggregate ─── */
  const fetchData = useCallback(
    async (page = pagination.page, pageSize = pagination.pageSize, sort?: string, order?: 'asc' | 'desc', sf?: Record<string, unknown>) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page, limit: pageSize };
        const af = sf ?? filters;
        if (sort) params.sortBy = sort;
        if (order) params.sortOrder = order;
        Object.entries(af).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params[k] = v; });

        // Fetch plans and all work orders in parallel
        const [planRes, woRes] = await Promise.all([
          apiClient.get<PaginatedResponse<ProdPlanRow>>('/v1/prod-plans', { params }),
          apiClient.get<PaginatedResponse<WorkOrderRow>>('/v1/work-orders', { params: { limit: 9999 } }),
        ]);

        const plans = planRes.data?.data ?? [];
        const allWos = woRes.data?.data ?? [];

        // Group WOs by plan_id
        const woByPlan = new Map<number, WorkOrderRow[]>();
        allWos.forEach((wo) => {
          if (wo.plan_id != null) {
            if (!woByPlan.has(wo.plan_id)) woByPlan.set(wo.plan_id, []);
            woByPlan.get(wo.plan_id)!.push(wo);
          }
        });

        // Build demand rows
        const rows: DemandRow[] = plans.map((plan) => {
          const wos = woByPlan.get(plan.plan_id) ?? [];
          const totalOrderQty = wos.reduce((sum, wo) => sum + Number(wo.order_qty ?? 0), 0);
          const totalGoodQty = wos.reduce((sum, wo) => sum + Number(wo.good_qty ?? 0), 0);
          const totalDefectQty = wos.reduce((sum, wo) => sum + Number(wo.defect_qty ?? 0), 0);
          const planQty = Number(plan.plan_qty ?? 0);
          const progressPct = planQty > 0 ? Math.round((totalGoodQty / planQty) * 100) : 0;

          return {
            ...plan,
            wo_count: wos.length,
            total_order_qty: totalOrderQty,
            total_good_qty: totalGoodQty,
            total_defect_qty: totalDefectQty,
            progress_pct: Math.min(progressPct, 100),
          };
        });

        setDemandRows(rows);
        if (planRes.data?.pagination) {
          setPagination({
            page: planRes.data.pagination.page,
            pageSize: planRes.data.pagination.pageSize,
            total: planRes.data.pagination.total,
          });
        }
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '수요 현황 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => { fetchData(1, pagination.pageSize, sortField, sortOrder, filters); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  /* ── Handlers ─── */
  const handleSearch = useCallback((values: Record<string, unknown>) => {
    setFilters(values);
    setPagination((p) => ({ ...p, page: 1 }));
    fetchData(1, pagination.pageSize, sortField, sortOrder, values);
  }, [fetchData, pagination.pageSize, sortField, sortOrder]);

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((p) => ({ ...p, page: 1 }));
    fetchData(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchData, pagination.pageSize, sortField, sortOrder]);

  const handleTableChange = useCallback(
    (pg: TablePaginationConfig, _f: Record<string, unknown>, sorter: SorterResult<DemandRow> | SorterResult<DemandRow>[]) => {
      const np = pg.current ?? 1;
      const ns = pg.pageSize ?? 20;
      let sf: string | undefined;
      let so: 'asc' | 'desc' | undefined;
      if (!Array.isArray(sorter) && sorter.field && sorter.order) { sf = sorter.field as string; so = sorter.order === 'ascend' ? 'asc' : 'desc'; }
      setSortField(sf); setSortOrder(so);
      setPagination((p) => ({ ...p, page: np, pageSize: ns }));
      fetchData(np, ns, sf, so, filters);
    },
    [fetchData, filters],
  );

  /* ── Summary stats ─── */
  const summary = useMemo(() => {
    const totalPlans = demandRows.length;
    const totalWos = demandRows.reduce((s, r) => s + r.wo_count, 0);
    const totalGood = demandRows.reduce((s, r) => s + r.total_good_qty, 0);
    const totalPlanQty = demandRows.reduce((s, r) => s + Number(r.plan_qty ?? 0), 0);
    const avgProgress = totalPlanQty > 0 ? Math.round((totalGood / totalPlanQty) * 100) : 0;
    return { totalPlans, totalWos, totalGood, avgProgress };
  }, [demandRows]);

  /* ── Columns ─── */
  const columns = useMemo(() => [
    { title: '계획번호', dataIndex: 'plan_no', width: 150, sorter: true, ellipsis: true },
    { title: '품목명', width: 150, ellipsis: true, render: (_: unknown, r: DemandRow) => r.item?.item_nm ?? r.item_cd },
    { title: '계획수량', dataIndex: 'plan_qty', width: 100, align: 'right' as const, sorter: true, render: (v: unknown) => v != null ? Number(v).toLocaleString() : '-' },
    { title: 'WO건수', dataIndex: 'wo_count', width: 80, align: 'right' as const },
    { title: '지시수량합', dataIndex: 'total_order_qty', width: 100, align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { title: '양품수량합', dataIndex: 'total_good_qty', width: 100, align: 'right' as const, render: (v: number) => v.toLocaleString() },
    {
      title: '불량수량합', dataIndex: 'total_defect_qty', width: 100, align: 'right' as const,
      render: (v: number) => <span style={{ color: v > 0 ? '#ff4d4f' : undefined }}>{v.toLocaleString()}</span>,
    },
    {
      title: '진행률', dataIndex: 'progress_pct', width: 130,
      render: (v: number) => <Progress percent={v} size="small" status={v >= 100 ? 'success' : 'active'} />,
    },
    {
      title: '상태', dataIndex: 'status', width: 80, align: 'center' as const, sorter: true,
      render: (v: unknown) => { const s = v as string; return <Tag color={PLAN_STATUS_COLOR[s] ?? 'default'}>{PLAN_STATUS_LABEL[s] ?? s}</Tag>; },
    },
    { title: '납기일', dataIndex: 'due_date', width: 110, sorter: true, render: (v: unknown) => (v as string)?.slice(0, 10) ?? '-' },
  ], []);

  /* ── Render ─── */
  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="생산계획 수" value={summary.totalPlans} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="작업지시 수" value={summary.totalWos} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="총 양품수량" value={summary.totalGood} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="평균 진행률" value={summary.avgProgress} suffix="%" prefix={<BarChartOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Search */}
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />

      {/* Table */}
      <div style={{ marginBottom: 8, marginTop: 8, color: '#666', fontSize: 13 }}>
        총 <strong>{pagination.total.toLocaleString()}</strong>건
      </div>
      <Table<DemandRow>
        columns={columns} dataSource={demandRows} rowKey="plan_id" loading={loading} size="small" scroll={{ x: 1200 }}
        pagination={{
          current: pagination.page, pageSize: pagination.pageSize, total: pagination.total,
          showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}건`,
        }}
        onChange={handleTableChange as any}
      />
    </div>
  );
}
