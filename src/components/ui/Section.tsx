'use client';

import React from 'react';

/**
 * Card-shaped section for modal forms.
 * Accent bar + title on top, border-rounded body.
 */
export function Section({
  title,
  aside,
  action,
  children,
  className = '',
}: {
  title: string;
  /** Small grey helper text next to the title (e.g. "모든 항목 필수") */
  aside?: string;
  /** Right-side slot for an action button (e.g. "추가"). */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-gray-100 rounded-lg ${className}`}>
      <header className="flex items-center justify-between px-4 h-10 border-b border-gray-100 bg-gray-50/60 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1 h-4 bg-cyan-accent rounded-sm" />
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          {aside && <span className="text-xs text-gray-400">{aside}</span>}
        </div>
        {action}
      </header>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}

/**
 * 2-column grid row: fixed 110px label column + flexible input column.
 * Use inside `<Section>` for form fields.
 */
export function Row({
  label,
  required,
  children,
  align = 'start',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  /** Align label to input baseline. Use 'center' for single-line inputs. */
  align?: 'start' | 'center';
}) {
  const itemsClass = align === 'center' ? 'items-center' : 'items-start';
  const labelPad = align === 'center' ? '' : 'pt-2';
  return (
    <div className={`grid grid-cols-[110px_1fr] gap-3 ${itemsClass}`}>
      <label className={`text-xs font-medium text-gray-400 uppercase tracking-wide ${labelPad}`}>
        {label}
        {required && <span className="text-red-accent ml-0.5">*</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}
