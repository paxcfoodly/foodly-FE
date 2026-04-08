'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Radio,
  Input,
  Button,
  Space,
  message,
} from 'antd';
import apiClient from '@/lib/apiClient';

/* ── Types ──────────────────────────────────────────── */

interface UserOption {
  user_id: number;
  user_nm: string;
  login_id: string;
  [key: string]: unknown;
}

export interface DisposeFormModalProps {
  open: boolean;
  defectId: number;
  onClose: () => void;
  onSaved: () => void;
}

/* ── Component ──────────────────────────────────────── */

export default function DisposeFormModal({
  open,
  defectId,
  onClose,
  onSaved,
}: DisposeFormModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [disposeType, setDisposeType] = useState<string>('REWORK');
  const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);

  /* ── Load users for approver select ─── */
  useEffect(() => {
    apiClient
      .get<{ data: UserOption[] }>('/v1/users', { params: { limit: 9999 } })
      .then((res) => {
        const list = res.data?.data ?? [];
        setUserOptions(
          list.map((u) => ({
            label: `${u.user_nm} (${u.login_id})`,
            value: u.login_id,
          })),
        );
      })
      .catch(() => {
        // Users API failure is non-blocking for REWORK/SCRAP
      });
  }, []);

  /* ── Reset on open ─── */
  useEffect(() => {
    if (open) {
      form.resetFields();
      setDisposeType('REWORK');
    }
  }, [open, form]);

  /* ── Save handler ─── */
  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: Record<string, unknown> = {
        dispose_type: values.dispose_type,
        dispose_qty: values.dispose_qty,
      };
      if (values.approve_by) payload.approve_by = values.approve_by;
      if (values.remark) payload.remark = values.remark;

      await apiClient.post(`/v1/defects/${defectId}/disposals`, payload);
      message.success('후속조치가 등록되었습니다.');
      form.resetFields();
      onSaved();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [form, defectId, onSaved, onClose]);

  /* ── Dispose type change ─── */
  const handleDisposeTypeChange = useCallback(
    (val: string) => {
      setDisposeType(val);
      // Clear approve_by when switching away from CONCESSION
      if (val !== 'CONCESSION') {
        form.setFieldValue('approve_by', undefined);
      }
    },
    [form],
  );

  const footer = (
    <Space>
      <Button onClick={onClose}>취소</Button>
      <Button type="primary" loading={loading} onClick={handleSave}>
        등록
      </Button>
    </Space>
  );

  return (
    <Modal
      open={open}
      title="후속조치 등록"
      width={640}
      destroyOnClose
      maskClosable={false}
      footer={footer}
      onCancel={onClose}
    >
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        initialValues={{ dispose_type: 'REWORK' }}
        autoComplete="off"
      >
        <Form.Item
          name="dispose_type"
          label="처리유형"
          rules={[{ required: true, message: '처리유형을 선택하세요.' }]}
        >
          <Radio.Group onChange={(e) => handleDisposeTypeChange(e.target.value)}>
            <Radio value="REWORK">재작업</Radio>
            <Radio value="SCRAP">폐기</Radio>
            <Radio value="CONCESSION">특채</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="dispose_qty"
          label="처리수량"
          rules={[
            { required: true, message: '처리수량을 입력하세요.' },
            { type: 'number', min: 1, message: '1 이상의 값을 입력하세요.' },
          ]}
        >
          <InputNumber min={1} style={{ width: '100%' }} placeholder="처리 수량" precision={0} />
        </Form.Item>

        <Form.Item
          name="approve_by"
          label="승인자"
          rules={[
            {
              required: disposeType === 'CONCESSION',
              message: '특채(CONCESSION) 처리 시 승인자를 선택해야 합니다.',
            },
          ]}
        >
          <Select
            placeholder={
              disposeType === 'CONCESSION' ? '승인자 선택 (필수)' : '승인자 선택 (선택사항)'
            }
            options={userOptions}
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={userOptions.length === 0}
          />
        </Form.Item>

        <Form.Item name="remark" label="비고">
          <Input.TextArea rows={3} placeholder="비고 입력" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
