'use client';

import React from 'react';

interface SpinnerProps {
  size?: 'small' | 'default' | 'large';
  className?: string;
  tip?: string;
  children?: React.ReactNode;
  spinning?: boolean;
}

const sizeMap = { small: 'w-4 h-4', default: 'w-8 h-8', large: 'w-12 h-12' };

export default function Spinner({ size = 'default', className = '', tip, children, spinning = true }: SpinnerProps) {
  if (!spinning) return <>{children}</>;

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <svg className={`animate-spin text-cyan-accent ${sizeMap[size]}`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {tip && <span className="text-sm text-gray-400">{tip}</span>}
    </div>
  );

  if (children) {
    return (
      <div className="relative">
        {spinning && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
            {spinner}
          </div>
        )}
        <div className={spinning ? 'opacity-40 pointer-events-none' : ''}>{children}</div>
      </div>
    );
  }

  return spinner;
}
