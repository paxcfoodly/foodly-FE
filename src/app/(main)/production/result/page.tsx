'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Space,
  Form,
  InputNumber,
  Select,
  Table,
  Checkbox,
  DatePicker,
  Input,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
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

interface ResultRow {
  result_id: number;
  wo_id: number;
  lot_no: string | null;
  equip_cd: string | null;
  worker_id: number | null;
  good_qty: number;
  defect_qty: number;
  work_start_dt: string | null;
  work_end_dt: string | null;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  work_order?: { wo_no: string; item_cd: string; item?: { item_nm: string } };
  lot?: { lot_no: string; lot_qty: number | null } | null;
  equipment?: { equip_nm: string } | null;
  worker?: { worker_nm: string } | null;
  [key: string]: unknown;
}

interface ResultFormValues {
  wo_id: number;
  equip_cd?: string;
  worker_id?: number;
  good_qty: number;
  defect_qty?: number;
  work_start_dt?: unknown;
  work_end_dt?: unknown;
  auto_lot?: boolean;
  [key: string]: unknown;
}

interface WorkOrderOption {
  wo_id: number;
  wo_no: string;
  item_cd: string;
  item?: { item_nm: string };
}

interface EquipmentOption {
  equip_cd: string;
  equip_nm: string;
}

interface WorkerOption {
  worker_id: number;
  worker_nm: string;
}

const MENU_URL = '/result/manage';

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'wo_no', label: '작업지시번호', type: 'text', placeholder: '작업지시번호 입력' },
  { name: 'dateRange', label: '작업기간', type: 'dateRange', placeholder: '작업기간' },
  { name: 'equip_cd', label: '설비', type: 'text', placeholder: '설비코드 입력' },
  { name: 'worker_id', label: '작업자', type: 'text', placeholder: '작업자 ID 입력' },
];

/* ── Component ─────────────────────────────────────── */

export default function ProdResultPage() {
  /* ── State ─── */
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<ResultRow | null>(null);

  // Dropdown data
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [equipments, setEquipments] = useState<EquipmentOption[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);

  /* ── Load dropdown options ─── */
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [woRes, eqRes, wkRes] = await Promise.all([
          apiClient.get<PaginatedResponse<WorkOrderOption>>('/v1/work-orders', {
            params: { limit: 200, status: 'PROGRESS' },
          }),
          apiClient.get<PaginatedResponse<EquipmentOption>>('/v1/equipments', {
            params: { limit: 200 },
          }),
          apiClient.get<PaginatedResponse<WorkerOption>>('/v1/workers', {
            params: { limit: 200 },
          }),
        ]);
        setWorkOrders(woRes.data?.data ?? []);
        setEquipments(eqRes.data?.data ?? []);
        setWorkers(wkRes.data?.data ?? []);
      } catch {
        // silently fail — dropdowns will be empty
      }
    };
    loadOptions();
  }, []);

  /* ── Data Fetching ─── */
  const fetchData = useCallback(
    async (
      page = pagination.page,
      pageSize = pagination.pageSize,
      sort?: string,
      order?: 'asc' | 'desc',
      searchFilters?: Record<string, unknown>,
    ) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = {
          page,
          limit: pageSize,
        };

        const activeFilters = searchFilters ?? filters;
        if (sort) params.sortBy = sort;
        if (order) params.sortOrder = order;

        // Apply search filters
        Object.entries(activeFilters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            if (key === 'dateRange' && Array.isArray(val) && val.length === 2) {
              params.startDate = dayjs(val[0] as string).format('YYYY-MM-DD');
              params.endDate = dayjs(val[1] as string).format('YYYY-MM-DD');
            } else {
              params[key] = val;
            }
          }
        });

        const res = await apiClient.get<PaginatedResponse<ResultRow>>('/v1/prod-results', { params });
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
        message.error(e?.response?.data?.message ?? '실적 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
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
      sorter: SorterResult<ResultRow> | SorterResult<ResultRow>[],
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

  /* ── CRUD handlers ─── */
  const handleCreate = useCallback(() => {
    setEditItem(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: ResultRow) => {
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: ResultFormValues, mode: FormModalMode) => {
      const payload = {
        wo_id: values.wo_id,
        equip_cd: values.equip_cd || null,
        worker_id: values.worker_id ?? null,
        good_qty: values.good_qty ?? 0,
        defect_qty: values.defect_qty ?? 0,
        work_start_dt: values.work_start_dt
          ? dayjs(values.work_start_dt as string).toISOString()
          : null,
        work_end_dt: values.work_end_dt
          ? dayjs(values.work_end_dt as string).toISOString()
          : null,
        auto_lot: values.auto_lot ?? false,
      };

      if (mode === 'create') {
        await apiClient.post('/v1/prod-results', payload);
      } else {
        await apiClient.put(`/v1/prod-results/${editItem!.result_id}`, payload);
      }
      fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: ResultRow) => {
      try {
        await apiClient.delete(`/v1/prod-results/${record.result_id}`);
        message.success('실적이 삭제되었습니다.');
        fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        const msg = e?.response?.data?.message ?? '삭제에 실패했습니다.';
        message.error(msg);
      }
    },
    [fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return { auto_lot: true } as Partial<ResultFormValues>;
    return {
      wo_id: editItem.wo_id,
      equip_cd: editItem.equip_cd ?? undefined,
      worker_id: editItem.worker_id ?? undefined,
      good_qty: Number(editItem.good_qty),
      defect_qty: Number(editItem.defect_qty),
      work_start_dt: editItem.work_start_dt ? dayjs(editItem.work_start_dt) : undefined,
      work_end_dt: editItem.work_end_dt ? dayjs(editItem.work_end_dt) : undefined,
      auto_lot: false,
    } as Partial<ResultFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      {
        title: '실적ID',
        dataIndex: 'result_id',
        width: 80,
        sorter: true,
      },
      {
        title: '작업지시번호',
        dataIndex: ['work_order', 'wo_no'],
        width: 140,
        ellipsis: true,
        render: (_: unknown, record: ResultRow) => record.work_order?.wo_no ?? '-',
      },
      {
        title: '품목명',
        dataIndex: ['work_order', 'item', 'item_nm'],
        width: 160,
        ellipsis: true,
        render: (_: unknown, record: ResultRow) => record.work_order?.item?.item_nm ?? '-',
      },
      {
        title: '설비',
        dataIndex: 'equip_cd',
        width: 100,
        render: (_: unknown, record: ResultRow) => record.equipment?.equip_nm ?? record.equip_cd ?? '-',
      },
      {
        title: '작업자',
        dataIndex: 'worker_id',
        width: 100,
        render: (_: unknown, record: ResultRow) => record.worker?.worker_nm ?? '-',
      },
      {
        title: '양품수량',
        dataIndex: 'good_qty',
        width: 100,
        align: 'right' as const,
        sorter: true,
        render: (val: unknown) => val != null ? Number(val).toLocaleString() : '0',
      },
      {
        title: '불량수량',
        dataIndex: 'defect_qty',
        width: 100,
        align: 'right' as const,
        sorter: true,
        render: (val: unknown) => val != null ? Number(val).toLocaleString() : '0',
      },
      {
        title: 'LOT번호',
        dataIndex: 'lot_no',
        width: 140,
        ellipsis: true,
        render: (val: unknown) => (val as string) || '-',
      },
      {
        title: '작업시작',
        dataIndex: 'work_start_dt',
        width: 140,
        sorter: true,
        render: (val: unknown) =>
          val ? dayjs(val as string).format('YYYY-MM-DD HH:mm') : '-',
      },
      {
        title: '작업종료',
        dataIndex: 'work_end_dt',
        width: 140,
        render: (val: unknown) =>
          val ? dayjs(val as string).format('YYYY-MM-DD HH:mm') : '-',
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 100,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: ResultRow) => (
          <Space size={4}>
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
            <Popconfirm
              title="실적을 삭제하시겠습니까?"
              description="관련 LOT 및 작업지시 수량이 재계산됩니다."
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
          </Space>
        ),
      },
    ],
    [handleEdit, handleDelete],
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
          실적 등록
        </PermissionButton>
      </div>

      {/* Table */}
      <Table<ResultRow>
        columns={columns}
        dataSource={rows}
        rowKey="result_id"
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

      {/* Create/Edit Modal */}
      <FormModal<ResultFormValues>
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '실적 등록' : '실적 수정'}
        width={560}
      >
        {(form, mode) => (
          <>
            <Form.Item
              name="wo_id"
              label="작업지시"
              rules={[{ required: true, message: '작업지시를 선택하세요.' }]}
            >
              <Select
                placeholder="작업지시 선택"
                showSearch
                optionFilterProp="label"
                disabled={mode === 'edit'}
                options={workOrders.map((wo) => ({
                  label: `${wo.wo_no} — ${wo.item?.item_nm ?? wo.item_cd}`,
                  value: wo.wo_id,
                }))}
              />
            </Form.Item>
            <Form.Item name="equip_cd" label="설비">
              <Select
                placeholder="설비 선택"
                allowClear
                showSearch
                optionFilterProp="label"
                options={equipments.map((eq) => ({
                  label: `${eq.equip_cd} — ${eq.equip_nm}`,
                  value: eq.equip_cd,
                }))}
              />
            </Form.Item>
            <Form.Item name="worker_id" label="작업자">
              <Select
                placeholder="작업자 선택"
                allowClear
                showSearch
                optionFilterProp="label"
                options={workers.map((wk) => ({
                  label: wk.worker_nm,
                  value: wk.worker_id,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="good_qty"
              label="양품수량"
              rules={[
                { required: true, message: '양품수량을 입력하세요.' },
                { type: 'number', min: 0, message: '0 이상이어야 합니다.' },
              ]}
            >
              <InputNumber
                placeholder="양품수량"
                min={0}
                style={{ width: '100%' }}
                precision={0}
              />
            </Form.Item>
            <Form.Item
              name="defect_qty"
              label="불량수량"
              rules={[
                { type: 'number', min: 0, message: '0 이상이어야 합니다.' },
              ]}
            >
              <InputNumber
                placeholder="불량수량"
                min={0}
                style={{ width: '100%' }}
                precision={0}
              />
            </Form.Item>
            <Form.Item name="work_start_dt" label="작업시작">
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                placeholder="작업시작 시간"
              />
            </Form.Item>
            <Form.Item name="work_end_dt" label="작업종료">
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                placeholder="작업종료 시간"
              />
            </Form.Item>
            {mode === 'create' && (
              <Form.Item name="auto_lot" label="LOT 자동생성" valuePropName="checked">
                <Checkbox>자동 LOT 생성</Checkbox>
              </Form.Item>
            )}
          </>
        )}
      </FormModal>
    </div>
  );
}
