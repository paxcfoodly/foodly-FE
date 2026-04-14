import { confirm } from '@/components/ui/confirm';

/**
 * 확인(confirm) 모달 — Promise<boolean> 반환
 *
 * @example
 * const ok = await confirmModal({ title: '삭제', content: '정말 삭제하시겠습니까?' });
 * if (ok) { … }
 */
export function confirmModal(
  props: {
    title?: string;
    content?: React.ReactNode;
    okText?: string;
    cancelText?: string;
    danger?: boolean;
  },
): Promise<boolean> {
  return new Promise((resolve) => {
    confirm({
      title: props.title ?? '확인',
      content: typeof props.content === 'string' ? props.content : undefined,
      okText: props.okText ?? '확인',
      cancelText: props.cancelText ?? '취소',
      danger: props.danger,
      onOk: () => {
        resolve(true);
      },
    });
    // Since confirm closes on backdrop click or cancel without calling onOk,
    // we resolve false after a timeout if not resolved.
    // However the confirm util doesn't provide an onCancel callback directly,
    // so we use a workaround: observe DOM removal.
    const checkRemoval = setInterval(() => {
      const overlay = document.querySelector('[id^="cf-"]');
      if (!overlay) {
        clearInterval(checkRemoval);
        // Resolve false if not already resolved via onOk
        resolve(false);
      }
    }, 200);
    // Safety timeout
    setTimeout(() => clearInterval(checkRemoval), 60000);
  });
}

/**
 * 알림(info) 모달 — 확인 버튼만 표시
 *
 * @example
 * await alertModal({ title: '알림', content: '저장되었습니다.' });
 */
export function alertModal(
  props: {
    title?: string;
    content?: React.ReactNode;
    okText?: string;
  },
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';

    const card = document.createElement('div');
    card.style.cssText =
      'background:white;border-radius:12px;padding:24px;max-width:420px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,0.15);';

    const contentStr = typeof props.content === 'string' ? props.content : '';
    card.innerHTML = `
      <h3 style="font-size:16px;font-weight:600;color:#111827;margin-bottom:8px">${props.title ?? '알림'}</h3>
      ${contentStr ? `<p style="font-size:14px;color:#6b7280;margin-bottom:20px">${contentStr}</p>` : '<div style="margin-bottom:20px"></div>'}
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button id="alert-ok" style="height:36px;padding:0 16px;border-radius:8px;border:none;background:#0891b2;color:white;font-size:14px;font-weight:500;cursor:pointer">${props.okText ?? '확인'}</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      resolve();
    };

    card.querySelector('#alert-ok')!.addEventListener('click', close);
  });
}
