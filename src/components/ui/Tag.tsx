'use client';

import React from 'react';

export interface TagProps {
  color?: 'green' | 'red' | 'blue' | 'yellow' | 'cyan' | 'gray' | 'orange' | 'purple' | string;
  children: React.ReactNode;
  className?: string;
}

const colorMap: Record<string, string> = {
  green: 'bg-green-accent/10 text-green-accent',
  red: 'bg-red-accent/10 text-red-accent',
  blue: 'bg-blue-accent/10 text-blue-accent',
  yellow: 'bg-yellow-accent/10 text-yellow-accent',
  cyan: 'bg-cyan-accent/10 text-cyan-accent',
  gray: 'bg-gray-100 text-gray-600',
  orange: 'bg-orange-100 text-orange-600',
  purple: 'bg-purple-100 text-purple-600',
  // Ant Design compatibility colors
  success: 'bg-green-accent/10 text-green-accent',
  error: 'bg-red-accent/10 text-red-accent',
  warning: 'bg-yellow-accent/10 text-yellow-accent',
  processing: 'bg-blue-accent/10 text-blue-accent',
  default: 'bg-gray-100 text-gray-600',
  gold: 'bg-yellow-accent/10 text-yellow-accent',
  lime: 'bg-lime-100 text-lime-600',
  volcano: 'bg-orange-100 text-orange-600',
  magenta: 'bg-pink-100 text-pink-600',
  geekblue: 'bg-blue-accent/10 text-blue-accent',
};

export default function Tag({ color = 'gray', children, className = '' }: TagProps) {
  const colorClass = colorMap[color] || colorMap.gray;
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
        ${colorClass} ${className}
      `}
    >
      {children}
    </span>
  );
}
