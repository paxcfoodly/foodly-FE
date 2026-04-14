'use client';

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  placement?: 'left' | 'right';
  width?: number | string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Drawer({
  open,
  onClose,
  title,
  placement = 'right',
  width = 360,
  children,
  footer,
}: DrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`absolute top-0 bottom-0 bg-white shadow-xl flex flex-col transition-transform duration-300
          ${placement === 'left' ? 'left-0' : 'right-0'}`}
        style={{ width }}
      >
        {title && (
          <div className="h-14 flex items-center justify-between px-6 border-b border-dark-500 shrink-0">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-dark-700 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto p-6">{children}</div>
        {footer && (
          <div className="border-t border-dark-500 px-6 py-4 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
