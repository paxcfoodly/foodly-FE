'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import dayjs from 'dayjs';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
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

/* ── Layout helpers ────────────────────────────────── */

function Section({
  title,
  aside,
  action,
  children,
}: {
  title: string;
  aside?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-gray-100 rounded-lg">
      <header className="flex items-center justify-between px-4 h-10 border-b border-gray-100 bg-gray-50/60 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1 h-4 bg-cyan-accent rounded-sm" />
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          {aside && <span className="text-xs text-gray-400">{aside}</span>}
        </div>
        {action}
      </header>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 items-start">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-2">
        {label}
        {required && <span className="text-red-accent ml-0.5">*</span>}
      </label>
      <div>{children}</div>
    </div>
  );
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
      <div className="space-y-5">
        {/* Section: Basic info */}
        <Section title="기본 정보">
          <Row label="설비" required={!hasPlanEquip}>
            {hasPlanEquip ? (
              <span className="text-sm text-gray-700 leading-9">
                {(plan?.equipment as { equip_nm?: string } | undefined)?.equip_nm ??
                  String(plan?.equip_cd ?? '')}
              </span>
            ) : (
              <Select
                placeholder="설비 선택"
                value={(formValues.equip_cd as string) ?? ''}
                onChange={(e) => setFormValues((prev) => ({ ...prev, equip_cd: e.target.value }))}
                options={equipments.map((e) => ({ label: e.equip_nm, value: e.equip_cd }))}
              />
            )}
          </Row>
          <Row label="보전유형">
            <CommonCodeSelect
              groupCd="MAINT_TYPE"
              placeholder="보전유형 선택"
              showAll
              value={(formValues.maint_type_cd as string) ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, maint_type_cd: e.target.value }))}
            />
          </Row>
          <Row label="작업일" required>
            <input
              type="date"
              className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
              value={(formValues.work_dt as string) ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, work_dt: e.target.value }))}
              required
            />
          </Row>
          <Row label="작업자">
            <Select
              placeholder="작업자 선택"
              value={(formValues.worker_id as string) ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, worker_id: e.target.value || undefined }))}
              options={workers.map((w) => ({ label: w.worker_nm, value: w.worker_id }))}
            />
          </Row>
          <Row label="비용">
            <input
              type="number"
              className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
              placeholder="보전 비용"
              min={0}
              value={(formValues.cost as number) ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, cost: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </Row>
          <Row label="메모">
            <Textarea
              rows={2}
              placeholder="보전 내용 메모"
              value={(formValues.memo as string) ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, memo: e.target.value }))}
            />
          </Row>
        </Section>

        {/* Section: Checklist results */}
        {checklistItems.length > 0 && (
          <Section title="점검항목 체크" aside="모든 항목 필수">
            {!allChecked && (
              <p className="text-sm text-yellow-600 mb-3">
                모든 점검항목을 체크한 후 저장할 수 있습니다.
              </p>
            )}
            <div className="space-y-3">
              {checklistItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[110px_1fr] gap-3 items-start"
                >
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-1">
                    항목 {index + 1}
                  </div>
                  <div>
                    <div className="text-sm text-gray-700 mb-1.5">
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
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Section: Replaced parts */}
        <Section
          title="교체 부품"
          action={
            <Button
              variant="ghost"
              onClick={addPart}
              icon={<Plus className="w-4 h-4" />}
              size="small"
            >
              부품 추가
            </Button>
          }
        >
          {parts.length === 0 ? (
            <p className="text-sm text-gray-400">교체된 부품이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {parts.map((part, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[110px_1fr] gap-3 items-center"
                >
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    부품 {index + 1}
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Section: Photo attachment */}
        <Section
          title="사진 첨부"
          aside={!createdResultId ? '저장 후 업로드 가능' : undefined}
        >
          <Row label="사진">
            <FileUpload
              refTable="tb_maint_result"
              refId={createdResultId}
              accept="image/*"
              maxCount={5}
              listType="picture"
            />
          </Row>
        </Section>
      </div>
    </Modal>
  );
}
