'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
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
  worker_id: number;
  worker_nm: string;
}

/* ── Component ────────────────────────────────────── */

export default function MaintPlanFormModal({
  open,
  mode,
  plan,
  onOk,
  onCancel,
}: MaintPlanFormModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [equipments, setEquipments] = useState<EquipmentOption[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const isView = mode === 'view';

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
      form.setFieldsValue({
        equip_cd: plan.equip_cd,
        plan_nm: plan.plan_nm,
        maint_type_cd: plan.maint_type_cd,
        cycle_type: plan.cycle_type,
        next_plan_date: plan.next_plan_date
          ? dayjs(plan.next_plan_date as string)
          : undefined,
        assignee_id: plan.assignee_id,
        description: plan.description,
        checklist_items: planDtls.map((dtl) => ({
          plan_dtl_id: dtl.plan_dtl_id,
          check_item: dtl.check_item,
          check_std: dtl.check_std ?? '',
        })),
      });
    } else {
      form.resetFields();
    }
  }, [open, plan, mode, form]);

  /* ── Submit ───────────────────────────────────── */
  const handleOk = useCallback(async () => {
    if (isView) {
      onCancel();
      return;
    }

    try {
      const values = await form.validateFields();
      setLoading(true);

      const checklistItems = (
        (values.checklist_items as Array<{ check_item: string; check_std?: string }>) ?? []
      ).map((item, idx) => ({
        item_no: idx + 1,
        check_item: item.check_item,
        check_std: item.check_std ?? '',
      }));

      const body = {
        equip_cd: values.equip_cd,
        plan_nm: values.plan_nm,
        maint_type_cd: values.maint_type_cd,
        cycle_type: values.cycle_type,
        next_plan_date: values.next_plan_date
          ? (values.next_plan_date as dayjs.Dayjs).format('YYYY-MM-DD')
          : undefined,
        assignee_id: values.assignee_id,
        description: values.description,
        checklist_items: checklistItems,
      };

      if (mode === 'create') {
        await apiClient.post('/v1/maint-plans', body);
      } else {
        const planId = (plan as Record<string, unknown>)?.maint_plan_id;
        await apiClient.put(`/v1/maint-plans/${planId}`, body);
      }

      message.success('보전계획이 저장되었습니다.');
      form.resetFields();
      onOk();
    } catch (err: unknown) {
      const axiosErr = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (axiosErr?.errorFields) return; // validation error
      message.error(axiosErr?.response?.data?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [form, isView, mode, plan, onOk, onCancel]);

  /* ── Cancel ───────────────────────────────────── */
  const handleCancel = useCallback(() => {
    form.resetFields();
    onCancel();
  }, [form, onCancel]);

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
    <Space>
      <Button onClick={handleCancel}>취소</Button>
      <Button type="primary" loading={loading} onClick={handleOk}>
        {mode === 'create' ? '등록' : '저장'}
      </Button>
    </Space>
  );

  return (
    <Modal
      open={open}
      title={title}
      width={720}
      destroyOnClose
      maskClosable={false}
      footer={footer}
      onCancel={handleCancel}
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        disabled={isView}
        autoComplete="off"
      >
        {/* Equipment */}
        <Form.Item
          name="equip_cd"
          label="설비"
          rules={[{ required: true, message: '설비를 선택해주세요.' }]}
        >
          <Select
            showSearch
            placeholder="설비 선택"
            optionFilterProp="label"
            allowClear
            options={equipments.map((e) => ({
              label: e.equip_nm,
              value: e.equip_cd,
            }))}
          />
        </Form.Item>

        {/* Plan name */}
        <Form.Item
          name="plan_nm"
          label="보전계획명"
          rules={[{ required: true, message: '보전계획명을 입력해주세요.' }]}
        >
          <Input placeholder="보전계획명" />
        </Form.Item>

        {/* Maintenance type */}
        <Form.Item name="maint_type_cd" label="보전유형">
          <CommonCodeSelect groupCd="MAINT_TYPE" placeholder="보전유형 선택" allowClear />
        </Form.Item>

        {/* Cycle type */}
        <Form.Item name="cycle_type" label="점검주기">
          <Select
            placeholder="주기 선택"
            allowClear
            options={[
              { label: '매일', value: 'DAILY' },
              { label: '매주', value: 'WEEKLY' },
              { label: '매월', value: 'MONTHLY' },
              { label: '매년', value: 'YEARLY' },
            ]}
          />
        </Form.Item>

        {/* Next plan date */}
        <Form.Item
          name="next_plan_date"
          label="점검일"
          rules={[{ required: true, message: '점검일을 선택해주세요.' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        {/* Assignee */}
        <Form.Item name="assignee_id" label="담당자">
          <Select
            showSearch
            placeholder="담당자 선택"
            optionFilterProp="label"
            allowClear
            options={workers.map((w) => ({
              label: w.worker_nm,
              value: w.worker_id,
            }))}
          />
        </Form.Item>

        {/* Description */}
        <Form.Item name="description" label="설명">
          <Input.TextArea rows={2} placeholder="보전 설명" />
        </Form.Item>

        {/* Dynamic checklist items — per D-10 */}
        <Form.Item label="점검항목" style={{ marginBottom: 0 }}>
          <Form.List name="checklist_items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Space
                    key={field.key}
                    align="baseline"
                    style={{ display: 'flex', marginBottom: 8 }}
                  >
                    <span style={{ minWidth: 24, color: '#8c8c8c' }}>
                      {index + 1}.
                    </span>
                    <Form.Item
                      {...field}
                      name={[field.name, 'check_item']}
                      rules={[{ required: true, message: '항목명 필수' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="점검항목명" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'check_std']}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="점검기준 (선택)" style={{ width: 200 }} />
                    </Form.Item>
                    {!isView && (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                        size="small"
                      />
                    )}
                  </Space>
                ))}
                {!isView && (
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    size="small"
                  >
                    항목 추가
                  </Button>
                )}
              </>
            )}
          </Form.List>
        </Form.Item>
      </Form>
    </Modal>
  );
}
