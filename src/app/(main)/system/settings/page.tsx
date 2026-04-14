'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Pencil } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import FormField from '@/components/ui/FormField';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Tabs from '@/components/ui/Tabs';
import toast from '@/components/ui/toast';
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
  const [formValues, setFormValues] = useState<CompanyData>({
    company_cd: '',
    company_nm: '',
    biz_no: '',
    ceo_nm: '',
    address: '',
    tel: '',
    fax: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiClient.get<ApiResponse<CompanyData>>('/v1/settings/company');
        if (res.data.data) setFormValues(res.data.data);
      } catch {
        toast.error('설정을 불러오지 못했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.');
      }
    }
    fetch();
  }, []);

  const handleSave = useCallback(async () => {
    if (!formValues.company_nm) {
      toast.warning('회사명은(는) 필수입니다.');
      return;
    }
    try {
      setLoading(true);
      await apiClient.put('/v1/settings/company', formValues);
      toast.success('설정이 저장되었습니다.');
    } catch {
      toast.error('설정 저장에 실패했습니다. 입력값을 확인하고 다시 시도하세요.');
    } finally {
      setLoading(false);
    }
  }, [formValues]);

  const updateField = (field: keyof CompanyData, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-[600px]">
      <div className="space-y-4">
        <FormField label="회사코드">
          <Input value={formValues.company_cd} disabled />
        </FormField>
        <FormField label="회사명" required>
          <Input
            value={formValues.company_nm}
            onChange={(e) => updateField('company_nm', e.target.value)}
            required
          />
        </FormField>
        <FormField label="사업자번호">
          <Input value={formValues.biz_no ?? ''} onChange={(e) => updateField('biz_no', e.target.value)} />
        </FormField>
        <FormField label="대표자">
          <Input value={formValues.ceo_nm ?? ''} onChange={(e) => updateField('ceo_nm', e.target.value)} />
        </FormField>
        <FormField label="주소">
          <Textarea rows={2} value={formValues.address ?? ''} onChange={(e) => updateField('address', e.target.value)} />
        </FormField>
        <FormField label="연락처">
          <Input value={formValues.tel ?? ''} onChange={(e) => updateField('tel', e.target.value)} />
        </FormField>
        <FormField label="팩스">
          <Input value={formValues.fax ?? ''} onChange={(e) => updateField('fax', e.target.value)} />
        </FormField>
        <PermissionButton
          action="update"
          menuUrl={MENU_URL}
          variant="primary"
          loading={loading}
          onClick={handleSave}
        >
          회사정보 저장
        </PermissionButton>
      </div>
    </div>
  );
}

/* ── Tab 2: 채번규칙 ─────────────────────────────── */

function NumberingTab() {
  const [numberings, setNumberings] = useState<NumberingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<NumberingRow | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<NumberingEditValues>({ prefix: '', seq_length: 4 });
  const [saving, setSaving] = useState(false);

  const fetchNumberings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<NumberingRow[]>>('/v1/settings/numberings');
      setNumberings(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      toast.error('설정을 불러오지 못했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNumberings();
  }, [fetchNumberings]);

  const handleEdit = useCallback((record: NumberingRow) => {
    setEditTarget(record);
    setEditForm({ prefix: record.prefix, seq_length: record.seq_length });
    setEditModalOpen(true);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editTarget) return;
    if (!editForm.seq_length) {
      toast.warning('자릿수는(는) 필수입니다.');
      return;
    }
    try {
      setSaving(true);
      await apiClient.put(`/v1/settings/numberings/${editTarget.num_type}`, editForm);
      toast.success('설정이 저장되었습니다.');
      setEditModalOpen(false);
      fetchNumberings();
    } catch {
      toast.error('설정 저장에 실패했습니다. 입력값을 확인하고 다시 시도하세요.');
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
          variant="ghost"
          icon={<Pencil className="w-4 h-4" />}
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
        emptyText="등록된 채번규칙이 없습니다. 추가 버튼을 눌러 새 규칙을 만드세요."
      />

      <Modal
        open={editModalOpen}
        title="채번규칙 편집"
        onClose={() => setEditModalOpen(false)}
        footer={
          <div className="flex items-center gap-2">
            <Button onClick={() => setEditModalOpen(false)}>취소</Button>
            <Button variant="primary" loading={saving} onClick={handleEditSave}>채번규칙 저장</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="접두어">
            <Input
              value={editForm.prefix}
              onChange={(e) => setEditForm((prev) => ({ ...prev, prefix: e.target.value }))}
            />
          </FormField>
          <FormField label="자릿수" required>
            <input
              type="number"
              min={1}
              max={10}
              required
              className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
              value={editForm.seq_length}
              onChange={(e) => setEditForm((prev) => ({ ...prev, seq_length: Number(e.target.value) }))}
            />
          </FormField>
        </div>
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
  const [formValues, setFormValues] = useState<Record<string, string | number>>({});
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
          setFormValues(fieldValues);
        }
        const workshops = workshopRes.data.data;
        if (Array.isArray(workshops)) {
          setWorkshopOptions(
            workshops.map((w) => ({ label: w.workshop_nm, value: w.workshop_cd })),
          );
        }
      } catch {
        toast.error('설정을 불러오지 못했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.');
      }
    }
    fetchData();
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setLoading(true);
      const settings = Object.entries(formValues)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([key, value]) => ({ key, value: String(value) }));
      await apiClient.patch('/v1/settings', { settings });
      toast.success('설정이 저장되었습니다.');
    } catch {
      toast.error('설정 저장에 실패했습니다. 입력값을 확인하고 다시 시도하세요.');
    } finally {
      setLoading(false);
    }
  }, [formValues]);

  return (
    <div className="max-w-[600px]">
      <div className="space-y-4">
        <FormField label="기본 창고">
          <Select
            options={workshopOptions}
            placeholder="창고 선택"
            value={(formValues.default_warehouse_cd as string) ?? ''}
            onChange={(e) => setFormValues((prev) => ({ ...prev, default_warehouse_cd: e.target.value }))}
          />
        </FormField>
        <FormField label="기본 생산라인">
          <Select
            options={workshopOptions}
            placeholder="생산라인 선택"
            value={(formValues.default_workshop_cd as string) ?? ''}
            onChange={(e) => setFormValues((prev) => ({ ...prev, default_workshop_cd: e.target.value }))}
          />
        </FormField>
        <FormField label="페이지당 행수">
          <input
            type="number"
            min={10}
            max={100}
            className="w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15"
            value={(formValues.page_size as number) ?? ''}
            onChange={(e) => setFormValues((prev) => ({ ...prev, page_size: Number(e.target.value) || '' }))}
          />
        </FormField>
        <PermissionButton
          action="update"
          menuUrl={MENU_URL}
          variant="primary"
          loading={loading}
          onClick={handleSave}
        >
          기본값 저장
        </PermissionButton>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────── */

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('company');

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
    <div className="w-full space-y-4">
      <Tabs items={items} activeKey={activeTab} onChange={setActiveTab} />
    </div>
  );
}
