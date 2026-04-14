'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

/**
 * Touch UI layout — full-width wrapper with a simple back button header.
 * Sits inside (main) layout so AuthGuard still applies.
 */
export default function TouchLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Simple header */}
      <div className="flex items-center px-5 py-3 bg-white border-b border-gray-200">
        <Button
          variant="ghost"
          icon={<ArrowLeft className="w-5 h-5" />}
          onClick={() => router.back()}
          className="!h-11 !w-11 text-lg"
        />
        <span className="text-xl font-semibold ml-2">
          터치 UI
        </span>
      </div>

      {/* Content */}
      <div className="p-4">{children}</div>
    </div>
  );
}
