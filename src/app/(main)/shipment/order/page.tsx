'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import DatePicker from 'antd/es/date-picker';
import dayjs from 'dayjs';
import DataGrid, { type DataGridColumn } from '@/components/common/DataGrid';
import ExcelDownloadButton from '@/components/common/ExcelDownloadButton';
import FormModal from '@/components/common/FormModal';
import SearchForm, { type SearchFieldDef } from '@/components/common/SearchForm';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';

/* ── Types ─────────────────────────────────────────── */

interface ShipmentDetail {
  ship_dtl_id: number;
  item_cd: string;
  lot_no: string | null;
  order_qty: number;
  actual_qty: number | null;
  item?: { item_nm: string };
  lot?: { lot_qty: number; lot_status: string; wh_cd: string };
}

interface Shipment {
  ship_id: number;
  ship_no: string;
  cust_cd: string;
  status: string;
  plan_dt: string | null;
  actual_ship_dt: string | null;
  cancel_reason: string | null;
  cancel_by: string | null;
  cancel_dt: string | null;
  remark: string | null;
  create_by: string | null;
  create_dt: string;
  customer?: { cust_nm: string };
  details: ShipmentDetail[];
  [key: string]: unknown;
}

interface EligibleLot {
  lot_no: string;
  item_cd: string;
  lot_qty: number;
  lot_status: string;
  wh_cd: string;
}

interface FormDetailRow {
  key: string;
  item_cd: string;
  lot_no: string | null;
  order_qty: number;
  lot_qty?: number;
}

/* ── Search field definitions ───────────────────── */

const SEARCH_FIELDS: SearchFieldDef[] = [
  {
    name: 'cust_cd',
    label: '거래처',
    type: 'text',
    placeholder: '거래처코드 입력',
  },
  {
    name: 'item_cd',
    label: '품목',
    type: 'text',
    placeholder: '품목코드 입력',
  },
  {
    name: 'date_range',
    label: '기간',
    type: 'dateRange',
  },
  {
    name: 'status',
    label: '상태',
    type: 'select',
    options: [
      { value: 'PLAN', label: '지시등록' },
      { value: 'SHIPPED', label: '출하완료' },
      { value: 'CANCEL_REQ', label: '취소요청중' },
      { value: 'CANCELLED', label: '취소됨' },
    ],
  },
];

/* ── Excel columns ────────────────────────────────── */

const EXCEL_COLUMNS = [
  { header: '출하번호', key: 'ship_no', width: 18 },
  { header: '거래처', key: 'cust_nm', width: 20 },
  { header: '상태', key: 'status_label', width: 14 },
  { header: '지시일', key: 'plan_dt', width: 14 },
  { header: '지시수량', key: 'total_order_qty', width: 12 },
];

/* ── Status helpers ─────────────────────────────── */

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PLAN: { label: '지시등록', color: 'warning' },
  SHIPPED: { label: '출하완료', color: 'success' },
  CANCEL_REQ: { label: '취소요청중', color: 'processing' },
  CANCELLED: { label: '취소됨', color: 'default' },
};

function StatusTag({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, color: 'default' };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
}

/* ── Component ────────────────────────────────────── */

export default function ShipmentOrderPage() {
  const { user } = useAuthStore();
  const isAdmin =
    user?.roleCd === 'SYS_ADMIN' || user?.roleCd === 'PROD_MGR';

  /* ── List state ─────────────────────────────────── */
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useState<Record<string, unknown>>({});

  /* ── Main modal state ───────────────────────────── */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>(
    'create',
  );
  const [selectedShipment, setSelectedShipment] = useState<
    Shipment | undefined
  >();

  /* ── LOT add section state ──────────────────────── */
  const [formDetails, setFormDetails] = useState<FormDetailRow[]>([]);
  const [addItemCd, setAddItemCd] = useState<string>('');
  const [addLotNo, setAddLotNo] = useState<string | null>(null);
  const [addOrderQty, setAddOrderQty] = useState<number>(1);
  const [eligibleLots, setEligibleLots] = useState<EligibleLot[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);

  /* ── Cancel request modal state ─────────────────── */
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelShipId, setCancelShipId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  /* ── Fetch shipments ────────────────────────────── */
  const fetchShipments = useCallback(
    async (p = page, ps = pageSize, params = searchParams) => {
      setLoading(true);
      try {
        const res = await apiClient.get('/v1/shipments', {
          params: { page: p, limit: ps, ...params },
        });
        const { data: rows, pagination } = res.data;
        setShipments(Array.isArray(rows) ? rows : []);
        setTotal(pagination?.total ?? 0);
      } catch {
        setShipments([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, searchParams],
  );

  useEffect(() => {
    fetchShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Search handlers ─────────────────────────────── */
  const handleSearch = useCallback(
    (values: Record<string, unknown>) => {
      const params: Record<string, unknown> = {};
      if (values.cust_cd) params.cust_cd = values.cust_cd;
      if (values.item_cd) params.item_cd = values.item_cd;
      if (values.status) params.status = values.status;
      if (
        Array.isArray(values.date_range) &&
        values.date_range.length === 2
      ) {
        params.start_dt = values.date_range[0];
        params.end_dt = values.date_range[1];
      }
      setSearchParams(params);
      setPage(1);
      fetchShipments(1, pageSize, params);
    },
    [fetchShipments, pageSize],
  );

  const handleReset = useCallback(() => {
    setSearchParams({});
    setPage(1);
    fetchShipments(1, pageSize, {});
  }, [fetchShipments, pageSize]);

  const handlePageChange = useCallback(
    (p: number, ps: number) => {
      setPage(p);
      setPageSize(ps);
      fetchShipments(p, ps, searchParams);
    },
    [fetchShipments, searchParams],
  );

  /* ── Delete ─────────────────────────────────────── */
  const handleDelete = useCallback(
    (shipId: number) => {
      Modal.confirm({
        title: '출하지시 삭제',
        content: '이 출하지시를 삭제하시겠습니까?',
        okType: 'danger',
        onOk: async () => {
          try {
            await apiClient.delete(`/v1/shipments/${shipId}`);
            message.success('출하지시가 삭제되었습니다.');
            fetchShipments(1, pageSize, searchParams);
            setPage(1);
          } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } }; message?: string };
            message.error(
              e?.response?.data?.error ?? e?.message ?? '삭제에 실패했습니다.',
            );
          }
        },
      });
    },
    [fetchShipments, pageSize, searchParams],
  );

  /* ── Cancel request ─────────────────────────────── */
  const openCancelModal = useCallback((shipId: number) => {
    setCancelShipId(shipId);
    setCancelReason('');
    setCancelModalOpen(true);
  }, []);

  const handleCancelRequest = useCallback(async () => {
    if (!cancelShipId || !cancelReason.trim()) {
      message.warning('취소 사유를 입력하세요.');
      return;
    }
    try {
      await apiClient.patch(`/v1/shipments/${cancelShipId}/cancel-request`, {
        cancel_reason: cancelReason.trim(),
      });
      message.success(
        '취소 요청이 접수되었습니다. 관리자 승인을 기다립니다.',
      );
      setCancelModalOpen(false);
      fetchShipments(1, pageSize, searchParams);
      setPage(1);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      message.error(e?.response?.data?.error ?? e?.message ?? '취소 요청에 실패했습니다.');
    }
  }, [cancelShipId, cancelReason, fetchShipments, pageSize, searchParams]);

  /* ── Cancel approve / reject ─────────────────────── */
  const handleCancelApprove = useCallback(
    (shipId: number) => {
      Modal.confirm({
        title: '취소 승인',
        content: '취소를 승인하시겠습니까? 재고가 복원됩니다.',
        onOk: async () => {
          try {
            await apiClient.patch(`/v1/shipments/${shipId}/cancel-approve`);
            message.success('취소가 승인되었습니다. 재고가 복원되었습니다.');
            fetchShipments(1, pageSize, searchParams);
            setPage(1);
          } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } }; message?: string };
            message.error(
              e?.response?.data?.error ?? e?.message ?? '승인 처리에 실패했습니다.',
            );
          }
        },
      });
    },
    [fetchShipments, pageSize, searchParams],
  );

  const handleCancelReject = useCallback(
    (shipId: number) => {
      Modal.confirm({
        title: '취소 반려',
        content: '취소 요청을 반려하시겠습니까?',
        onOk: async () => {
          try {
            await apiClient.patch(`/v1/shipments/${shipId}/cancel-reject`);
            message.success('취소 요청이 반려되었습니다.');
            fetchShipments(1, pageSize, searchParams);
            setPage(1);
          } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } }; message?: string };
            message.error(
              e?.response?.data?.error ?? e?.message ?? '반려 처리에 실패했습니다.',
            );
          }
        },
      });
    },
    [fetchShipments, pageSize, searchParams],
  );

  /* ── Modal open helpers ─────────────────────────── */
  const handleCreate = useCallback(() => {
    setSelectedShipment(undefined);
    setFormDetails([]);
    setAddItemCd('');
    setAddLotNo(null);
    setAddOrderQty(1);
    setEligibleLots([]);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((ship: Shipment) => {
    setSelectedShipment(ship);
    setFormDetails(
      (ship.details ?? []).map((d) => ({
        key: String(d.ship_dtl_id),
        item_cd: d.item_cd,
        lot_no: d.lot_no,
        order_qty: d.order_qty,
        lot_qty: d.lot?.lot_qty,
      })),
    );
    setAddItemCd('');
    setAddLotNo(null);
    setAddOrderQty(1);
    setEligibleLots([]);
    setModalMode('edit');
    setModalOpen(true);
  }, []);

  const handleView = useCallback((ship: Shipment) => {
    setSelectedShipment(ship);
    setModalMode('view');
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedShipment(undefined);
    setFormDetails([]);
  }, []);

  /* ── Eligible lots fetch ─────────────────────────── */
  const fetchEligibleLots = useCallback(async (itemCd: string) => {
    if (!itemCd) {
      setEligibleLots([]);
      return;
    }
    setLotsLoading(true);
    try {
      const res = await apiClient.get('/v1/shipments/eligible-lots', {
        params: { item_cd: itemCd },
      });
      setEligibleLots(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setEligibleLots([]);
    } finally {
      setLotsLoading(false);
    }
  }, []);

  /* ── Add LOT row ─────────────────────────────────── */
  const handleAddDetail = useCallback(() => {
    if (!addItemCd || !addLotNo || addOrderQty < 1) {
      message.warning('품목, LOT번호, 수량을 입력하세요.');
      return;
    }
    const lot = eligibleLots.find((l) => l.lot_no === addLotNo);
    setFormDetails((prev) => [
      ...prev,
      {
        key: `${addItemCd}-${addLotNo}-${Date.now()}`,
        item_cd: addItemCd,
        lot_no: addLotNo,
        order_qty: addOrderQty,
        lot_qty: lot?.lot_qty,
      },
    ]);
    setAddLotNo(null);
    setAddOrderQty(1);
  }, [addItemCd, addLotNo, addOrderQty, eligibleLots]);

  const handleRemoveDetail = useCallback((key: string) => {
    setFormDetails((prev) => prev.filter((d) => d.key !== key));
  }, []);

  /* ── FormModal submit ────────────────────────────── */
  const handleSubmit = useCallback(
    async (
      values: Record<string, unknown>,
      mode: 'create' | 'edit' | 'view',
    ) => {
      const plan_dt = values.plan_dt
        ? dayjs(values.plan_dt as string | Date).format('YYYY-MM-DD')
        : null;

      const payload = {
        cust_cd: values.cust_cd,
        plan_dt,
        remark: values.remark ?? null,
        details: formDetails.map((d) => ({
          item_cd: d.item_cd,
          lot_no: d.lot_no,
          order_qty: d.order_qty,
        })),
      };

      if (mode === 'create') {
        await apiClient.post('/v1/shipments', payload);
        message.success('출하지시가 등록되었습니다.');
      } else if (mode === 'edit' && selectedShipment) {
        await apiClient.put(
          `/v1/shipments/${selectedShipment.ship_id}`,
          payload,
        );
        message.success('출하지시가 수정되었습니다.');
      }
      fetchShipments(1, pageSize, searchParams);
      setPage(1);
    },
    [formDetails, selectedShipment, fetchShipments, pageSize, searchParams],
  );

  /* ── Excel data ──────────────────────────────────── */
  const getExcelData = useCallback(async () => {
    const res = await apiClient.get('/v1/shipments', {
      params: { limit: 10000, ...searchParams },
    });
    const rows: Shipment[] = res.data?.data ?? [];
    return rows.map((r) => ({
      ship_no: r.ship_no,
      cust_nm: r.customer?.cust_nm ?? r.cust_cd,
      status_label: STATUS_MAP[r.status]?.label ?? r.status,
      plan_dt: r.plan_dt ? String(r.plan_dt).slice(0, 10) : '',
      total_order_qty: (r.details ?? []).reduce(
        (s, d) => s + (d.order_qty ?? 0),
        0,
      ),
    }));
  }, [searchParams]);

  /* ── Columns ─────────────────────────────────────── */
  const COLUMNS: DataGridColumn<Shipment>[] = [
    {
      title: '출하번호',
      dataIndex: 'ship_no',
      width: 160,
      fixed: 'left',
    },
    {
      title: '거래처',
      dataIndex: 'customer',
      width: 180,
      render: (val: unknown, record: Shipment) => {
        const c = val as { cust_nm?: string } | null;
        return c?.cust_nm ?? record.cust_cd;
      },
    },
    {
      title: '품목',
      dataIndex: 'details',
      width: 220,
      ellipsis: true,
      render: (val: unknown) => {
        const details = val as ShipmentDetail[];
        if (!details || details.length === 0) return '-';
        const first = details[0];
        const nm = first.item?.item_nm ?? first.item_cd;
        return details.length > 1 ? `${nm} 외 ${details.length - 1}건` : nm;
      },
    },
    {
      title: 'LOT 수',
      dataIndex: 'details',
      width: 80,
      align: 'center',
      render: (val: unknown) => {
        const details = val as ShipmentDetail[];
        return details?.length ?? 0;
      },
    },
    {
      title: '지시수량',
      dataIndex: 'details',
      width: 100,
      align: 'right',
      render: (val: unknown) => {
        const details = val as ShipmentDetail[];
        return (details ?? []).reduce((s, d) => s + (d.order_qty ?? 0), 0);
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      width: 100,
      align: 'center',
      render: (val: unknown) => <StatusTag status={String(val)} />,
    },
    {
      title: '지시일',
      dataIndex: 'plan_dt',
      width: 110,
      render: (val: unknown) => (val ? String(val).slice(0, 10) : '-'),
    },
    {
      title: '액션',
      dataIndex: 'ship_id',
      width: 200,
      fixed: 'right',
      render: (_val: unknown, record: Shipment) => {
        const { status, ship_id } = record;
        return (
          <Space size={4}>
            {status === 'PLAN' && (
              <>
                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(record);
                  }}
                >
                  수정
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(ship_id);
                  }}
                >
                  삭제
                </Button>
              </>
            )}
            {status === 'SHIPPED' && (
              <>
                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView(record);
                  }}
                >
                  상세보기
                </Button>
                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCancelModal(ship_id);
                  }}
                >
                  취소요청
                </Button>
              </>
            )}
            {status === 'CANCEL_REQ' && (
              <>
                {isAdmin ? (
                  <>
                    <Button
                      size="small"
                      type="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelApprove(ship_id);
                      }}
                    >
                      승인
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelReject(ship_id);
                      }}
                    >
                      반려
                    </Button>
                  </>
                ) : (
                  <span style={{ color: '#faad14', fontSize: 12 }}>
                    취소요청중
                  </span>
                )}
              </>
            )}
            {status === 'CANCELLED' && (
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleView(record);
                }}
              >
                상세보기
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  /* ── FormModal initial values ───────────────────── */
  const modalInitialValues = selectedShipment
    ? {
        cust_cd: selectedShipment.cust_cd,
        plan_dt: selectedShipment.plan_dt
          ? dayjs(selectedShipment.plan_dt)
          : undefined,
        remark: selectedShipment.remark ?? undefined,
      }
    : undefined;

  return (
    <div style={{ padding: '16px 24px' }}>
      {/* Search form */}
      <SearchForm
        fields={SEARCH_FIELDS}
        onSearch={handleSearch}
        onReset={handleReset}
        loading={loading}
      />

      {/* Toolbar */}
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            출하지시 등록
          </Button>
          <ExcelDownloadButton
            filename="출하지시목록"
            columns={EXCEL_COLUMNS}
            data={getExcelData}
          />
        </Space>
      </div>

      {/* Data grid */}
      <DataGrid<Shipment>
        columns={COLUMNS}
        dataSource={shipments}
        rowKey="ship_id"
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={handlePageChange}
        scrollX={1200}
        emptyText="출하지시 없음 — 등록된 출하지시가 없습니다. 출하지시 등록 버튼을 눌러 시작하세요."
        onRow={(record) => ({
          onClick: () => handleView(record),
          style: { cursor: 'pointer' },
        })}
      />

      {/* Create / Edit / View modal */}
      <FormModal<Record<string, unknown>>
        open={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        mode={modalMode}
        initialValues={modalInitialValues as Record<string, unknown> | undefined}
        title={
          modalMode === 'create'
            ? '출하지시 등록'
            : modalMode === 'edit'
              ? '출하지시 수정'
              : '출하지시 상세'
        }
        width={720}
      >
        {(_form, mode) => (
          <>
            <Form.Item
              name="cust_cd"
              label="거래처"
              rules={[{ required: true, message: '거래처를 입력하세요.' }]}
            >
              <Input placeholder="거래처 코드 입력" disabled={mode === 'view'} />
            </Form.Item>

            <Form.Item
              name="plan_dt"
              label="출하예정일"
              rules={[{ required: true, message: '출하예정일을 선택하세요.' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                disabled={mode === 'view'}
                placeholder="날짜 선택"
              />
            </Form.Item>

            <Form.Item name="remark" label="비고">
              <Input.TextArea
                rows={2}
                placeholder="비고"
                disabled={mode === 'view'}
              />
            </Form.Item>

            {/* LOT addition section — create/edit only */}
            {mode !== 'view' && (
              <Form.Item label="LOT 추가">
                <Space style={{ width: '100%', flexWrap: 'wrap' }}>
                  <Input
                    placeholder="품목 코드"
                    value={addItemCd}
                    onChange={(e) => setAddItemCd(e.target.value)}
                    onBlur={() => fetchEligibleLots(addItemCd)}
                    style={{ width: 130 }}
                  />
                  <Select
                    placeholder="LOT 선택"
                    value={addLotNo}
                    onChange={(v) => setAddLotNo(v)}
                    loading={lotsLoading}
                    style={{ width: 160 }}
                    options={eligibleLots.map((l) => ({
                      value: l.lot_no,
                      label: `${l.lot_no} (${l.lot_qty})`,
                    }))}
                  />
                  <InputNumber
                    min={1}
                    value={addOrderQty}
                    onChange={(v) => setAddOrderQty(v ?? 1)}
                    style={{ width: 100 }}
                    placeholder="지시수량"
                  />
                  <Button onClick={handleAddDetail}>추가</Button>
                </Space>
              </Form.Item>
            )}

            {/* Added LOT table */}
            {(mode !== 'view' ? formDetails.length > 0 : (selectedShipment?.details ?? []).length > 0) && (
              <Form.Item label=" " colon={false}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      <th style={thStyle}>품목</th>
                      <th style={thStyle}>LOT번호</th>
                      <th style={thStyle}>가용재고</th>
                      <th style={thStyle}>지시수량</th>
                      {mode !== 'view' && <th style={thStyle}>삭제</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(mode === 'view'
                      ? (selectedShipment?.details ?? []).map((d) => ({
                          key: String(d.ship_dtl_id),
                          item_cd: d.item_cd,
                          lot_no: d.lot_no,
                          order_qty: d.order_qty,
                          lot_qty: d.lot?.lot_qty,
                        }))
                      : formDetails
                    ).map((row) => (
                      <tr key={row.key}>
                        <td style={tdStyle}>{row.item_cd}</td>
                        <td style={tdStyle}>{row.lot_no ?? '-'}</td>
                        <td style={tdStyle}>{row.lot_qty ?? '-'}</td>
                        <td style={tdStyle}>{row.order_qty}</td>
                        {mode !== 'view' && (
                          <td style={tdStyle}>
                            <Button
                              size="small"
                              danger
                              onClick={() => handleRemoveDetail(row.key)}
                            >
                              삭제
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Form.Item>
            )}
          </>
        )}
      </FormModal>

      {/* Cancel reason modal */}
      <Modal
        open={cancelModalOpen}
        title="취소 요청"
        width={480}
        onOk={handleCancelRequest}
        onCancel={() => {
          setCancelModalOpen(false);
          setCancelReason('');
        }}
        okText="요청"
        cancelText="취소"
      >
        <Form layout="vertical">
          <Form.Item label="취소 사유" required>
            <Input.TextArea
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="취소 사유를 입력하세요"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/* ── Table cell styles ─────────────────────────────── */

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid #f0f0f0',
  textAlign: 'left',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid #f0f0f0',
};
