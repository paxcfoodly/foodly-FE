'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, ArrowLeft, Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Tag from '@/components/ui/Tag';
import Spinner from '@/components/ui/Spinner';
import toast from '@/components/ui/toast';
import apiClient from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types';

/* ── Types ─────────────────────────────────────────── */

interface WorkOrderItem {
  wo_id: number;
  wo_no: string;
  item_cd: string;
  order_qty: number;
  good_qty: number;
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

/* ── Styles (touch-optimised) ─────────────────────── */

const CARD_STYLE = 'rounded-xl cursor-pointer mb-3 text-base bg-white p-4 shadow-sm';
const CARD_ACTIVE = `${CARD_STYLE} border-2 border-cyan-accent shadow-md`;

const LABEL_STYLE = 'text-base font-medium mb-2 block';

const INPUT_NUMBER_CLASS =
  'w-full h-[52px] text-xl bg-dark-700 border border-dark-500 rounded-lg px-3 text-gray-700 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15';

const BIG_BUTTON_CLASS = 'w-full !h-14 !text-xl !font-semibold !rounded-xl';

/* ── Component ─────────────────────────────────────── */

type Step = 'select' | 'entry' | 'success';

export default function TouchResultPage() {
  /* ── State ─── */
  const [step, setStep] = useState<Step>('select');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [equipments, setEquipments] = useState<EquipmentOption[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);

  // Selection & form
  const [selectedWO, setSelectedWO] = useState<WorkOrderItem | null>(null);
  const [goodQty, setGoodQty] = useState<number>(0);
  const [defectQty, setDefectQty] = useState<number>(0);
  const [equipCd, setEquipCd] = useState<string | undefined>();
  const [workerId, setWorkerId] = useState<number | undefined>();

  /* ── Load work orders & dropdown options ─── */
  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<PaginatedResponse<WorkOrderItem>>(
        '/v1/work-orders',
        { params: { limit: 50, status: 'PROGRESS' } },
      );
      setWorkOrders(res.data?.data ?? []);
    } catch {
      toast.error('작업지시 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();

    const loadDropdowns = async () => {
      try {
        const [eqRes, wkRes] = await Promise.all([
          apiClient.get<PaginatedResponse<EquipmentOption>>('/v1/equipments', {
            params: { limit: 200 },
          }),
          apiClient.get<PaginatedResponse<WorkerOption>>('/v1/workers', {
            params: { limit: 200 },
          }),
        ]);
        setEquipments(eqRes.data?.data ?? []);
        setWorkers(wkRes.data?.data ?? []);
      } catch {
        // dropdowns optional — silent fail
      }
    };
    loadDropdowns();
  }, [fetchWorkOrders]);

  /* ── Handlers ─── */
  const handleSelectWO = useCallback((wo: WorkOrderItem) => {
    setSelectedWO(wo);
    setGoodQty(0);
    setDefectQty(0);
    setEquipCd(undefined);
    setWorkerId(undefined);
    setStep('entry');
  }, []);

  const handleBack = useCallback(() => {
    setStep('select');
    setSelectedWO(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedWO) return;
    if (goodQty <= 0 && defectQty <= 0) {
      toast.warning('양품수량 또는 불량수량을 입력하세요.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/v1/prod-results', {
        wo_id: selectedWO.wo_id,
        good_qty: goodQty,
        defect_qty: defectQty,
        equip_cd: equipCd ?? null,
        worker_id: workerId ?? null,
        auto_lot: true,
        work_start_dt: new Date().toISOString(),
      });
      setStep('success');
      toast.success('실적이 등록되었습니다.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? '실적 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedWO, goodQty, defectQty, equipCd, workerId]);

  const handleRegisterAnother = useCallback(() => {
    setStep('select');
    setSelectedWO(null);
    setGoodQty(0);
    setDefectQty(0);
    setEquipCd(undefined);
    setWorkerId(undefined);
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  /* ── Render: Step 1 — Work Order Selection ─── */
  if (step === 'select') {
    return (
      <div>
        <h3 className="text-xl font-semibold mb-4">작업지시 선택</h3>
        {loading ? (
          <div className="text-center py-16">
            <Spinner size="large" />
          </div>
        ) : workOrders.length === 0 ? (
          <div className={CARD_STYLE}>
            <p className="text-gray-400 text-base">
              진행 중인 작업지시가 없습니다.
            </p>
          </div>
        ) : (
          workOrders.map((wo) => {
            const progress = wo.order_qty > 0
              ? Math.min(100, Math.round((Number(wo.good_qty ?? 0) / wo.order_qty) * 100))
              : 0;
            return (
              <div
                key={wo.wo_id}
                className={`${CARD_STYLE} hover:shadow-md transition-shadow`}
                onClick={() => handleSelectWO(wo)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg font-semibold">{wo.wo_no}</span>
                    <br />
                    <span className="text-[15px] text-gray-500">
                      {wo.item?.item_nm ?? wo.item_cd}
                    </span>
                  </div>
                  <div className="text-right">
                    <Tag color={progress >= 100 ? 'green' : 'blue'} className="text-sm !px-3 !py-1">
                      {Number(wo.good_qty ?? 0).toLocaleString()} / {wo.order_qty.toLocaleString()}
                    </Tag>
                    <br />
                    <span className="text-[13px] text-gray-400">
                      진행률 {progress}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  /* ── Render: Step 2 — Quantity Entry ─── */
  if (step === 'entry' && selectedWO) {
    return (
      <div>
        {/* Header with back */}
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={handleBack}
            className="!h-11 !w-11 mr-2"
          />
          <h3 className="text-xl font-semibold">실적 등록</h3>
        </div>

        {/* Selected WO info */}
        <div className="rounded-xl mb-5 bg-blue-50 p-4">
          <span className="text-lg font-semibold">{selectedWO.wo_no}</span>
          <br />
          <span className="text-[15px]">{selectedWO.item?.item_nm ?? selectedWO.item_cd}</span>
          <br />
          <span className="text-sm text-gray-500">
            지시수량: {selectedWO.order_qty.toLocaleString()} | 기등록: {Number(selectedWO.good_qty ?? 0).toLocaleString()}
          </span>
        </div>

        {/* Quantity inputs */}
        <div className="mb-5">
          <span className={LABEL_STYLE}>양품수량 *</span>
          <input
            type="number"
            className={INPUT_NUMBER_CLASS}
            value={goodQty}
            onChange={(e) => setGoodQty(Number(e.target.value) || 0)}
            min={0}
            placeholder="양품수량 입력"
          />
        </div>

        <div className="mb-5">
          <span className={LABEL_STYLE}>불량수량</span>
          <input
            type="number"
            className={INPUT_NUMBER_CLASS}
            value={defectQty}
            onChange={(e) => setDefectQty(Number(e.target.value) || 0)}
            min={0}
            placeholder="불량수량 입력"
          />
        </div>

        {/* Optional: equipment & worker */}
        <div className="mb-5">
          <span className={LABEL_STYLE}>설비 (선택)</span>
          <Select
            value={equipCd ?? ''}
            onChange={(e) => setEquipCd(e.target.value || undefined)}
            placeholder="설비 선택"
            size="large"
            options={equipments.map((eq) => ({
              label: `${eq.equip_cd} — ${eq.equip_nm}`,
              value: eq.equip_cd,
            }))}
          />
        </div>

        <div className="mb-6">
          <span className={LABEL_STYLE}>작업자 (선택)</span>
          <Select
            value={workerId !== undefined ? String(workerId) : ''}
            onChange={(e) => setWorkerId(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="작업자 선택"
            size="large"
            options={workers.map((wk) => ({
              label: wk.worker_nm,
              value: wk.worker_id,
            }))}
          />
        </div>

        {/* Auto LOT notice */}
        <div className="rounded-lg mb-5 bg-yellow-50 border border-yellow-200 p-3">
          <span className="text-sm">
            LOT 번호가 자동으로 생성됩니다.
          </span>
        </div>

        {/* Submit */}
        <Button
          variant="primary"
          icon={<Send className="w-5 h-5" />}
          className={BIG_BUTTON_CLASS}
          loading={submitting}
          onClick={handleSubmit}
        >
          등록
        </Button>
      </div>
    );
  }

  /* ── Render: Step 3 — Success ─── */
  if (step === 'success') {
    return (
      <div className="text-center pt-16">
        <CheckCircle className="w-[72px] h-[72px] text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">실적이 등록되었습니다</h2>
        <p className="text-base text-gray-500 mb-8">
          LOT 번호가 자동 생성되었습니다.
        </p>
        <div className="flex flex-col items-center gap-3 max-w-[320px] mx-auto">
          <Button
            variant="primary"
            size="large"
            className={BIG_BUTTON_CLASS}
            onClick={handleRegisterAnother}
          >
            추가 등록
          </Button>
          <Button
            size="large"
            className={`${BIG_BUTTON_CLASS} !font-normal`}
            onClick={handleBack}
          >
            작업지시 목록으로
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
