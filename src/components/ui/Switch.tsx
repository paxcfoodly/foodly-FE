'use client';

import React from 'react';

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'default';
}

export default function Switch({ checked = false, onChange, disabled, size = 'default' }: SwitchProps) {
  const isSmall = size === 'small';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`
        relative inline-flex items-center rounded-full transition-colors
        ${checked ? 'bg-cyan-accent' : 'bg-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isSmall ? 'h-4 w-7' : 'h-6 w-11'}
      `}
    >
      <span
        className={`
          inline-block bg-white rounded-full shadow transition-transform
          ${isSmall ? 'h-3 w-3' : 'h-5 w-5'}
          ${checked ? (isSmall ? 'translate-x-3.5' : 'translate-x-5.5') : 'translate-x-0.5'}
        `}
      />
    </button>
  );
}
