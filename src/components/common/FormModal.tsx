'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';

/* ── Types ─────────────────────────────────────────── */

export type FormModalMode = 'create' | 'edit' | 'view';

/**
 * Minimal form handle exposed to children — replaces antd FormInstance.
 * Children use this to register fields for validation and to read/write values.
 */
export interface FormHandle<T = Record<string, unknown>> {
  /** Get all current form values */
  getFieldsValue: () => T;
  /** Set multiple field values */
  setFieldsValue: (vals: Partial<T>) => void;
  /** Reset all fields to initial state */
  resetFields: () => void;
  /** Validate all required fields. Throws if invalid. Returns values. */
  validateFields: () => T;
  /** Register a native form element ref for validation */
  formRef: React.RefObject<HTMLFormElement | null>;
}

export interface FormModalProps<T = Record<string, unknown>> {
  /** 모달 열림 여부 */
  open: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 저장 콜백 — 유효성 통과 후 호출됨 */
  onSubmit: (values: T, mode: FormModalMode) => Promise<void> | void;
  /** 등록 / 수정 / 보기 모드 (기본 create) */
  mode?: FormModalMode;
  /** 수정 시 초기 데이터 */
  initialValues?: Partial<T>;
  /** 모달 제목 (미지정 시 모드별 자동 생성) */
  title?: string;
  /** Form 레이아웃 */
  layout?: 'horizontal' | 'vertical';
  /** label 컬럼 span (기본 6) — kept for interface compat */
  labelCol?: { span?: number };
  /** wrapper 컬럼 span (기본 18) — kept for interface compat */
  wrapperCol?: { span?: number };
  /** 모달 너비 (기본 640) */
  width?: number;
  /** 폼 필드 렌더링 */
  children: (form: FormHandle<T>, mode: FormModalMode) => React.ReactNode;
  /** 추가 버튼 렌더링 */
  extraFooter?: React.ReactNode;
  /** 모달 z-index */
  zIndex?: number;
}

/* ── 모드별 기본 제목 ─────────────────────────────── */

const MODE_TITLES: Record<FormModalMode, string> = {
  create: '신규 등록',
  edit: '수정',
  view: '상세 보기',
};

/* ── Component ────────────────────────────────────── */

export default function FormModal<T extends Record<string, unknown> = Record<string, unknown>>({
  open,
  onClose,
  onSubmit,
  mode = 'create',
  initialValues,
  title,
  layout = 'horizontal',
  width = 640,
  children,
  extraFooter,
  zIndex,
}: FormModalProps<T>) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState<Partial<T>>({});
  const isViewMode = mode === 'view';

  /* 모달 열릴 때 초기값 세팅 */
  useEffect(() => {
    if (open) {
      if (initialValues) {
        setFormValues({ ...initialValues });
      } else {
        setFormValues({});
      }
    }
  }, [open, initialValues]);

  /* Form handle exposed to children */
  const form: FormHandle<T> = {
    getFieldsValue: () => formValues as T,
    setFieldsValue: (vals: Partial<T>) => {
      setFormValues((prev) => ({ ...prev, ...vals }));
    },
    resetFields: () => {
      setFormValues({});
      formRef.current?.reset();
    },
    validateFields: () => {
      /* Use native HTML5 validation */
      if (formRef.current && !formRef.current.checkValidity()) {
        formRef.current.reportValidity();
        throw { errorFields: true };
      }
      /* Gather values from form elements as a fallback merge */
      if (formRef.current) {
        const fd = new FormData(formRef.current);
        const nativeVals: Record<string, unknown> = {};
        fd.forEach((v, k) => {
          nativeVals[k] = v;
        });
        return { ...nativeVals, ...formValues } as T;
      }
      return formValues as T;
    },
    formRef,
  };

  /* 저장 핸들러 */
  const handleOk = useCallback(async () => {
    if (isViewMode) {
      onClose();
      return;
    }
    try {
      const values = form.validateFields();
      setLoading(true);
      await onSubmit(values, mode);
      toast.success(mode === 'create' ? '등록되었습니다.' : '수정되었습니다.');
      form.resetFields();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      toast.error(err?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isViewMode, mode, onClose, onSubmit, formValues]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 닫기 핸들러 */
  const handleCancel = useCallback(() => {
    form.resetFields();
    onClose();
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 푸터 */
  const footer = isViewMode ? (
    <Button onClick={handleCancel}>닫기</Button>
  ) : (
    <div className="flex items-center gap-2">
      {extraFooter}
      <Button onClick={handleCancel}>취소</Button>
      <Button variant="primary" loading={loading} onClick={handleOk}>
        {mode === 'create' ? '등록' : '저장'}
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      title={title ?? MODE_TITLES[mode]}
      width={width}
      maskClosable={false}
      footer={footer}
      onClose={handleCancel}
      zIndex={zIndex}
    >
      <div className="pt-2">
        <form
          ref={formRef}
          autoComplete="off"
          onSubmit={(e) => { e.preventDefault(); handleOk(); }}
        >
          <fieldset disabled={isViewMode} className={layout === 'horizontal' ? 'space-y-4' : 'space-y-3'}>
            {children(form, mode)}
          </fieldset>
        </form>
      </div>
    </Modal>
  );
}
