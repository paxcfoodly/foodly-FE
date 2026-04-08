'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Space,
  Form,
  InputNumber,
  Select,
  Input,
  Table,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
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

interface MaterialInputRow {
  input_id: number;
  wo_id: number;
  item_cd: string;
  lot_no: string | null;
  input_qty: number;
  worker_id: string | null;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  work_order?: { wo_no: string };
  item?: { item_nm: string };
  lot?: { lot_no: string } | null;
  worker?: { worker_nm: string } | null;
  [key: string]: unknown;
}

interface MaterialInputFormValues {
  wo_id: number;
  item_cd: string;
  lot_no?: string;
  input_qty: number;
  worker_id?: string;
  [key: string]: unknown;
}

interface WorkOrderOption {
  wo_id: number;
  wo_no: string;
  item_cd: string;
  item?: { item_nm: string };
}

interface ItemOption {
  item_cd: string;
  item_nm: string;
}

interface WorkerOption {
  worker_id: string;
  worker_nm: string;
}

const MENU_URL = '/result/material';

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'wo_id', label: '작업지시번호', type: 'text', placeholder: '작업지시 ID 입력' },
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'lot_no', label: 'LOT번호', type: 'text', placeholder: 'LOT번호 입력' },
];

/* ── Component ─────────────────────────────────────── */

export default function MaterialInputPage() {
  /* ── State ─── */
  const [rows, setRows] = useState<MaterialInputRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);

  // Dropdown data
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);

  // Barcode lot_no input ref
  const lotNoInputRef = useRef<HTMLInputElement>(null);

  /* ── Load dropdown options ─── */
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [woRes, itemRes, wkRes] = await Promise.all([
          apiClient.get<PaginatedResponse<WorkOrderOption>>('/v1/work-orders', {
            params: { limit: 200, status: 'PROGRESS' },
          }),
          apiClient.get<PaginatedResponse<ItemOption>>('/v1/items', {
            params: { limit: 9999, use_yn: 'Y' },
          }),
          apiClient.get<PaginatedResponse<WorkerOption>>('/v1/workers', {
            params: { limit: 200 },
          }),
        ]);
        setWorkOrders(woRes.data?.data ?? []);
        setItems(itemRes.data?.data ?? []);
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

        Object.entries(activeFilters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            params[key] = val;
          }
        });

        const res = await apiClient.get<PaginatedResponse<MaterialInputRow>>('/v1/material-inputs', { params });
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
        message.error(e?.response?.data?.message ?? '자재투입 목록 조회에 실패했습니다.');
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
      sorter: SorterResult<MaterialInputRow> | SorterResult<MaterialInputRow>[],
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
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: MaterialInputFormValues) => {
      const payload = {
        wo_id: values.wo_id,
        item_cd: values.item_cd,
        lot_no: values.lot_no || null,
        input_qty: values.input_qty ?? 0,
        worker_id: values.worker_id || null,
      };

      await apiClient.post('/v1/material-inputs', payload);
      fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: MaterialInputRow) => {
      try {
        await apiClient.delete(`/v1/material-inputs/${record.input_id}`);
        message.success('자재투입이 삭제되었습니다.');
        fetchData(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        const msg = e?.response?.data?.message ?? '삭제에 실패했습니다.';
        message.error(msg);
      }
    },
    [fetchData, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      {
        title: '투입ID',
        dataIndex: 'input_id',
        width: 80,
        sorter: true,
      },
      {
        title: '작업지시번호',
        dataIndex: ['work_order', 'wo_no'],
        width: 140,
        ellipsis: true,
        render: (_: unknown, record: MaterialInputRow) => record.work_order?.wo_no ?? '-',
      },
      {
        title: '품목명',
        dataIndex: ['item', 'item_nm'],
        width: 160,
        ellipsis: true,
        render: (_: unknown, record: MaterialInputRow) => record.item?.item_nm ?? record.item_cd,
      },
      {
        title: 'LOT번호',
        dataIndex: 'lot_no',
        width: 160,
        ellipsis: true,
        render: (val: unknown) => (val as string) || '-',
      },
      {
        title: '투입수량',
        dataIndex: 'input_qty',
        width: 100,
        align: 'right' as const,
        sorter: true,
        render: (val: unknown) => val != null ? Number(val).toLocaleString() : '0',
      },
      {
        title: '작업자',
        dataIndex: 'worker_id',
        width: 100,
        render: (_: unknown, record: MaterialInputRow) => record.worker?.worker_nm ?? '-',
      },
      {
        title: '등록일시',
        dataIndex: 'create_dt',
        width: 140,
        sorter: true,
        render: (val: unknown) =>
          val ? dayjs(val as string).format('YYYY-MM-DD HH:mm') : '-',
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 80,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: MaterialInputRow) => (
          <Popconfirm
            title="자재투입을 삭제하시겠습니까?"
            description="관련 LOT 이력이 함께 삭제됩니다."
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
        ),
      },
    ],
    [handleDelete],
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
          자재투입 등록
        </PermissionButton>
      </div>

      {/* Table */}
      <Table<MaterialInputRow>
        columns={columns}
        dataSource={rows}
        rowKey="input_id"
        loading={loading}
        size="small"
        scroll={{ x: 1000 }}
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

      {/* Create Modal — no edit (immutable records) */}
      <FormModal<MaterialInputFormValues>
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        mode="create"
        title="자재투입 등록"
        width={560}
      >
        {() => (
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
                options={workOrders.map((wo) => ({
                  label: `${wo.wo_no} — ${wo.item?.item_nm ?? wo.item_cd}`,
                  value: wo.wo_id,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="item_cd"
              label="품목"
              rules={[{ required: true, message: '품목을 선택하세요.' }]}
            >
              <Select
                placeholder="품목 선택"
                showSearch
                optionFilterProp="label"
                options={items.map((it) => ({
                  label: `${it.item_cd} — ${it.item_nm}`,
                  value: it.item_cd,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="lot_no"
              label="LOT번호"
              tooltip="바코드 스캐너로 입력 가능합니다"
            >
              <Input
                placeholder="LOT번호 입력 (바코드 스캔)"
                ref={lotNoInputRef as React.Ref<any>}
                autoFocus
                allowClear
              />
            </Form.Item>
            <Form.Item
              name="input_qty"
              label="투입수량"
              rules={[
                { required: true, message: '투입수량을 입력하세요.' },
                { type: 'number', min: 0.001, message: '0보다 커야 합니다.' },
              ]}
            >
              <InputNumber
                placeholder="투입수량"
                min={0}
                style={{ width: '100%' }}
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
          </>
        )}
      </FormModal>
    </div>
  );
}
