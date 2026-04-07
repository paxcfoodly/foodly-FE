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
  DatePicker,
  Table,
  Modal,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

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
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  item?: { item_nm: string } | null;
  plant?: { plant_nm: string } | null;
  [key: string]: unknown;
}

interface ProdPlanFormValues {
  plant_cd: string;
  item_cd: string;
  plan_qty: number;
  due_date: unknown; // Dayjs in form
  priority: number;
  [key: string]: unknown;
}

interface ItemOption {
  item_cd: string;
  item_nm: string;
}

const MENU_URL = '/plan/management';

/* ── Status config ─── */

const STATUS_OPTIONS = [
  { label: '계획', value: 'PLAN' },
  { label: '확정', value: 'CONFIRMED' },
  { label: '진행', value: 'PROGRESS' },
  { label: '완료', value: 'COMPLETE' },
  { label: '취소', value: 'CANCEL' },
];

const STATUS_LABEL: Record<string, string> = {
  PLAN: '계획',
  CONFIRMED: '확정',
  PROGRESS: '진행',
  COMPLETE: '완료',
  CANCEL: '취소',
};

const STATUS_COLOR: Record<string, string> = {
  PLAN: 'blue',
  CONFIRMED: 'green',
  PROGRESS: 'orange',
  COMPLETE: 'cyan',
  CANCEL: 'red',
};

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'item_cd', label: '품목', type: 'text', placeholder: '품목코드 입력' },
  {
    name: 'status',
    label: '상태',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...STATUS_OPTIONS],
  },
  { name: 'due_date', label: '납기일', type: 'dateRange' },
];

/* ── Component ─────────────────────────────────────── */

export default function ProdPlanPage() {
  /* ── State ─── */
  const [plans, setPlans] = useState<ProdPlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<ProdPlanRow | null>(null);

  // Lookup data
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);

  // Material check modal
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialData, setMaterialData] = useState<{
    planNo: string;
    itemCd: string;
    materials: { itemCd: string; itemNm: string; requiredQty: number; availableQty: number; shortage: number }[];
  } | null>(null);
  const [materialLoading, setMaterialLoading] = useState(false);

  /* ── Load dropdown options ─── */
  useEffect(() => {
    apiClient
      .get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 9999, use_yn: 'Y' } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setItemOptions(list.map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd })));
      })
      .catch(() => {});
  }, []);

  /* ── Data Fetching ─── */
  const fetchPlans = useCallback(
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

        const res = await apiClient.get<PaginatedResponse<ProdPlanRow>>('/v1/prod-plans', { params });
        const body = res.data;
        setPlans(body.data ?? []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            pageSize: body.pagination.pageSize,
            total: body.pagination.total,
          });
        }
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '생산계획 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => {
    fetchPlans(1, pagination.pageSize, sortField, sortOrder, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Search handler ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchPlans(1, pagination.pageSize, sortField, sortOrder, values);
    },
    [fetchPlans, pagination.pageSize, sortField, sortOrder],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchPlans(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchPlans, pagination.pageSize, sortField, sortOrder]);

  /* ── Table change (pagination + sort) ─── */
  const handleTableChange = useCallback(
    (
      paginationConfig: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: SorterResult<ProdPlanRow> | SorterResult<ProdPlanRow>[],
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
      fetchPlans(newPage, newPageSize, newSortField, newSortOrder, filters);
    },
    [fetchPlans, filters],
  );

  /* ── CRUD handlers ─── */
  const handleCreate = useCallback(() => {
    setEditItem(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: ProdPlanRow) => {
    if (record.status !== 'PLAN') {
      message.warning('계획(PLAN) 상태에서만 수정할 수 있습니다.');
      return;
    }
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: ProdPlanFormValues, mode: FormModalMode) => {
      const due_date =
        values.due_date && typeof values.due_date === 'object' && 'format' in (values.due_date as any)
          ? (values.due_date as any).format('YYYY-MM-DD')
          : values.due_date;

      if (mode === 'create') {
        await apiClient.post('/v1/prod-plans', {
          plant_cd: values.plant_cd,
          item_cd: values.item_cd,
          plan_qty: values.plan_qty,
          due_date,
          priority: values.priority ?? 5,
        });
      } else {
        await apiClient.put(`/v1/prod-plans/${editItem!.plan_id}`, {
          plant_cd: values.plant_cd,
          item_cd: values.item_cd,
          plan_qty: values.plan_qty,
          due_date,
          priority: values.priority,
        });
      }
      fetchPlans(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchPlans, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: ProdPlanRow) => {
      try {
        await apiClient.delete(`/v1/prod-plans/${record.plan_id}`);
        message.success('생산계획이 삭제되었습니다.');
        fetchPlans(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? '삭제에 실패했습니다.';
        message.error(msg);
      }
    },
    [fetchPlans, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  /* ── Confirm handler ─── */
  const handleConfirm = useCallback(
    async (record: ProdPlanRow) => {
      try {
        await apiClient.patch(`/v1/prod-plans/${record.plan_id}/confirm`);
        message.success('생산계획이 확정되었습니다.');
        fetchPlans(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? '확정에 실패했습니다.';
        message.error(msg);
      }
    },
    [fetchPlans, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  /* ── Material check handler ─── */
  const handleMaterialCheck = useCallback(async (record: ProdPlanRow) => {
    setMaterialLoading(true);
    setMaterialModalOpen(true);
    setMaterialData(null);
    try {
      const res = await apiClient.get(`/v1/prod-plans/${record.plan_id}/material-check`);
      setMaterialData(res.data?.data ?? null);
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? '자재 가용성 조회에 실패했습니다.');
      setMaterialModalOpen(false);
    } finally {
      setMaterialLoading(false);
    }
  }, []);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return { priority: 5 } as Partial<ProdPlanFormValues>;
    return {
      plant_cd: editItem.plant_cd,
      item_cd: editItem.item_cd,
      plan_qty: editItem.plan_qty != null ? Number(editItem.plan_qty) : undefined,
      due_date: editItem.due_date ? dayjs(editItem.due_date) : undefined,
      priority: editItem.priority ?? 5,
    } as Partial<ProdPlanFormValues>;
  }, [editItem]);

  /* ── Disabled form when not PLAN status ─── */
  const isEditDisabled = modalMode === 'edit' && editItem?.status !== 'PLAN';

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      {
        title: '계획번호',
        dataIndex: 'plan_no',
        width: 160,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '품목명',
        dataIndex: ['item', 'item_nm'],
        width: 180,
        ellipsis: true,
        render: (_: unknown, record: ProdPlanRow) => record.item?.item_nm ?? record.item_cd,
      },
      {
        title: '공장',
        dataIndex: 'plant_cd',
        width: 100,
        sorter: true,
        render: (_: unknown, record: ProdPlanRow) => record.plant?.plant_nm ?? record.plant_cd,
      },
      {
        title: '계획수량',
        dataIndex: 'plan_qty',
        width: 100,
        align: 'right' as const,
        sorter: true,
        render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '-'),
      },
      {
        title: '납기일',
        dataIndex: 'due_date',
        width: 120,
        sorter: true,
        render: (val: unknown) => (val ? dayjs(val as string).format('YYYY-MM-DD') : '-'),
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
        title: '등록일',
        dataIndex: 'create_dt',
        width: 110,
        sorter: true,
        render: (val: unknown) => (val ? dayjs(val as string).format('YYYY-MM-DD') : '-'),
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 200,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: ProdPlanRow) => {
          const isPlan = record.status === 'PLAN';
          return (
            <Space size={4}>
              {isPlan ? (
                <Popconfirm
                  title="생산계획을 확정하시겠습니까?"
                  description="확정 후에는 수정·삭제가 불가합니다."
                  onConfirm={() => handleConfirm(record)}
                  okText="확정"
                  cancelText="취소"
                >
                  <PermissionButton
                    action="update"
                    menuUrl={MENU_URL}
                    fallback="hide"
                    size="small"
                    type="text"
                    icon={<CheckCircleOutlined />}
                    style={{ color: '#52c41a' }}
                  >
                    {''}
                  </PermissionButton>
                </Popconfirm>
              ) : null}
              <Button
                size="small"
                type="text"
                icon={<ExperimentOutlined />}
                onClick={() => handleMaterialCheck(record)}
                title="자재 가용성"
              />
              {isPlan ? (
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
              {isPlan ? (
                <Popconfirm
                  title="생산계획을 삭제하시겠습니까?"
                  description="확정 이후에는 삭제할 수 없습니다."
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
    [handleEdit, handleDelete, handleConfirm, handleMaterialCheck],
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
          생산계획 등록
        </PermissionButton>
      </div>

      {/* Table */}
      <Table<ProdPlanRow>
        columns={columns}
        dataSource={plans}
        rowKey="plan_id"
        loading={loading}
        size="small"
        scroll={{ x: 1100 }}
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

      {/* Material Availability Modal */}
      <Modal
        title={`자재 가용성 — ${materialData?.planNo ?? ''}`}
        open={materialModalOpen}
        onCancel={() => setMaterialModalOpen(false)}
        footer={null}
        width={700}
      >
        <Table
          dataSource={materialData?.materials ?? []}
          rowKey="itemCd"
          loading={materialLoading}
          size="small"
          pagination={false}
          columns={[
            { title: '자재코드', dataIndex: 'itemCd', width: 120 },
            { title: '자재명', dataIndex: 'itemNm', width: 160, ellipsis: true },
            {
              title: '소요량',
              dataIndex: 'requiredQty',
              width: 100,
              align: 'right' as const,
              render: (v: number) => v?.toLocaleString(),
            },
            {
              title: '가용재고',
              dataIndex: 'availableQty',
              width: 100,
              align: 'right' as const,
              render: (v: number) => v?.toLocaleString(),
            },
            {
              title: '부족량',
              dataIndex: 'shortage',
              width: 100,
              align: 'right' as const,
              render: (v: number) => (
                <span style={{ color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
                  {v > 0 ? `-${v.toLocaleString()}` : '충분'}
                </span>
              ),
            },
          ]}
          locale={{ emptyText: 'BOM이 등록되지 않았거나 소요 자재가 없습니다.' }}
        />
      </Modal>

      {/* Create/Edit Modal */}
      <FormModal<ProdPlanFormValues>
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '생산계획 등록' : '생산계획 수정'}
        width={560}
      >
        {(_form, mode) => (
          <>
            <Form.Item
              name="plant_cd"
              label="공장코드"
              rules={[{ required: true, message: '공장코드를 입력하세요.' }]}
            >
              <Input placeholder="공장코드 입력" disabled={isEditDisabled} />
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
                disabled={isEditDisabled}
              />
            </Form.Item>
            <Form.Item
              name="plan_qty"
              label="계획수량"
              rules={[
                { required: true, message: '계획수량을 입력하세요.' },
                { type: 'number', min: 1, message: '1 이상의 값을 입력하세요.' },
              ]}
            >
              <InputNumber
                placeholder="계획수량"
                min={1}
                style={{ width: '100%' }}
                precision={0}
                disabled={isEditDisabled}
              />
            </Form.Item>
            <Form.Item
              name="due_date"
              label="납기일"
              rules={[{ required: true, message: '납기일을 선택하세요.' }]}
            >
              <DatePicker
                placeholder="납기일 선택"
                style={{ width: '100%' }}
                disabled={isEditDisabled}
              />
            </Form.Item>
            <Form.Item
              name="priority"
              label="우선순위"
              rules={[
                { type: 'number', min: 1, max: 10, message: '1~10 사이 값을 입력하세요.' },
              ]}
            >
              <InputNumber
                placeholder="우선순위 (1-10)"
                min={1}
                max={10}
                style={{ width: '100%' }}
                disabled={isEditDisabled}
              />
            </Form.Item>
            {mode === 'edit' && (
              <Form.Item label="상태">
                <Tag color={STATUS_COLOR[editItem?.status ?? ''] ?? 'default'}>
                  {STATUS_LABEL[editItem?.status ?? ''] ?? editItem?.status}
                </Tag>
              </Form.Item>
            )}
          </>
        )}
      </FormModal>
    </div>
  );
}
