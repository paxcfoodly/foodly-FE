/**
 * Simple confirm dialog (replaces antd Modal.confirm)
 */
export function confirm({
  title,
  content,
  onOk,
  okText = '확인',
  cancelText = '취소',
  danger = false,
}: {
  title: string;
  content?: string;
  onOk: () => void | Promise<void>;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
}) {
  if (typeof window === 'undefined') return;

  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);';

  const card = document.createElement('div');
  card.style.cssText =
    'background:white;border-radius:12px;padding:24px;max-width:420px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,0.15);';

  card.innerHTML = `
    <h3 style="font-size:16px;font-weight:600;color:#111827;margin-bottom:8px">${title}</h3>
    ${content ? `<p style="font-size:14px;color:#6b7280;margin-bottom:20px">${content}</p>` : '<div style="margin-bottom:20px"></div>'}
    <div style="display:flex;justify-content:flex-end;gap:8px">
      <button id="cf-cancel" style="height:36px;padding:0 16px;border-radius:8px;border:1px solid #d1d5db;background:#f0f1f3;font-size:14px;cursor:pointer;color:#374151">${cancelText}</button>
      <button id="cf-ok" style="height:36px;padding:0 16px;border-radius:8px;border:none;background:${danger ? '#dc2626' : '#0891b2'};color:white;font-size:14px;font-weight:500;cursor:pointer">${okText}</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  card.querySelector('#cf-cancel')!.addEventListener('click', close);
  card.querySelector('#cf-ok')!.addEventListener('click', async () => {
    await onOk();
    close();
  });
}
