'use client';

import React from 'react';

export interface FormFieldProps {
  label?: string;
  name?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
  layout?: 'vertical' | 'horizontal';
  labelCol?: number;
  style?: React.CSSProperties;
}

export default function FormField({
  label,
  required,
  error,
  children,
  className = '',
  layout = 'vertical',
  style,
}: FormFieldProps) {
  if (layout === 'horizontal') {
    return (
      <div className={`flex items-start gap-4 mb-4 ${className}`} style={style}>
        {label && (
          <label className="shrink-0 w-32 pt-2 text-xs font-medium text-gray-400 uppercase tracking-wide text-right">
            {label}
            {required && <span className="text-red-accent ml-0.5">*</span>}
          </label>
        )}
        <div className="flex-1">
          {children}
          {error && <p className="text-xs text-red-accent mt-1">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-4 ${className}`} style={style}>
      {label && (
        <label className="block mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
          {label}
          {required && <span className="text-red-accent ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-accent mt-1">{error}</p>}
    </div>
  );
}
