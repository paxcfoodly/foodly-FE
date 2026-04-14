/**
 * Simple toast notification system (replaces antd message)
 * Uses native DOM — no React portal needed.
 */

type ToastType = 'success' | 'error' | 'warning' | 'info';

const iconMap: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const colorMap: Record<ToastType, string> = {
  success: '#059669',
  error: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
};

function show(type: ToastType, content: string, duration = 3000) {
  if (typeof window === 'undefined') return;

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText =
      'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }

  const el = document.createElement('div');
  el.style.cssText = `
    display:flex;align-items:center;gap:8px;padding:10px 20px;
    background:white;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.12);
    font-size:14px;color:#374151;pointer-events:auto;
    animation: toastIn 0.2s ease-out;
  `;
  el.innerHTML = `<span style="color:${colorMap[type]};font-weight:600;font-size:16px">${iconMap[type]}</span><span>${content}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s';
    setTimeout(() => el.remove(), 200);
  }, duration);
}

const toast = {
  success: (content: string, duration?: number) => show('success', content, duration),
  error: (content: string, duration?: number) => show('error', content, duration),
  warning: (content: string, duration?: number) => show('warning', content, duration),
  info: (content: string, duration?: number) => show('info', content, duration),
};

export default toast;
