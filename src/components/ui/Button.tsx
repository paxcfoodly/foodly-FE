'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default' | 'danger' | 'ghost' | 'link';
  size?: 'small' | 'middle' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
  block?: boolean;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-cyan-accent text-white hover:opacity-90 shadow-sm hover:shadow-md',
  default: 'bg-dark-700 border border-dark-500 text-gray-700 hover:bg-dark-600',
  danger: 'bg-red-accent text-white hover:opacity-90',
  ghost: 'bg-transparent border border-dark-500 text-gray-700 hover:bg-dark-700',
  link: 'bg-transparent text-cyan-accent hover:underline p-0 h-auto',
};

const sizeClasses: Record<string, string> = {
  small: 'h-7 px-3 text-xs rounded-md',
  middle: 'h-9 px-4 text-sm rounded-lg',
  large: 'h-11 px-6 text-base rounded-lg',
};

export default function Button({
  variant = 'default',
  size = 'middle',
  loading = false,
  icon,
  block = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium transition-all
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${block ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {!loading && icon}
      {children}
    </button>
  );
}
