'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Modal, Tag, Spinner, Alert } from '@/components/ui';
import toast from '@/components/ui/toast';
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* Reference data */
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [processes, setProcesses] = useState<ProcessOption[]>([]);
  const [lots, setLots] = useState<LotOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);

  /* Form fields */
  const [formWoId, setFormWoId] = useState<string>('');
  const [formProcessCd, setFormProcessCd] = useState<string>('');
  const [formLotNo, setFormLotNo] = useState<string>('');
  const [formItemCd, setFormItemCd] = useState<string>('');
  const [formRemark, setFormRemark] = useState<string>('');

  /* Selected fields */
  const [selectedItemCd, setSelectedItemCd] = useState<string | null>(null);
  const [selectedProcessCd, setSelectedProcessCd] = useState<string | null>(null);

  /* Inspection standards + measurement values */
  const [standards, setStandards] = useState<InspectStdRow[]>([]);
  const [values, setValues] = useState<Record<number, number | null>>({});
  const [stdLoading, setStdLoading] = useState(false);
  const [noStandards, setNoStandards] = useState(false);

  /* Validation */
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── Load reference data on open ──────────────────── */
  useEffect(() => {
    if (!open) return;

    if (mode === 'create') {
      // Reset form state
      setFormWoId('');
      setFormProcessCd('');
      setFormLotNo('');
      setFormItemCd('');
      setFormRemark('');
      setStandards([]);
      setValues({});
      setNoStandards(false);
      setSelectedItemCd(null);
      setSelectedProcessCd(null);
      setErrors({});

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
  }, [open, mode, inspectType, record]);

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
    (woId: string) => {
      setFormWoId(woId);
      const wo = workOrders.find((w) => w.wo_id === Number(woId));
      if (wo?.item_cd) {
        setFormItemCd(wo.item_cd);
        setSelectedItemCd(wo.item_cd);
        if (selectedProcessCd) {
          fetchStandards(wo.item_cd, selectedProcessCd);
        }
      }
    },
    [workOrders, selectedProcessCd, fetchStandards],
  );

  /* ── Handle process selection (PROCESS) ────────── */
  const handleProcessChange = useCallback(
    (processCd: string) => {
      setFormProcessCd(processCd);
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
      setFormLotNo(lotNo);
      const lot = lots.find((l) => l.lot_no === lotNo);
      if (lot?.item_cd) {
        setFormItemCd(lot.item_cd);
        setSelectedItemCd(lot.item_cd);
        fetchStandards(lot.item_cd);
      }
    },
    [lots, fetchStandards],
  );

  /* ── Handle item selection (manual) ────────────── */
  const handleItemChange = useCallback(
    (itemCd: string) => {
      setFormItemCd(itemCd);
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
    // Validate
    const newErrors: Record<string, string> = {};
    if (!formLotNo) newErrors.lot_no = 'LOT번호를 입력해 주세요.';
    if (!formItemCd) newErrors.item_cd = '품목을 선택해 주세요.';
    if (inspectType === 'PROCESS' && !formProcessCd) newErrors.process_cd = '공정을 선택해 주세요.';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      setSaving(true);

      const details = standards.map((s) => ({
        inspect_std_id: s.inspect_std_id,
        measure_value: values[s.inspect_std_id] ?? null,
      }));

      const payload = {
        inspect_type: inspectType,
        item_cd: formItemCd,
        lot_no: formLotNo,
        wo_id: formWoId ? Number(formWoId) : null,
        process_cd: formProcessCd || null,
        remark: formRemark || null,
        details,
      };

      const res = await apiClient.post('/v1/inspect-results', payload);
      const savedRecord = res.data?.data;
      toast.success('검사가 등록되었습니다.');

      // Show quarantine warning if overall judge is FAIL
      if (savedRecord?.judge === 'FAIL' && payload.lot_no) {
        toast.warning(`Lot ${payload.lot_no} 불합격 - 격리 상태로 전환되었습니다.`);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [formLotNo, formItemCd, formProcessCd, formWoId, formRemark, inspectType, standards, values, onSaved, onClose]);

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
    <div className="flex items-center gap-2">
      <Button onClick={onClose}>취소</Button>
      <Button variant="primary" loading={saving} onClick={handleSave}>
        등록
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      title={
        <div className="flex items-center gap-2">
          {modalTitle}
          {renderOverallJudge()}
        </div>
      }
      width={960}
      maskClosable={false}
      footer={footer}
      onClose={onClose}
    >
      <Spinner spinning={loading}>
        <div className={mode === 'view' ? 'pointer-events-none opacity-70' : ''}>
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {inspectType === 'PROCESS' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">작업지시</label>
                  <select
                    className="w-full h-9 bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500"
                    value={formWoId}
                    onChange={(e) => handleWoChange(e.target.value)}
                    disabled={mode === 'view'}
                  >
                    <option value="">작업지시 선택</option>
                    {workOrders.map((wo) => (
                      <option key={wo.wo_id} value={wo.wo_id}>
                        {wo.wo_no}{wo.item ? ` (${wo.item.item_nm})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    공정 <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`w-full h-9 bg-gray-50 border rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 ${errors.process_cd ? 'border-red-400' : 'border-gray-200'}`}
                    value={formProcessCd}
                    onChange={(e) => handleProcessChange(e.target.value)}
                    disabled={mode === 'view'}
                  >
                    <option value="">공정 선택</option>
                    {processes.map((p) => (
                      <option key={p.process_cd} value={p.process_cd}>{p.process_nm}</option>
                    ))}
                  </select>
                  {errors.process_cd && <p className="text-red-500 text-xs mt-1">{errors.process_cd}</p>}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                LOT번호 <span className="text-red-500">*</span>
              </label>
              {inspectType === 'SHIPPING' ? (
                <select
                  className={`w-full h-9 bg-gray-50 border rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 ${errors.lot_no ? 'border-red-400' : 'border-gray-200'}`}
                  value={formLotNo}
                  onChange={(e) => handleLotChange(e.target.value)}
                  disabled={mode === 'view'}
                >
                  <option value="">LOT번호 선택</option>
                  {lots.map((l) => (
                    <option key={l.lot_no} value={l.lot_no}>{l.lot_no}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={`w-full h-9 bg-gray-50 border rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 ${errors.lot_no ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="LOT번호 입력"
                  value={formLotNo}
                  onChange={(e) => setFormLotNo(e.target.value)}
                  disabled={mode === 'view'}
                />
              )}
              {errors.lot_no && <p className="text-red-500 text-xs mt-1">{errors.lot_no}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                품목 <span className="text-red-500">*</span>
              </label>
              <select
                className={`w-full h-9 bg-gray-50 border rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 ${errors.item_cd ? 'border-red-400' : 'border-gray-200'}`}
                value={formItemCd}
                onChange={(e) => handleItemChange(e.target.value)}
                disabled={mode === 'view'}
              >
                <option value="">품목 선택</option>
                {items.map((i) => (
                  <option key={i.item_cd} value={i.item_cd}>{i.item_nm}</option>
                ))}
              </select>
              {errors.item_cd && <p className="text-red-500 text-xs mt-1">{errors.item_cd}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">비고</label>
              <textarea
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500"
                rows={2}
                placeholder="비고 입력"
                value={formRemark}
                onChange={(e) => setFormRemark(e.target.value)}
                disabled={mode === 'view'}
              />
            </div>
          </div>

          {/* Standards section */}
          {mode === 'create' && noStandards && (
            <Alert
              type="warning"
              showIcon
              message="해당 품목/공정의 검사기준이 없습니다. 검사기준 관리에서 먼저 등록해 주세요."
              className="mt-3"
            />
          )}

          {stdLoading ? (
            <div className="text-center py-6">
              <Spinner />
            </div>
          ) : standards.length > 0 ? (
            <div className="mt-4">
              <InspectionDetailTable
                standards={standards}
                values={values}
                onValueChange={handleValueChange}
                readOnly={mode === 'view'}
              />
            </div>
          ) : null}
        </div>
      </Spinner>
    </Modal>
  );
}
