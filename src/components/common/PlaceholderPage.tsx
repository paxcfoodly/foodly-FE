'use client';

import { Clock } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 bg-dark-700"
      >
        <Clock className="w-7 h-7 text-cyan-accent" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-gray-900">
        {title}
      </h2>
      <p className="text-sm text-gray-400">
        {description ?? `${title} 화면은 준비 중입니다.`}
      </p>
    </div>
  );
}
