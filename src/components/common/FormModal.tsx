'use client';

import React, { useEffect, useCallback } from 'react';
import { Modal, Form, Button, Space, message } from 'antd';
import type { FormInstance, FormProps } from 'antd';

/* ── Types ─────────────────────────────────────────── */

export type FormModalMode = 'create' | 'edit' | 'view';

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
  layout?: FormProps['layout'];
  /** label 컬럼 span (기본 6) */
  labelCol?: FormProps['labelCol'];
  /** wrapper 컬럼 span (기본 18) */
  wrapperCol?: FormProps['wrapperCol'];
  /** 모달 너비 (기본 640) */
  width?: number;
  /** 폼 필드 렌더링 */
  children: (form: FormInstance<T>, mode: FormModalMode) => React.ReactNode;
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
  labelCol = { span: 6 },
  wrapperCol = { span: 18 },
  width = 640,
  children,
  extraFooter,
  zIndex,
}: FormModalProps<T>) {
  const [form] = Form.useForm<T>();
  const [loading, setLoading] = React.useState(false);
  const isViewMode = mode === 'view';

  /* 모달 열릴 때 초기값 세팅 */
  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue(initialValues as any);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  /* 저장 핸들러 */
  const handleOk = useCallback(async () => {
    if (isViewMode) {
      onClose();
      return;
    }
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onSubmit(values, mode);
      message.success(mode === 'create' ? '등록되었습니다.' : '수정되었습니다.');
      form.resetFields();
      onClose();
    } catch (err: any) {
      // validation error는 antd가 자동 표시, 그 외만 처리
      if (err?.errorFields) return;
      message.error(err?.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [form, isViewMode, mode, onClose, onSubmit]);

  /* 닫기 핸들러 */
  const handleCancel = useCallback(() => {
    form.resetFields();
    onClose();
  }, [form, onClose]);

  /* 푸터 */
  const footer = isViewMode ? (
    <Button onClick={handleCancel}>닫기</Button>
  ) : (
    <Space>
      {extraFooter}
      <Button onClick={handleCancel}>취소</Button>
      <Button type="primary" loading={loading} onClick={handleOk}>
        {mode === 'create' ? '등록' : '저장'}
      </Button>
    </Space>
  );

  return (
    <Modal
      open={open}
      title={title ?? MODE_TITLES[mode]}
      width={width}
      destroyOnClose
      maskClosable={false}
      footer={footer}
      onCancel={handleCancel}
      zIndex={zIndex}
    >
      <Form<T>
        form={form}
        layout={layout}
        labelCol={layout === 'horizontal' ? labelCol : undefined}
        wrapperCol={layout === 'horizontal' ? wrapperCol : undefined}
        disabled={isViewMode}
        autoComplete="off"
      >
        {children(form, mode)}
      </Form>
    </Modal>
  );
}
