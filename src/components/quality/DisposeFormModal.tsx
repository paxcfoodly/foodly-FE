'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Modal } from '@/components/ui';
import toast from '@/components/ui/toast';
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
  const [loading, setLoading] = useState(false);
  const [disposeType, setDisposeType] = useState<string>('REWORK');
  const [disposeQty, setDisposeQty] = useState<string>('');
  const [approveBy, setApproveBy] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      setDisposeType('REWORK');
      setDisposeQty('');
      setApproveBy('');
      setRemark('');
      setErrors({});
    }
  }, [open]);

  /* ── Save handler ─── */
  const handleSave = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    if (!disposeType) newErrors.dispose_type = '처리유형을 선택하세요.';
    if (!disposeQty || Number(disposeQty) < 1) newErrors.dispose_qty = '1 이상의 값을 입력하세요.';
    if (disposeType === 'CONCESSION' && !approveBy) newErrors.approve_by = '특채(CONCESSION) 처리 시 승인자를 선택해야 합니다.';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      setLoading(true);

      const payload: Record<string, unknown> = {
        dispose_type: disposeType,
        dispose_qty: Number(disposeQty),
      };
      if (approveBy) payload.approve_by = approveBy;
      if (remark) payload.remark = remark;

      await apiClient.post(`/v1/defects/${defectId}/disposals`, payload);
      toast.success('후속조치가 등록되었습니다.');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [disposeType, disposeQty, approveBy, remark, defectId, onSaved, onClose]);

  /* ── Dispose type change ─── */
  const handleDisposeTypeChange = useCallback(
    (val: string) => {
      setDisposeType(val);
      if (val !== 'CONCESSION') {
        setApproveBy('');
      }
    },
    [],
  );

  const requiresDownReason = disposeType === 'CONCESSION';

  const footer = (
    <div className="flex items-center gap-2">
      <Button onClick={onClose}>취소</Button>
      <Button variant="primary" loading={loading} onClick={handleSave}>
        등록
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      title="후속조치 등록"
      width={640}
      maskClosable={false}
      footer={footer}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Dispose type */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            처리유형 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-4">
            {[
              { value: 'REWORK', label: '재작업' },
              { value: 'SCRAP', label: '폐기' },
              { value: 'CONCESSION', label: '특채' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="dispose_type"
                  value={opt.value}
                  checked={disposeType === opt.value}
                  onChange={(e) => handleDisposeTypeChange(e.target.value)}
                  className="accent-cyan-600"
                />
                {opt.label}
              </label>
            ))}
          </div>
          {errors.dispose_type && <p className="text-red-500 text-xs mt-1">{errors.dispose_type}</p>}
        </div>

        {/* Dispose qty */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            처리수량 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            className={`w-full h-9 bg-gray-50 border rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 ${errors.dispose_qty ? 'border-red-400' : 'border-gray-200'}`}
            min={1}
            placeholder="처리 수량"
            value={disposeQty}
            onChange={(e) => setDisposeQty(e.target.value)}
          />
          {errors.dispose_qty && <p className="text-red-500 text-xs mt-1">{errors.dispose_qty}</p>}
        </div>

        {/* Approver */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            승인자 {requiresDownReason && <span className="text-red-500">*</span>}
          </label>
          <select
            className={`w-full h-9 bg-gray-50 border rounded-lg px-3 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 ${errors.approve_by ? 'border-red-400' : 'border-gray-200'}`}
            value={approveBy}
            onChange={(e) => setApproveBy(e.target.value)}
            disabled={userOptions.length === 0}
          >
            <option value="">
              {requiresDownReason ? '승인자 선택 (필수)' : '승인자 선택 (선택사항)'}
            </option>
            {userOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.approve_by && <p className="text-red-500 text-xs mt-1">{errors.approve_by}</p>}
        </div>

        {/* Remark */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">비고</label>
          <textarea
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500"
            rows={3}
            placeholder="비고 입력"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
