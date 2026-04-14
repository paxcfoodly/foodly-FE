'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Tag from '@/components/ui/Tag';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import FormField from '@/components/ui/FormField';
import Switch from '@/components/ui/Switch';
import Table from '@/components/ui/Table';
import Empty from '@/components/ui/Empty';
import toast from '@/components/ui/toast';
import { confirm } from '@/components/ui/confirm';
import CommonCodeSelect from '@/components/common/CommonCodeSelect';
import PermissionButton from '@/components/auth/PermissionButton';
import apiClient from '@/lib/apiClient';
import type { ApiResponse } from '@/types';

const MENU_URL = '/system/notification';

/* ── Types ─────────────────────────────────────────── */

interface RoleOption {
  role_cd: string;
  role_nm: string;
}

interface NotiRule {
  rule_id: number;
  event_type: string;
  target_role_cd: string;
  channel: string;
  use_yn: string;
  target_role?: {
    role_nm: string;
  };
  [key: string]: unknown;
}

interface NotiRuleFormValues {
  event_type: string;
  target_role_cd: string;
  channel: string;
}

const CHANNEL_OPTIONS = [{ value: 'IN_APP', label: '화면내알림' }];

/* ── Component ─────────────────────────────────────── */

export default function NotificationsPage() {
  const [rules, setRules] = useState<NotiRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NotiRule | null>(null);
  const [formValues, setFormValues] = useState<NotiRuleFormValues>({
    event_type: '',
    target_role_cd: '',
    channel: 'IN_APP',
  });
  const [saving, setSaving] = useState(false);

  /* ── Data fetch ─── */

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<NotiRule[]>>('/v1/noti-rules');
      setRules(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      toast.error('알림 규칙을 불러오지 못했습니다. 페이지를 새로고침하세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await apiClient.get<ApiResponse<RoleOption[]>>('/v1/roles');
      setRoles(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      // roles are non-critical, silent fail
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchRoles();
  }, [fetchRules, fetchRoles]);

  /* ── Handlers ─── */

  const handleToggle = useCallback(
    async (rule: NotiRule, checked: boolean) => {
      const newUseYn = checked ? 'Y' : 'N';
      // Optimistic update
      setRules((prev) =>
        prev.map((r) => (r.rule_id === rule.rule_id ? { ...r, use_yn: newUseYn } : r)),
      );
      try {
        await apiClient.put(`/v1/noti-rules/${rule.rule_id}`, { use_yn: newUseYn });
      } catch {
        // Revert on failure
        setRules((prev) =>
          prev.map((r) => (r.rule_id === rule.rule_id ? { ...r, use_yn: rule.use_yn } : r)),
        );
        toast.error('상태 변경에 실패했습니다.');
      }
    },
    [],
  );

  const handleDelete = useCallback(
    async (ruleId: number) => {
      try {
        await apiClient.delete(`/v1/noti-rules/${ruleId}`);
        toast.success('알림 규칙이 삭제되었습니다.');
        fetchRules();
      } catch {
        toast.error('삭제에 실패했습니다. 다시 시도하세요.');
      }
    },
    [fetchRules],
  );

  const handleCreate = useCallback(() => {
    setEditTarget(null);
    setFormValues({ event_type: '', target_role_cd: '', channel: 'IN_APP' });
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback(
    (rule: NotiRule) => {
      setEditTarget(rule);
      setFormValues({
        event_type: rule.event_type,
        target_role_cd: rule.target_role_cd,
        channel: rule.channel,
      });
      setModalOpen(true);
    },
    [],
  );

  const handleModalSave = useCallback(async () => {
    if (!formValues.event_type || !formValues.target_role_cd || !formValues.channel) {
      toast.warning('모든 필수 항목을 입력해주세요.');
      return;
    }
    try {
      setSaving(true);
      if (editTarget) {
        await apiClient.put(`/v1/noti-rules/${editTarget.rule_id}`, formValues);
      } else {
        await apiClient.post('/v1/noti-rules', formValues);
      }
      toast.success('알림 규칙이 저장되었습니다.');
      setModalOpen(false);
      setFormValues({ event_type: '', target_role_cd: '', channel: 'IN_APP' });
      fetchRules();
    } catch {
      toast.error('저장에 실패했습니다. 다시 시도하세요.');
    } finally {
      setSaving(false);
    }
  }, [editTarget, formValues, fetchRules]);

  const handleModalCancel = useCallback(() => {
    setModalOpen(false);
    setFormValues({ event_type: '', target_role_cd: '', channel: 'IN_APP' });
    setEditTarget(null);
  }, []);

  /* ── Role options ─── */
  const roleOptions = roles.map((r) => ({ label: r.role_nm, value: r.role_cd }));

  /* ── Table columns ─── */
  const columns = [
    {
      title: '알림유형',
      dataIndex: 'event_type',
      width: 160,
      render: (val: unknown) => <Tag color="blue">{val as string}</Tag>,
    },
    {
      title: '수신자 역할',
      dataIndex: 'target_role_cd',
      width: 160,
      render: (_: unknown, record: NotiRule) => (
        <Tag>{record.target_role?.role_nm ?? record.target_role_cd}</Tag>
      ),
    },
    {
      title: '채널',
      dataIndex: 'channel',
      width: 120,
      render: (val: unknown) => {
        const opt = CHANNEL_OPTIONS.find((o) => o.value === val);
        return opt ? opt.label : (val as string);
      },
    },
    {
      title: '활성화',
      dataIndex: 'use_yn',
      width: 90,
      align: 'center' as const,
      render: (val: unknown, record: NotiRule) => (
        <Switch
          checked={(val as string) === 'Y'}
          onChange={(checked) => handleToggle(record, checked)}
          size="small"
        />
      ),
    },
    {
      title: '액션',
      dataIndex: '_action',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: NotiRule) => (
        <div className="flex items-center gap-1 justify-center">
          <PermissionButton
            action="update"
            menuUrl={MENU_URL}
            fallback="hide"
            size="small"
            variant="ghost"
            icon={<Pencil className="w-4 h-4" />}
            onClick={() => handleEdit(record)}
          >
            {''}
          </PermissionButton>
          <PermissionButton
            action="delete"
            menuUrl={MENU_URL}
            fallback="hide"
            size="small"
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => {
              confirm({
                title: '알림 규칙 삭제',
                content: '이 알림 규칙을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.',
                okText: '삭제',
                danger: true,
                onOk: () => handleDelete(record.rule_id),
              });
            }}
          >
            {''}
          </PermissionButton>
        </div>
      ),
    },
  ];

  /* ── Render ─── */
  return (
    <>
      <div className="bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">알림설정</h3>
          <PermissionButton
            action="create"
            menuUrl={MENU_URL}
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreate}
          >
            알림 규칙 추가
          </PermissionButton>
        </div>
        <div className="p-6">
          {!loading && rules.length === 0 ? (
            <Empty
              description={
                <div>
                  <div className="font-semibold mb-1">등록된 알림 규칙이 없습니다</div>
                  <div>알림 규칙 추가 버튼을 눌러 첫 번째 알림 규칙을 만드세요.</div>
                </div>
              }
            />
          ) : (
            <Table
              columns={columns}
              dataSource={rules}
              rowKey="rule_id"
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* 추가/편집 Modal */}
      <Modal
        open={modalOpen}
        title={editTarget ? '알림 규칙 편집' : '알림 규칙 추가'}
        onClose={handleModalCancel}
        footer={
          <div className="flex items-center gap-2">
            <Button onClick={handleModalCancel}>취소</Button>
            <Button variant="primary" loading={saving} onClick={handleModalSave}>저장</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="알림유형" required>
            <CommonCodeSelect
              groupCd="NOTI_TYPE"
              placeholder="알림유형 선택"
              value={formValues.event_type}
              onChange={(e) => setFormValues((prev) => ({ ...prev, event_type: e.target.value }))}
            />
          </FormField>
          <FormField label="수신자 역할" required>
            <Select
              placeholder="역할 선택"
              options={roleOptions}
              value={formValues.target_role_cd}
              onChange={(e) => setFormValues((prev) => ({ ...prev, target_role_cd: e.target.value }))}
            />
          </FormField>
          <FormField label="채널" required>
            <Select
              options={CHANNEL_OPTIONS}
              value={formValues.channel}
              onChange={(e) => setFormValues((prev) => ({ ...prev, channel: e.target.value }))}
            />
          </FormField>
        </div>
      </Modal>
    </>
  );
}
