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
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import PermissionButton from '@/components/auth/PermissionButton';
import FormModal, { type FormModalMode } from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import ExcelUploadButton from '@/components/common/ExcelUploadButton';
import ExcelDownloadButton, { type ExcelColumn } from '@/components/common/ExcelDownloadButton';
import DataHistoryDrawer from '@/components/common/DataHistoryDrawer';
import CommonCodeSelect from '@/components/common/CommonCodeSelect';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

/* ── Types ─────────────────────────────────────────── */

interface ItemRow {
  item_cd: string;
  item_nm: string;
  item_type: string;
  unit_cd: string | null;
  spec: string | null;
  drawing_no: string | null;
  safety_stock: string | number | null;
  use_yn: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  [key: string]: unknown;
}

interface ItemFormValues {
  item_cd: string;
  item_nm: string;
  item_type: string;
  unit_cd?: string;
  spec?: string;
  drawing_no?: string;
  safety_stock?: number;
  use_yn?: string;
  [key: string]: unknown;
}

const MENU_URL = '/master/item';

const ITEM_TYPE_OPTIONS = [
  { label: '원자재', value: 'RAW' },
  { label: '반제품', value: 'SEMI' },
  { label: '완제품', value: 'FIN' },
];

const ITEM_TYPE_LABEL: Record<string, string> = {
  RAW: '원자재',
  SEMI: '반제품',
  FIN: '완제품',
};

const ITEM_TYPE_COLOR: Record<string, string> = {
  RAW: 'blue',
  SEMI: 'orange',
  FIN: 'green',
};

const USE_YN_OPTIONS = [
  { label: '사용', value: 'Y' },
  { label: '미사용', value: 'N' },
];

/* ── Excel columns ─── */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: '품목코드', key: 'item_cd', width: 15 },
  { header: '품목명', key: 'item_nm', width: 30 },
  { header: '품목유형', key: 'item_type', width: 10 },
  { header: '단위', key: 'unit_cd', width: 10 },
  { header: '규격', key: 'spec', width: 20 },
  { header: '도면번호', key: 'drawing_no', width: 20 },
  { header: '안전재고', key: 'safety_stock', width: 12 },
  { header: '사용여부', key: 'use_yn', width: 10 },
];

/* ── Search fields ─── */
const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'item_cd', label: '품목코드', type: 'text', placeholder: '품목코드 입력' },
  { name: 'item_nm', label: '품목명', type: 'text', placeholder: '품목명 입력' },
  {
    name: 'item_type',
    label: '품목유형',
    type: 'select',
    options: [
      { label: '전체', value: '' },
      ...ITEM_TYPE_OPTIONS,
    ],
  },
  {
    name: 'use_yn',
    label: '사용여부',
    type: 'select',
    options: [
      { label: '전체', value: '' },
      ...USE_YN_OPTIONS,
    ],
  },
];

/* ── Component ─────────────────────────────────────── */

export default function ItemMasterPage() {
  /* ── State ─── */
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<ItemRow | null>(null);

  // History drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItemCd, setHistoryItemCd] = useState('');

  /* ── Data Fetching ─── */
  const fetchItems = useCallback(
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
            params[key] = val;
          }
        });

        const res = await apiClient.get<PaginatedResponse<ItemRow>>('/v1/items', { params });
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
        message.error(err?.response?.data?.message ?? '품목 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => {
    fetchItems(1, pagination.pageSize, sortField, sortOrder, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Search handler ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchItems(1, pagination.pageSize, sortField, sortOrder, values);
    },
    [fetchItems, pagination.pageSize, sortField, sortOrder],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchItems(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchItems, pagination.pageSize, sortField, sortOrder]);

  /* ── Table change (pagination + sort) ─── */
  const handleTableChange = useCallback(
    (
      paginationConfig: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: SorterResult<ItemRow> | SorterResult<ItemRow>[],
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
      fetchItems(newPage, newPageSize, newSortField, newSortOrder, filters);
    },
    [fetchItems, filters],
  );

  /* ── CRUD handlers ─── */
  const handleCreate = useCallback(() => {
    setEditItem(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: ItemRow) => {
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: ItemFormValues, mode: FormModalMode) => {
      if (mode === 'create') {
        await apiClient.post('/v1/items', {
          item_cd: values.item_cd,
          item_nm: values.item_nm,
          item_type: values.item_type,
          unit_cd: values.unit_cd || null,
          spec: values.spec || null,
          drawing_no: values.drawing_no || null,
          safety_stock: values.safety_stock ?? null,
        });
      } else {
        await apiClient.put(`/v1/items/${editItem!.item_cd}`, {
          item_nm: values.item_nm,
          item_type: values.item_type,
          unit_cd: values.unit_cd || null,
          spec: values.spec || null,
          drawing_no: values.drawing_no || null,
          safety_stock: values.safety_stock ?? null,
          use_yn: values.use_yn,
        });
      }
      fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: ItemRow) => {
      try {
        await apiClient.delete(`/v1/items/${record.item_cd}`);
        message.success('품목이 삭제되었습니다.');
        fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? '삭제에 실패했습니다.';
        message.error(msg);
      }
    },
    [fetchItems, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  /* ── History handler ─── */
  const handleHistory = useCallback((record: ItemRow) => {
    setHistoryItemCd(record.item_cd);
    setHistoryOpen(true);
  }, []);

  /* ── Excel download data fetcher ─── */
  const fetchExcelData = useCallback(async () => {
    const res = await apiClient.get<PaginatedResponse<ItemRow>>('/v1/items/export');
    return (res.data?.data ?? []) as Record<string, unknown>[];
  }, []);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return undefined;
    return {
      item_cd: editItem.item_cd,
      item_nm: editItem.item_nm,
      item_type: editItem.item_type,
      unit_cd: editItem.unit_cd ?? undefined,
      spec: editItem.spec ?? undefined,
      drawing_no: editItem.drawing_no ?? undefined,
      safety_stock: editItem.safety_stock != null ? Number(editItem.safety_stock) : undefined,
      use_yn: editItem.use_yn,
    } as Partial<ItemFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      {
        title: '품목코드',
        dataIndex: 'item_cd',
        width: 130,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '품목명',
        dataIndex: 'item_nm',
        width: 200,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '품목유형',
        dataIndex: 'item_type',
        width: 90,
        align: 'center' as const,
        sorter: true,
        render: (val: unknown) => {
          const v = val as string;
          return (
            <Tag color={ITEM_TYPE_COLOR[v] ?? 'default'}>
              {ITEM_TYPE_LABEL[v] ?? v}
            </Tag>
          );
        },
      },
      {
        title: '단위',
        dataIndex: 'unit_cd',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '규격',
        dataIndex: 'spec',
        width: 150,
        ellipsis: true,
      },
      {
        title: '도면번호',
        dataIndex: 'drawing_no',
        width: 130,
        ellipsis: true,
      },
      {
        title: '안전재고',
        dataIndex: 'safety_stock',
        width: 100,
        align: 'right' as const,
        sorter: true,
        render: (val: unknown) => {
          if (val == null) return '-';
          return Number(val).toLocaleString();
        },
      },
      {
        title: '사용여부',
        dataIndex: 'use_yn',
        width: 80,
        align: 'center' as const,
        render: (val: unknown) => (
          <Tag color={(val as string) === 'Y' ? 'green' : 'default'}>
            {(val as string) === 'Y' ? '사용' : '미사용'}
          </Tag>
        ),
      },
      {
        title: '등록일',
        dataIndex: 'create_dt',
        width: 110,
        sorter: true,
        render: (val: unknown) =>
          val ? dayjs(val as string).format('YYYY-MM-DD') : '-',
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 130,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: ItemRow) => (
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
              title="품목을 삭제하시겠습니까?"
              description="다른 데이터에서 참조 중인 경우 삭제가 거부됩니다."
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
            <Button
              size="small"
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handleHistory(record)}
            />
          </Space>
        ),
      },
    ],
    [handleEdit, handleDelete, handleHistory],
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
        extraButtons={
          <Space>
            <ExcelUploadButton
              uploadUrl="/v1/items/import"
              onComplete={() =>
                fetchItems(pagination.page, pagination.pageSize, sortField, sortOrder, filters)
              }
            />
            <ExcelDownloadButton
              filename="품목목록"
              columns={EXCEL_COLUMNS}
              data={fetchExcelData}
            />
          </Space>
        }
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
          품목 등록
        </PermissionButton>
      </div>

      {/* Table */}
      <Table<ItemRow>
        columns={columns}
        dataSource={items}
        rowKey="item_cd"
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

      {/* Create/Edit Modal */}
      <FormModal<ItemFormValues>
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '품목 등록' : '품목 수정'}
        width={560}
      >
        {(form, mode) => (
          <>
            <Form.Item
              name="item_cd"
              label="품목코드"
              rules={[
                { required: true, message: '품목코드를 입력하세요.' },
                { max: 30, message: '최대 30자까지 입력 가능합니다.' },
              ]}
            >
              <Input
                placeholder="품목코드 입력"
                disabled={mode === 'edit'}
                maxLength={30}
              />
            </Form.Item>
            <Form.Item
              name="item_nm"
              label="품목명"
              rules={[
                { required: true, message: '품목명을 입력하세요.' },
                { max: 200, message: '최대 200자까지 입력 가능합니다.' },
              ]}
            >
              <Input placeholder="품목명 입력" maxLength={200} />
            </Form.Item>
            <Form.Item
              name="item_type"
              label="품목유형"
              rules={[{ required: true, message: '품목유형을 선택하세요.' }]}
            >
              <Select
                placeholder="품목유형 선택"
                options={ITEM_TYPE_OPTIONS}
              />
            </Form.Item>
            <Form.Item name="unit_cd" label="단위">
              <CommonCodeSelect groupCd="UNIT" placeholder="단위 선택" />
            </Form.Item>
            <Form.Item name="spec" label="규격">
              <Input placeholder="규격 입력" />
            </Form.Item>
            <Form.Item name="drawing_no" label="도면번호">
              <Input placeholder="도면번호 입력" />
            </Form.Item>
            <Form.Item
              name="safety_stock"
              label="안전재고"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: '0 이상의 값을 입력하세요.',
                },
              ]}
            >
              <InputNumber
                placeholder="안전재고"
                min={0}
                style={{ width: '100%' }}
                precision={0}
              />
            </Form.Item>
            {mode === 'edit' && (
              <Form.Item name="use_yn" label="사용여부">
                <Select options={USE_YN_OPTIONS} />
              </Form.Item>
            )}
          </>
        )}
      </FormModal>

      {/* History Drawer */}
      <DataHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        tableName="tb_item"
        recordId={historyItemCd}
        title={`품목 변경이력 (${historyItemCd})`}
      />
    </div>
  );
}
