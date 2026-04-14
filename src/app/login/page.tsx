'use client';

import { Suspense } from 'react';
import { Spinner } from '@/components/ui';
import LoginContent from './LoginContent';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <Spinner size="large" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
