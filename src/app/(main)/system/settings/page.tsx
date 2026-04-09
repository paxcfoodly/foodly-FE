'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs,
  Form,
  Input,
  InputNumber,
  Card,
  Select,
  Table,
  Space,
  message,
  Modal,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import PermissionButton from '@/components/auth/PermissionButton';
import apiClient from '@/lib/apiClient';
import type { ApiResponse } from '@/types';

const MENU_URL = '/system/config';

/* ── Types ─────────────────────────────────────────── */

interface CompanyData {
  company_cd: string;
  company_nm: string;
  biz_no?: string;
  ceo_nm?: string;
  address?: string;
  tel?: string;
  fax?: string;
}

interface NumberingRow {
  num_type: string;
  prefix: string;
  date_format: string;
  seq_length: number;
  last_seq: number;
  [key: string]: unknown;
}

interface SysSetting {
  setting_key: string;
  setting_value: string;
  setting_group: string;
  setting_desc?: string;
}

interface NumberingEditValues {
  prefix: string;
  seq_length: number;
}

/* ── Tab 1: 회사정보 ─────────────────────────────── */

function CompanyTab() {
  const [form] = Form.useForm<CompanyData>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiClient.get<ApiResponse<CompanyData>>('/v1/settings/company');
        form.setFieldsValue(res.data.data);
      } catch {
        message.error('설정을 불러오지 못했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.');
      }
    }
    fetch();
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await apiClient.put('/v1/settings/company', values);
      message.success('설정이 저장되었습니다.');
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown[] };
      if (e?.errorFields) return;
      message.error('설정 저장에 실패했습니다. 입력값을 확인하고 다시 시도하세요.');
    } finally {
      setLoading(false);
    }
  }, [form]);

  return (
    <Card bordered={false} style={{ maxWidth: 600 }}>
      <Form form={form} layout="vertical">
        <Form.Item name="company_cd" label="회사코드">
          <Input disabled />
        </Form.Item>
        <Form.Item
          name="company_nm"
          label="회사명"
          rules={[{ required: true, message: '회사명은(는) 필수입니다.' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="biz_no" label="사업자번호">
          <Input />
        </Form.Item>
        <Form.Item name="ceo_nm" label="대표자">
          <Input />
        </Form.Item>
        <Form.Item name="address" label="주소">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="tel" label="연락처">
          <Input />
        </Form.Item>
        <Form.Item name="fax" label="팩스">
          <Input />
        </Form.Item>
        <Form.Item>
          <PermissionButton
            action="update"
            menuUrl={MENU_URL}
            type="primary"
            loading={loading}
            onClick={handleSave}
          >
            회사정보 저장
          </PermissionButton>
        </Form.Item>
      </Form>
    </Card>
  );
}

/* ── Tab 2: 채번규칙 ─────────────────────────────── */

function NumberingTab() {
  const [numberings, setNumberings] = useState<NumberingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<NumberingRow | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm<NumberingEditValues>();
  const [saving, setSaving] = useState(false);

  const fetchNumberings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<NumberingRow[]>>('/v1/settings/numberings');
      setNumberings(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      message.error('설정을 불러오지 못했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNumberings();
  }, [fetchNumberings]);

  const handleEdit = useCallback((record: NumberingRow) => {
    setEditTarget(record);
    editForm.setFieldsValue({ prefix: record.prefix, seq_length: record.seq_length });
    setEditModalOpen(true);
  }, [editForm]);

  const handleEditSave = useCallback(async () => {
    if (!editTarget) return;
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      await apiClient.put(`/v1/settings/numberings/${editTarget.num_type}`, values);
      message.success('설정이 저장되었습니다.');
      setEditModalOpen(false);
      fetchNumberings();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown[] };
      if (e?.errorFields) return;
      message.error('설정 저장에 실패했습니다. 입력값을 확인하고 다시 시도하세요.');
    } finally {
      setSaving(false);
    }
  }, [editTarget, editForm, fetchNumberings]);

  const columns = [
    { title: '채번유형', dataIndex: 'num_type', width: 140 },
    { title: '접두어', dataIndex: 'prefix', width: 100 },
    { title: '날짜형식', dataIndex: 'date_format', width: 120 },
    { title: '자릿수', dataIndex: 'seq_length', width: 80, align: 'center' as const },
    { title: '현재번호', dataIndex: 'last_seq', width: 100, align: 'center' as const },
    {
      title: '관리',
      dataIndex: '_action',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: NumberingRow) => (
        <PermissionButton
          action="update"
          menuUrl={MENU_URL}
          size="small"
          type="text"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          {''}
        </PermissionButton>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={numberings}
        rowKey="num_type"
        loading={loading}
        pagination={false}
        size="small"
        locale={{ emptyText: '등록된 채번규칙이 없습니다. 추가 버튼을 눌러 새 규칙을 만드세요.' }}
      />

      <Modal
        open={editModalOpen}
        title="채번규칙 편집"
        onOk={handleEditSave}
        onCancel={() => setEditModalOpen(false)}
        okText="채번규칙 저장"
        cancelText="취소"
        confirmLoading={saving}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="prefix" label="접두어">
            <Input />
          </Form.Item>
          <Form.Item
            name="seq_length"
            label="자릿수"
            rules={[{ required: true, message: '자릿수는(는) 필수입니다.' }]}
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

/* ── Tab 3: 기본값설정 ──────────────────────────── */

interface WorkshopOption {
  workshop_cd: string;
  workshop_nm: string;
}

function DefaultsTab() {
  const [form] = Form.useForm<Record<string, string | number>>();
  const [loading, setLoading] = useState(false);
  const [workshopOptions, setWorkshopOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsRes, workshopRes] = await Promise.all([
          apiClient.get<ApiResponse<SysSetting[]>>('/v1/settings?group=DEFAULT'),
          apiClient.get<ApiResponse<WorkshopOption[]>>('/v1/workshops'),
        ]);
        const settings = settingsRes.data.data;
        if (Array.isArray(settings)) {
          const fieldValues: Record<string, string | number> = {};
          settings.forEach((s) => {
            if (s.setting_key === 'page_size') {
              fieldValues[s.setting_key] = Number(s.setting_value) || 20;
            } else {
              fieldValues[s.setting_key] = s.setting_value;
            }
          });
          form.setFieldsValue(fieldValues);
        }
        const workshops = workshopRes.data.data;
        if (Array.isArray(workshops)) {
          setWorkshopOptions(
            workshops.map((w) => ({ label: w.workshop_nm, value: w.workshop_cd })),
          );
        }
      } catch {
        message.error('설정을 불러오지 못했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.');
      }
    }
    fetchData();
  }, [form]);

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const settings = Object.entries(values)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([key, value]) => ({ key, value: String(value) }));
      await apiClient.patch('/v1/settings', { settings });
      message.success('설정이 저장되었습니다.');
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown[] };
      if (e?.errorFields) return;
      message.error('설정 저장에 실패했습니다. 입력값을 확인하고 다시 시도하세요.');
    } finally {
      setLoading(false);
    }
  }, [form]);

  return (
    <Card bordered={false} style={{ maxWidth: 600 }}>
      <Form form={form} layout="vertical">
        <Form.Item name="default_warehouse_cd" label="기본 창고">
          <Select options={workshopOptions} allowClear placeholder="창고 선택" />
        </Form.Item>
        <Form.Item name="default_workshop_cd" label="기본 생산라인">
          <Select options={workshopOptions} allowClear placeholder="생산라인 선택" />
        </Form.Item>
        <Form.Item name="page_size" label="페이지당 행수">
          <InputNumber min={10} max={100} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item>
          <PermissionButton
            action="update"
            menuUrl={MENU_URL}
            type="primary"
            loading={loading}
            onClick={handleSave}
          >
            기본값 저장
          </PermissionButton>
        </Form.Item>
      </Form>
    </Card>
  );
}

/* ── Main Page ──────────────────────────────────── */

export default function SystemSettingsPage() {
  const items = [
    {
      key: 'company',
      label: '회사정보',
      children: <CompanyTab />,
    },
    {
      key: 'numbering',
      label: '채번규칙',
      children: <NumberingTab />,
    },
    {
      key: 'defaults',
      label: '기본값설정',
      children: <DefaultsTab />,
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Tabs items={items} tabPosition="top" />
    </Space>
  );
}
