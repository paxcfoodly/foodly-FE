'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Radio,
  Select,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
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
  worker_id: number;
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
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

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
      const planDtls = (plan.plan_dtls as Array<Record<string, unknown>>) ?? [];
      const items: ChecklistItem[] = planDtls.map((dtl) => ({
        plan_dtl_id: dtl.plan_dtl_id as number | undefined,
        check_item: dtl.check_item as string,
        check_std: dtl.check_std as string | undefined,
        check_result: undefined,
      }));
      setChecklistItems(items);

      form.setFieldsValue({
        equip_cd: plan.equip_cd,
        maint_type_cd: plan.maint_type_cd,
        work_dt: dayjs(),
        cost: undefined,
        memo: '',
      });
    } else {
      setChecklistItems([]);
      form.resetFields();
      form.setFieldValue('work_dt', dayjs());
    }

    setParts([]);
  }, [open, plan, form]);

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
      message.warning('모든 점검항목을 체크한 후 저장할 수 있습니다.');
      return;
    }

    try {
      const values = await form.validateFields();
      setLoading(true);

      const validParts = parts.filter((p) => p.part_nm.trim() !== '');

      const body = {
        equip_cd: values.equip_cd ?? plan?.equip_cd,
        maint_plan_id: plan?.maint_plan_id,
        maint_type_cd: values.maint_type_cd,
        work_dt: values.work_dt
          ? (values.work_dt as dayjs.Dayjs).format('YYYY-MM-DD')
          : dayjs().format('YYYY-MM-DD'),
        worker_id: values.worker_id,
        cost: values.cost,
        memo: values.memo,
        replaced_parts: validParts.map((p) => ({
          part_nm: p.part_nm,
          qty: p.qty ?? 1,
          cost: p.cost ?? undefined,
        })),
        checklist_results: checklistItems.map((item) => ({
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

      message.success('보전이력이 등록되었습니다. 다음 점검일이 자동으로 갱신되었습니다.');
      form.resetFields();
      setChecklistItems([]);
      setParts([]);
      onOk();
    } catch (err: unknown) {
      const axiosErr = err as {
        errorFields?: unknown;
        response?: { data?: { message?: string } };
      };
      if (axiosErr?.errorFields) return;
      message.error(axiosErr?.response?.data?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [allChecked, form, plan, parts, checklistItems, onOk]);

  /* ── Cancel ───────────────────────────────────── */
  const handleCancel = useCallback(() => {
    form.resetFields();
    setChecklistItems([]);
    setParts([]);
    setCreatedResultId(undefined);
    onCancel();
  }, [form, onCancel]);

  const hasPlanEquip = !!plan?.equip_cd;

  return (
    <Modal
      open={open}
      title="보전이력 등록"
      width={760}
      destroyOnClose
      maskClosable={false}
      footer={
        <Space>
          <Button onClick={handleCancel}>취소</Button>
          <Button
            type="primary"
            loading={loading}
            onClick={handleOk}
            disabled={!allChecked && checklistItems.length > 0}
          >
            보전이력 저장
          </Button>
        </Space>
      }
      onCancel={handleCancel}
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        autoComplete="off"
      >
        {/* Section: Basic info */}
        <Divider titlePlacement="left" plain style={{ marginTop: 0 }}>
          기본 정보
        </Divider>

        {/* Equipment — readonly if from plan */}
        {hasPlanEquip ? (
          <Form.Item label="설비">
            <Typography.Text>
              {(plan?.equipment as { equip_nm?: string } | undefined)?.equip_nm ??
                String(plan?.equip_cd ?? '')}
            </Typography.Text>
            <Form.Item name="equip_cd" hidden initialValue={plan?.equip_cd}>
              <Input />
            </Form.Item>
          </Form.Item>
        ) : (
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
        )}

        {/* Maintenance type */}
        <Form.Item name="maint_type_cd" label="보전유형">
          <CommonCodeSelect groupCd="MAINT_TYPE" placeholder="보전유형 선택" allowClear />
        </Form.Item>

        {/* Work date */}
        <Form.Item
          name="work_dt"
          label="작업일"
          rules={[{ required: true, message: '작업일을 선택해주세요.' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        {/* Worker */}
        <Form.Item name="worker_id" label="작업자">
          <Select
            showSearch
            placeholder="작업자 선택"
            optionFilterProp="label"
            allowClear
            options={workers.map((w) => ({
              label: w.worker_nm,
              value: w.worker_id,
            }))}
          />
        </Form.Item>

        {/* Cost */}
        <Form.Item name="cost" label="비용">
          <InputNumber
            style={{ width: '100%' }}
            placeholder="보전 비용"
            min={0}
            precision={2}
            formatter={(val) =>
              val ? String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
            }
          />
        </Form.Item>

        {/* Memo */}
        <Form.Item name="memo" label="메모">
          <Input.TextArea rows={2} placeholder="보전 내용 메모" />
        </Form.Item>

        {/* Section: Checklist results — per D-10 */}
        {checklistItems.length > 0 && (
          <>
            <Divider titlePlacement="left" plain>
              점검항목 체크 <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                (모든 항목 필수)
              </Typography.Text>
            </Divider>

            {!allChecked && (
              <Typography.Text type="warning" style={{ display: 'block', marginBottom: 8 }}>
                모든 점검항목을 체크한 후 저장할 수 있습니다.
              </Typography.Text>
            )}

            <List
              size="small"
              dataSource={checklistItems}
              renderItem={(item, index) => (
                <List.Item
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    paddingLeft: 8,
                  }}
                >
                  <div style={{ marginBottom: 4 }}>
                    <Typography.Text strong>
                      {index + 1}. {item.check_item}
                    </Typography.Text>
                    {item.check_std && (
                      <Typography.Text
                        type="secondary"
                        style={{ marginLeft: 8, fontSize: 12 }}
                      >
                        기준: {item.check_std}
                      </Typography.Text>
                    )}
                  </div>
                  <Radio.Group
                    value={item.check_result}
                    onChange={(e) =>
                      handleCheckResultChange(index, e.target.value)
                    }
                  >
                    <Radio value="OK">양호</Radio>
                    <Radio value="ACTION_NEEDED">조치필요</Radio>
                    <Radio value="REPLACED">교체</Radio>
                  </Radio.Group>
                </List.Item>
              )}
            />
          </>
        )}

        {/* Section: Replaced parts — per D-11 */}
        <Divider titlePlacement="left" plain>
          교체 부품
        </Divider>

        {parts.map((part, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              alignItems: 'center',
            }}
          >
            <Input
              placeholder="부품명"
              style={{ flex: 2 }}
              value={part.part_nm}
              onChange={(e) => updatePart(index, 'part_nm', e.target.value)}
            />
            <InputNumber
              placeholder="수량"
              style={{ flex: 1 }}
              min={1}
              value={part.qty}
              onChange={(val) => updatePart(index, 'qty', val)}
            />
            <InputNumber
              placeholder="비용 (선택)"
              style={{ flex: 1 }}
              min={0}
              value={part.cost}
              onChange={(val) => updatePart(index, 'cost', val)}
            />
            <Tooltip title="삭제">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label="부품 행 삭제"
                onClick={() => removePart(index)}
                size="small"
              />
            </Tooltip>
          </div>
        ))}

        <Button
          type="dashed"
          onClick={addPart}
          icon={<PlusOutlined />}
          size="small"
          style={{ marginBottom: 16 }}
        >
          + 부품 추가
        </Button>

        {/* Section: Photo attachment — per D-12 */}
        <Divider titlePlacement="left" plain>
          사진 첨부
        </Divider>

        <Form.Item label="사진" wrapperCol={{ span: 18 }}>
          <FileUpload
            refTable="tb_maint_result"
            refId={createdResultId}
            accept="image/*"
            maxCount={5}
            listType="picture"
          />
          {!createdResultId && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              저장 후 사진이 이력에 연결됩니다.
            </Typography.Text>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}
