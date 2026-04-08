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

interface IssueDtlRow {
  issue_dtl_id?: number;
  item_cd: string;
  lot_no?: string | null;
  request_qty: number;
  issue_qty?: number | null;
  item?: { item_nm: string } | null;
}

interface IssueRow {
  issue_id: number;
  issue_no: string;
  wo_id: number | null;
  status: string;
  create_by: string | null;
  create_dt: string;
  update_by: string | null;
  update_dt: string | null;
  work_order?: { wo_no: string } | null;
  details: IssueDtlRow[];
  [key: string]: unknown;
}

interface IssueFormValues {
  wo_id?: number | null;
  details: { item_cd: string; lot_no?: string | null; request_qty: number }[];
  [key: string]: unknown;
}

interface ProcessDtlInput {
  issue_dtl_id: number;
  issue_qty: number;
}

interface ItemOption {
  item_cd: string;
  item_nm: string;
}

interface WoOption {
  wo_id: number;
  wo_no: string;
}

interface WhOption {
  wh_cd: string;
  wh_nm: string;
}

const MENU_URL = '/inventory/issue';

/* ── Status config ─── */

const STATUS_OPTIONS = [
  { label: '요청', value: 'REQUESTED' },
  { label: '불출', value: 'ISSUED' },
  { label: '취소', value: 'CANCELLED' },
];

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: '요청',
  ISSUED: '불출',
  CANCELLED: '취소',
};

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: 'blue',
  ISSUED: 'green',
  CANCELLED: 'red',
};

/* ── Search fields ─── */

const SEARCH_FIELDS: SearchFieldDef[] = [
  { name: 'issue_no', label: '불출번호', type: 'text', placeholder: '불출번호 입력' },
  {
    name: 'status',
    label: '상태',
    type: 'select',
    options: [{ label: '전체', value: '' }, ...STATUS_OPTIONS],
  },
  { name: 'wo_id', label: '작업지시 ID', type: 'text', placeholder: '작업지시 ID 입력' },
];

/* ── Component ─────────────────────────────────────── */

export default function MaterialIssuePage() {
  /* ── State ─── */
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  // CRUD Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormModalMode>('create');
  const [editItem, setEditItem] = useState<IssueRow | null>(null);

  // Detail Modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<IssueRow | null>(null);

  // Process Modal
  const [processOpen, setProcessOpen] = useState(false);
  const [processTarget, setProcessTarget] = useState<IssueRow | null>(null);
  const [processForm] = Form.useForm();
  const [processLoading, setProcessLoading] = useState(false);

  // Lookup data
  const [itemOptions, setItemOptions] = useState<{ label: string; value: string }[]>([]);
  const [woOptions, setWoOptions] = useState<{ label: string; value: number }[]>([]);
  const [whOptions, setWhOptions] = useState<{ label: string; value: string }[]>([]);

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
      .get<PaginatedResponse<WoOption>>('/v1/work-orders', { params: { limit: 9999 } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setWoOptions(list.map((w) => ({ label: w.wo_no, value: w.wo_id })));
      })
      .catch(() => {});

    apiClient
      .get<PaginatedResponse<WhOption>>('/v1/workshops', { params: { limit: 9999, type: 'WAREHOUSE' } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setWhOptions(list.map((w) => ({ label: `${w.wh_cd} - ${w.wh_nm}`, value: w.wh_cd })));
      })
      .catch(() => {});
  }, []);

  /* ── Data Fetching ─── */
  const fetchIssues = useCallback(
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

        const res = await apiClient.get<PaginatedResponse<IssueRow>>('/v1/material-issues', { params });
        const body = res.data;
        setIssues(body.data ?? []);
        if (body.pagination) {
          setPagination({
            page: body.pagination.page,
            pageSize: body.pagination.pageSize,
            total: body.pagination.total,
          });
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        message.error(e?.response?.data?.message ?? '불출 목록 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.page, pagination.pageSize],
  );

  useEffect(() => {
    fetchIssues(1, pagination.pageSize, sortField, sortOrder, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Search handler ─── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      setFilters(values);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchIssues(1, pagination.pageSize, sortField, sortOrder, values);
    },
    [fetchIssues, pagination.pageSize, sortField, sortOrder],
  );

  const handleSearchReset = useCallback(() => {
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchIssues(1, pagination.pageSize, sortField, sortOrder, {});
  }, [fetchIssues, pagination.pageSize, sortField, sortOrder]);

  /* ── Table change ─── */
  const handleTableChange = useCallback(
    (
      paginationConfig: TablePaginationConfig,
      _filters: Record<string, unknown>,
      sorter: SorterResult<IssueRow> | SorterResult<IssueRow>[],
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
      fetchIssues(newPage, newPageSize, newSortField, newSortOrder, filters);
    },
    [fetchIssues, filters],
  );

  /* ── CRUD handlers ─── */
  const handleCreate = useCallback(() => {
    setEditItem(null);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: IssueRow) => {
    if (record.status !== 'REQUESTED') {
      message.warning('요청(REQUESTED) 상태에서만 수정할 수 있습니다.');
      return;
    }
    setEditItem(record);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (values: IssueFormValues, mode: FormModalMode) => {
      const payload = {
        wo_id: values.wo_id ?? null,
        details: (values.details ?? []).map((d) => ({
          item_cd: d.item_cd,
          lot_no: d.lot_no || null,
          request_qty: d.request_qty,
        })),
      };

      if (mode === 'create') {
        await apiClient.post('/v1/material-issues', payload);
      } else {
        await apiClient.put(`/v1/material-issues/${editItem!.issue_id}`, payload);
      }
      fetchIssues(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    },
    [editItem, fetchIssues, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  const handleDelete = useCallback(
    async (record: IssueRow) => {
      try {
        await apiClient.delete(`/v1/material-issues/${record.issue_id}`);
        message.success('불출요청이 삭제되었습니다.');
        fetchIssues(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        message.error(e?.response?.data?.message ?? '삭제에 실패했습니다.');
      }
    },
    [fetchIssues, pagination.page, pagination.pageSize, sortField, sortOrder, filters],
  );

  /* ── Detail view ─── */
  const handleViewDetail = useCallback(async (record: IssueRow) => {
    try {
      const res = await apiClient.get<{ data: IssueRow }>(`/v1/material-issues/${record.issue_id}`);
      setDetailItem(res.data.data);
      setDetailOpen(true);
    } catch {
      // fallback to list data
      setDetailItem(record);
      setDetailOpen(true);
    }
  }, []);

  /* ── Process handlers ─── */
  const handleProcessOpen = useCallback(async (record: IssueRow) => {
    try {
      const res = await apiClient.get<{ data: IssueRow }>(`/v1/material-issues/${record.issue_id}`);
      const freshData = res.data.data;
      setProcessTarget(freshData);
      processForm.setFieldsValue({
        wh_cd: undefined,
        details: (freshData.details ?? []).map((d) => ({
          issue_dtl_id: d.issue_dtl_id,
          issue_qty: d.request_qty,
        })),
      });
      setProcessOpen(true);
    } catch {
      setProcessTarget(record);
      processForm.setFieldsValue({
        wh_cd: undefined,
        details: (record.details ?? []).map((d) => ({
          issue_dtl_id: d.issue_dtl_id,
          issue_qty: d.request_qty,
        })),
      });
      setProcessOpen(true);
    }
  }, [processForm]);

  const handleProcessSubmit = useCallback(async () => {
    if (!processTarget) return;
    try {
      const values = await processForm.validateFields();
      setProcessLoading(true);
      await apiClient.patch(`/v1/material-issues/${processTarget.issue_id}/process`, {
        wh_cd: values.wh_cd,
        details: (values.details ?? []).map((d: ProcessDtlInput) => ({
          issue_dtl_id: d.issue_dtl_id,
          issue_qty: d.issue_qty,
        })),
      });
      message.success('불출 처리가 완료되었습니다.');
      setProcessOpen(false);
      setProcessTarget(null);
      fetchIssues(pagination.page, pagination.pageSize, sortField, sortOrder, filters);
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message ?? '불출 처리에 실패했습니다.');
    } finally {
      setProcessLoading(false);
    }
  }, [processTarget, processForm, fetchIssues, pagination.page, pagination.pageSize, sortField, sortOrder, filters]);

  /* ── Modal initial values ─── */
  const modalInitialValues = useMemo(() => {
    if (!editItem) return { details: [{ item_cd: undefined, lot_no: null, request_qty: 1 }] } as unknown as Partial<IssueFormValues>;
    return {
      wo_id: editItem.wo_id,
      details: (editItem.details ?? []).map((d) => ({
        item_cd: d.item_cd,
        lot_no: d.lot_no ?? null,
        request_qty: d.request_qty != null ? Number(d.request_qty) : 1,
      })),
    } as Partial<IssueFormValues>;
  }, [editItem]);

  /* ── Table columns ─── */
  const columns = useMemo(
    () => [
      {
        title: '불출번호',
        dataIndex: 'issue_no',
        width: 160,
        sorter: true,
        ellipsis: true,
      },
      {
        title: '작업지시',
        dataIndex: ['work_order', 'wo_no'],
        width: 150,
        ellipsis: true,
        render: (_: unknown, record: IssueRow) => record.work_order?.wo_no ?? '-',
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
        render: (details: IssueDtlRow[]) => details?.length ?? 0,
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
        render: (_: unknown, record: IssueRow) => {
          const isRequested = record.status === 'REQUESTED';

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

              {/* Process */}
              {isRequested && (
                <PermissionButton
                  action="update"
                  menuUrl={MENU_URL}
                  fallback="hide"
                  size="small"
                  type="text"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleProcessOpen(record)}
                  title="불출처리"
                >
                  {''}
                </PermissionButton>
              )}

              {/* Edit */}
              {isRequested ? (
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
              {isRequested ? (
                <Popconfirm
                  title="불출요청을 삭제하시겠습니까?"
                  description="요청 상태에서만 삭제할 수 있습니다."
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
    [handleEdit, handleDelete, handleViewDetail, handleProcessOpen],
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
        render: (_: unknown, record: IssueDtlRow) => record.item?.item_nm ?? '-',
      },
      {
        title: 'LOT 번호',
        dataIndex: 'lot_no',
        width: 140,
        render: (val: unknown) => (val as string) || '-',
      },
      {
        title: '요청수량',
        dataIndex: 'request_qty',
        width: 100,
        align: 'right' as const,
        render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '-'),
      },
      {
        title: '불출수량',
        dataIndex: 'issue_qty',
        width: 100,
        align: 'right' as const,
        render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '-'),
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
          불출요청 등록
        </PermissionButton>
      </div>

      {/* Table */}
      <Table<IssueRow>
        columns={columns}
        dataSource={issues}
        rowKey="issue_id"
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
      <FormModal<IssueFormValues>
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues}
        title={modalMode === 'create' ? '불출요청 등록' : '불출요청 수정'}
        width={720}
        layout="vertical"
      >
        {(form, _mode) => (
          <>
            <Form.Item name="wo_id" label="작업지시">
              <Select
                placeholder="작업지시 선택 (선택사항)"
                options={woOptions}
                allowClear
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>

            <Form.List name="details">
              {(fields, { add, remove }) => (
                <>
                  <div style={{ marginBottom: 8, fontWeight: 500 }}>불출 상세</div>
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
                        name={[name, 'request_qty']}
                        rules={[
                          { required: true, message: '수량 입력' },
                          { type: 'number', min: 0.01, message: '0보다 커야 합니다' },
                        ]}
                        style={{ width: 120 }}
                      >
                        <InputNumber placeholder="요청수량" min={0.01} style={{ width: '100%' }} />
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
                      onClick={() => add({ item_cd: undefined, lot_no: null, request_qty: 1 })}
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
        title={`불출 상세 — ${detailItem?.issue_no ?? ''}`}
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailItem(null);
        }}
        footer={
          <Space>
            {detailItem?.status === 'REQUESTED' && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setDetailOpen(false);
                  if (detailItem) handleProcessOpen(detailItem);
                }}
              >
                불출처리
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
              <Descriptions.Item label="불출번호">{detailItem.issue_no}</Descriptions.Item>
              <Descriptions.Item label="상태">
                <Tag color={STATUS_COLOR[detailItem.status] ?? 'default'}>
                  {STATUS_LABEL[detailItem.status] ?? detailItem.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="작업지시">
                {detailItem.work_order?.wo_no ?? '-'}
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
              rowKey={(r) => r.issue_dtl_id?.toString() ?? `${r.item_cd}-${r.lot_no}`}
              size="small"
              pagination={false}
            />
          </>
        )}
      </Modal>

      {/* Process Modal */}
      <Modal
        title={`불출처리 — ${processTarget?.issue_no ?? ''}`}
        open={processOpen}
        onCancel={() => {
          setProcessOpen(false);
          setProcessTarget(null);
        }}
        onOk={handleProcessSubmit}
        confirmLoading={processLoading}
        okText="불출처리"
        cancelText="취소"
        destroyOnClose
        width={700}
      >
        <Form form={processForm} layout="vertical">
          <Form.Item
            name="wh_cd"
            label="출고 창고"
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

          <div style={{ marginBottom: 8, fontWeight: 500 }}>불출 상세</div>
          <Table
            size="small"
            pagination={false}
            dataSource={processTarget?.details ?? []}
            rowKey={(r) => r.issue_dtl_id?.toString() ?? r.item_cd}
            columns={[
              {
                title: '품목',
                dataIndex: 'item_cd',
                width: 120,
                render: (_: unknown, record: IssueDtlRow) =>
                  record.item?.item_nm ? `${record.item_cd} - ${record.item.item_nm}` : record.item_cd,
              },
              {
                title: 'LOT',
                dataIndex: 'lot_no',
                width: 120,
                render: (val: unknown) => (val as string) || '-',
              },
              {
                title: '요청수량',
                dataIndex: 'request_qty',
                width: 100,
                align: 'right' as const,
                render: (val: unknown) => (val != null ? Number(val).toLocaleString() : '-'),
              },
              {
                title: '불출수량',
                width: 120,
                render: (_: unknown, __: unknown, index: number) => (
                  <>
                    <Form.Item name={['details', index, 'issue_dtl_id']} hidden>
                      <InputNumber />
                    </Form.Item>
                    <Form.Item
                      name={['details', index, 'issue_qty']}
                      rules={[
                        { required: true, message: '필수' },
                        { type: 'number', min: 0.01, message: '0보다 커야 합니다' },
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber min={0.01} style={{ width: '100%' }} />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
}
