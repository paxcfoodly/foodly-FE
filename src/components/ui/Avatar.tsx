'use client';

import React from 'react';

interface AvatarProps {
  size?: number | 'small' | 'default' | 'large';
  src?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const sizeMap = { small: 24, default: 32, large: 40 };

export default function Avatar({ size = 'default', src, icon, children, className = '', style }: AvatarProps) {
  const px = typeof size === 'number' ? size : sizeMap[size];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-dark-700 text-gray-500 overflow-hidden shrink-0 ${className}`}
      style={{ width: px, height: px, fontSize: px * 0.45, ...style }}
    >
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : icon || children}
    </span>
  );
}
