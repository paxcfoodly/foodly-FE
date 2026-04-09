'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import dayjs, { type Dayjs } from 'dayjs';
import PermissionButton from '@/components/auth/PermissionButton';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';

/* ── Types ─────────────────────────────────────────── */

interface DemandRow {
  demand_id: number;
  demand_no: string;
  item_cd: string;
  cust_cd: string | null;
  demand_qty: number;
  due_date: string | null;
  status: 'OPEN' | 'PLANNED' | 'CLOSED';
  remark: string | null;
  create_dt: string;
  item?: { item_nm: string } | null;
  customer?: { cust_nm: string } | null;
  [key: string]: unknown;
}

interface ItemOption {
  item_cd: string;
  item_nm: string;
}

interface CustomerOption {
  cust_cd: string;
  cust_nm: string;
}

interface WorkshopOption {
  plant_cd: string;
  plant_nm: string;
}

const MENU_URL = '/plan/demand';

/* ── Status config ─── */

const DEMAND_STATUS_OPTIONS = [
  { label: '전체', value: '' },
  { label: '수주', value: 'OPEN' },
  { label: '계획중', value: 'PLANNED' },
  { label: '완료', value: 'CLOSED' },
];

const DEMAND_STATUS_COLOR: Record<string, string> = {
  OPEN: 'default',
  PLANNED: 'blue',
  CLOSED: 'green',
};

const DEMAND_STATUS_LABEL: Record<string, string> = {
  OPEN: '수주',
  PLANNED: '계획중',
  CLOSED: '완료',
};

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'demand_no', label: '수요번호', type: 'text', placeholder: '수요번호 입력' },
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'status', label: '상태', type: 'select', options: DEMAND_STATUS_OPTIONS },
];

/* ── Component ─────────────────────────────────────── */

export default function DemandPage() {
  const [demands, setDemands] = useState<DemandRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Create/Edit demand modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<DemandRow | null>(null);
  const [createForm] = Form.useForm();
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Create plan draft modal
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftDemand, setDraftDemand] = useState<DemandRow | null>(null);
  const [draftForm] = Form.useForm();
  const [draftSubmitting, setDraftSubmitting] = useState(false);

  // Options
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);
  const [workshopOptions, setWorkshopOptions] = useState<{ label: string; value: string }[]>([]);

  /* ── Load select options ─── */
  useEffect(() => {
    apiClient
      .get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 500 } })
      .then((res) => {
        setItemOptions(
          (res.data?.data ?? []).map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd })),
        );
      })
      .catch(() => {});

    apiClient
      .get<PaginatedResponse<CustomerOption>>('/v1/customers', { params: { limit: 500 } })
      .then((res) => {
        setCustomerOptions(
          (res.data?.data ?? []).map((c) => ({ label: `${c.cust_cd} - ${c.cust_nm}`, value: c.cust_cd })),
        );
      })
      .catch(() => {});

    apiClient
      .get<PaginatedResponse<WorkshopOption>>('/v1/workshops', { params: { limit: 200 } })
      .then((res) => {
        setWorkshopOptions(
          (res.data?.data ?? []).map((w) => ({ label: `${w.plant_cd} - ${w.plant_nm}`, value: w.plant_cd })),
        );
      })
      .catch(() => {});
  }, []);

  /* ── Fetch data ─── */
  const fetchData = useCallback(
    async (
      page = pagination.page,
      pageSize = pagination.pageSize,
      sort?: string,
      order?: 'asc' | 'desc',
      sf?: Record<string, unknown>,
    ) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page, limit: pageSize };
        const af = sf ?? filters;
        if (sort) params.sortBy = sort;
        if (order) params.sortOrder = order;
        Object.entries(af).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') params[k] = v;
        });

        const res = await apiClient.get<PaginatedResponse<DemandRow>>('/v1/demands', { params });
        const body = res.data;
        setDemands(body.data ?? []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            pageSize: body.pagination.pageSize,
            total: body.pagination.total,
          });
        }
      } catch {
        message.error('수주 데이터를 불러오지 못했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => {
    fetchData(1, pagination.pageSize, sortField, sortOrder, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Summary stats (client-side aggregation from current page) ─── */
  const summary = useMemo(() => {
    const total = pagination.total;
    const closed = demands.filter((d) => d.status === 'CLOSED').length;
    const planned = demands.filter((d) => d.status === 'PLANNED').length;
    const open = demands.filter((d) => d.status === 'OPEN').length;
    return { total, closed, planned, open };
  }, [demands, pagination.total]);

  /* ── Handlers ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((p) => ({ ...p, page: 1 }));
      fetchData(1, pagination.pageSize, sortField, sortOrder, values);
    },
    [fetchData, pagination.pageSize, sortField, sortOrder],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((p) => ({ ...p, page: 1 }));
    fetchData(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchData, pagination.pageSize, sortField, sortOrder]);

  const handleTableChange = useCallback(
    (
      pg: TablePaginationConfig,
      _f: Record<string, unknown>,
      sorter: SorterResult<DemandRow> | SorterResult<DemandRow>[],
    ) => {
      const np = pg.current ?? 1;
      const ns = pg.pageSize ?? 20;
      let sf: string | undefined;
      let so: 'asc' | 'desc' | undefined;
      if (!Array.isArray(sorter) && sorter.field && sorter.order) {
        sf = sorter.field as string;
        so = sorter.order === 'ascend' ? 'asc' : 'desc';
      }
      setSortField(sf);
      setSortOrder(so);
      setPagination((p) => ({ ...p, page: np, pageSize: ns }));
      fetchData(np, ns, sf, so, filters);
    },
    [fetchData, filters],
  );

  /* ── Create/Edit Demand ─── */
  const handleOpenCreate = useCallback(() => {
    setEditingDemand(null);
    createForm.resetFields();
    setCreateModalOpen(true);
  }, [createForm]);

  const handleOpenEdit = useCallback(
    (record: DemandRow) => {
      setEditingDemand(record);
      createForm.setFieldsValue({
        item_cd: record.item_cd,
        demand_qty: record.demand_qty,
        due_date: record.due_date ? dayjs(record.due_date) : null,
        cust_cd: record.cust_cd ?? undefined,
        remark: record.remark ?? undefined,
      });
      setCreateModalOpen(true);
    },
    [createForm],
  );

  const handleCreateSubmit = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      setCreateSubmitting(true);
      const payload = {
        item_cd: values.item_cd,
        demand_qty: values.demand_qty,
        due_date: values.due_date ? (values.due_date as Dayjs).format('YYYY-MM-DD') : undefined,
        cust_cd: values.cust_cd ?? undefined,
        remark: values.remark ?? undefined,
      };
      if (editingDemand) {
        await apiClient.put(`/v1/demands/${editingDemand.demand_id}`, payload);
        message.success('수주가 수정되었습니다.');
      } else {
        await apiClient.post('/v1/demands', payload);
        message.success('수주가 등록되었습니다.');
      }
      setCreateModalOpen(false);
      fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; errorFields?: unknown[] };
      if (e?.errorFields) return; // Form validation error
      message.error(e?.response?.data?.message ?? '수주 저장에 실패했습니다.');
    } finally {
      setCreateSubmitting(false);
    }
  }, [createForm, editingDemand, fetchData, filters, pagination.page, pagination.pageSize, sortField, sortOrder]);

  const handleDelete = useCallback(
    async (demandId: number) => {
      try {
        await apiClient.delete(`/v1/demands/${demandId}`);
        message.success('수주가 삭제되었습니다.');
        fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        message.error(e?.response?.data?.message ?? '수주 삭제에 실패했습니다.');
      }
    },
    [fetchData, filters, pagination.page, pagination.pageSize, sortField, sortOrder],
  );

  /* ── Create Plan Draft ─── */
  const handleOpenDraft = useCallback(
    (record: DemandRow) => {
      setDraftDemand(record);
      draftForm.setFieldsValue({
        plan_qty: record.demand_qty,
        due_date: record.due_date ? dayjs(record.due_date) : null,
        plant_cd: undefined,
      });
      setDraftModalOpen(true);
    },
    [draftForm],
  );

  const handleDraftSubmit = useCallback(async () => {
    if (!draftDemand) return;
    try {
      const values = await draftForm.validateFields();
      setDraftSubmitting(true);
      const payload = {
        plant_cd: values.plant_cd,
        plan_qty: values.plan_qty,
        due_date: values.due_date ? (values.due_date as Dayjs).format('YYYY-MM-DD') : undefined,
      };
      await apiClient.post(`/v1/demands/${draftDemand.demand_id}/create-plan`, payload);
      message.success('생산계획 초안이 생성되었습니다. 계획 화면에서 내용을 확인하고 수정하세요.');
      setDraftModalOpen(false);
      fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } }; errorFields?: unknown[] };
      if (e?.errorFields) return; // Form validation error
      if (e?.response?.status === 409) {
        message.warning('이미 생성된 생산계획이 있습니다.');
      } else {
        message.error('초안 생성에 실패했습니다. 다시 시도하세요.');
      }
    } finally {
      setDraftSubmitting(false);
    }
  }, [draftDemand, draftForm, fetchData, filters, pagination.page, pagination.pageSize, sortField, sortOrder]);

  /* ── Columns ─── */
  const columns = useMemo(
    () => [
      {
        title: '수요번호',
        dataIndex: 'demand_no',
        width: 150,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '거래처명',
        width: 140,
        ellipsis: true,
        render: (_: unknown, r: DemandRow) => r.customer?.cust_nm ?? r.cust_cd ?? '-',
      },
      {
        title: '품목명',
        width: 150,
        ellipsis: true,
        render: (_: unknown, r: DemandRow) => r.item?.item_nm ?? r.item_cd,
      },
      {
        title: '수량',
        dataIndex: 'demand_qty',
        width: 90,
        align: 'right' as const,
        sorter: true,
        render: (v: unknown) => (v != null ? Number(v).toLocaleString() : '-'),
      },
      {
        title: '납기일',
        dataIndex: 'due_date',
        width: 110,
        sorter: true,
        render: (v: unknown) => (v as string)?.slice(0, 10) ?? '-',
      },
      {
        title: '상태',
        dataIndex: 'status',
        width: 80,
        align: 'center' as const,
        sorter: true,
        render: (v: unknown) => {
          const s = v as string;
          return <Tag color={DEMAND_STATUS_COLOR[s] ?? 'default'}>{DEMAND_STATUS_LABEL[s] ?? s}</Tag>;
        },
      },
      {
        title: '초안 생성',
        dataIndex: '_draft',
        width: 160,
        align: 'center' as const,
        render: (_: unknown, r: DemandRow) => (
          <Tooltip title={r.status === 'PLANNED' || r.status === 'CLOSED' ? '이미 생산계획이 생성되었습니다' : undefined}>
            <span>
              <Button
                size="small"
                type="primary"
                disabled={r.status === 'PLANNED' || r.status === 'CLOSED'}
                onClick={() => handleOpenDraft(r)}
              >
                생산계획 초안 생성
              </Button>
            </span>
          </Tooltip>
        ),
      },
      {
        title: '액션',
        dataIndex: '_action',
        width: 120,
        align: 'center' as const,
        render: (_: unknown, r: DemandRow) => (
          <Button.Group size="small">
            <PermissionButton action="update" menuUrl={MENU_URL} fallback="hide" size="small" onClick={() => handleOpenEdit(r)}>
              수정
            </PermissionButton>
            <PermissionButton
              action="delete"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              danger
              onClick={() => {
                Modal.confirm({
                  title: '수주를 삭제하시겠습니까?',
                  okText: '삭제',
                  okType: 'danger',
                  cancelText: '취소',
                  onOk: () => handleDelete(r.demand_id),
                });
              }}
            >
              삭제
            </PermissionButton>
          </Button.Group>
        ),
      },
    ],
    [handleOpenDraft, handleOpenEdit, handleDelete],
  );

  /* ── Render ─── */
  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="전체 수주건"
              value={summary.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="완료건"
              value={summary.closed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="진행 중"
              value={summary.planned}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="취소건"
              value={summary.open}
              prefix={<StopOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Search */}
      <SearchForm fields={SEARCH_FIELDS} onSearch={handleSearch} onReset={handleSearchReset} loading={loading} />

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 8 }}>
        <span style={{ color: '#666', fontSize: 13 }}>
          총 <strong>{pagination.total.toLocaleString()}</strong>건
        </span>
        <PermissionButton action="create" menuUrl={MENU_URL} fallback="hide" type="primary" size="small" onClick={handleOpenCreate}>
          수주 등록
        </PermissionButton>
      </div>

      {/* Table */}
      <Table<DemandRow>
        columns={columns}
        dataSource={demands}
        rowKey="demand_id"
        loading={loading}
        size="small"
        scroll={{ x: 1000 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}건`,
        }}
        onChange={handleTableChange as any}
        locale={{
          emptyText: (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>등록된 수주가 없습니다</div>
              <div style={{ color: '#888' }}>수주를 등록하면 생산계획 초안을 자동으로 생성할 수 있습니다.</div>
            </div>
          ),
        }}
      />

      {/* Create/Edit Demand Modal */}
      <Modal
        title={editingDemand ? '수주 수정' : '수주 등록'}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreateSubmit}
        confirmLoading={createSubmitting}
        okText={editingDemand ? '수정' : '등록'}
        cancelText="취소"
        destroyOnClose
        width={480}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="item_cd" label="품목" rules={[{ required: true, message: '품목은 필수입니다.' }]}>
            <Select
              showSearch
              placeholder="품목 선택"
              options={itemOptions}
              optionFilterProp="label"
              disabled={!!editingDemand}
            />
          </Form.Item>
          <Form.Item name="demand_qty" label="수량" rules={[{ required: true, message: '수량은 필수입니다.' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="수량 입력" />
          </Form.Item>
          <Form.Item name="due_date" label="납기일">
            <DatePicker style={{ width: '100%' }} placeholder="납기일 선택" />
          </Form.Item>
          <Form.Item name="cust_cd" label="거래처">
            <Select showSearch placeholder="거래처 선택 (선택)" options={customerOptions} optionFilterProp="label" allowClear />
          </Form.Item>
          <Form.Item name="remark" label="비고">
            <Input.TextArea rows={2} placeholder="비고 입력 (선택)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Plan Draft Modal */}
      <Modal
        title="생산계획 초안 생성"
        open={draftModalOpen}
        onCancel={() => setDraftModalOpen(false)}
        onOk={handleDraftSubmit}
        confirmLoading={draftSubmitting}
        okText="초안 생성"
        cancelText="취소"
        destroyOnClose
        width={480}
      >
        <Form form={draftForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="품목명">
            <Input disabled value={draftDemand?.item?.item_nm ?? draftDemand?.item_cd ?? ''} />
          </Form.Item>
          <Form.Item name="plan_qty" label="계획 수량" rules={[{ required: true, message: '계획 수량은 필수입니다.' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="계획 수량 입력" />
          </Form.Item>
          <Form.Item name="due_date" label="납기일">
            <DatePicker style={{ width: '100%' }} placeholder="납기일 선택" />
          </Form.Item>
          <Form.Item name="plant_cd" label="생산라인" rules={[{ required: true, message: '생산라인은 필수입니다.' }]}>
            <Select
              showSearch
              placeholder="생산라인 선택"
              options={workshopOptions}
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
