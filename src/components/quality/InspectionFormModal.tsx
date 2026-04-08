'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  message,
} from 'antd';
import apiClient from '@/lib/apiClient';
import InspectionDetailTable, { type InspectStdRow } from './InspectionDetailTable';

/* ── Types ─────────────────────────────────────────── */

export interface InspectionFormModalProps {
  open: boolean;
  mode: 'create' | 'view';
  inspectType: 'PROCESS' | 'SHIPPING';
  record?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface WorkOrderOption {
  wo_id: number;
  wo_no: string;
  item_cd?: string;
  item?: { item_nm: string };
}

interface ProcessOption {
  process_cd: string;
  process_nm: string;
}

interface LotOption {
  lot_no: string;
  item_cd?: string;
  item?: { item_nm: string };
}

interface ItemOption {
  item_cd: string;
  item_nm: string;
}

/* ── Overall judgment helper ─────────────────────── */

function calcOverallJudge(
  standards: InspectStdRow[],
  values: Record<number, number | null>,
): 'PASS' | 'FAIL' | 'EMPTY' {
  if (standards.length === 0) return 'EMPTY';
  let anyEmpty = false;
  for (const std of standards) {
    const v = values[std.inspect_std_id];
    if (v === null || v === undefined) {
      anyEmpty = true;
      continue;
    }
    if (std.lsl !== null && v < std.lsl) return 'FAIL';
    if (std.usl !== null && v > std.usl) return 'FAIL';
  }
  if (anyEmpty) return 'EMPTY';
  return 'PASS';
}

/* ── Component ────────────────────────────────────── */

export default function InspectionFormModal({
  open,
  mode,
  inspectType,
  record,
  onClose,
  onSaved,
}: InspectionFormModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* Reference data */
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [processes, setProcesses] = useState<ProcessOption[]>([]);
  const [lots, setLots] = useState<LotOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  /* Selected fields */
  const [selectedItemCd, setSelectedItemCd] = useState<string | null>(null);
  const [selectedProcessCd, setSelectedProcessCd] = useState<string | null>(null);

  /* Inspection standards + measurement values */
  const [standards, setStandards] = useState<InspectStdRow[]>([]);
  const [values, setValues] = useState<Record<number, number | null>>({});
  const [stdLoading, setStdLoading] = useState(false);
  const [noStandards, setNoStandards] = useState(false);

  /* ── Load reference data on open ──────────────────── */
  useEffect(() => {
    if (!open) return;

    if (mode === 'create') {
      // Reset form state
      form.resetFields();
      setStandards([]);
      setValues({});
      setNoStandards(false);
      setSelectedItemCd(null);
      setSelectedProcessCd(null);

      // Fetch work orders for PROCESS type
      if (inspectType === 'PROCESS') {
        apiClient
          .get('/v1/work-orders', { params: { limit: 200, status: 'PROGRESS' } })
          .then((res) => {
            const data = res.data?.data ?? [];
            setWorkOrders(Array.isArray(data) ? data : []);
          })
          .catch(() => setWorkOrders([]));

        apiClient
          .get('/v1/processes', { params: { limit: 200 } })
          .then((res) => {
            const data = res.data?.data ?? [];
            setProcesses(Array.isArray(data) ? data : []);
          })
          .catch(() => setProcesses([]));
      }

      // Fetch lots
      apiClient
        .get('/v1/lots', { params: { limit: 200 } })
        .then((res) => {
          const data = res.data?.data ?? [];
          setLots(Array.isArray(data) ? data : []);
        })
        .catch(() => setLots([]));

      // Fetch items
      apiClient
        .get('/v1/items', { params: { limit: 200 } })
        .then((res) => {
          const data = res.data?.data ?? [];
          setItems(Array.isArray(data) ? data : []);
        })
        .catch(() => setItems([]));
    }

    if (mode === 'view' && record) {
      // Populate form with existing record data
      const details = (record.details as Array<{ inspect_std_id: number; measure_value: number | null }>) ?? [];
      const initValues: Record<number, number | null> = {};
      details.forEach((d) => {
        initValues[d.inspect_std_id] = d.measure_value;
      });
      setValues(initValues);

      // Build standards from existing detail records if available
      if (Array.isArray(record.details)) {
        const stds: InspectStdRow[] = (record.details as Array<{
          inspect_std_id: number;
          inspect_std?: {
            inspect_item_nm: string;
            measure_type: string | null;
            lsl: number | null;
            target_val: number | null;
            usl: number | null;
            unit: string | null;
          };
        }>).map((d) => ({
          inspect_std_id: d.inspect_std_id,
          inspect_item_nm: d.inspect_std?.inspect_item_nm ?? '-',
          measure_type: d.inspect_std?.measure_type ?? null,
          lsl: d.inspect_std?.lsl ?? null,
          target_val: d.inspect_std?.target_val ?? null,
          usl: d.inspect_std?.usl ?? null,
          unit: d.inspect_std?.unit ?? null,
        }));
        setStandards(stds);
      }
    }
  }, [open, mode, inspectType, record, form]);

  /* ── Fetch standards when item_cd (and process_cd for PROCESS) change ── */
  const fetchStandards = useCallback(
    async (itemCd: string, processCd?: string) => {
      setStdLoading(true);
      setNoStandards(false);
      setStandards([]);
      setValues({});
      try {
        const params: Record<string, string> = {
          item_cd: itemCd,
          inspect_type: inspectType,
        };
        if (inspectType === 'PROCESS' && processCd) {
          params.process_cd = processCd;
        }
        const res = await apiClient.get('/v1/inspect-results/standards', { params });
        const data: InspectStdRow[] = res.data?.data ?? [];
        if (data.length === 0) {
          setNoStandards(true);
        } else {
          setStandards(data);
          const initVals: Record<number, number | null> = {};
          data.forEach((s) => {
            initVals[s.inspect_std_id] = null;
          });
          setValues(initVals);
        }
      } catch {
        setNoStandards(true);
      } finally {
        setStdLoading(false);
      }
    },
    [inspectType],
  );

  /* ── Handle work order selection (PROCESS) ─────── */
  const handleWoChange = useCallback(
    (woId: number) => {
      const wo = workOrders.find((w) => w.wo_id === woId);
      if (wo?.item_cd) {
        form.setFieldValue('item_cd', wo.item_cd);
        setSelectedItemCd(wo.item_cd);
        if (selectedProcessCd) {
          fetchStandards(wo.item_cd, selectedProcessCd);
        }
      }
    },
    [workOrders, form, selectedProcessCd, fetchStandards],
  );

  /* ── Handle process selection (PROCESS) ────────── */
  const handleProcessChange = useCallback(
    (processCd: string) => {
      setSelectedProcessCd(processCd);
      if (selectedItemCd) {
        fetchStandards(selectedItemCd, processCd);
      }
    },
    [selectedItemCd, fetchStandards],
  );

  /* ── Handle LOT selection (SHIPPING) ───────────── */
  const handleLotChange = useCallback(
    (lotNo: string) => {
      const lot = lots.find((l) => l.lot_no === lotNo);
      if (lot?.item_cd) {
        form.setFieldValue('item_cd', lot.item_cd);
        setSelectedItemCd(lot.item_cd);
        fetchStandards(lot.item_cd);
      }
    },
    [lots, form, fetchStandards],
  );

  /* ── Handle item selection (manual) ────────────── */
  const handleItemChange = useCallback(
    (itemCd: string) => {
      setSelectedItemCd(itemCd);
      if (inspectType === 'PROCESS' && selectedProcessCd) {
        fetchStandards(itemCd, selectedProcessCd);
      } else if (inspectType === 'SHIPPING') {
        fetchStandards(itemCd);
      }
    },
    [inspectType, selectedProcessCd, fetchStandards],
  );

  /* ── Handle measurement value change ───────────── */
  const handleValueChange = useCallback((stdId: number, value: number | null) => {
    setValues((prev) => ({ ...prev, [stdId]: value }));
  }, []);

  /* ── Overall judgment ───────────────────────────── */
  const overallJudge = calcOverallJudge(standards, values);

  /* ── Save handler ─────────────────────────────── */
  const handleSave = useCallback(async () => {
    try {
      const fields = await form.validateFields();
      setSaving(true);

      const details = standards.map((s) => ({
        inspect_std_id: s.inspect_std_id,
        measure_value: values[s.inspect_std_id] ?? null,
      }));

      const payload = {
        inspect_type: inspectType,
        item_cd: fields.item_cd,
        lot_no: fields.lot_no,
        wo_id: fields.wo_id ?? null,
        process_cd: fields.process_cd ?? null,
        remark: fields.remark ?? null,
        details,
      };

      const res = await apiClient.post('/v1/inspect-results', payload);
      const savedRecord = res.data?.data;
      message.success('검사가 등록되었습니다.');

      // Show quarantine warning if overall judge is FAIL
      if (savedRecord?.judge === 'FAIL' && payload.lot_no) {
        message.warning(`Lot ${payload.lot_no} 불합격 - 격리 상태로 전환되었습니다.`);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; message?: string };
      if (e?.errorFields) return; // validation error — antd shows it
      message.error(e?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [form, standards, values, inspectType, onSaved, onClose]);

  /* ── Modal title ─────────────────────────────── */
  const modalTitle = mode === 'create' ? '검사 등록' : '검사 상세';

  /* ── Render overall judge tag ──────────────────── */
  const renderOverallJudge = () => {
    if (standards.length === 0) return null;
    if (overallJudge === 'FAIL') return <Tag color="error">불합격</Tag>;
    if (overallJudge === 'PASS') return <Tag color="success">합격</Tag>;
    return <Tag>미입력</Tag>;
  };

  /* ── Footer ─────────────────────────────────── */
  const footer = mode === 'view' ? (
    <Button onClick={onClose}>닫기</Button>
  ) : (
    <Space>
      <Button onClick={onClose}>취소</Button>
      <Button type="primary" loading={saving} onClick={handleSave}>
        등록
      </Button>
    </Space>
  );

  return (
    <Modal
      open={open}
      title={
        <Space>
          {modalTitle}
          {renderOverallJudge()}
        </Space>
      }
      width={960}
      destroyOnClose
      maskClosable={false}
      footer={footer}
      onCancel={onClose}
    >
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          disabled={mode === 'view'}
          autoComplete="off"
        >
          {/* Header fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {inspectType === 'PROCESS' && (
              <>
                <Form.Item name="wo_id" label="작업지시">
                  <Select
                    placeholder="작업지시 선택"
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    options={workOrders.map((wo) => ({
                      value: wo.wo_id,
                      label: `${wo.wo_no}${wo.item ? ` (${wo.item.item_nm})` : ''}`,
                    }))}
                    onChange={handleWoChange}
                  />
                </Form.Item>
                <Form.Item
                  name="process_cd"
                  label="공정"
                  rules={[{ required: true, message: '공정을 선택해 주세요.' }]}
                >
                  <Select
                    placeholder="공정 선택"
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    options={processes.map((p) => ({
                      value: p.process_cd,
                      label: p.process_nm,
                    }))}
                    onChange={handleProcessChange}
                  />
                </Form.Item>
              </>
            )}

            <Form.Item
              name="lot_no"
              label="LOT번호"
              rules={[{ required: true, message: 'LOT번호를 입력해 주세요.' }]}
            >
              {inspectType === 'SHIPPING' ? (
                <Select
                  placeholder="LOT번호 선택"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  options={lots.map((l) => ({
                    value: l.lot_no,
                    label: l.lot_no,
                  }))}
                  onChange={handleLotChange}
                />
              ) : (
                <Input
                  placeholder="LOT번호 입력"
                  onChange={(e) => {
                    // For PROCESS, lot_no is free text
                  }}
                />
              )}
            </Form.Item>

            <Form.Item
              name="item_cd"
              label="품목"
              rules={[{ required: true, message: '품목을 선택해 주세요.' }]}
            >
              <Select
                placeholder="품목 선택"
                showSearch
                allowClear
                optionFilterProp="label"
                options={items.map((i) => ({
                  value: i.item_cd,
                  label: i.item_nm,
                }))}
                onChange={handleItemChange}
              />
            </Form.Item>

            <Form.Item name="remark" label="비고" style={{ gridColumn: '1 / -1' }}>
              <Input.TextArea rows={2} placeholder="비고 입력" />
            </Form.Item>
          </div>

          {/* Standards section */}
          {mode === 'create' && noStandards && (
            <Alert
              type="warning"
              showIcon
              message="해당 품목/공정의 검사기준이 없습니다. 검사기준 관리에서 먼저 등록해 주세요."
              style={{ marginBottom: 12 }}
            />
          )}

          {stdLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : standards.length > 0 ? (
            <InspectionDetailTable
              standards={standards}
              values={values}
              onValueChange={handleValueChange}
              readOnly={mode === 'view'}
            />
          ) : null}
        </Form>
      </Spin>
    </Modal>
  );
}
