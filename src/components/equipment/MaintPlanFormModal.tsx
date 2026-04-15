'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import dayjs from 'dayjs';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Section, Row } from '@/components/ui/Section';
import toast from '@/components/ui/toast';
import CommonCodeSelect from '@/components/common/CommonCodeSelect';
import apiClient from '@/lib/apiClient';

/* ── Types ─────────────────────────────────────────── */

export interface MaintPlanFormModalProps {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  plan?: Record<string, unknown>;
  onOk: () => void;
  onCancel: () => void;
}

interface EquipmentOption {
  equip_cd: string;
  equip_nm: string;
}

interface WorkerOption {
  worker_id: string;
  worker_nm: string;
}

interface ChecklistItem {
  plan_dtl_id?: number;
  check_item: string;
  check_std: string;
}

/* ── Component ────────────────────────────────────── */

export default function MaintPlanFormModal({
  open,
  mode,
  plan,
  onOk,
  onCancel,
}: MaintPlanFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [equipments, setEquipments] = useState<EquipmentOption[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const isView = mode === 'view';

  /* Form state */
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  /* ── Fetch reference data ─────────────────────── */
  useEffect(() => {
    if (!open) return;

    apiClient
      .get('/v1/equipments', { params: { use_yn: 'Y', limit: 500 } })
      .then((res) => {
        const rows = res.data?.data ?? [];
        setEquipments(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setEquipments([]));

    apiClient
      .get('/v1/workers', { params: { limit: 500 } })
      .then((res) => {
        const rows = res.data?.data ?? [];
        setWorkers(Array.isArray(rows) ? rows : []);
      })
      .catch(() => setWorkers([]));
  }, [open]);

  /* ── Populate form on open ────────────────────── */
  useEffect(() => {
    if (!open) return;

    if (plan && (mode === 'edit' || mode === 'view')) {
      const planDtls = (plan.plan_dtls as Array<Record<string, unknown>>) ?? [];
      setFormValues({
        equip_cd: plan.equip_cd,
        plan_nm: plan.plan_nm,
        maint_type_cd: plan.maint_type_cd,
        cycle_type: plan.cycle_type,
        next_plan_date: plan.next_plan_date
          ? String(plan.next_plan_date).slice(0, 10)
          : '',
        assignee_id: plan.assignee_id,
        description: plan.description,
      });
      setChecklistItems(
        planDtls.map((dtl) => ({
          plan_dtl_id: dtl.plan_dtl_id as number | undefined,
          check_item: (dtl.check_item as string) ?? '',
          check_std: (dtl.check_std as string) ?? '',
        })),
      );
    } else {
      setFormValues({});
      setChecklistItems([]);
    }
  }, [open, plan, mode]);

  /* ── Submit ───────────────────────────────────── */
  const handleOk = useCallback(async () => {
    if (isView) {
      onCancel();
      return;
    }

    if (!formValues.equip_cd) {
      toast.warning('설비를 선택해주세요.');
      return;
    }
    if (!formValues.plan_nm) {
      toast.warning('보전계획명을 입력해주세요.');
      return;
    }
    if (!formValues.next_plan_date) {
      toast.warning('점검일을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);

      const items = checklistItems
        .filter((item) => item.check_item.trim())
        .map((item, idx) => ({
          item_no: idx + 1,
          check_item: item.check_item,
          check_std: item.check_std ?? '',
        }));

      const body = {
        equip_cd: formValues.equip_cd,
        plan_nm: formValues.plan_nm,
        maint_type_cd: formValues.maint_type_cd,
        cycle_type: formValues.cycle_type,
        next_plan_date: formValues.next_plan_date,
        assignee_id: formValues.assignee_id,
        description: formValues.description,
        checklist_items: items,
      };

      if (mode === 'create') {
        await apiClient.post('/v1/maint-plans', body);
      } else {
        const planId = (plan as Record<string, unknown>)?.maint_plan_id;
        await apiClient.put(`/v1/maint-plans/${planId}`, body);
      }

      toast.success('보전계획이 저장되었습니다.');
      setFormValues({});
      setChecklistItems([]);
      onOk();
    } catch (err: unknown) {
      const axiosErr = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (axiosErr?.errorFields) return;
      toast.error(axiosErr?.response?.data?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [formValues, isView, mode, plan, checklistItems, onOk, onCancel]);

  /* ── Cancel ───────────────────────────────────── */
  const handleCancel = useCallback(() => {
    setFormValues({});
    setChecklistItems([]);
    onCancel();
  }, [onCancel]);

  /* ── Modal title ──────────────────────────────── */
  const title =
    mode === 'create'
      ? '보전계획 등록'
      : mode === 'edit'
        ? '보전계획 수정'
        : '보전계획 상세';

  /* ── Footer ───────────────────────────────────── */
  const footer = isView ? (
    <Button onClick={handleCancel}>닫기</Button>
  ) : (
    <div className="flex items-center gap-2">
      <Button onClick={handleCancel}>취소</Button>
      <Button variant="primary" loading={loading} onClick={handleOk}>
        {mode === 'create' ? '등록' : '저장'}
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      title={title}
      width={720}
      maskClosable={false}
      onClose={handleCancel}
      footer={footer}
    >
      <fieldset disabled={isView} className="space-y-5">
        <Section title="기본 정보">
          <Row label="설비" required>
            <Select
              placeholder="설비 선택"
              value={(formValues.equip_cd as string) ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, equip_cd: e.target.value }))}
              options={equipments.map((e) => ({ label: e.equip_nm, value: e.equip_cd }))}
            />
          </Row>
          <Row label="보전계획명" required>
            <Input
              placeholder="보전계획명"
              required
              value={(formValues.plan_nm as string) ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, plan_nm: e.target.value }))}
            />
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
          <Row label="점검주기">
            <Select
              placeholder="주기 선택"
              value={(formValues.cycle_type as string) ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, cycle_type: e.target.value }))}
              options={[
                { label: '매일', value: 'DAILY' },
                { label: '매주', value: 'WEEKLY' },
                { label: '매월', value: 'MONTHLY' },
                { label: '매년', value: 'YEARLY' },
              ]}
            />
          </Row>
          <Row label="점검일" required>
            <input
              type="date"
              className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
              required
              value={(formValues.next_plan_date as string) ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, next_plan_date: e.target.value }))}
            />
          </Row>
          <Row label="담당자">
            <Select
              placeholder="담당자 선택"
              value={(formValues.assignee_id as string) ?? ''}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  assignee_id: e.target.value || undefined,
                }))
              }
              options={workers.map((w) => ({
                label: `${w.worker_id} - ${w.worker_nm}`,
                value: w.worker_id,
              }))}
            />
          </Row>
          <Row label="설명">
            <Textarea
              rows={2}
              placeholder="보전 설명"
              value={(formValues.description as string) ?? ''}
              onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))}
            />
          </Row>
        </Section>

        <Section
          title="점검항목"
          action={
            !isView ? (
              <Button
                variant="ghost"
                onClick={() =>
                  setChecklistItems((prev) => [...prev, { check_item: '', check_std: '' }])
                }
                icon={<Plus className="w-4 h-4" />}
                size="small"
              >
                항목 추가
              </Button>
            ) : undefined
          }
        >
          {checklistItems.length === 0 ? (
            <p className="text-sm text-gray-400">등록된 점검항목이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {checklistItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[110px_1fr] gap-3 items-center"
                >
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    항목 {index + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="점검항목명"
                      required
                      className="flex-1"
                      value={item.check_item}
                      onChange={(e) => {
                        setChecklistItems((prev) =>
                          prev.map((ci, i) =>
                            i === index ? { ...ci, check_item: e.target.value } : ci,
                          ),
                        );
                      }}
                    />
                    <Input
                      placeholder="점검기준 (선택)"
                      className="flex-1"
                      value={item.check_std}
                      onChange={(e) => {
                        setChecklistItems((prev) =>
                          prev.map((ci, i) =>
                            i === index ? { ...ci, check_std: e.target.value } : ci,
                          ),
                        );
                      }}
                    />
                    {!isView && (
                      <Button
                        variant="danger"
                        size="small"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={() =>
                          setChecklistItems((prev) => prev.filter((_, i) => i !== index))
                        }
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </fieldset>
    </Modal>
  );
}
