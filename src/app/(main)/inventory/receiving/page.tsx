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
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
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

interface IncomingDtlRow {
  incoming_dtl_id?: number;
  item_cd: string;
  lot_no?: string | null;
  incoming_qty: number;
  inspect_status?: string | null;
  item?: { item_nm: string } | null;
}

interface IncomingRow {
  incoming_id: number;
  incoming_no: string;
  cust_cd: string | null;
  status: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  customer?: { cust_nm: string } | null;
  details: IncomingDtlRow[];
  [key: string]: unknown;
}

interface IncomingFormValues {
  cust_cd: string;
  details: { item_cd: string; lot_no?: string | null; incoming_qty: number }[];
  [key: string]: unknown;
}

interface CustOption {
  cust_cd: string;
  cust_nm: string;
}

interface ItemOption {
  item_cd: string;
  item_nm: string;
}

interface WhOption {
  workshop_cd: string;
  workshop_nm: string;
}

const MENU_URL = '/inventory/receive';

/* ── Status config ─── */

const STATUS_OPTIONS = [
  { label: '계획', value: 'PLAN' },
  { label: '확인', value: 'CONFIRMED' },
  { label: '취소', value: 'CANCELLED' },
];

const STATUS_LABEL: Record<string, string> = {
  PLAN: '계획',
  CONFIRMED: '확인',
  CANCELLED: '취소',
};

const STATUS_COLOR: Record<string, string> = {
  PLAN: 'blue',
  CONFIRMED: 'green',
  CANCELLED: 'red',
};

const INSPECT_LABEL: Record<string, string> = {
  PENDING: '대기',
  PASS: '합격',
  FAIL: '불합격',
};

const INSPECT_COLOR: Record<string, string> = {
  PENDING: 'default',
  PASS: 'green',
  FAIL: 'red',
};

/* ── Search fields ─── */

const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'incoming_no', label: '입고번호', type: 'text', placeholder: '입고번호 입력' },
  {
    name: 'status',
    label: '상태',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...STATUS_OPTIONS],
  },
  { name: 'cust_cd', label: '거래처코드', type: 'text', placeholder: '거래처코드 입력' },
];

/* ── Component ─────────────────────────────────────── */

export default function IncomingPage() {
  /* ── State ─── */
  const [incomings, setIncomings] = useState<IncomingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // CRUD Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<IncomingRow | null>(null);

  // Detail Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<IncomingRow | null>(null);

  // Confirm Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<IncomingRow | null>(null);
  const [confirmForm] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Lookup data
  const [custOptions, setCustOptions] = useState<{ label: string; value: string }[]>([]);
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);
  const [whOptions, setWhOptions] = useState<{ label: string; value: string }[]>([]);

  /* ── Load dropdown options ─── */
  useEffect(() => {
    apiClient
      .get<PaginatedResponse<CustOption>>('/v1/customers', { params: { limit: 9999 } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setCustOptions(list.map((c) => ({ label: `${c.cust_cd} - ${c.cust_nm}`, value: c.cust_cd })));
      })
      .catch(() => {});

    apiClient
      .get<PaginatedResponse<ItemOption>>('/v1/items', { params: { limit: 9999, use_yn: 'Y' } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setItemOptions(list.map((i) => ({ label: `${i.item_cd} - ${i.item_nm}`, value: i.item_cd })));
      })
      .catch(() => {});

    apiClient
      .get<PaginatedResponse<WhOption>>('/v1/workshops', { params: { limit: 9999 } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setWhOptions(list.map((w) => ({ label: `${w.workshop_cd} - ${w.workshop_nm}`, value: w.workshop_cd })));
      })
      .catch(() => {});
  }, []);

  /* ── Data Fetching ─── */
  const fetchIncomings = useCallback(
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

        const res = await apiClient.get<PaginatedResponse<IncomingRow>>('/v1/incomings', { params });
        const body = res.data;
        setIncomings(body.data ?? []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            pageSize: body.pagination.pageSize,
            total: body.pagination.total,
          });
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        message.error(e?.response?.data?.message ?? '입고 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => {
    fetchIncomings(1, pagination.pageSize, sortField, sortOrder, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Search handler ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchIncomings(1, pagination.pageSize, sortField, sortOrder, values);
    },
    [fetchIncomings, pagination.pageSize, sortField, sortOrder],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchIncomings(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchIncomings, pagination.pageSize, sortField, sortOrder]);

  /* ── Table change ─── */
  const handleTableChange = useCallback(
    (
      paginationConfig: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: SorterResult<IncomingRow> | SorterResult<IncomingRow>[],
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
      fetchIncomings(newPage, newPageSize, newSortField, newSortOrder, filters);
    },
    [fetchIncomings, filters],
  );

  /* ── CRUD handlers ─── */
  const handleCreate = useCallback(() => {
    setEditItem(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: IncomingRow) => {
    if (record.status !== 'PLAN') {
      message.warning('계획(PLAN) 상태에서만 수정할 수 있습니다.');
      return;
    }
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: IncomingFormValues, mode: FormModalMode) => {
      const payload = {
        cust_cd: values.cust_cd,
        details: (values.details ?? []).map((d) => ({
          item_cd: d.item_cd,
          lot_no: d.lot_no || null,
          incoming_qty: d.incoming_qty,
        })),
      };

      if (mode === 'create') {
        await apiClient.post('/v1/incomings', payload);
      } else {
        await apiClient.put(`/v1/incomings/${editItem!.incoming_id}`, payload);
      }
      fetchIncomings(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchIncomings, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: IncomingRow) => {
      try {
        await apiClient.delete(`/v1/incomings/${record.incoming_id}`);
        message.success('입고가 삭제되었습니다.');
        fetchIncomings(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        message.error(e?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [fetchIncomings, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  /* ── Detail view ─── */
  const handleViewDetail = useCallback(async (record: IncomingRow) => {
    try {
      const res = await apiClient.get<{ data: IncomingRow }>(`/v1/incomings/${record.incoming_id}`);
      setDetailItem(res.data.data);
      setDetailOpen(true);
    } catch {
      setDetailItem(record);
      setDetailOpen(true);
    }
  }, []);

  /* ── Confirm handlers ─── */
  const handleConfirmOpen = useCallback((record: IncomingRow) => {
    setConfirmTarget(record);
    confirmForm.resetFields();
    setConfirmOpen(true);
  }, [confirmForm]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!confirmTarget) return;
    try {
      const values = await confirmForm.validateFields();
      setConfirmLoading(true);
      await apiClient.patch(`/v1/incomings/${confirmTarget.incoming_id}/confirm`, {
        wh_cd: values.wh_cd,
      });
      message.success('입고 확인이 완료되었습니다.');
      setConfirmOpen(false);
      setConfirmTarget(null);
      setDetailOpen(false);
      setDetailItem(null);
      fetchIncomings(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message ?? '입고 확인에 실패했습니다.');
    } finally {
      setConfirmLoading(false);
    }
  }, [confirmTarget, confirmForm, fetchIncomings, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return { details: [{ item_cd: undefined, lot_no: null, incoming_qty: 1 }] } as unknown as Partial<IncomingFormValues>;
    return {
      cust_cd: editItem.cust_cd,
      details: (editItem.details ?? []).map((d) => ({
        item_cd: d.item_cd,
        lot_no: d.lot_no ?? null,
        incoming_qty: d.incoming_qty != null ? Number(d.incoming_qty) : 1,
      })),
    } as Partial<IncomingFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      {
        title: '입고번호',
        dataIndex: 'incoming_no',
        width: 160,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '거래처',
        dataIndex: ['customer', 'cust_nm'],
        width: 150,
        ellipsis: true,
        render: (_: unknown, record: IncomingRow) => record.customer?.cust_nm ?? record.cust_cd ?? '-',
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
        title: '상세 품목수',
        dataIndex: 'details',
        width: 100,
        align: 'center' as const,
        render: (details: IncomingDtlRow[]) => details?.length ?? 0,
      },
      {
        title: '등록일',
        dataIndex: 'create_dt',
        width: 160,
        sorter: true,
        render: (val: unknown) => (val ? dayjs(val as string).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '등록자',
        dataIndex: 'create_by',
        width: 100,
        ellipsis: true,
      },
      {
        title: '관리',
        dataIndex: '_action',
        width: 200,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: IncomingRow) => {
          const isPlan = record.status === 'PLAN';

          return (
            <Space size={4}>
              {/* View detail */}
              <Button
                size="small"
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(record)}
                title="상세"
              />

              {/* Confirm */}
              {isPlan && (
                <PermissionButton
                  action="update"
                  menuUrl={MENU_URL}
                  fallback="hide"
                  size="small"
                  type="text"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleConfirmOpen(record)}
                  title="입고확인"
                >
                  {''}
                </PermissionButton>
              )}

              {/* Edit */}
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

              {/* Delete */}
              {isPlan ? (
                <Popconfirm
                  title="입고를 삭제하시겠습니까?"
                  description="계획 상태에서만 삭제할 수 있습니다."
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
    [handleEdit, handleDelete, handleViewDetail, handleConfirmOpen],
  );

  /* ── Detail columns ─── */
  const detailColumns = useMemo(
    () => [
      {
        title: '품목코드',
        dataIndex: 'item_cd',
        width: 120,
      },
      {
        title: '품목명',
        dataIndex: ['item', 'item_nm'],
        width: 150,
        render: (_: unknown, record: IncomingDtlRow) => record.item?.item_nm ?? '-',
      },
      {
        title: 'LOT 번호',
        dataIndex: 'lot_no',
        width: 140,
        render: (val: unknown) => (val as string) || '-',
      },
      {
        title: '입고수량',
        dataIndex: 'incoming_qty',
        width: 100,
        align: 'right' as const,
        render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '-'),
      },
      {
        title: '검사상태',
        dataIndex: 'inspect_status',
        width: 90,
        align: 'center' as const,
        render: (val: unknown) => {
          const v = val as string;
          if (!v) return '-';
          return <Tag color={INSPECT_COLOR[v] ?? 'default'}>{INSPECT_LABEL[v] ?? v}</Tag>;
        },
      },
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
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          입고 등록
        </PermissionButton>
      </div>

      {/* Table */}
      <Table<IncomingRow>
        columns={columns}
        dataSource={incomings}
        rowKey="incoming_id"
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

      {/* Create/Edit Modal */}
      <FormModal<IncomingFormValues>
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '입고 등록' : '입고 수정'}
        width={720}
        layout="vertical"
      >
        {() => (
          <>
            <Form.Item
              name="cust_cd"
              label="거래처"
              rules={[{ required: true, message: '거래처를 선택하세요.' }]}
            >
              <Select
                placeholder="거래처 선택"
                options={custOptions}
                allowClear
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>

            <Form.List name="details">
              {(fields, { add, remove }) => (
                <>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>입고 상세</div>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'item_cd']}
                        rules={[{ required: true, message: '품목 선택' }]}
                        style={{ width: 220 }}
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
                        {...restField}
                        name={[name, 'lot_no']}
                        style={{ width: 140 }}
                      >
                        <Input placeholder="LOT 번호" allowClear />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'incoming_qty']}
                        rules={[
                          { required: true, message: '수량 입력' },
                          { type: 'number', min: 0.01, message: '0보다 커야 합니다' },
                        ]}
                        style={{ width: 120 }}
                      >
                        <InputNumber placeholder="입고수량" min={0.01} style={{ width: '100%' }} />
                      </Form.Item>
                      {fields.length > 1 && (
                        <MinusCircleOutlined
                          onClick={() => remove(name)}
                          style={{ color: '#ff4d4f' }}
                        />
                      )}
                    </Space>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add({ item_cd: undefined, lot_no: null, incoming_qty: 1 })}
                      block
                      icon={<PlusOutlined />}
                    >
                      상세 추가
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </>
        )}
      </FormModal>

      {/* Detail Modal */}
      <Modal
        title={`입고 상세 — ${detailItem?.incoming_no ?? ''}`}
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailItem(null);
        }}
        footer={
          <Space>
            {detailItem?.status === 'PLAN' && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  if (detailItem) handleConfirmOpen(detailItem);
                }}
              >
                입고확인
              </Button>
            )}
            <Button onClick={() => { setDetailOpen(false); setDetailItem(null); }}>
              닫기
            </Button>
          </Space>
        }
        width={700}
        destroyOnClose
      >
        {detailItem && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="입고번호">{detailItem.incoming_no}</Descriptions.Item>
              <Descriptions.Item label="상태">
                <Tag color={STATUS_COLOR[detailItem.status] ?? 'default'}>
                  {STATUS_LABEL[detailItem.status] ?? detailItem.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="거래처">
                {detailItem.customer?.cust_nm ?? detailItem.cust_cd ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="등록일">
                {detailItem.create_dt ? dayjs(detailItem.create_dt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="등록자">{detailItem.create_by ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="수정자">{detailItem.update_by ?? '-'}</Descriptions.Item>
            </Descriptions>
            <Table
              columns={detailColumns}
              dataSource={detailItem.details ?? []}
              rowKey={(r) => r.incoming_dtl_id?.toString() ?? `${r.item_cd}-${r.lot_no}`}
              size="small"
              pagination={false}
            />
          </>
        )}
      </Modal>

      {/* Confirm Modal */}
      <Modal
        title={`입고확인 — ${confirmTarget?.incoming_no ?? ''}`}
        open={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onOk={handleConfirmSubmit}
        confirmLoading={confirmLoading}
        okText="입고확인"
        cancelText="취소"
        destroyOnClose
        width={500}
      >
        <Form form={confirmForm} layout="vertical">
          <Form.Item
            name="wh_cd"
            label="입고 창고"
            rules={[{ required: true, message: '창고를 선택하세요.' }]}
          >
            <Select
              placeholder="창고 선택"
              options={whOptions}
              allowClear
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
