'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Switch,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Popconfirm,
  Button,
  Card,
  Space,
  Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
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
  [key: string]: unknown;
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
  const [form] = Form.useForm<NotiRuleFormValues>();
  const [saving, setSaving] = useState(false);

  /* ── Data fetch ─── */

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<NotiRule[]>>('/v1/noti-rules');
      setRules(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      message.error('알림 규칙을 불러오지 못했습니다. 페이지를 새로고침하세요.');
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
        message.error('상태 변경에 실패했습니다.');
      }
    },
    [],
  );

  const handleDelete = useCallback(
    async (ruleId: number) => {
      try {
        await apiClient.delete(`/v1/noti-rules/${ruleId}`);
        message.success('알림 규칙이 삭제되었습니다.');
        fetchRules();
      } catch {
        message.error('삭제에 실패했습니다. 다시 시도하세요.');
      }
    },
    [fetchRules],
  );

  const handleCreate = useCallback(() => {
    setEditTarget(null);
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  const handleEdit = useCallback(
    (rule: NotiRule) => {
      setEditTarget(rule);
      form.setFieldsValue({
        event_type: rule.event_type,
        target_role_cd: rule.target_role_cd,
        channel: rule.channel,
      });
      setModalOpen(true);
    },
    [form],
  );

  const handleModalSave = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editTarget) {
        await apiClient.put(`/v1/noti-rules/${editTarget.rule_id}`, values);
      } else {
        await apiClient.post('/v1/noti-rules', values);
      }
      message.success('알림 규칙이 저장되었습니다.');
      setModalOpen(false);
      form.resetFields();
      fetchRules();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown[] };
      if (e?.errorFields) return;
      message.error('저장에 실패했습니다. 다시 시도하세요.');
    } finally {
      setSaving(false);
    }
  }, [editTarget, form, fetchRules]);

  const handleModalCancel = useCallback(() => {
    setModalOpen(false);
    form.resetFields();
    setEditTarget(null);
  }, [form]);

  /* ── Role options ─── */
  const roleOptions = roles.map((r) => ({ label: r.role_nm, value: r.role_cd }));

  /* ── Table columns ─── */
  const columns = [
    {
      title: '알림유형',
      dataIndex: 'event_type',
      width: 160,
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: '수신자 역할',
      dataIndex: 'target_role_cd',
      width: 160,
      render: (_: string, record: NotiRule) => (
        <Tag>{record.target_role?.role_nm ?? record.target_role_cd}</Tag>
      ),
    },
    {
      title: '채널',
      dataIndex: 'channel',
      width: 120,
      render: (val: string) => {
        const opt = CHANNEL_OPTIONS.find((o) => o.value === val);
        return opt ? opt.label : val;
      },
    },
    {
      title: '활성화',
      dataIndex: 'use_yn',
      width: 90,
      align: 'center' as const,
      render: (val: string, record: NotiRule) => (
        <Switch
          checked={val === 'Y'}
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
        <Space size={4}>
          <PermissionButton
            action="update"
            menuUrl={MENU_URL}
            fallback="hide"
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {''}
          </PermissionButton>
          <Popconfirm
            title="이 알림 규칙을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다."
            onConfirm={() => handleDelete(record.rule_id)}
            okText="삭제"
            okType="danger"
            cancelText="취소"
          >
            <PermissionButton
              action="delete"
              menuUrl={MENU_URL}
              fallback="hide"
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
            >
              {''}
            </PermissionButton>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /* ── Render ─── */
  return (
    <>
      <Card
        title="알림설정"
        extra={
          <PermissionButton
            action="create"
            menuUrl={MENU_URL}
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            알림 규칙 추가
          </PermissionButton>
        }
      >
        {!loading && rules.length === 0 ? (
          <Empty
            description={
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 알림 규칙이 없습니다</div>
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
            pagination={false}
            size="small"
          />
        )}
      </Card>

      {/* 추가/편집 Modal */}
      <Modal
        open={modalOpen}
        title={editTarget ? '알림 규칙 편집' : '알림 규칙 추가'}
        onOk={handleModalSave}
        onCancel={handleModalCancel}
        okText="저장"
        cancelText="취소"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="event_type"
            label="알림유형"
            rules={[{ required: true, message: '알림유형은(는) 필수입니다.' }]}
          >
            <CommonCodeSelect groupCd="NOTI_TYPE" placeholder="알림유형 선택" />
          </Form.Item>
          <Form.Item
            name="target_role_cd"
            label="수신자 역할"
            rules={[{ required: true, message: '수신자 역할은(는) 필수입니다.' }]}
          >
            <Select options={roleOptions} placeholder="역할 선택" />
          </Form.Item>
          <Form.Item
            name="channel"
            label="채널"
            initialValue="IN_APP"
            rules={[{ required: true, message: '채널은(는) 필수입니다.' }]}
          >
            <Select options={CHANNEL_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
