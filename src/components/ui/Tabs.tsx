'use client';

import React from 'react';

export interface TabItem {
  key: string;
  label: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  activeKey?: string;
  onChange?: (key: string) => void;
  className?: string;
}

export default function Tabs({ items, activeKey, onChange, className = '' }: TabsProps) {
  const active = activeKey || items[0]?.key;
  const current = items.find((i) => i.key === active);

  return (
    <div className={className}>
      <div className="flex border-b border-dark-500 gap-1 mb-4">
        {items.map((item) => (
          <button
            key={item.key}
            disabled={item.disabled}
            onClick={() => onChange?.(item.key)}
            className={`
              px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px
              ${item.key === active
                ? 'border-cyan-accent text-cyan-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'}
              ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {item.label}
          </button>
        ))}
      </div>
      {current?.children}
    </div>
  );
}
