'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import dayjs from 'dayjs';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import FormField from '@/components/ui/FormField';
import Tooltip from '@/components/ui/Tooltip';
import toast from '@/components/ui/toast';
import CommonCodeSelect from '@/components/common/CommonCodeSelect';
import FileUpload from '@/components/common/FileUpload';
import apiClient from '@/lib/apiClient';

/* ── Types ─────────────────────────────────────────── */

export interface MaintResultFormModalProps {
  open: boolean;
  plan?: Record<string, unknown>;
  onOk: () => void;
  onCancel: () => void;
}

interface ChecklistItem {
  plan_dtl_id?: number;
  check_item: string;
  check_std?: string;
  check_result?: string; // 'OK' | 'ACTION_NEEDED' | 'REPLACED'
}

interface ReplacedPart {
  part_nm: string;
  qty: number | null;
  cost?: number | null;
}

interface WorkerOption {
  worker_id: string;
  worker_nm: string;
}

interface EquipmentOption {
  equip_cd: string;
  equip_nm: string;
}

/* ── Component ────────────────────────────────────── */

export default function MaintResultFormModal({
  open,
  plan,
  onOk,
  onCancel,
}: MaintResultFormModalProps) {
  const [loading, setLoading] = useState(false);

  /* Form state */
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  /* Checklist state */
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  /* Replaced parts state */
  const [parts, setParts] = useState<ReplacedPart[]>([]);

  /* Photo upload state */
  const [createdResultId, setCreatedResultId] = useState<string | undefined>();

  /* Reference data */
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [equipments, setEquipments] = useState<EquipmentOption[]>([]);

  /* ── Fetch reference data ─────────────────────── */
  useEffect(() => {
    if (!open) return;

    apiClient
      .get('/v1/workers', { params: { limit: 500 } })
      .then((res) => {
        const rows = res.data?.data ?? [];
        setWorkers(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setWorkers([]));

    if (!plan?.equip_cd) {
      apiClient
        .get('/v1/equipments', { params: { use_yn: 'Y', limit: 500 } })
        .then((res) => {
          const rows = res.data?.data ?? [];
          setEquipments(Array.isArray(rows) ? rows : []);
        })
        .catch(() => setEquipments([]));
    }
  }, [open, plan]);

  /* ── Populate form on open ────────────────────── */
  useEffect(() => {
    if (!open) return;

    setCreatedResultId(undefined);

    if (plan) {
      // 목록 API 가 plan_dtls 를 plan_dtl_id 만 반환하므로 체크리스트 전체를 별도 조회
      const planId = plan.maint_plan_id as number | undefined;
      if (planId) {
        apiClient
          .get(`/v1/maint-plans/${planId}`)
          .then((res) => {
            const full = res.data?.data ?? {};
            const planDtls = (full.plan_dtls as Array<Record<string, unknown>>) ?? [];
            const items: ChecklistItem[] = planDtls
              .filter((dtl) => typeof dtl.check_item === 'string' && (dtl.check_item as string).trim() !== '')
              .map((dtl) => ({
                plan_dtl_id: dtl.plan_dtl_id as number | undefined,
                check_item: dtl.check_item as string,
                check_std: dtl.check_std as string | undefined,
                check_result: undefined,
              }));
            setChecklistItems(items);
          })
          .catch(() => setChecklistItems([]));
      } else {
        setChecklistItems([]);
      }

      setFormValues({
        equip_cd: plan.equip_cd,
        maint_type_cd: plan.maint_type_cd,
        work_dt: dayjs().format('YYYY-MM-DD'),
        worker_id: (plan.assignee_id as string | undefined) ?? undefined,
        cost: undefined,
        memo: '',
      });
    } else {
      setChecklistItems([]);
      setFormValues({ work_dt: dayjs().format('YYYY-MM-DD') });
    }

    setParts([]);
  }, [open, plan]);

  /* ── Check if all checklist items are answered ── */
  const allChecked = useMemo(() => {
    if (checklistItems.length === 0) return true;
    return checklistItems.every((item) => !!item.check_result);
  }, [checklistItems]);

  /* ── Checklist item result change ────────────── */
  const handleCheckResultChange = useCallback(
    (index: number, value: string) => {
      setChecklistItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, check_result: value } : item,
        ),
      );
    },
    [],
  );

  /* ── Parts management ─────────────────────────── */
  const addPart = useCallback(() => {
    setParts((prev) => [...prev, { part_nm: '', qty: null, cost: null }]);
  }, []);

  const removePart = useCallback((index: number) => {
    setParts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updatePart = useCallback(
    (index: number, field: keyof ReplacedPart, value: string | number | null) => {
      setParts((prev) =>
        prev.map((part, i) =>
          i === index ? { ...part, [field]: value } : part,
        ),
      );
    },
    [],
  );

  /* ── Submit ───────────────────────────────────── */
  const handleOk = useCallback(async () => {
    if (!allChecked) {
      toast.warning('모든 점검항목을 체크한 후 저장할 수 있습니다.');
      return;
    }

    if (!formValues.work_dt) {
      toast.warning('작업일을 선택해주세요.');
      return;
    }

    if (!plan?.equip_cd && !formValues.equip_cd) {
      toast.warning('설비를 선택해주세요.');
      return;
    }

    try {
      setLoading(true);

      const validParts = parts.filter((p) => p.part_nm.trim() !== '');

      const body = {
        equip_cd: formValues.equip_cd ?? plan?.equip_cd,
        maint_plan_id: plan?.maint_plan_id,
        maint_type_cd: formValues.maint_type_cd,
        work_dt: formValues.work_dt,
        worker_id: formValues.worker_id,
        cost: formValues.cost,
        memo: formValues.memo,
        replaced_parts: validParts.map((p) => ({
          part_nm: p.part_nm,
          qty: p.qty ?? 1,
          cost: p.cost ?? undefined,
        })),
        checklist_results: checklistItems
          .filter((item) => item.check_item && item.check_item.trim() !== '')
          .map((item) => ({
            plan_dtl_id: item.plan_dtl_id,
            check_item: item.check_item,
            check_result: item.check_result ?? 'OK',
            memo: '',
          })),
      };

      const res = await apiClient.post('/v1/maint-results', body);
      const resultId = res.data?.data?.maint_result_id;
      if (resultId) {
        setCreatedResultId(String(resultId));
      }

      toast.success('보전이력이 등록되었습니다. 이제 사진을 업로드할 수 있습니다.');
      // 사진 업로드 UI 활성화를 위해 모달을 닫지 않고 유지. 사용자가 '완료' 를 눌러야 onOk() 발화.
    } catch (err: unknown) {
      const axiosErr = err as {
        errorFields?: unknown;
        response?: { data?: { message?: string } };
      };
      if (axiosErr?.errorFields) return;
      toast.error(axiosErr?.response?.data?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [allChecked, formValues, plan, parts, checklistItems, onOk]);

  /* ── Cancel ───────────────────────────────────── */
  const handleCancel = useCallback(() => {
    // 저장 후 사진 업로드 단계에서 취소/X 를 눌러도 이력 자체는 이미 저장됐으므로 부모를 refresh
    const wasSaved = !!createdResultId;
    setFormValues({});
    setChecklistItems([]);
    setParts([]);
    setCreatedResultId(undefined);
    if (wasSaved) onOk(); else onCancel();
  }, [createdResultId, onOk, onCancel]);

  const handleDone = useCallback(() => {
    setFormValues({});
    setChecklistItems([]);
    setParts([]);
    setCreatedResultId(undefined);
    onOk();
  }, [onOk]);

  const hasPlanEquip = !!plan?.equip_cd;

  return (
    <Modal
      open={open}
      title="보전이력 등록"
      width={760}
      maskClosable={false}
      onClose={handleCancel}
      footer={
        createdResultId ? (
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={handleDone}>완료</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={handleCancel}>취소</Button>
            <Button
              variant="primary"
              loading={loading}
              onClick={handleOk}
              disabled={!allChecked && checklistItems.length > 0}
            >
              보전이력 저장
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {/* Section: Basic info */}
        <div className="border-b border-gray-100 pb-1 mb-3">
          <span className="text-sm font-medium text-gray-500">기본 정보</span>
        </div>

        {/* Equipment — readonly if from plan */}
        {hasPlanEquip ? (
          <FormField label="설비" layout="horizontal">
            <span className="text-sm text-gray-700">
              {(plan?.equipment as { equip_nm?: string } | undefined)?.equip_nm ??
                String(plan?.equip_cd ?? '')}
            </span>
          </FormField>
        ) : (
          <FormField label="설비" required layout="horizontal">
            <Select
              placeholder="설비 선택"
              value={(formValues.equip_cd as string) ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, equip_cd: e.target.value }))}
              options={equipments.map((e) => ({
                label: e.equip_nm,
                value: e.equip_cd,
              }))}
            />
          </FormField>
        )}

        {/* Maintenance type */}
        <FormField label="보전유형" layout="horizontal">
          <CommonCodeSelect
            groupCd="MAINT_TYPE"
            placeholder="보전유형 선택"
            showAll
            value={(formValues.maint_type_cd as string) ?? ''}
            onChange={(e) => setFormValues((prev) => ({ ...prev, maint_type_cd: e.target.value }))}
          />
        </FormField>

        {/* Work date */}
        <FormField label="작업일" required layout="horizontal">
          <input
            type="date"
            className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
            value={(formValues.work_dt as string) ?? ''}
            onChange={(e) => setFormValues((prev) => ({ ...prev, work_dt: e.target.value }))}
            required
          />
        </FormField>

        {/* Worker */}
        <FormField label="작업자" layout="horizontal">
          <Select
            placeholder="작업자 선택"
            value={(formValues.worker_id as string) ?? ''}
            onChange={(e) => setFormValues((prev) => ({ ...prev, worker_id: e.target.value || undefined }))}
            options={workers.map((w) => ({
              label: w.worker_nm,
              value: w.worker_id,
            }))}
          />
        </FormField>

        {/* Cost */}
        <FormField label="비용" layout="horizontal">
          <input
            type="number"
            className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
            placeholder="보전 비용"
            min={0}
            value={(formValues.cost as number) ?? ''}
            onChange={(e) => setFormValues((prev) => ({ ...prev, cost: e.target.value ? Number(e.target.value) : undefined }))}
          />
        </FormField>

        {/* Memo */}
        <FormField label="메모" layout="horizontal">
          <Textarea
            rows={2}
            placeholder="보전 내용 메모"
            value={(formValues.memo as string) ?? ''}
            onChange={(e) => setFormValues((prev) => ({ ...prev, memo: e.target.value }))}
          />
        </FormField>

        {/* Section: Checklist results */}
        {checklistItems.length > 0 && (
          <>
            <div className="border-b border-gray-100 pb-1 mb-3 mt-6 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">점검항목 체크</span>
              <span className="text-xs text-gray-400">모든 항목 필수</span>
            </div>

            {!allChecked && (
              <p className="text-sm text-yellow-600 mb-2 ml-36">
                모든 점검항목을 체크한 후 저장할 수 있습니다.
              </p>
            )}

            {checklistItems.map((item, index) => (
              <FormField
                key={index}
                label={`항목 ${index + 1}`}
                layout="horizontal"
              >
                <div className="text-sm text-gray-700 mb-2">
                  {item.check_item}
                  {item.check_std && (
                    <span className="text-xs text-gray-400 ml-2">
                      기준: {item.check_std}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {(['OK', 'ACTION_NEEDED', 'REPLACED'] as const).map((val) => (
                    <label key={val} className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name={`check_result_${index}`}
                        value={val}
                        checked={item.check_result === val}
                        onChange={() => handleCheckResultChange(index, val)}
                        className="accent-cyan-accent"
                      />
                      {val === 'OK' ? '양호' : val === 'ACTION_NEEDED' ? '조치필요' : '교체'}
                    </label>
                  ))}
                </div>
              </FormField>
            ))}
          </>
        )}

        {/* Section: Replaced parts */}
        <div className="border-b border-gray-100 pb-1 mb-3 mt-6">
          <span className="text-sm font-medium text-gray-500">교체 부품</span>
        </div>

        {parts.map((part, index) => (
          <FormField key={index} label={`부품 ${index + 1}`} layout="horizontal">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="부품명"
                className="flex-[2]"
                value={part.part_nm}
                onChange={(e) => updatePart(index, 'part_nm', e.target.value)}
              />
              <input
                type="number"
                className="flex-1 h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                placeholder="수량"
                min={1}
                value={part.qty ?? ''}
                onChange={(e) => updatePart(index, 'qty', e.target.value ? Number(e.target.value) : null)}
              />
              <input
                type="number"
                className="flex-1 h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
                placeholder="비용 (선택)"
                min={0}
                value={part.cost ?? ''}
                onChange={(e) => updatePart(index, 'cost', e.target.value ? Number(e.target.value) : null)}
              />
              <Tooltip title="삭제">
                <Button
                  variant="danger"
                  size="small"
                  icon={<Trash2 className="w-4 h-4" />}
                  aria-label="부품 행 삭제"
                  onClick={() => removePart(index)}
                />
              </Tooltip>
            </div>
          </FormField>
        ))}

        <div className="ml-36 mb-4">
          <Button
            variant="ghost"
            onClick={addPart}
            icon={<Plus className="w-4 h-4" />}
            size="small"
          >
            + 부품 추가
          </Button>
        </div>

        {/* Section: Photo attachment */}
        <div className="border-b border-gray-100 pb-1 mb-3 mt-6">
          <span className="text-sm font-medium text-gray-500">사진 첨부</span>
        </div>

        <FormField label="사진" layout="horizontal">
          <FileUpload
            refTable="tb_maint_result"
            refId={createdResultId}
            accept="image/*"
            maxCount={5}
            listType="picture"
          />
          {!createdResultId && (
            <p className="text-xs text-gray-400 mt-1">
              저장 후 사진이 이력에 연결됩니다.
            </p>
          )}
        </FormField>
      </div>
    </Modal>
  );
}
