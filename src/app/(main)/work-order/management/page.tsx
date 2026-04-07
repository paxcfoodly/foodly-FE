'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Space,
  Tag,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Modal,
  message,
  Popconfirm,
  Dropdown,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SplitCellsOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import type { MenuProps } from 'antd';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';

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

interface WorkOrderFormValues {
  plan_id?: number | null;
  item_cd: string;
  order_qty: number;
  priority: number;
  [key: string]: unknown;
}

interface SplitFormValues {
  split_qty: number;
}

interface ItemOption {
  item_cd: string;
  item_nm: string;
}

interface ProdPlanOption {
  plan_id: number;
  plan_no: string;
}

const MENU_URL = '/work-order/management';

/* ── Status config ─── */

const STATUS_OPTIONS = [
  { label: '대기', value: 'WAIT' },
  { label: '진행', value: 'PROGRESS' },
  { label: '완료', value: 'COMPLETE' },
  { label: '마감', value: 'CLOSE' },
  { label: '취소', value: 'CANCEL' },
];

const STATUS_LABEL: Record<string, string> = {
  WAIT: '대기',
  PROGRESS: '진행',
  COMPLETE: '완료',
  CLOSE: '마감',
  CANCEL: '취소',
};

const STATUS_COLOR: Record<string, string> = {
  WAIT: 'blue',
  PROGRESS: 'orange',
  COMPLETE: 'cyan',
  CLOSE: 'green',
  CANCEL: 'red',
};

/** Allowed status transitions — mirrors BE STATUS_TRANSITIONS */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  WAIT: ['PROGRESS', 'CANCEL'],
  PROGRESS: ['COMPLETE', 'CANCEL'],
  COMPLETE: ['CLOSE'],
  CLOSE: [],
  CANCEL: [],
};

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'wo_no', label: '작업지시번호', type: 'text', placeholder: '작업지시번호 입력' },
  { name: 'item_cd', label: '품목', type: 'text', placeholder: '품목코드 입력' },
  {
    name: 'status',
    label: '상태',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...STATUS_OPTIONS],
  },
  { name: 'plan_id', label: '생산계획 ID', type: 'text', placeholder: '계획 ID 입력' },
];

/* ── Component ─────────────────────────────────────── */

export default function WorkOrderManagementPage() {
  /* ── State ─── */
  const [orders, setOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // CRUD Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<WorkOrderRow | null>(null);

  // Split Modal
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitTarget, setSplitTarget] = useState<WorkOrderRow | null>(null);
  const [splitForm] = Form.useForm<SplitFormValues>();
  const [splitLoading, setSplitLoading] = useState(false);

  // Lookup data
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);
  const [planOptions, setPlanOptions] = useState<{ label: string; value: number }[]>([]);

  /* ── Load dropdown options ─── */
  useEffect(() => {
    apiClient
      .get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 9999, use_yn: 'Y' } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setItemOptions(list.map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd })));
      })
      .catch(() => {});

    apiClient
      .get<PaginatedResponse<ProdPlanOption>>('/v1/prod-plans', { params: { limit: 9999 } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setPlanOptions(list.map((p) => ({ label: p.plan_no, value: p.plan_id })));
      })
      .catch(() => {});
  }, []);

  /* ── Data Fetching ─── */
  const fetchOrders = useCallback(
    async (
      page = pagination.page,
      pageSize = pagination.pageSize,
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

        const res = await apiClient.get<PaginatedResponse<WorkOrderRow>>('/v1/work-orders', { params });
        const body = res.data;
        setOrders(body.data ?? []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            pageSize: body.pagination.pageSize,
            total: body.pagination.total,
          });
        }
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '작업지시 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => {
    fetchOrders(1, pagination.pageSize, sortField, sortOrder, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Search handler ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchOrders(1, pagination.pageSize, sortField, sortOrder, values);
    },
    [fetchOrders, pagination.pageSize, sortField, sortOrder],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchOrders(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchOrders, pagination.pageSize, sortField, sortOrder]);

  /* ── Table change (pagination + sort) ─── */
  const handleTableChange = useCallback(
    (
      paginationConfig: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: SorterResult<WorkOrderRow> | SorterResult<WorkOrderRow>[],
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
      fetchOrders(newPage, newPageSize, newSortField, newSortOrder, filters);
    },
    [fetchOrders, filters],
  );

  /* ── CRUD handlers ─── */
  const handleCreate = useCallback(() => {
    setEditItem(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: WorkOrderRow) => {
    if (record.status !== 'WAIT') {
      message.warning('대기(WAIT) 상태에서만 수정할 수 있습니다.');
      return;
    }
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: WorkOrderFormValues, mode: FormModalMode) => {
      const payload = {
        plan_id: values.plan_id ?? null,
        item_cd: values.item_cd,
        order_qty: values.order_qty,
        priority: values.priority ?? 5,
      };

      if (mode === 'create') {
        await apiClient.post('/v1/work-orders', payload);
      } else {
        await apiClient.put(`/v1/work-orders/${editItem!.wo_id}`, payload);
      }
      fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: WorkOrderRow) => {
      try {
        await apiClient.delete(`/v1/work-orders/${record.wo_id}`);
        message.success('작업지시가 삭제되었습니다.');
        fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  /* ── Status change handler ─── */
  const handleStatusChange = useCallback(
    async (record: WorkOrderRow, newStatus: string) => {
      try {
        await apiClient.patch(`/v1/work-orders/${record.wo_id}/status`, { status: newStatus });
        message.success(`상태가 ${STATUS_LABEL[newStatus] ?? newStatus}(으)로 변경되었습니다.`);
        fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '상태 변경에 실패했습니다.');
      }
    },
    [fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  /* ── Split handlers ─── */
  const handleSplitOpen = useCallback((record: WorkOrderRow) => {
    if (record.status !== 'WAIT') {
      message.warning('대기(WAIT) 상태에서만 분할할 수 있습니다.');
      return;
    }
    setSplitTarget(record);
    splitForm.resetFields();
    setSplitModalOpen(true);
  }, [splitForm]);

  const handleSplitSubmit = useCallback(async () => {
    if (!splitTarget) return;
    try {
      const values = await splitForm.validateFields();
      setSplitLoading(true);
      await apiClient.post(`/v1/work-orders/${splitTarget.wo_id}/split`, {
        split_qty: values.split_qty,
      });
      message.success('작업지시가 분할되었습니다.');
      setSplitModalOpen(false);
      setSplitTarget(null);
      fetchOrders(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: any) {
      if (err?.errorFields) return; // antd validation
      message.error(err?.response?.data?.message ?? '분할에 실패했습니다.');
    } finally {
      setSplitLoading(false);
    }
  }, [splitTarget, splitForm, fetchOrders, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return { priority: 5 } as Partial<WorkOrderFormValues>;
    return {
      plan_id: editItem.plan_id,
      item_cd: editItem.item_cd,
      order_qty: editItem.order_qty != null ? Number(editItem.order_qty) : undefined,
      priority: editItem.priority ?? 5,
    } as Partial<WorkOrderFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      {
        title: '작업지시번호',
        dataIndex: 'wo_no',
        width: 160,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '생산계획',
        dataIndex: ['prod_plan', 'plan_no'],
        width: 150,
        ellipsis: true,
        render: (_: unknown, record: WorkOrderRow) => record.prod_plan?.plan_no ?? '-',
      },
      {
        title: '품목명',
        dataIndex: ['item', 'item_nm'],
        width: 180,
        ellipsis: true,
        render: (_: unknown, record: WorkOrderRow) => record.item?.item_nm ?? record.item_cd,
      },
      {
        title: '지시수량',
        dataIndex: 'order_qty',
        width: 100,
        align: 'right' as const,
        sorter: true,
        render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '-'),
      },
      {
        title: '양품수량',
        dataIndex: 'good_qty',
        width: 100,
        align: 'right' as const,
        render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '0'),
      },
      {
        title: '불량수량',
        dataIndex: 'defect_qty',
        width: 100,
        align: 'right' as const,
        render: (val: unknown) => {
          const n = val != null ? Number(val) : 0;
          return <span style={{ color: n > 0 ? '#ff4d4f' : undefined }}>{n.toLocaleString()}</span>;
        },
      },
      {
        title: '진행률',
        dataIndex: '_progress',
        width: 130,
        render: (_: unknown, record: WorkOrderRow) => {
          const orderQty = record.order_qty != null ? Number(record.order_qty) : 0;
          const goodQty = record.good_qty != null ? Number(record.good_qty) : 0;
          const pct = orderQty > 0 ? Math.round((goodQty / orderQty) * 100) : 0;
          return <Progress percent={pct} size="small" />;
        },
      },
      {
        title: '우선순위',
        dataIndex: 'priority',
        width: 90,
        align: 'center' as const,
        sorter: true,
      },
      {
        title: '상태',
        dataIndex: 'status',
        width: 90,
        align: 'center' as const,
        sorter: true,
        render: (val: unknown) => {
          const v = val as string;
          return <Tag color={STATUS_COLOR[v] ?? 'default'}>{STATUS_LABEL[v] ?? v}</Tag>;
        },
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 220,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: WorkOrderRow) => {
          const isWait = record.status === 'WAIT';
          const nextStatuses = STATUS_TRANSITIONS[record.status] ?? [];

          // Build dropdown menu for status change
          const statusMenuItems: MenuProps['items'] = nextStatuses.map((s) => ({
            key: s,
            label: (
              <Popconfirm
                title={`상태를 ${STATUS_LABEL[s]}(으)로 변경하시겠습니까?`}
                onConfirm={() => handleStatusChange(record, s)}
                okText="변경"
                cancelText="취소"
              >
                <span>
                  <Tag color={STATUS_COLOR[s]} style={{ cursor: 'pointer' }}>
                    {STATUS_LABEL[s]}
                  </Tag>
                </span>
              </Popconfirm>
            ),
          }));

          return (
            <Space size={4}>
              {/* Status change */}
              {nextStatuses.length > 0 && (
                <Dropdown menu={{ items: statusMenuItems }} trigger={['click']}>
                  <PermissionButton
                    action="update"
                    menuUrl={MENU_URL}
                    fallback="hide"
                    size="small"
                    type="text"
                    icon={<SwapOutlined />}
                    title="상태변경"
                  >
                    {''}
                  </PermissionButton>
                </Dropdown>
              )}

              {/* Split */}
              {isWait && (
                <PermissionButton
                  action="create"
                  menuUrl={MENU_URL}
                  fallback="hide"
                  size="small"
                  type="text"
                  icon={<SplitCellsOutlined />}
                  onClick={() => handleSplitOpen(record)}
                  title="분할"
                >
                  {''}
                </PermissionButton>
              )}

              {/* Edit */}
              {isWait ? (
                <PermissionButton
                  action="update"
                  menuUrl={MENU_URL}
                  fallback="hide"
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                >
                  {''}
                </PermissionButton>
              ) : (
                <Button size="small" type="text" icon={<EditOutlined />} disabled />
              )}

              {/* Delete */}
              {isWait ? (
                <Popconfirm
                  title="작업지시를 삭제하시겠습니까?"
                  description="대기 상태에서만 삭제할 수 있습니다."
                  onConfirm={() => handleDelete(record)}
                  okText="삭제"
                  cancelText="취소"
                >
                  <PermissionButton
                    action="delete"
                    menuUrl={MENU_URL}
                    fallback="hide"
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                  >
                    {''}
                  </PermissionButton>
                </Popconfirm>
              ) : (
                <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled />
              )}
            </Space>
          );
        },
      },
    ],
    [handleEdit, handleDelete, handleStatusChange, handleSplitOpen],
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
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          작업지시 등록
        </PermissionButton>
      </div>

      {/* Table */}
      <Table<WorkOrderRow>
        columns={columns}
        dataSource={orders}
        rowKey="wo_id"
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
        onChange={handleTableChange as any}
      />

      {/* Split Modal */}
      <Modal
        title={`작업지시 분할 — ${splitTarget?.wo_no ?? ''}`}
        open={splitModalOpen}
        onCancel={() => {
          setSplitModalOpen(false);
          setSplitTarget(null);
        }}
        onOk={handleSplitSubmit}
        confirmLoading={splitLoading}
        okText="분할"
        cancelText="취소"
        destroyOnClose
        width={420}
      >
        <div style={{ marginBottom: 16, color: '#666' }}>
          현재 지시수량: <strong>{splitTarget?.order_qty != null ? Number(splitTarget.order_qty).toLocaleString() : '-'}</strong>
        </div>
        <Form form={splitForm} layout="vertical">
          <Form.Item
            name="split_qty"
            label="분할 수량"
            rules={[
              { required: true, message: '분할 수량을 입력하세요.' },
              {
                type: 'number',
                min: 1,
                message: '1 이상의 값을 입력하세요.',
              },
              {
                validator: (_, value) => {
                  if (value && splitTarget && Number(value) >= Number(splitTarget.order_qty)) {
                    return Promise.reject('분할 수량은 원래 수량보다 작아야 합니다.');
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              placeholder="분할할 수량 입력"
              min={1}
              max={splitTarget?.order_qty != null ? Number(splitTarget.order_qty) - 1 : undefined}
              style={{ width: '100%' }}
              precision={0}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create/Edit Modal */}
      <FormModal<WorkOrderFormValues>
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '작업지시 등록' : '작업지시 수정'}
        width={560}
      >
        {(_form, _mode) => (
          <>
            <Form.Item name="plan_id" label="생산계획">
              <Select
                placeholder="생산계획 선택 (선택사항)"
                options={planOptions}
                allowClear
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item
              name="item_cd"
              label="품목"
              rules={[{ required: true, message: '품목을 선택하세요.' }]}
            >
              <Select
                placeholder="품목 선택"
                options={itemOptions}
                allowClear
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item
              name="order_qty"
              label="지시수량"
              rules={[
                { required: true, message: '지시수량을 입력하세요.' },
                { type: 'number', min: 1, message: '1 이상의 값을 입력하세요.' },
              ]}
            >
              <InputNumber placeholder="지시수량" min={1} style={{ width: '100%' }} precision={0} />
            </Form.Item>
            <Form.Item
              name="priority"
              label="우선순위"
              rules={[
                { type: 'number', min: 1, max: 10, message: '1~10 사이 값을 입력하세요.' },
              ]}
            >
              <InputNumber placeholder="우선순위 (1-10)" min={1} max={10} style={{ width: '100%' }} />
            </Form.Item>
            {_mode === 'edit' && editItem && (
              <Form.Item label="상태">
                <Tag color={STATUS_COLOR[editItem.status] ?? 'default'}>
                  {STATUS_LABEL[editItem.status] ?? editItem.status}
                </Tag>
              </Form.Item>
            )}
          </>
        )}
      </FormModal>
    </div>
  );
}
