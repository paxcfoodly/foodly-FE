'use client';

import React, { forwardRef } from 'react';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options?: SelectOption[];
  placeholder?: string;
  allowClear?: boolean;
  size?: 'small' | 'middle' | 'large';
}

const sizeClasses: Record<string, string> = {
  small: 'h-7 text-xs',
  middle: 'h-9 text-sm',
  large: 'h-11 text-base',
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options = [], placeholder, className = '', size = 'middle', ...rest }, ref) => {
    return (
      <select
        ref={ref}
        className={`
          w-full bg-dark-700 border border-dark-500 rounded-lg px-3 text-gray-700
          transition-all appearance-none cursor-pointer
          focus:outline-none focus:bg-white focus:border-cyan-accent focus:ring-2 focus:ring-cyan-accent/15
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${className}
        `}
        {...rest}
      >
        {placeholder && (
          // Placeholder option stays selectable so the user can re-pick
          // it to clear a prior selection (e.g. go back to "전체" after
          // choosing FIN001 in a filter dropdown).
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  },
);

Select.displayName = 'Select';
export default Select;
