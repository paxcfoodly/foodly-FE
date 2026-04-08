'use client';

import React, { useState } from 'react';
import { Popover, Badge, Radio, Input, Button, Space, Typography, message } from 'antd';
import type { RadioChangeEvent } from 'antd';
import CommonCodeSelect from '@/components/common/CommonCodeSelect';
import apiClient from '@/lib/apiClient';

const STATUS_COLORS: Record<string, string> = {
  RUN: '#52c41a',
  IDLE: '#fa8c16',
  DOWN: '#ff4d4f',
  SETUP: '#faad14',
};

const STATUS_LABELS: Record<string, string> = {
  RUN: '가동',
  IDLE: '비가동',
  DOWN: '고장',
  SETUP: '점검',
};

const NON_RUN_STATUSES = ['IDLE', 'DOWN', 'SETUP'];

interface StatusTogglePopoverProps {
  equipCd: string;
  currentStatus?: string;
  onSuccess: () => void;
}

export default function StatusTogglePopover({
  equipCd,
  currentStatus,
  onSuccess,
}: StatusTogglePopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus ?? 'RUN');
  const [downReason, setDownReason] = useState<string | undefined>(undefined);
  const [memo, setMemo] = useState('');
  const [downReasonError, setDownReasonError] = useState(false);
  const [saving, setSaving] = useState(false);

  const requiresDownReason = NON_RUN_STATUSES.includes(selectedStatus);

  const isSaveEnabled = requiresDownReason ? !!downReason : true;

  const handleStatusChange = (e: RadioChangeEvent) => {
    setSelectedStatus(e.target.value as string);
    setDownReason(undefined);
    setDownReasonError(false);
  };

  const handleSave = async () => {
    if (requiresDownReason && !downReason) {
      setDownReasonError(true);
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/v1/equip-statuses', {
        equip_cd: equipCd,
        status_type: selectedStatus,
        down_reason_cd: downReason,
        memo: memo || undefined,
      });
      message.success('설비 상태가 변경되었습니다.');
      setOpen(false);
      onSuccess();
    } catch {
      message.error('상태 변경에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpenChange = (visible: boolean) => {
    if (visible) {
      setSelectedStatus(currentStatus ?? 'RUN');
      setDownReason(undefined);
      setMemo('');
      setDownReasonError(false);
    }
    setOpen(visible);
  };

  const content = (
    <div style={{ width: 280 }}>
      <Radio.Group
        value={selectedStatus}
        onChange={handleStatusChange}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <Radio key={value} value={value}>
            <Badge color={STATUS_COLORS[value]} text={label} />
          </Radio>
        ))}
      </Radio.Group>

      {requiresDownReason && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#595959' }}>
            비가동 사유 <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <CommonCodeSelect
            groupCd="DOWN_REASON"
            value={downReason}
            onChange={(val: string) => {
              setDownReason(val);
              setDownReasonError(false);
            }}
            placeholder="비가동 사유 선택"
            style={{ width: '100%' }}
          />
          {downReasonError && (
            <Typography.Text type="danger" style={{ fontSize: 12 }}>
              비가동 사유를 선택해주세요.
            </Typography.Text>
          )}
        </div>
      )}

      <Input.TextArea
        placeholder="변경 사유 또는 메모 (선택)"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        rows={2}
        style={{ marginBottom: 12 }}
      />

      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button onClick={handleClose}>닫기</Button>
        <Button
          type="primary"
          onClick={handleSave}
          loading={saving}
          disabled={!isSaveEnabled}
        >
          상태 저장
        </Button>
      </Space>
    </div>
  );

  return (
    <Popover
      content={content}
      title="설비 상태 변경"
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
    >
      <Badge
        color={STATUS_COLORS[currentStatus ?? 'RUN'] ?? '#d9d9d9'}
        text={STATUS_LABELS[currentStatus ?? 'RUN'] ?? currentStatus ?? '-'}
        style={{ cursor: 'pointer' }}
      />
    </Popover>
  );
}
