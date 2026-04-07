import { Modal } from 'antd';
import type { ModalFuncProps } from 'antd';

/**
 * 확인(confirm) 모달 — Promise<boolean> 반환
 *
 * @example
 * const ok = await confirmModal({ title: '삭제', content: '정말 삭제하시겠습니까?' });
 * if (ok) { … }
 */
export function confirmModal(
  props: Omit<ModalFuncProps, 'onOk' | 'onCancel'> & {
    title?: string;
    content?: React.ReactNode;
  },
): Promise<boolean> {
  return new Promise((resolve) => {
    Modal.confirm({
      title: props.title ?? '확인',
      okText: '확인',
      cancelText: '취소',
      ...props,
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

/**
 * 알림(info) 모달 — 확인 버튼만 표시
 *
 * @example
 * await alertModal({ title: '알림', content: '저장되었습니다.' });
 */
export function alertModal(
  props: Omit<ModalFuncProps, 'onOk'> & {
    title?: string;
    content?: React.ReactNode;
  },
): Promise<void> {
  return new Promise((resolve) => {
    Modal.info({
      title: props.title ?? '알림',
      okText: '확인',
      ...props,
      onOk: () => resolve(),
    });
  });
}
