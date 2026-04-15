'use client';

import React, { useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import toast from '@/components/ui/toast';
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

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'error' | 'processing' | 'default'> = {
  RUN: 'success',
  IDLE: 'warning',
  DOWN: 'error',
  SETUP: 'warning',
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

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
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
      toast.success('설비 상태가 변경되었습니다.');
      setOpen(false);
      onSuccess();
    } catch {
      toast.error('상태 변경에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleToggle = () => {
    if (!open) {
      // Reset on open
      setSelectedStatus(currentStatus ?? 'RUN');
      setDownReason(undefined);
      setMemo('');
      setDownReasonError(false);
    }
    setOpen(!open);
  };

  return (
    <div className="relative inline-block">
      <button onClick={handleToggle} className="cursor-pointer">
        <Badge
          status={STATUS_BADGE[currentStatus ?? 'RUN'] ?? 'default'}
          text={STATUS_LABELS[currentStatus ?? 'RUN'] ?? currentStatus ?? '-'}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={handleClose} />

          {/* Popover content */}
          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 p-4 w-[300px]">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">설비 상태 변경</h4>

            <div className="flex flex-col gap-2 mb-3">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <label key={value} className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="equip_status"
                    value={value}
                    checked={selectedStatus === value}
                    onChange={() => handleStatusChange(value)}
                    className="accent-cyan-accent"
                  />
                  <Badge status={STATUS_BADGE[value] ?? 'default'} text={label} />
                </label>
              ))}
            </div>

            {requiresDownReason && (
              <div className="mb-3">
                <div className="mb-1 text-xs text-gray-500">
                  비가동 사유 <span className="text-red-500">*</span>
                </div>
                <CommonCodeSelect
                  groupCd="DOWN_REASON"
                  value={downReason}
                  onChange={(e) => {
                    setDownReason(e.target.value);
                    setDownReasonError(false);
                  }}
                  placeholder="비가동 사유 선택"
                />
                {downReasonError && (
                  <p className="text-xs text-red-500 mt-1">
                    비가동 사유를 선택해주세요.
                  </p>
                )}
              </div>
            )}

            <Textarea
              placeholder="변경 사유 또는 메모 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="mb-3"
            />

            <div className="flex justify-end gap-2">
              <Button size="small" onClick={handleClose}>닫기</Button>
              <Button
                size="small"
                variant="primary"
                onClick={handleSave}
                loading={saving}
                disabled={!isSaveEnabled}
              >
                상태 저장
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
