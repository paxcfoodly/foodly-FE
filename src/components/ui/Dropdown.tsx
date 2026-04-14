'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  type?: 'divider';
  onClick?: () => void;
}

interface DropdownProps {
  items: DropdownItem[];
  trigger?: ('click' | 'hover')[];
  placement?: 'bottomLeft' | 'bottomRight';
  children: React.ReactNode;
}

export default function Dropdown({
  items,
  trigger = ['click'],
  placement = 'bottomLeft',
  children,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div
        onClick={trigger.includes('click') ? () => setOpen(!open) : undefined}
        onMouseEnter={trigger.includes('hover') ? () => setOpen(true) : undefined}
        onMouseLeave={trigger.includes('hover') ? () => setOpen(false) : undefined}
      >
        {children}
      </div>

      {open && (
        <div
          className={`
            absolute z-50 mt-1 py-1 min-w-[160px] bg-white/95 backdrop-blur-xl
            border border-dark-600 rounded-lg shadow-lg
            ${placement === 'bottomRight' ? 'right-0' : 'left-0'}
          `}
        >
          {items.map((item, idx) => {
            if (item.type === 'divider') {
              return <div key={idx} className="my-1 border-t border-dark-600" />;
            }
            return (
              <button
                key={item.key}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                  ${item.danger ? 'text-red-accent hover:bg-red-50' : 'text-gray-700 hover:bg-dark-700'}
                  ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => {
                  if (item.disabled) return;
                  item.onClick?.();
                  setOpen(false);
                }}
                disabled={item.disabled}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
