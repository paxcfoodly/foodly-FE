'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Table,
  Modal,
  message,
  Descriptions,
} from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import PermissionButton from '@/components/auth/PermissionButton';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

/* ── Types ─────────────────────────────────────────── */

interface InventoryRow {
  inventory_id: number;
  item_cd: string;
  lot_no: string | null;
  wh_cd: string;
  qty: number;
  allocated_qty: number;
  available_qty: number;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  item?: { item_nm: string } | null;
  lot?: { lot_status: string } | null;
  warehouse?: { wh_nm: string } | null;
}

interface AdjustFormValues {
  adjust_qty: number;
  adjust_reason?: string;
}

const MENU_URL = '/inventory/stock';

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'wh_cd', label: '창고코드', type: 'text', placeholder: '창고코드 입력' },
  { name: 'lot_no', label: 'LOT번호', type: 'text', placeholder: 'LOT번호 입력' },
];

/* ── Component ─────────────────────────────────────── */

export default function InventoryStockPage() {
  /* ── State ─── */
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Adjust Modal
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<InventoryRow | null>(null);
  const [adjustForm] = Form.useForm<AdjustFormValues>();
  const [adjustLoading, setAdjustLoading] = useState(false);

  /* ── Data Fetching ─── */
  const fetchInventory = useCallback(
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

        const res = await apiClient.get<PaginatedResponse<InventoryRow>>('/v1/inventory', { params });
        const body = res.data;
        setItems(body.data ?? []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            pageSize: body.pagination.pageSize,
            total: body.pagination.total,
          });
        }
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? '재고 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => {
    fetchInventory(1, pagination.pageSize, sortField, sortOrder, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Search handler ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchInventory(1, pagination.pageSize, sortField, sortOrder, values);
    },
    [fetchInventory, pagination.pageSize, sortField, sortOrder],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchInventory(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchInventory, pagination.pageSize, sortField, sortOrder]);

  /* ── Table change (pagination + sort) ─── */
  const handleTableChange = useCallback(
    (
      paginationConfig: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: SorterResult<InventoryRow> | SorterResult<InventoryRow>[],
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
      fetchInventory(newPage, newPageSize, newSortField, newSortOrder, filters);
    },
    [fetchInventory, filters],
  );

  /* ── Adjust handlers ─── */
  const handleAdjustOpen = useCallback(
    (record: InventoryRow) => {
      setAdjustTarget(record);
      adjustForm.resetFields();
      setAdjustOpen(true);
    },
    [adjustForm],
  );

  const handleAdjustSubmit = useCallback(async () => {
    if (!adjustTarget) return;
    try {
      const values = await adjustForm.validateFields();
      setAdjustLoading(true);
      await apiClient.post('/v1/inventory/adjust', {
        item_cd: adjustTarget.item_cd,
        lot_no: adjustTarget.lot_no ?? null,
        wh_cd: adjustTarget.wh_cd,
        adjust_qty: values.adjust_qty,
        adjust_reason: values.adjust_reason ?? '',
      });
      message.success('재고가 조정되었습니다.');
      setAdjustOpen(false);
      setAdjustTarget(null);
      fetchInventory(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: any) {
      if (err?.errorFields) return; // antd validation
      message.error(err?.response?.data?.message ?? '재고 조정에 실패했습니다.');
    } finally {
      setAdjustLoading(false);
    }
  }, [adjustTarget, adjustForm, fetchInventory, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      {
        title: '품목코드',
        dataIndex: 'item_cd',
        width: 120,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '품목명',
        dataIndex: ['item', 'item_nm'],
        width: 180,
        ellipsis: true,
        render: (_: unknown, record: InventoryRow) => record.item?.item_nm ?? '-',
      },
      {
        title: 'LOT번호',
        dataIndex: 'lot_no',
        width: 140,
        sorter: true,
        ellipsis: true,
        render: (val: unknown) => (val as string) ?? '-',
      },
      {
        title: '창고코드',
        dataIndex: 'wh_cd',
        width: 100,
        sorter: true,
      },
      {
        title: '창고명',
        dataIndex: ['warehouse', 'wh_nm'],
        width: 140,
        ellipsis: true,
        render: (_: unknown, record: InventoryRow) => record.warehouse?.wh_nm ?? '-',
      },
      {
        title: '재고수량',
        dataIndex: 'qty',
        width: 110,
        align: 'right' as const,
        render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '0'),
      },
      {
        title: '할당수량',
        dataIndex: 'allocated_qty',
        width: 110,
        align: 'right' as const,
        render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '0'),
      },
      {
        title: '가용수량',
        dataIndex: 'available_qty',
        width: 110,
        align: 'right' as const,
        render: (val: unknown) => {
          const n = val != null ? Number(val) : 0;
          return (
            <span style={{ fontWeight: 600, color: n <= 0 ? '#ff4d4f' : undefined }}>
              {n.toLocaleString()}
            </span>
          );
        },
      },
      {
        title: '최종수정일',
        dataIndex: 'update_dt',
        width: 140,
        render: (val: unknown) => (val ? dayjs(val as string).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 90,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: InventoryRow) => (
          <PermissionButton
            action="update"
            menuUrl={MENU_URL}
            fallback="hide"
            size="small"
            type="link"
            icon={<ToolOutlined />}
            onClick={() => handleAdjustOpen(record)}
          >
            조정
          </PermissionButton>
        ),
      },
    ],
    [handleAdjustOpen],
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
      </div>

      {/* Table */}
      <Table<InventoryRow>
        columns={columns}
        dataSource={items}
        rowKey="inventory_id"
        loading={loading}
        size="small"
        scroll={{ x: 1200 }}
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

      {/* Adjust Modal */}
      <Modal
        title="재고 조정"
        open={adjustOpen}
        onCancel={() => {
          setAdjustOpen(false);
          setAdjustTarget(null);
        }}
        onOk={handleAdjustSubmit}
        confirmLoading={adjustLoading}
        okText="조정"
        cancelText="취소"
        destroyOnClose
        width={480}
      >
        {adjustTarget && (
          <>
            <Descriptions
              column={2}
              size="small"
              bordered
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="품목코드">{adjustTarget.item_cd}</Descriptions.Item>
              <Descriptions.Item label="품목명">{adjustTarget.item?.item_nm ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="LOT번호">{adjustTarget.lot_no ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="창고">{adjustTarget.warehouse?.wh_nm ?? adjustTarget.wh_cd}</Descriptions.Item>
              <Descriptions.Item label="현재 재고">{Number(adjustTarget.qty).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="가용 수량">{Number(adjustTarget.available_qty).toLocaleString()}</Descriptions.Item>
            </Descriptions>

            <Form form={adjustForm} layout="vertical">
              <Form.Item
                name="adjust_qty"
                label="조정 수량"
                rules={[
                  { required: true, message: '조정 수량을 입력하세요.' },
                  { type: 'number', message: '숫자를 입력하세요.' },
                  {
                    validator: (_, value) => {
                      if (value === 0) {
                        return Promise.reject('0이 아닌 값을 입력하세요.');
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
                extra="양수: 재고 증가, 음수: 재고 감소"
              >
                <InputNumber
                  placeholder="조정 수량 (예: 10, -5)"
                  style={{ width: '100%' }}
                  precision={0}
                />
              </Form.Item>
              <Form.Item
                name="adjust_reason"
                label="조정 사유"
              >
                <Input.TextArea
                  placeholder="조정 사유를 입력하세요"
                  rows={3}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
