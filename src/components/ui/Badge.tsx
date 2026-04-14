'use client';

import React from 'react';

export interface BadgeProps {
  count?: number;
  dot?: boolean;
  color?: string;
  size?: 'small' | 'default';
  children?: React.ReactNode;
  className?: string;
  status?: 'success' | 'error' | 'warning' | 'processing' | 'default';
  text?: string;
}

const statusColors: Record<string, string> = {
  success: 'bg-green-accent',
  error: 'bg-red-accent',
  warning: 'bg-yellow-accent',
  processing: 'bg-blue-accent animate-pulse',
  default: 'bg-gray-400',
};

export default function Badge({
  count,
  dot,
  size = 'default',
  children,
  className = '',
  status,
  text,
}: BadgeProps) {
  // Status badge (dot + text inline)
  if (status && !children) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className={`w-2 h-2 rounded-full ${statusColors[status] || statusColors.default}`} />
        {text && <span className="text-sm text-gray-600">{text}</span>}
      </span>
    );
  }

  return (
    <span className={`relative inline-flex ${className}`}>
      {children}
      {dot && (
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-accent rounded-full ring-2 ring-white" />
      )}
      {count !== undefined && count > 0 && (
        <span
          className={`
            absolute -top-1.5 -right-1.5 flex items-center justify-center
            bg-red-accent text-white rounded-full font-medium
            ${size === 'small' ? 'min-w-4 h-4 text-[10px] px-1' : 'min-w-5 h-5 text-xs px-1.5'}
          `}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  );
}
