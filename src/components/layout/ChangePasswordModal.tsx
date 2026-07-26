'use client';

import { useState } from 'react';
import { Modal, Button, toast } from '@/components/ui';
import { changePasswordApi } from '@/lib/notificationApi';

interface Props {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full h-9 bg-dark-700 border border-dark-500 rounded-lg px-3 text-sm text-gray-700 placeholder-gray-400 transition-all focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15';

export default function ChangePasswordModal({ open, onClose }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm('');
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!current || !next) {
      toast.error('현재 비밀번호와 새 비밀번호를 입력하세요.');
      return;
    }
    if (next.length < 8) {
      toast.error('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (next !== confirm) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (next === current) {
      toast.error('새 비밀번호가 현재 비밀번호와 같습니다.');
      return;
    }
    setSubmitting(true);
    try {
      await changePasswordApi(current, next);
      toast.success('비밀번호가 변경되었습니다.');
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? '비밀번호 변경에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="비밀번호 변경"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={handleClose} disabled={submitting}>취소</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '변경 중…' : '변경'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">현재 비밀번호</label>
          <input
            type="password"
            className={inputClass}
            value={current}
            autoComplete="current-password"
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">새 비밀번호 (8자 이상)</label>
          <input
            type="password"
            className={inputClass}
            value={next}
            minLength={8}
            autoComplete="new-password"
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">새 비밀번호 확인</label>
          <input
            type="password"
            className={inputClass}
            value={confirm}
            autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
        </div>
      </div>
    </Modal>
  );
}
