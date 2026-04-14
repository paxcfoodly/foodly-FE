'use client';

import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyProps {
  description?: React.ReactNode;
  image?: React.ReactNode;
  children?: React.ReactNode;
}

export default function Empty({ description = '데이터가 없습니다.', image, children }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {image || <Inbox className="w-12 h-12 text-gray-300 mb-3" />}
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      {children}
    </div>
  );
}
